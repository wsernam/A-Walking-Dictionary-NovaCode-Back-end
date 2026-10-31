# SUPERPROMPT + HITL · guía

## La idea en una línea
Un solo archivo, **`docs/ai/SUPERPROMPT.md`**, contiene todo el proyecto (memoria, decisiones, reglas, roles, backlog completo, markdowns y contratos de los tres repos, historial git, bitácora completa, trazabilidad). **Se construye solo**; las sesiones de trabajo son un encabezado corto que se pega después.

```
 FUENTES (se editan a mano o ya existen)                CONSTRUCCIÓN AUTOMÁTICA             USO CON HUMANO EN EL CIRCUITO
 ───────────────────────────────────────                ───────────────────────             ─────────────────────────────
 CONTEXTO_PROYECTO.md  DECISIONES.md  REGLAS.md  ─┐
 roles.json (sprint, roles, rotación)             │
 Backlog_HU.xlsx (épicas, HU, criterios)          ├──►  hitl.py build  ──►  SUPERPROMPT.md  ──┐
 README + docs/*.md + contratos (los repos)         │     (a mano, hook o                       ├─► asistente (chat o agente)
 git log (3 repos)                                │      GitHub Actions)                      │      P1 plan ─ P2 contrato ─ P3 diff
 Bitacora_de_prompts.xlsx + TRAZABILIDAD.md      ─┘                                           │      P4 verificación ─ P5 registro
                                                        hitl.py sesion  ──►  SESION_<id>.md ──┘            │
                                                        (persona, rol, HU, tarea)                          ▼
                                                                                              persona revisa y decide
                                                                                                           │
                          Bitacora_de_prompts.xlsx  ◄── hitl.py log --confirmo ◄───────────────────────────┘
                          TRAZABILIDAD.md           ◄──  (solo con revisión humana explícita)
```

## Qué hace el código y qué una persona
| Automático | Humano |
|---|---|
| `build`: reconstruye el SUPERPROMPT desde las fuentes | Mantiene las fuentes de fondo (contexto, decisiones, reglas, roles) |
| `sesion`: Prompt-ID, rol de la persona en el sprint, verificación de ámbito, HU y criterios, estado de la rama | Escribe la tarea y la definición de hecho |
| `log`: escribe la fila en la bitácora Excel (hoja correcta, formato, lista de responsables) y en `TRAZABILIDAD.md` | Aprueba P1, P2 (líder del sprint), P3; decide VALIDADO, ADAPTADO, CORREGIDO o RECHAZADO y escribe qué verificó |
| `check`: commits sin Prompt-ID ni fila de trazabilidad; contratos modificados | Revisa el diff, hace commit y abre el PR |
| GitHub Actions: reconstruye el SUPERPROMPT y abre un PR | Revisa y fusiona ese PR |

El código **sí obliga**: `log` se niega sin `--confirmo`, sin estado válido y sin notas de revisión. **No** puede obligar a que el asistente respete las puertas P1 a P4: eso depende de que la persona no avance sin leer.

## Dónde instalarlo (verificado contra los repos reales)
Repos: backend `wsernam/A-Walking-Dictionary-NovaCode-Back-end`, frontend `knnsand/A-Walking-Dictionary-NovaCode-Front-end` e infra `wsernam/walking-dictionary-infra` (los tres públicos; rama por defecto `main`; backend y frontend tienen `develop`, infra solo `main` y el equipo ya decidió el 2026-10-17 no poner CI allí).

**El kit se instala en el repo BACKEND**, porque ahí ya viven `CLAUDE.md` (protocolo HITL, DER oficial, discrepancias y decisiones del equipo), los contratos del back y los workflows de CI. Cámbienlo solo si prefieren otro anfitrión (ver al final).

```
A-Walking-Dictionary-NovaCode-Back-end/          ← raíz del repo backend
├── .github/workflows/
│   ├── backend-tests.yml  funcionales.yml  owasp-security.yml  codeql.yml   (ya existen, no se tocan)
│   └── superprompt.yml                          ← NUEVO
├── .gitignore                                   ← agregar 3 líneas (abajo)
├── CLAUDE.md                                    ← ya existe; el script lo lee, no lo modifica
├── docs/
│   ├── CONTRATO_*.md  FLUJO_*.md  codigos-error.md …   (ya existen)
│   └── ai/                                      ← NUEVA carpeta
│       ├── SUPERPROMPT.md                       ← lo genera el script
│       ├── SUPERPROMPT.plantilla.md  SESION.plantilla.md
│       ├── CONTEXTO_PROYECTO.md  DECISIONES.md  REGLAS.md  roles.json  README_HITL.md
│       ├── Backlog_HU.xlsx  Bitacora_de_prompts.xlsx
│       └── TRAZABILIDAD.md                      ← la crea el script
├── tools/hitl/                                  ← NUEVA carpeta (hitl.py, hitl.config.json, requirements.txt, hooks/)
├── backend/  (código; no se toca)   init.sql  seed.sql  docker-compose.yml  sonar-project.properties …
```
- `sonar-project.properties` analiza solo `backend/src` y CodeQL solo JavaScript, así que `tools/` (Python) y `docs/ai/` no afectan SonarQube ni CodeQL; el lint corre dentro de `backend/`, tampoco los toca.
- Agregar al `.gitignore` del backend: `docs/ai/generated/`, `docs/ai/*.bak` y `_repos/`.

En su computador las carpetas de los repos deben ser **hermanas** y llamarse como el repo (así lo espera `hitl.config.json`):
```
proyecto/
├── A-Walking-Dictionary-NovaCode-Back-end/      ← aquí se corre python tools/hitl/hitl.py
├── A-Walking-Dictionary-NovaCode-Front-end/
└── walking-dictionary-infra/                    ← opcional
```
Si sus carpetas se llaman distinto, cambien `repos` en `tools/hitl/hitl.config.json` (o definan la variable de entorno `HITL_REPOS`).

### Lo que hay que tener presente
1. **Los repos son públicos.** Todo lo que se commitee en `docs/ai/` (el SUPERPROMPT, la bitácora Excel, el backlog) será público. En modo normal el SUPERPROMPT no copia el texto de los contratos (solo su índice) ni contiene secretos; con `--contratos completo` copia, por ejemplo, las cuentas de prueba del contrato de autenticación (que ya son públicas en el repo). Revisen el PR antes de fusionarlo.
2. **Backlog y bitácora son Excel.** El script los lee de `docs/ai/`. Si el original vive en Google Sheets o en un Drive, hay que subir una copia exportada al repo cada vez que cambie (o `build` mostrará un aviso y trabajará sin ellos). Si no quieren versionar la bitácora, no la copien: `log` registra la trazabilidad en `TRAZABILIDAD.md` e imprime la fila lista para pegar en su hoja.
3. **Dos nombres para cada HU.** El Excel usa `HU-009`; `CLAUDE.md` y varias ramas usan `HU-3.3`. El script entiende ambos (`--hu 9`, `--hu HU-009` o `--hu HU-3.3`) y el SUPERPROMPT trae la equivalencia en cada HU.
4. **`D-nn` y `DP-nn`.** Los `D-nn` son del `CLAUDE.md` del backend (discrepancias y decisiones); los `DP-nn` son de `docs/ai/DECISIONES.md`. No se mezclan.
5. **`CLAUDE.md` sigue mandando en el backend.** Su protocolo (plan antes de código, confirmación humana para migraciones, `init.sql`, endpoints, commit, push, dependencias…) se copia al SUPERPROMPT y se suma a las puertas P1 a P5: aplica el más estricto.

## Instalación (una vez)
1. Desde `develop` del backend, cree la rama `feature/superprompt-hitl`, descomprima el kit en la raíz y copie a `docs/ai/` el `Backlog_HU.xlsx` y la bitácora (como `Bitacora_de_prompts.xlsx`).
2. `pip install -r tools/hitl/requirements.txt` y pruebe: `python tools/hitl/hitl.py build` (debe terminar en «SUPERPROMPT actualizado» y sin «carpeta no encontrada»).
3. En `docs/ai/roles.json` confirme `sprint_actual` (viene en 3, deducido de las ramas) y la rotación de roles.
4. Abra PR hacia `develop` (como dice su Gitflow) y pida la revisión de un compañero.
5. Configuración del repo backend en GitHub (la hace quien tenga permisos de administrador, hoy `wsernam`): Settings → Actions → General → Workflow permissions: «Read and write permissions» y marcar «Allow GitHub Actions to create and approve pull requests». Sin eso el flujo no puede abrir el PR.
6. Los PR que abre un flujo con el token por defecto no disparan otros workflows (backend-tests, CodeQL…); si `develop` exige esos checks para fusionar, creen un secreto `PR_TOKEN` (token personal con permiso de escritura en el repo) y el workflow lo usará solo.
7. El cron y el botón manual aparecen cuando `superprompt.yml` llega a `main` (con el siguiente `release/sprintX`); mientras tanto el flujo corre solo cuando alguien cambia `docs/ai/**` o `tools/hitl/**` en `develop`.
8. Opcional: el flujo clona también infra (rama `main`); si ya no lo usan, borren ese paso y la entrada `infra` de `HITL_REPOS`.

Si prefieren el frontend como anfitrión, es el mismo árbol: pasen `repos.frontend` a `"."` y `repos.backend` a la carpeta hermana, y ajusten el workflow. Ojo: el CI del front corre SonarQube y E2E, y Vercel construye cada PR.

## Tres formas de automatizar `build` (elijan una o combínenlas)
1. **A mano:** `python tools/hitl/hitl.py build` antes de cada sesión. `--verificar` dice si está desactualizado.
2. **Hook local:** copia `tools/hitl/hooks/post-merge` a `.git/hooks/post-merge` del repo backend; se reconstruye con cada `git pull`.
3. **GitHub Actions (recomendada):** `.github/workflows/superprompt.yml` lo reconstruye cada lunes, al cambiar `docs/ai/**` en `develop` o con el botón manual, y **abre un PR** (`bot/superprompt`) para que una persona lo revise. Nunca hace push directo. Cambios en backend o frontend no la disparan por sí solos: usen el botón manual o el cron semanal.

## Flujo de una sesión
```bash
# 1. Encabezado corto de la sesión (el SUPERPROMPT ya está construido)
python tools/hitl/hitl.py sesion --autor manuela --repo frontend --hu HU-009 \
  --tarea "Agregar botón de exportar PDF por quiz en el panel docente" \
  --hecho "CA-9.2 cubierto; npx vitest run y npx eslint en verde" --herramienta "Gemini"
# -> docs/ai/generated/SESION_P-AAAAMMDD-HHMM-HU-009.md

# 2. En el asistente: pega SUPERPROMPT.md y luego el SESION_... ; trabaja P1 -> P2 (si aplica) -> P3 -> P4.
#    Al cerrar pide el bloque RESULTADO_PARA_BITACORA.

# 3. Después de revisar tú misma el resultado (cierra el Excel antes):
python tools/hitl/hitl.py log --id P-AAAAMMDD-HHMM-HU-009 --estado VALIDADO \
  --notas "npx vitest run: N pruebas aprobadas; revisión manual en vista docente" \
  --resultado "Botón de exportación por quiz en ListaQuices.jsx" --pr "#53" --confirmo
# Usa --dry-run primero para ver la fila sin escribir.

# 4. En el commit, agrega la línea final:  Prompt-ID: P-AAAAMMDD-HHMM-HU-009
# 5. Antes del PR:
python tools/hitl/hitl.py check          # sale con código 1 si hay commits sin trazabilidad
```
Sube `docs/ai/TRAZABILIDAD.md` en el mismo PR. Si el asistente propuso `decisiones_nuevas`, agréguenlas a `docs/ai/DECISIONES.md`.

## Tamaño
Con los repos reales, el modo por defecto mide ≈ 120.000 caracteres (≈ 40.000 tokens): `--contratos indice` (solo la lista de contratos). `--contratos resumen` sube a ≈ 155.000 y `--contratos completo` a ≈ 220.000 (útil solo para un chat sin acceso a los repos). Para algo más corto: `--criterios-resumidos --commits 20`, o adjunten el archivo en vez de pegarlo.

## Notas
- `--repo` acepta `frontend`, `backend`, `infra` o `docs` (esta última escribe en la hoja «Presentaciones - Documentos»).
- Si la persona trabaja fuera del ámbito de su rol en el sprint, el encabezado de sesión lo marca y pide visto bueno del líder.
- `TRAZABILIDAD.md` es append-only y se fusiona bien en git; el Excel es binario, así que si dos personas lo editan a la vez habrá conflicto: dejen que lo edite una sola persona por PR y usen `TRAZABILIDAD.md` como fuente reconstruible.
- Para que el SUPERPROMPT no cambie sin motivo, no lleva fecha: solo cambia cuando cambian sus fuentes. Construyanlo desde `develop` actualizado.
- Quien lo construya en su PC ve la rama local de cada repo; el del Actions siempre ve `develop`.
- Si cambian la plantilla, súbanle `plantilla_version`; la huella queda en cada fila de trazabilidad.
