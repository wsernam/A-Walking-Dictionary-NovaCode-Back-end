// Gráficas de rendimiento de la prueba «Entrada sobredimensionada».
//
// Lee reportes-funcionales/entrada-sobredimensionada.json (lo escribe
// pruebas-funcionales/entrada-sobredimensionada.test.js) y genera, sin dependencias, cuatro SVG y
// una tabla en Markdown en docs/seguridad/entrada-sobredimensionada/:
//   1. latencia-texto.svg    — latencia según la longitud del texto, por campo/endpoint;
//   2. latencia-body.svg     — latencia según el tamaño del body, con el límite de 100 kB;
//   3. latencia-anidado.svg  — latencia según los niveles de anidación del JSON;
//   4. latencia-casos.svg    — latencia de cada caso, por endpoint, coloreada por status.
// Los SVG traen modo claro y oscuro (prefers-color-scheme) y un <title> por punto (tooltip).
//
// Uso (desde backend/):  node pruebas-funcionales/soporte/graficas-entrada.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENTRADA = fileURLToPath(new URL('../../reportes-funcionales/entrada-sobredimensionada.json', import.meta.url));
const SALIDA = fileURLToPath(new URL('../../../docs/seguridad/entrada-sobredimensionada/', import.meta.url));

const { fecha, node, resultados } = JSON.parse(readFileSync(ENTRADA, 'utf8'));
mkdirSync(SALIDA, { recursive: true });

// Paleta categórica de referencia (validada: claro y oscuro, adyacentes; 3 primeras también todos-contra-todos).
const SERIES_CLARO = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const SERIES_OSCURO = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c'];

const ANCHO = 780;
const ALTO = 400;
const M = { izq: 64, der: 24, arr: 92, aba: 56 };

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function estilo() {
  const vars = (fondo, t1, t2, muted, grid, eje, series) =>
    `--fondo:${fondo};--t1:${t1};--t2:${t2};--muted:${muted};--grid:${grid};--eje:${eje};` +
    series.map((c, i) => `--s${i + 1}:${c}`).join(';');
  return `<style>
svg{${vars('#fcfcfb', '#0b0b0b', '#52514e', '#898781', '#e1e0d9', '#c3c2b7', SERIES_CLARO)};font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
@media (prefers-color-scheme: dark){svg{${vars('#1a1a19', '#f0efec', '#c3c2b7', '#898781', '#2c2c2a', '#383835', SERIES_OSCURO)}}}
.fondo{fill:var(--fondo)}.titulo{fill:var(--t1);font-size:16px;font-weight:600}.sub{fill:var(--t2);font-size:12px}
.grid{stroke:var(--grid);stroke-width:1}.eje{stroke:var(--eje);stroke-width:1}
.tick{fill:var(--muted);font-size:11px}.etq{fill:var(--t2);font-size:12px}.leyenda{fill:var(--t2);font-size:12px}
.limite{stroke:var(--t2);stroke-width:1;stroke-dasharray:4 3}
</style>`;
}

/** Escala logarítmica en base 10. */
function escalaLog(min, max, desde, hasta) {
  const a = Math.log10(min);
  const b = Math.log10(max);
  return (v) => desde + ((Math.log10(v) - a) / (b - a)) * (hasta - desde);
}
const escalaLineal = (min, max, desde, hasta) => (v) => desde + ((v - min) / (max - min)) * (hasta - desde);

function redondearArriba(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((f) => f * p).find((n) => n >= v);
}

function formatoBytes(v) {
  if (v >= 1024 * 1024) return `${+(v / (1024 * 1024)).toFixed(1)} MB`;
  if (v >= 1024) return `${Math.round(v / 1024)} kB`;
  return `${v} B`;
}

function formatoCantidad(v) {
  if (v >= 1_000_000) return `${v / 1_000_000} M`;
  if (v >= 1_000) return `${v / 1_000} k`;
  return String(v);
}

function encabezado(titulo, subtitulo, series) {
  let svg = `<rect class="fondo" width="${ANCHO}" height="${ALTO}" rx="8"/>`;
  svg += `<text class="titulo" x="${M.izq}" y="28">${esc(titulo)}</text>`;
  svg += `<text class="sub" x="${M.izq}" y="48">${esc(subtitulo)}</text>`;
  // Leyenda en una fila sobre la gráfica (siempre con 2 o más series).
  if (series.length >= 2) {
    let x = M.izq;
    for (const [i, nombre] of series.entries()) {
      svg += `<rect x="${x}" y="62" width="10" height="10" rx="2" fill="var(--s${i + 1})"/>`;
      svg += `<text class="leyenda" x="${x + 15}" y="71">${esc(nombre)}</text>`;
      x += 15 + nombre.length * 6.6 + 18;
    }
  }
  return svg;
}

/**
 * Gráfica de líneas con eje x logarítmico.
 * @param {{ titulo, subtitulo, ejeX, series: { nombre, puntos: { x, y, info }[] }[], ticksX: number[], limite?: { x, texto } }} op
 */
function lineas({ titulo, subtitulo, ejeX, series, ticksX, limite, formato = formatoCantidad }) {
  const xs = series.flatMap((s) => s.puntos.map((p) => p.x));
  const ys = series.flatMap((s) => s.puntos.map((p) => p.y));
  const xMin = Math.min(...ticksX, ...xs);
  const xMax = Math.max(...ticksX, ...xs);
  const yMax = redondearArriba(Math.max(...ys) * 1.1);
  const sx = escalaLog(xMin, xMax, M.izq, ANCHO - M.der);
  const sy = escalaLineal(0, yMax, ALTO - M.aba, M.arr);

  let svg = encabezado(titulo, subtitulo, series.map((s) => s.nombre));
  for (let i = 0; i <= 4; i += 1) {
    const v = (yMax / 4) * i;
    svg += `<line class="grid" x1="${M.izq}" x2="${ANCHO - M.der}" y1="${sy(v)}" y2="${sy(v)}"/>`;
    svg += `<text class="tick" x="${M.izq - 8}" y="${sy(v) + 4}" text-anchor="end">${+v.toFixed(1)}</text>`;
  }
  svg += `<line class="eje" x1="${M.izq}" x2="${ANCHO - M.der}" y1="${sy(0)}" y2="${sy(0)}"/>`;
  for (const t of ticksX) {
    svg += `<text class="tick" x="${sx(t)}" y="${ALTO - M.aba + 18}" text-anchor="middle">${formato(t)}</text>`;
  }
  svg += `<text class="etq" x="${(M.izq + ANCHO - M.der) / 2}" y="${ALTO - 14}" text-anchor="middle">${esc(ejeX)} (escala logarítmica)</text>`;
  svg += `<text class="etq" transform="translate(16 ${(M.arr + ALTO - M.aba) / 2}) rotate(-90)" text-anchor="middle">Latencia (ms)</text>`;
  if (limite) {
    svg += `<line class="limite" x1="${sx(limite.x)}" x2="${sx(limite.x)}" y1="${M.arr}" y2="${sy(0)}"/>`;
    svg += `<text class="etq" x="${sx(limite.x) + 6}" y="${M.arr + 12}">${esc(limite.texto)}</text>`;
  }
  for (const [i, s] of series.entries()) {
    const color = `var(--s${i + 1})`;
    const d = s.puntos.map((p, j) => `${j ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
    svg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
    for (const p of s.puntos) {
      svg += `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4" fill="${color}" stroke="var(--fondo)" stroke-width="2">` +
        `<title>${esc(`${s.nombre} · ${formato(p.x)} → ${p.info} · ${p.y} ms`)}</title></circle>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" width="${ANCHO}" height="${ALTO}" role="img" aria-label="${esc(titulo)}">${estilo()}${svg}</svg>`;
}

/** Diagrama de puntos: una fila por endpoint, x = latencia (log), color = clase de status. */
function puntosPorCaso() {
  const clases = [
    { nombre: '200 (consulta válida)', test: (s) => s >= 200 && s < 300 },
    { nombre: '400 (validación)', test: (s) => s === 400 },
    { nombre: '413 / 431 (tamaño)', test: (s) => s === 413 || s === 431 },
  ];
  const filas = [...new Set(resultados.map((r) => r.endpoint))];
  const alto = M.arr + filas.length * 22 + M.aba;
  const izq = 300;
  const ms = resultados.map((r) => r.ms);
  const sx = escalaLog(0.5, redondearArriba(Math.max(...ms) * 1.2), izq, ANCHO - M.der);
  const ticks = [0.5, 1, 2, 5, 10, 20, 50, 100].filter((t) => t <= redondearArriba(Math.max(...ms) * 1.2));
  const yFila = (i) => M.arr + 11 + i * 22;

  let svg = `<rect class="fondo" width="${ANCHO}" height="${alto}" rx="8"/>`;
  svg += `<text class="titulo" x="24" y="28">Latencia de cada caso, por endpoint</text>`;
  svg += `<text class="sub" x="24" y="48">${resultados.length} casos · ningún 5xx · /health respondió 200 después de todos</text>`;
  let xl = 24;
  for (const [i, c] of clases.entries()) {
    svg += `<rect x="${xl}" y="62" width="10" height="10" rx="5" fill="var(--s${i + 1})"/>`;
    svg += `<text class="leyenda" x="${xl + 15}" y="71">${esc(c.nombre)}</text>`;
    xl += 15 + c.nombre.length * 6.6 + 18;
  }
  for (const t of ticks) {
    svg += `<line class="grid" x1="${sx(t)}" x2="${sx(t)}" y1="${M.arr}" y2="${alto - M.aba}"/>`;
    svg += `<text class="tick" x="${sx(t)}" y="${alto - M.aba + 18}" text-anchor="middle">${t}</text>`;
  }
  svg += `<text class="etq" x="${(izq + ANCHO - M.der) / 2}" y="${alto - 14}" text-anchor="middle">Latencia (ms, escala logarítmica)</text>`;
  for (const [i, fila] of filas.entries()) {
    svg += `<text class="etq" x="${izq - 12}" y="${yFila(i) + 4}" text-anchor="end">${esc(fila)}</text>`;
    svg += `<line class="grid" x1="${izq}" x2="${ANCHO - M.der}" y1="${yFila(i)}" y2="${yFila(i)}" stroke-dasharray="1 3"/>`;
  }
  for (const r of resultados) {
    const k = clases.findIndex((c) => c.test(r.status));
    const cx = sx(Math.max(r.ms, 0.5)).toFixed(1);
    svg += `<circle cx="${cx}" cy="${yFila(filas.indexOf(r.endpoint))}" r="5" fill="var(--s${k + 1})" stroke="var(--fondo)" stroke-width="2">` +
      `<title>${esc(`${r.caso} → ${r.status}${r.code ? ` ${r.code}` : ''} · ${r.ms} ms`)}</title></circle>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${alto}" width="${ANCHO}" height="${alto}" role="img" aria-label="Latencia de cada caso, por endpoint">${estilo()}${svg}</svg>`;
}

const punto = (r) => ({ x: r.tamano, y: r.ms, info: `${r.status}${r.code ? ` ${r.code}` : ''}` });
const serie = (nombre, filtro) => ({ nombre, puntos: resultados.filter(filtro).map(punto).sort((a, b) => a.x - b.x) });

const graficas = {
  'latencia-texto.svg': lineas({
    titulo: 'Latencia según la longitud del texto',
    subtitulo: 'Más de 150 caracteres → 400 FIELD_TOO_LONG; en la URL, más de ~16 kB lo corta Node con 431',
    ejeX: 'Longitud del campo (caracteres)',
    ticksX: [100, 1_000, 10_000, 100_000],
    series: [
      serie('palabra', (r) => r.endpoint === 'POST /decks/:id/cards (palabra)'),
      serie('ejemplo', (r) => r.endpoint === 'POST /decks/:id/cards (ejemplo)'),
      serie('autor', (r) => r.endpoint === 'POST /decks (autor)'),
      serie('check-duplicate', (r) => r.endpoint === 'POST /cards/check-duplicate (palabra)'),
      serie('family/:word', (r) => r.endpoint === 'GET /enrichment/family/:word'),
      serie('dictionary?q', (r) => r.endpoint === 'GET /dictionary?q='),
    ],
  }),
  'latencia-body.svg': lineas({
    titulo: 'Latencia según el tamaño del body JSON',
    subtitulo: 'Hasta 100 kB llega al controlador (400); más grande, express.json responde 413 sin leerlo entero',
    ejeX: 'Tamaño del body (bytes)',
    ticksX: [10 * 1024, 100 * 1024, 1024 * 1024, 10 * 1024 * 1024],
    formato: formatoBytes,
    limite: { x: 100 * 1024, texto: 'límite 100 kB' },
    series: [
      serie('check-duplicate (con sesión)', (r) => r.endpoint === 'POST /cards/check-duplicate'),
      serie('auth/google (sin sesión)', (r) => r.endpoint === 'POST /auth/google (sin sesión)'),
    ],
  }),
  'latencia-anidado.svg': lineas({
    titulo: 'Latencia según la anidación del JSON',
    subtitulo: 'Todos los casos responden 400; la latencia crece con el tamaño del body, no se dispara',
    ejeX: 'Niveles de anidación',
    ticksX: [10, 100, 1_000, 10_000, 100_000],
    series: [
      serie('arreglo [[[…]]]', (r) => r.endpoint === 'POST /cards/check-duplicate (arreglo)'),
      serie('objeto {"a":{…}}', (r) => r.endpoint === 'POST /cards/check-duplicate (objeto)'),
    ],
  }),
  'latencia-casos.svg': puntosPorCaso(),
};

for (const [archivo, svg] of Object.entries(graficas)) writeFileSync(`${SALIDA}${archivo}`, svg);

// Vista de tabla (accesibilidad y lectura sin las gráficas).
const filas = resultados
  .map((r) => `| ${r.grupo} | ${r.caso} | \`${r.endpoint}\` | ${r.status} | ${r.code ?? '—'} | ${r.ms} | ${r.vivo ? 'sí' : '**NO**'} |`)
  .join('\n');
const max = resultados.reduce((a, r) => (r.ms > a.ms ? r : a));
const tabla = `<!-- Generado por backend/pruebas-funcionales/soporte/graficas-entrada.mjs; no editar a mano. -->
# Resultados por caso — entrada sobredimensionada

Ejecución: ${fecha} · Node ${node} · ${resultados.length} casos · 5xx: ${resultados.filter((r) => r.status >= 500).length} · caso más lento: ${max.caso} (${max.ms} ms)

| Grupo | Caso | Endpoint | Status | code | ms | /health después |
|---|---|---|---|---|---|---|
${filas}
`;
writeFileSync(`${SALIDA}resultados.md`, tabla);
console.log(`Gráficas y tabla generadas en ${SALIDA}`);
