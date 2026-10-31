#!/usr/bin/env python3
"""
HITL · Super prompt de "A Walking Dictionary"

Comandos:
  build   Construye docs/ai/SUPERPROMPT.md: el prompt maestro de TODO el proyecto
          (memoria, decisiones, reglas, roles y rotación, backlog completo, markdowns y
          contratos de los repos, historial git, bitácora completa y trazabilidad).
  sesion  Genera el encabezado corto de una sesión (Prompt-ID, persona y rol, HU, tarea)
          que se pega después del SUPERPROMPT.
  log     Después de que una PERSONA revisó el resultado, lo registra en la bitácora
          de prompts (Excel) y en docs/ai/TRAZABILIDAD.md.
  check   Revisa que los commits de la rama tengan trazabilidad (hook o CI).

No llama a ninguna IA ni a ningún servicio: solo lee archivos y git locales.
Dependencia: openpyxl  (pip install openpyxl)
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from copy import copy
from pathlib import Path

try:
    import openpyxl
except ImportError:  # pragma: no cover
    sys.exit("Falta openpyxl: pip install openpyxl")

ESTADOS = ("VALIDADO", "ADAPTADO", "CORREGIDO", "RECHAZADO")
REPOS = ("frontend", "backend", "infra", "docs")


# ----------------------------------------------------------------------------- utilidades
def die(msg):
    sys.exit(f"ERROR: {msg}")


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower().strip()


def one_line(s, n=None):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    return s if not n or len(s) <= n else s[: n - 1] + "…"


def cell(s):  # texto seguro para tabla markdown
    return one_line(s).replace("|", "\\|")


def git(path, *args):
    try:
        r = subprocess.run(["git", "-C", str(path), *args], capture_output=True, text=True, timeout=30)
        return r.stdout.strip() if r.returncode == 0 else None
    except Exception:
        return None


def load_cfg(root):
    p = root / "tools" / "hitl" / "hitl.config.json"
    if not p.exists():
        die(f"No encuentro {p}")
    cfg = json.loads(p.read_text(encoding="utf-8"))
    extra = os.environ.get("HITL_REPOS")  # p. ej. '{"frontend": "_repos/frontend", "infra": "_repos/infra"}' (CI)
    if extra:
        cfg["repos"].update(json.loads(extra))
    return cfg


def repo_path(cfg, root, repo):
    rel = cfg["repos"].get(repo)
    return (root / rel).resolve() if rel is not None else None


# ----------------------------------------------------------------------------- roles
def resolver_sprint(roles, arg):
    if arg:
        return str(arg)
    hoy = dt.date.today().isoformat()
    for k, s in roles["sprints"].items():
        if s.get("inicio") and s.get("fin") and s["inicio"] <= hoy <= s["fin"]:
            return k
    if roles.get("sprint_actual"):
        return str(roles["sprint_actual"])
    die("No sé en qué sprint estamos. Usa --sprint N o llena 'sprint_actual' (o las fechas) en docs/ai/roles.json")


def resolver_persona(roles, texto):
    t = norm(texto)
    hits = [n for n in roles["integrantes"] if t and (t in norm(n) or norm(n).startswith(t))]
    if len(hits) != 1:
        die(f"'{texto}' no identifica a una sola persona. Integrantes: {', '.join(roles['integrantes'])}")
    return hits[0]


def tabla_roles(roles, sprint, autor):
    s = roles["sprints"][sprint]
    filas = ["| Integrante | Rol en el Sprint %s | |" % sprint, "|---|---|---|"]
    for n in roles["integrantes"]:
        marca = "← quien trabaja esta sesión" if n == autor else ""
        filas.append(f"| {n} | {s['roles'][n]} | {marca} |")
    return "\n".join(filas)


# ----------------------------------------------------------------------------- backlog
def norm_hu(hu):
    m = re.search(r"(\d+)", hu or "")
    if not m:
        die(f"HU inválida: {hu}")
    return f"HU-{int(m.group(1)):03d}"


def leer_hu(path, hu):
    p = Path(path)
    if not p.exists():
        return None
    wb = openpyxl.load_workbook(p, data_only=True, read_only=True)
    info = {"id": hu, "criterios": []}
    ws = wb["Historias de usuario"]
    head = None
    epica_id = epica_nombre = None
    for row in ws.iter_rows(values_only=True):
        if head is None:
            head = {norm(c): i for i, c in enumerate(row) if c}
            continue
        g = lambda k: row[head[k]] if k in head and head[k] < len(row) else None
        if g("id epica"):
            epica_id, epica_nombre = g("id epica"), g("nombre epica")
        if g("id historia usuario") == hu:
            info.update(
                epica=f"{epica_id} · {epica_nombre}",
                funcionalidad=g("funcionalidad clave"),
                resultado=g("resultado esperado"),
                historia=g("historia de usuario"),
                estado=g("estado"),
                tareas=g("tareas tecnicas"),
                prioridad=g("prioridad"),
            )
            break
    else:
        return None
    ws = wb["Criterios de aceptación"]
    actual = None
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue
        if row[1]:
            actual = row[1]
        if actual == hu and row[2]:
            info["criterios"].append(
                dict(id=row[2], nombre=row[3], estado=row[4], dado=row[5], cuando=row[6], entonces=row[7])
            )
    return info


def bloque_hu(info, hu):
    if not info:
        return f"> ⚠ POR COMPLETAR: no encontré {hu} en el backlog. Pega aquí la historia y sus criterios de aceptación."
    out = [
        f"**{info['id']}** · {info['epica']} · Prioridad {info['prioridad']} · Estado: **{info['estado']}**",
        f"- Funcionalidad: {one_line(info['funcionalidad'])}",
        f"- Resultado esperado: {one_line(info['resultado'])}",
        f"- Historia: {one_line(info['historia'])}",
        f"- Tareas técnicas (backlog): {one_line(info['tareas'])}",
        "",
        "Criterios de aceptación:",
    ]
    if not info["criterios"]:
        out.append("- (sin criterios en el backlog)")
    for c in info["criterios"]:
        out.append(
            f"- **{c['id']}** {one_line(c['nombre'])} [{c['estado']}] — {one_line(c['dado'])}; "
            f"{one_line(c['cuando'])}; {one_line(c['entonces'])}"
        )
    return "\n".join(out)


def leer_backlog_completo(path):
    """Devuelve (epicas, historias). historias: lista en orden con criterios."""
    p = Path(path)
    if not p.exists():
        return None, None
    wb = openpyxl.load_workbook(p, data_only=True, read_only=True)
    epicas = []
    if "Backlog" in wb.sheetnames:
        head = None
        for row in wb["Backlog"].iter_rows(values_only=True):
            if head is None:
                head = {norm(c): i for i, c in enumerate(row) if c}
                continue
            g = lambda k: row[head[k]] if k in head and head[k] < len(row) else None
            if g("id he"):
                epicas.append(dict(id=g("id he"), nombre=g("nombre he"), prioridad=g("prioridad"), riesgo=g("estimacion de riesgo"),
                                   valor=g("estimacion de valor"), esfuerzo=g("estimacion de esfuerzo"), restante=g("esfuerzo restante"),
                                   sprint=g("sprint")))
    crit = {}
    actual = None
    for i, row in enumerate(wb["Criterios de aceptación"].iter_rows(values_only=True)):
        if i == 0:
            continue
        if row[1]:
            actual = row[1]
        if actual and row[2]:
            crit.setdefault(actual, []).append(dict(id=row[2], nombre=row[3], estado=row[4], dado=row[5], cuando=row[6], entonces=row[7]))
    historias, head = [], None
    epica = None
    pos_ep = {}
    for row in wb["Historias de usuario"].iter_rows(values_only=True):
        if head is None:
            head = {norm(c): i for i, c in enumerate(row) if c}
            continue
        g = lambda k: row[head[k]] if k in head and head[k] < len(row) else None
        if g("id epica"):
            epica = f"{g('id epica')} · {g('nombre epica')}"
        if g("id historia usuario"):
            n_ep = int(re.search(r"(\d+)", str(epica_id_actual(epica))).group(1)) if epica else 0
            pos_ep[n_ep] = pos_ep.get(n_ep, 0) + 1
            historias.append(dict(id=g("id historia usuario"), alias=f"HU-{n_ep}.{pos_ep[n_ep]}", epica=epica, prioridad=g("prioridad"), func=g("funcionalidad clave"),
                                  resultado=g("resultado esperado"), historia=g("historia de usuario"), estado=g("estado"),
                                  tareas=g("tareas tecnicas"), esfuerzo=g("estimacion inicial de esfuerzo"),
                                  criterios=crit.get(g("id historia usuario"), [])))
    return epicas, historias


def epica_id_actual(epica):
    return (epica or "").split(" · ")[0]


def resolver_hu(path, texto):
    """HU-009, 9 o la forma del backend/ramas (HU-3.3) -> id del Excel (HU-009)."""
    m = re.search(r"(\d+)\s*\.\s*(\d+)", texto or "")
    if m:
        _, hs = leer_backlog_completo(path)
        for h in hs or []:
            if h["alias"] == f"HU-{int(m.group(1))}.{int(m.group(2))}":
                return h["id"]
        die(f"No encuentro la equivalencia de {texto} en el backlog (se esperaba algo como HU-3.3).")
    return norm_hu(texto)


def bloque_backlog(path, hu_obj, criterios_completos):
    epicas, hs = leer_backlog_completo(path)
    if hs is None:
        return "> ⚠ POR COMPLETAR: no encontré el backlog. Pega aquí las épicas y HU."
    v = lambda x: "—" if x in (None, "") else x
    out = ["Épicas:", "", "| Épica | Nombre | Prioridad | Riesgo | Valor | Esfuerzo | Restante |", "|---|---|---|---|---|---|---|"]
    for e in epicas:
        out.append(f"| {v(e['id'])} | {cell(e['nombre'])} | {v(e['prioridad'])} | {v(e['riesgo'])} | {v(e['valor'])} | {v(e['esfuerzo'])} | {v(e['restante'])} |")
    n_ok = sum(1 for h in hs if norm(h["estado"]) == "completado")
    out += ["", f"Historias de usuario: {len(hs)} en total, {n_ok} completadas.",
            "Cada HU tiene dos nombres en uso: el del Excel (HU-009) y el de CLAUDE.md del backend y varias ramas (HU-3.3). Son la misma HU; la equivalencia está en cada línea.", ""]
    epica_act = None
    for h in hs:
        if h["epica"] != epica_act:
            epica_act = h["epica"]
            out.append(f"\n**{epica_act}**")
        marca = "  ← HU objetivo de esta sesión" if h["id"] == hu_obj else ""
        out.append(f"- **{h['id']}** (= {h['alias']} en CLAUDE.md y ramas) [{h['estado']}] {one_line(h['func'])} — {one_line(h['historia'], 260)}{marca}")
        out.append(f"  - Tareas técnicas: {one_line(h['tareas'], 300)}")
        if h["criterios"]:
            if criterios_completos or h["id"] == hu_obj:
                for c in h["criterios"]:
                    out.append(f"  - {c['id']} [{c['estado']}] {one_line(c['nombre'])}: {one_line(c['dado'])}; {one_line(c['cuando'])}; {one_line(c['entonces'])}")
            else:
                out.append("  - Criterios: " + "; ".join(f"{c['id']} {one_line(c['nombre'], 60)}" for c in h["criterios"]))
    return "\n".join(out)


def rotacion(roles):
    cols = list(roles["sprints"].keys())
    out = ["| Integrante | " + " | ".join(f"Sprint {k}" for k in cols) + " |", "|---|" + "---|" * len(cols)]
    for n in roles["integrantes"]:
        out.append(f"| {n} | " + " | ".join(roles["sprints"][k]["roles"][n] for k in cols) + " |")
    out.append("")
    for k in cols:
        s = roles["sprints"][k]
        fechas = f" ({s['inicio']} a {s['fin']})" if s.get("inicio") and s.get("fin") else ""
        out.append(f"- Sprint {k} · {s['nombre']}{fechas}: líder {s['lider']}")
    return "\n".join(out)


def bajar_titulos(txt, niveles=4):
    """Baja el nivel de los títulos de un markdown ajeno para no romper la jerarquía de este documento."""
    return re.sub(r"^(#{1,5}) ", lambda m: "#" * min(6, len(m.group(1)) + niveles) + " ", txt, flags=re.M)


def extraer_secciones(txt, titulos):
    """Devuelve los bloques '## Título' pedidos (hasta el siguiente '## ')."""
    bloques, actual, buf = [], None, []
    for linea in txt.splitlines():
        if linea.startswith("## "):
            if actual is not None and any(actual.startswith(t) for t in titulos):
                bloques.append("\n".join(buf).rstrip())
            actual, buf = linea[3:].strip(), [linea]
        elif actual is not None:
            buf.append(linea)
    if actual is not None and any(actual.startswith(t) for t in titulos):
        bloques.append("\n".join(buf).rstrip())
    return "\n\n".join(bloques)


def fuentes_md(cfg, root):
    out = []
    for f in cfg.get("fuentes_md", []):
        base = repo_path(cfg, root, f["repo"])
        p = base / f["ruta"] if base else None
        if not (p and p.exists()):
            out.append(f"#### {f['repo']}:{f['ruta']}\n> ⚠ No encontré este archivo (¿carpeta del repo `{f['repo']}` disponible?).")
            continue
        txt = p.read_text(encoding="utf-8", errors="replace")
        cuerpo = extraer_secciones(txt, f["secciones"]) if f.get("secciones") else txt
        mx = f.get("max_chars", 40000)
        if len(cuerpo) > mx:
            cuerpo = cuerpo[:mx] + f"\n… [recortado a {mx} caracteres; lee el archivo completo en el repo]"
        # los títulos del archivo origen bajan de nivel para no romper la jerarquía de este documento
        cuerpo = bajar_titulos(cuerpo)
        out.append(f"#### {f['titulo']} — `{f['repo']}:{f['ruta']}`\n\n{cuerpo}")
    return "\n\n".join(out) if out else "(sin fuentes configuradas)"


def leer_md(root, rel):
    p = root / rel
    if not p.exists():
        return f"> ⚠ POR COMPLETAR: falta {rel}"
    txt = p.read_text(encoding="utf-8")
    return re.sub(r"\A---\n.*?\n---\n", "", txt, flags=re.S).strip()


# ----------------------------------------------------------------------------- docs y contratos
def excluido(p, base):
    rel = p.relative_to(base).parts
    # repos anidados (p. ej. backend y frontend clonados dentro de infra): se leen por su propia entrada
    for i in range(1, len(rel)):
        if (base.joinpath(*rel[:i]) / ".git").exists():
            return True
    return (bool({"node_modules", "generated", "_repos", "coverage", "dist", ".git"} & set(rel))
            or rel[:2] == ("docs", "ai"))


def indexar_docs(cfg, root, repo):
    base = repo_path(cfg, root, repo)
    if base is None or not base.exists():
        return None, []
    rx = re.compile(cfg["contract_regex"], re.I)
    lineas, contratos = [], []
    for p in sorted(base.rglob("*.md")):
        if excluido(p, base):
            continue
        rel = p.relative_to(base).as_posix()
        txt = p.read_text(encoding="utf-8", errors="replace")
        m = re.search(r"^#\s+(.+)$", txt, re.M)
        titulo = m.group(1).strip() if m else "(sin título)"
        ult = git(base, "log", "-1", "--format=%h %ad", "--date=short", "--", rel) or "sin historial git"
        es_contrato = bool(rx.search(rel))
        lineas.append(f"- {'**[CONTRATO]** ' if es_contrato else ''}`{repo}:{rel}` — {titulo} ({len(txt):,} caracteres; último cambio: {ult})".replace(",", "."))
        if es_contrato:
            contratos.append((f"{repo}:{rel}", txt))
    return lineas, contratos


def bloque_docs(cfg, root, modo):
    """modo: indice (solo lista), resumen (primeros caracteres de cada contrato) o completo."""
    lineas, inline_txt = [], []
    for repo in [x for x in ("backend", "frontend", "infra") if x in cfg["repos"]]:
        ls, cs = indexar_docs(cfg, root, repo)
        if ls is None:
            lineas.append(f"- ⚠ `{repo}`: carpeta no encontrada en {cfg['repos'][repo]!r} (clónala o ajusta hitl.config.json)")
            continue
        lineas += ls or [f"- `{repo}`: sin markdowns"]
        if modo != "indice":
            mx = cfg["inline_contract_max_chars"] if modo == "completo" else cfg["inline_contract_resumen_chars"]
            for ruta, txt in cs:
                corte = txt if len(txt) <= mx else txt[:mx].rstrip() + f"\n\n… [recortado a {mx} caracteres; lee el archivo completo en el repo]"
                inline_txt.append(f"#### {ruta}\n\n{bajar_titulos(corte)}")
    contratos = "\n\n".join(inline_txt) if inline_txt else (
        "(No se incluye el texto de los contratos: léelos desde el repo con las rutas de arriba. "
        "Si trabajas en un chat sin acceso al repo, reconstruye con `--contratos resumen` o `--contratos completo`.)"
    )
    return "\n".join(lineas), contratos


# ----------------------------------------------------------------------------- git
def estado_git(cfg, root, repo, base_branch):
    out, head = [], {}
    for r in [x for x in ("infra", "backend", "frontend") if x in cfg["repos"]]:
        p = repo_path(cfg, root, r)
        h = git(p, "rev-parse", "--short", "HEAD") if p and p.exists() else None
        head[r] = h
        rama = git(p, "rev-parse", "--abbrev-ref", "HEAD") if h else None
        marca = " ← repo objetivo" if r == repo else ""
        out.append(f"- `{r}`: rama `{rama or 'N/D'}`, HEAD `{h or 'N/D'}`{marca}")
    p = repo_path(cfg, root, repo)
    if p and p.exists() and git(p, "rev-parse", "HEAD"):
        base = base_branch if git(p, "rev-parse", "--verify", base_branch) else None
        rango = f"{base}..HEAD" if base else "-10"
        log = git(p, "log", "--no-merges", "--format=%h %ad %an: %s", "--date=short", *([rango] if base else ["-10"]))
        out.append(f"\nCommits de la rama del repo objetivo ({'desde ' + base if base else 'últimos 10; no existe ' + base_branch}):")
        out.append("\n".join(f"  - {l}" for l in log.splitlines()) if log else "  - (ninguno)")
        pend = git(p, "status", "--short")
        out.append(f"\nCambios sin commitear: {len(pend.splitlines()) if pend else 0}")
    else:
        out.append(f"\n⚠ El repo objetivo `{repo}` no es un repo git accesible: no hay historial para la trazabilidad.")
    return "\n".join(out), head


# ----------------------------------------------------------------------------- bitácora
def hoja_bitacora(wb, cfg, repo):
    nombre = cfg["hoja_por_repo"][repo]
    if nombre not in wb.sheetnames:
        die(f"La bitácora no tiene la hoja '{nombre}'. Hojas: {wb.sheetnames}")
    return wb[nombre]


def ultima_fila(ws):
    ult = 1
    for r in range(2, ws.max_row + 1):
        if ws.cell(r, 2).value not in (None, ""):
            ult = r
    return ult


def historial_git(cfg, root, n=60):
    out = []
    for r in [x for x in ("infra", "backend", "frontend") if x in cfg["repos"]]:
        p = repo_path(cfg, root, r)
        if not (p and p.exists() and git(p, "rev-parse", "HEAD")):
            out.append(f"**{r}**: sin historial git accesible.")
            continue
        log = git(p, "log", f"-n{n}", "--format=%h %ad %an: %s", "--date=short") or ""
        total = git(p, "rev-list", "--count", "HEAD") or "?"
        out.append(f"**{r}** — últimos {min(n, len(log.splitlines()))} de {total} commits (incluye merges de PR):")
        out += [f"  - {l}" for l in log.splitlines()]
    return "### Historial de commits\n" + "\n".join(out)


def bitacora_completa(cfg, root):
    p = root / cfg["bitacora_xlsx"]
    if not p.exists():
        return f"> ⚠ No encuentro la bitácora en {cfg['bitacora_xlsx']}."
    wb = openpyxl.load_workbook(p, data_only=True)
    vistos = {}
    for ws in wb:
        for r in ws.iter_rows(min_row=2, min_col=2, max_col=7, values_only=True):
            if r[0]:
                f = r[0]
                fecha = f.date().isoformat() if hasattr(f, "date") else str(f)
                k = (fecha, one_line(r[1]), r[5])  # la misma sesión puede estar en varias hojas
                if k in vistos:
                    vistos[k][1].append(ws.title)
                else:
                    vistos[k] = [fecha, [ws.title], r]
    filas = sorted(((f, " + ".join(h), r) for f, h, r in vistos.values()), key=lambda x: x[0])
    estados = {}
    for _, _, r in filas:
        m = re.match(r"\s*([A-ZÁÉÍÓÚ]+)", str(r[4] or ""))
        k = m.group(1) if m else "SIN ESTADO"
        estados[k] = estados.get(k, 0) + 1
    out = [f"{len(filas)} sesiones registradas (una sesión copiada en varias hojas cuenta una vez), en orden cronológico "
           f"({filas[0][0]} a {filas[-1][0]}). Estados: " + ", ".join(f"{k} {v}" for k, v in sorted(estados.items())) + ".",
           "Úsalo para no repetir trabajo, respetar lo ya adaptado o corregido y copiar el estilo de registro.", ""]
    for fecha, hoja, r in filas:
        out.append(f"- {fecha} · {hoja} · {r[2]} · {r[5]}: «{one_line(r[1], 260)}» → {one_line(r[3], 200)} | {one_line(r[4], 260)}")
    return "\n".join(out)


def traza_historial(cfg, root):
    p = root / cfg["trazabilidad"]
    if not p.exists():
        return "(todavía no hay filas de trazabilidad; la primera se crea con `hitl.py log`)"
    filas = [l for l in p.read_text(encoding="utf-8").splitlines() if l.startswith("| 20")]
    return (TRAZA_HEAD + "\n".join(filas)) if filas else "(sin filas todavía)"


def bitacora_reciente(cfg, root, repo, n=5):
    p = root / cfg["bitacora_xlsx"]
    if not p.exists():
        return f"> ⚠ No encuentro la bitácora en {cfg['bitacora_xlsx']}."
    wb = openpyxl.load_workbook(p, read_only=False)
    ws = hoja_bitacora(wb, cfg, repo)
    filas = [r for r in ws.iter_rows(min_row=2, min_col=2, max_col=7, values_only=True) if r[0]]
    if not filas:
        return "(la hoja está vacía)"
    out = [f"Hoja «{ws.title}» — {len(filas)} registros. Últimos {min(n, len(filas))} (para no repetir trabajo y copiar el estilo):"]
    for f in filas[-n:]:
        fecha = f[0].date().isoformat() if hasattr(f[0], "date") else f[0]
        out.append(f"- {fecha} · {f[2]} · {f[5]}: «{one_line(f[1], 150)}» → {one_line(f[3], 120)} | {one_line(f[4], 100)}")
    return "\n".join(out)


# ----------------------------------------------------------------------------- trazabilidad
TRAZA_HEAD = (
    "| Fecha | Prompt-ID | Sprint | Autor (rol) | Repo | HU | Rama | Commits | PR | Estado | Hoja · fila bitácora | Plantilla |\n"
    "|---|---|---|---|---|---|---|---|---|---|---|---|\n"
)


def trazar(root, cfg, fila):
    p = root / cfg["trazabilidad"]
    if not p.exists():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("# Trazabilidad de cambios asistidos por IA\n\nRegistro append-only. No editar filas anteriores.\n\n" + TRAZA_HEAD, encoding="utf-8")
    txt = p.read_text(encoding="utf-8")
    if "| Prompt-ID |" not in txt:
        txt += "\n" + TRAZA_HEAD
    if not txt.endswith("\n"):
        txt += "\n"
    p.write_text(txt + "| " + " | ".join(cell(x) for x in fila) + " |\n", encoding="utf-8")


# ----------------------------------------------------------------------------- build (SUPERPROMPT global)
def estado_repos(cfg, root):
    out, head = [], {}
    for r in [x for x in ("infra", "backend", "frontend") if x in cfg["repos"]]:
        p = repo_path(cfg, root, r)
        h = git(p, "rev-parse", "--short", "HEAD") if p and p.exists() else None
        rama = git(p, "rev-parse", "--abbrev-ref", "HEAD") if h else None
        head[r] = h
        out.append(f"- `{r}`: rama `{rama or 'N/D'}`, HEAD `{h or 'N/D'}`")
    return "\n".join(out), head


def tabla_ambito(roles):
    filas = ["| Rol | Repos |", "|---|---|"]
    for rol, repos in roles["ambito"].items():
        filas.append(f"| {rol} | {', '.join(repos)} |")
    return "\n".join(filas)


def sustituir(plantilla, vals):
    out = plantilla
    for k, v in vals.items():
        out = out.replace("{{" + k + "}}", str(v))
    return out


def huella_plantilla(txt, clave="plantilla_version"):
    ver = (re.search(clave + r":\s*([\w.]+)", txt) or [None, "?"])[1]
    return f"{ver} ({hashlib.sha256(txt.encode()).hexdigest()[:8]})"


def construir_superprompt(a, root, cfg):
    roles = json.loads((root / cfg["roles"]).read_text(encoding="utf-8"))
    sprint = resolver_sprint(roles, a.sprint)
    if sprint not in roles["sprints"]:
        die(f"Sprint {sprint} no existe en roles.json")
    plantilla = (root / cfg["plantilla_superprompt"]).read_text(encoding="utf-8")
    docs, contratos = bloque_docs(cfg, root, a.contratos)
    estado, heads = estado_repos(cfg, root)
    _, hs = leer_backlog_completo(root / cfg["backlog_xlsx"])
    bit = bitacora_completa(cfg, root)
    n_bit = (re.search(r"^(\d+) sesiones", bit) or [None, "0"])[1]
    vals = {
        "PLANTILLA_VERSION": huella_plantilla(plantilla),
        "SPRINT": f"{sprint} · {roles['sprints'][sprint]['nombre']}",
        "LIDER": roles["sprints"][sprint]["lider"],
        "HEADS": ", ".join(f"{r}@{h or 'N/D'}" for r, h in heads.items()),
        "N_HU": len(hs) if hs else "N/D",
        "N_BITACORA": n_bit,
        "CONTEXTO_PROYECTO": leer_md(root, cfg["contexto"]),
        "DECISIONES": leer_md(root, cfg["decisiones"]),
        "REGLAS": leer_md(root, cfg["reglas"]),
        "TABLA_ROLES": tabla_roles(roles, sprint, None),
        "ROTACION": rotacion(roles),
        "AMBITO": tabla_ambito(roles),
        "BACKLOG_COMPLETO": bloque_backlog(root / cfg["backlog_xlsx"], None, not a.criterios_resumidos),
        "DOCS_INDEX": docs,
        "CONTRATOS_INLINE": contratos,
        "FUENTES_MD": fuentes_md(cfg, root),
        "GIT_ESTADO": estado,
        "HISTORIAL_GIT": historial_git(cfg, root, a.commits),
        "BITACORA": bit,
        "TRAZA_HISTORIAL": traza_historial(cfg, root),
    }
    return sustituir(plantilla, vals)


def cmd_build(a, root, cfg):
    out = construir_superprompt(a, root, cfg)
    destino = root / cfg["superprompt"]
    pend = sorted(set(re.findall(r"\{\{(\w+)\}\}", out)))
    if a.verificar:
        actual = destino.read_text(encoding="utf-8") if destino.exists() else ""
        if actual == out:
            print("SUPERPROMPT al día.")
            return
        print("SUPERPROMPT DESACTUALIZADO: corre `python tools/hitl/hitl.py build`.")
        sys.exit(1)
    destino.parent.mkdir(parents=True, exist_ok=True)
    cambio = not destino.exists() or destino.read_text(encoding="utf-8") != out
    destino.write_text(out, encoding="utf-8")
    print(f"SUPERPROMPT {'actualizado' if cambio else 'sin cambios'}: {destino}")
    print(f"Tamaño: {len(out):,} caracteres (≈ {len(out) // 3:,} tokens)".replace(",", "."))
    if len(out) > 150_000:
        print("⚠ Muy largo para pegarlo en un chat gratuito: adjúntalo como archivo o usa --criterios-resumidos --contratos indice --commits 20.")
    if pend:
        print("Placeholders sin resolver:", pend)
    if out.count("⚠ POR COMPLETAR"):
        print(f"{out.count('⚠ POR COMPLETAR')} marca(s) '⚠ POR COMPLETAR': faltan fuentes (backlog, bitácora, contexto).")


# ----------------------------------------------------------------------------- sesion (encabezado corto por sesión)
def cmd_sesion(a, root, cfg):
    roles = json.loads((root / cfg["roles"]).read_text(encoding="utf-8"))
    sprint = resolver_sprint(roles, a.sprint)
    if sprint not in roles["sprints"]:
        die(f"Sprint {sprint} no existe en roles.json")
    autor = resolver_persona(roles, a.autor)
    rol = roles["sprints"][sprint]["roles"][autor]
    lider = roles["sprints"][sprint]["lider"]
    hu = resolver_hu(root / cfg["backlog_xlsx"], a.hu) if a.hu else None
    tarea = a.tarea or (Path(a.tarea_file).read_text(encoding="utf-8").strip() if a.tarea_file else None)
    if not tarea:
        die("Falta la tarea: --tarea \"...\" o --tarea-file archivo.txt")
    plantilla = (root / cfg["plantilla_sesion"]).read_text(encoding="utf-8")
    sp = root / cfg["superprompt"]
    sp_h = hashlib.sha256(sp.read_bytes()).hexdigest()[:8] if sp.exists() else "NO GENERADO: corre build"
    ahora = dt.datetime.now()
    pid = f"P-{ahora:%Y%m%d-%H%M}" + (f"-{hu}" if hu else "")
    info = leer_hu(root / cfg["backlog_xlsx"], hu) if hu else None
    gitblk, head = estado_git(cfg, root, a.repo, cfg["rama_base"])
    p_obj = repo_path(cfg, root, a.repo)
    rama = (git(p_obj, "rev-parse", "--abbrev-ref", "HEAD") if p_obj and p_obj.exists() else None) or "N/D"
    ambito = roles["ambito"].get(rol, [])
    aviso = ""
    if a.repo not in ambito:
        aviso = (f"⚠ FUERA DE ROL: en el Sprint {sprint} {autor} es «{rol}» y su ámbito es {ambito or 'N/D'}; "
                 f"trabajar en `{a.repo}` requiere visto bueno de {lider}. Pídelo antes de editar.")
    vals = {
        "PROMPT_ID": pid, "FECHA": ahora.strftime("%Y-%m-%d %H:%M"), "AUTOR": autor, "ROL": rol, "SPRINT": sprint,
        "LIDER": lider, "REPO": a.repo, "RAMA": rama, "HU": hu or "(sin HU: tarea transversal)",
        "AVISO_ROL": aviso or "Dentro del ámbito del rol.", "GIT_ESTADO": gitblk,
        "HU_BLOQUE": bloque_hu(info, hu) if hu else "(tarea sin HU; explica a qué HU o épica aporta)",
        "TAREA": tarea, "SP_HUELLA": sp_h,
        "HECHO": a.hecho or "⚠ POR COMPLETAR: define cuándo se da por terminada (p. ej. criterios CA-x.y cubiertos, pruebas en verde).",
    }
    out = sustituir(plantilla, vals)
    d = root / cfg["salida"]
    d.mkdir(parents=True, exist_ok=True)
    (d / f"SESION_{pid}.md").write_text(out, encoding="utf-8")
    (d / f"{pid}.json").write_text(json.dumps(
        dict(id=pid, fecha=ahora.isoformat(timespec="seconds"), sprint=sprint, autor=autor, rol=rol, repo=a.repo, hu=hu,
             rama=rama, tarea=tarea, herramienta=a.herramienta, head_inicial=head.get(a.repo),
             plantilla=f"SUPERPROMPT {sp_h}"), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Encabezado de sesión: {d / ('SESION_' + pid + '.md')}")
    print(f"Metadatos:            {d / (pid + '.json')}   (los usa el comando log)")
    print(f"Pega primero {cfg['superprompt']} y después este encabezado.")
    if aviso:
        print(aviso)
    if out.count("⚠ POR COMPLETAR"):
        print("Hay marcas '⚠ POR COMPLETAR': complétalas antes de enviarlo.")
    if not sp.exists():
        print("⚠ Aún no existe SUPERPROMPT.md: corre `python tools/hitl/hitl.py build`.")


# ----------------------------------------------------------------------------- log
def cmd_log(a, root, cfg):
    d = root / cfg["salida"]
    meta_p = d / f"{a.id}.json"
    if not meta_p.exists():
        die(f"No existe {meta_p}. Primero corre 'fill'.")
    meta = json.loads(meta_p.read_text(encoding="utf-8"))
    roles = json.loads((root / cfg["roles"]).read_text(encoding="utf-8"))

    # ---- puerta HITL: sin revisión humana explícita no se registra
    if not a.confirmo:
        die("Puerta P5: agrega --confirmo para declarar que una persona revisó el resultado.")
    estado = a.estado.upper()
    if estado not in ESTADOS:
        die(f"--estado debe ser uno de {ESTADOS}")
    if len(one_line(a.notas)) < 15:
        die("--notas debe explicar qué se verificó/adaptó/corrigió (mín. 15 caracteres).")
    resultado = a.resultado or (Path(a.resultado_file).read_text(encoding="utf-8") if a.resultado_file else None)
    if not resultado:
        die("Falta --resultado \"...\" o --resultado-file (usa el bloque RESULTADO_PARA_BITACORA del agente).")
    herramienta = a.herramienta or meta.get("herramienta")
    if not herramienta:
        die("Falta --herramienta (p. ej. \"Gemini\", \"Claude (Sonnet 5.5)\").")
    responsable = resolver_persona(roles, a.responsable) if a.responsable else meta["autor"]

    repo = meta["repo"]
    fecha = dt.datetime.combine(dt.date.today(), dt.time.min)
    fila_xl = [fecha, meta["tarea"], herramienta, one_line(resultado), f"{estado}: {one_line(a.notas)}", responsable]

    p_x = root / cfg["bitacora_xlsx"]
    hay_xlsx = p_x.exists()
    if hay_xlsx:
        wb = openpyxl.load_workbook(p_x)
        ws = hoja_bitacora(wb, cfg, repo)
        ult = ultima_fila(ws)
        nueva = ult + 1
        hoja_txt = f"{ws.title} · fila {nueva}"
    else:
        hoja_txt = f"{cfg['hoja_por_repo'][repo]} · (pegar a mano)"

    pr = a.pr or "—"
    p_git = repo_path(cfg, root, repo)
    commits = "N/D"
    if meta.get("head_inicial") and p_git and p_git.exists():
        c = git(p_git, "log", "--no-merges", "--format=%h", f"{meta['head_inicial']}..HEAD")
        commits = ", ".join(c.split()[:15]) if c else "sin commits nuevos"
    if a.commits:
        commits = a.commits
    traza = [meta["fecha"][:10], meta["id"], meta["sprint"], f"{meta['autor']} ({meta['rol']})", repo, meta["hu"] or "—",
            meta["rama"], commits, pr, estado, hoja_txt, meta["plantilla"]]
    tsv = "\t".join([fecha.strftime("%Y-%m-%d")] + [one_line(x) for x in fila_xl[1:]])

    if a.dry_run:
        print(f"[dry-run] Hoja «{hoja_txt}»:")
        for k, v in zip(("Fecha", "Prompt", "Herramienta", "Resultado", "Validación/Notas", "Responsable"), fila_xl):
            print(f"  {k}: {one_line(v, 160)}")
        print("[dry-run] Trazabilidad:", " | ".join(map(str, traza)))
        return

    if not hay_xlsx:
        trazar(root, cfg, traza)
        print(f"No hay Excel en {cfg['bitacora_xlsx']}: solo se registró la trazabilidad ({cfg['trazabilidad']}).")
        print("Fila para pegar en la hoja «" + cfg["hoja_por_repo"][repo] + "» de su bitácora (columnas Fecha a Responsable, separadas por tabulación):")
        print(tsv)
        return
    shutil.copy2(p_x, p_x.with_suffix(".xlsx.bak"))
    for i, v in enumerate(fila_xl):
        c = ws.cell(nueva, 2 + i)
        c.value = v
        src = ws.cell(ult, 2 + i) if ult >= 2 else None
        if src is not None and src.has_style:
            c._style = copy(src._style)
    if ult >= 2 and ws.row_dimensions[ult].height:
        ws.row_dimensions[nueva].height = ws.row_dimensions[ult].height
    tmp = p_x.with_suffix(".tmp.xlsx")
    wb.save(tmp)
    tmp.replace(p_x)
    trazar(root, cfg, traza)
    print(f"Bitácora: hoja «{ws.title}», fila {nueva}  (copia de seguridad: {p_x.with_suffix('.xlsx.bak').name})")
    print("Si su bitácora de verdad vive en Google Sheets, pegue esta fila allí (Fecha a Responsable, separadas por tabulación):")
    print(tsv)
    print(f"Trazabilidad: {cfg['trazabilidad']}")
    print(f"Si haces commit, agrega el trailer:  Prompt-ID: {meta['id']}")
    print("Recuerda subir TRAZABILIDAD.md en el mismo PR. Cierra el Excel antes de correr este comando.")


# ----------------------------------------------------------------------------- check
def cmd_check(a, root, cfg):
    traza = (root / cfg["trazabilidad"]).read_text(encoding="utf-8") if (root / cfg["trazabilidad"]).exists() else ""
    rx = re.compile(cfg["contract_regex"], re.I)
    mal = 0
    repos = [a.repo] if a.repo else [x for x in ("infra", "backend", "frontend") if x in cfg["repos"]]
    for r in repos:
        p = repo_path(cfg, root, r)
        if not p or not p.exists() or not git(p, "rev-parse", "HEAD"):
            print(f"[{r}] omitido (no es repo git accesible)")
            continue
        base = cfg["rama_base"]
        if not git(p, "rev-parse", "--verify", base):
            print(f"[{r}] omitido (no existe la rama {base})")
            continue
        commits = (git(p, "log", "--no-merges", "--format=%h%x09%B%x1e", f"{base}..HEAD") or "").split("\x1e")
        sin = []
        for blk in filter(str.strip, commits):
            h, _, cuerpo = blk.strip().partition("\t")
            if "Prompt-ID:" not in cuerpo and h not in traza:
                sin.append(h + " " + one_line(cuerpo, 70))
        tocados = [f for f in (git(p, "diff", "--name-only", f"{base}...HEAD") or "").splitlines() if rx.search(f) and f.endswith(".md")]
        print(f"[{r}] commits sin trazabilidad: {len(sin)}")
        for s in sin:
            print("   -", s)
        if tocados:
            print(f"[{r}] contratos modificados (confirma la aprobación P2 en el PR): {', '.join(tocados)}")
        mal += len(sin)
    sys.exit(1 if mal else 0)


# ----------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", help="raíz del repo infra (por defecto, la carpeta que contiene tools/)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("build", help="construye docs/ai/SUPERPROMPT.md (el prompt maestro de TODO el proyecto)")
    b.add_argument("--sprint", help="fuerza el sprint (por defecto: fechas o sprint_actual de roles.json)")
    b.add_argument("--criterios-resumidos", action="store_true", help="solo nombres de criterios en HU no objetivo (más corto)")
    b.add_argument("--contratos", choices=("indice", "resumen", "completo"), default="indice",
                   help="indice: solo la lista (por defecto, para agentes con acceso al repo); resumen: primeros caracteres de cada "
                        "contrato; completo: el texto íntegro (para chats sin acceso al repo; hace el documento muy largo)")
    b.add_argument("--commits", type=int, default=60, help="commits por repo en el historial (por defecto 60)")
    b.add_argument("--verificar", action="store_true", help="no escribe: sale con código 1 si SUPERPROMPT.md está desactualizado")
    b.set_defaults(fn=cmd_build)

    f = sub.add_parser("sesion", help="genera el encabezado corto de una sesión de trabajo (Prompt-ID, rol, HU, tarea)")
    f.add_argument("--autor", required=True, help="quien trabaja (nombre o primer nombre)")
    f.add_argument("--repo", required=True, choices=REPOS)
    f.add_argument("--hu", help="p. ej. HU-009 o 9")
    f.add_argument("--tarea")
    f.add_argument("--tarea-file")
    f.add_argument("--hecho", help="definición de hecho")
    f.add_argument("--sprint")
    f.add_argument("--herramienta", help="herramienta/modelo que se usará (queda en los metadatos)")
    f.set_defaults(fn=cmd_sesion)

    l = sub.add_parser("log", help="registra en bitácora y trazabilidad tras la revisión humana")
    l.add_argument("--id", required=True, help="Prompt-ID generado por fill")
    l.add_argument("--estado", required=True, help="/".join(ESTADOS))
    l.add_argument("--notas", required=True, help="qué verificó/adaptó/corrigió la persona")
    l.add_argument("--resultado")
    l.add_argument("--resultado-file")
    l.add_argument("--herramienta")
    l.add_argument("--responsable")
    l.add_argument("--pr", help="p. ej. #52")
    l.add_argument("--commits", help="sobrescribe la lista de commits detectada")
    l.add_argument("--confirmo", action="store_true", help="una persona revisó el resultado (puerta P5)")
    l.add_argument("--dry-run", action="store_true")
    l.set_defaults(fn=cmd_log)

    c = sub.add_parser("check", help="verifica trazabilidad de los commits de la rama")
    c.add_argument("--repo", choices=("frontend", "backend", "infra"))
    c.set_defaults(fn=cmd_check)

    a = ap.parse_args()
    root = Path(a.root).resolve() if a.root else Path(__file__).resolve().parents[2]
    a.fn(a, root, load_cfg(root))


if __name__ == "__main__":
    main()
