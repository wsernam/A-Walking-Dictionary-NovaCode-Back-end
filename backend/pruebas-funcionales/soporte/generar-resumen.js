// Genera el resumen en Markdown de una ejecución de la suite funcional.
//
// Lee los resultados en JSON (Vitest o Playwright, se detecta solo) y la lista de criterios de
// aceptación en alcance, saca el CA del nombre de cada prueba ("CA-1.2.3 ...") y calcula:
// totales, tasa de éxito, cobertura de CA, pruebas por HU y las que fallaron.
//
// Uso:
//   node generar-resumen.js --resultados <json> --criterios <json> --suite "<nombre>" --salida <md>
// En GitHub Actions además lo agrega a la página de la ejecución ($GITHUB_STEP_SUMMARY).
// No hace fallar el job: si no hay resultados, lo dice en el resumen.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pares, valor, i, todos) => (i % 2 === 0 ? [...pares, [valor.replace(/^--/, ''), todos[i + 1]]] : pares), [])
);
const SUITE = args.suite || 'Pruebas funcionales';

const ESTADO = { PASA: 'pasa', FALLA: 'falla', CONOCIDO: 'error conocido', PENDIENTE: 'pendiente' };
const RE_CA = /CA-\d+\.\d+\.\d+/g;
const RE_HU = /HU-\d+\.\d+/;

/** Vitest (reporter "json"): testResults[].assertionResults[]. */
function desdeVitest(json) {
  const pruebas = json.testResults.flatMap((archivo) =>
    archivo.assertionResults.map((p) => ({
      nombre: p.title,
      contexto: (p.ancestorTitles || []).join(' › '),
      estado: p.status === 'passed' ? ESTADO.PASA : p.status === 'failed' ? ESTADO.FALLA : ESTADO.PENDIENTE,
      error: (p.failureMessages || [])[0],
    }))
  );
  const fin = Math.max(...json.testResults.map((a) => a.endTime || 0));
  return { pruebas, duracionMs: fin && json.startTime ? fin - json.startTime : null };
}

/** Playwright (reporter "json"): suites anidadas con specs[].tests[]. */
function desdePlaywright(json) {
  const pruebas = [];
  const recorrer = (suite, titulos) => {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests) {
        const ultimo = t.results[t.results.length - 1];
        let estado;
        if (t.status === 'skipped') estado = ESTADO.PENDIENTE;
        else if (t.status === 'expected' && t.expectedStatus === 'failed') estado = ESTADO.CONOCIDO;
        else if (t.status === 'expected' || t.status === 'flaky') estado = ESTADO.PASA;
        else estado = ESTADO.FALLA;
        pruebas.push({ nombre: spec.title, contexto: titulos.join(' › '), estado, error: ultimo?.error?.message });
      }
    }
    for (const hija of suite.suites || []) recorrer(hija, hija.title.endsWith('.js') ? titulos : [...titulos, hija.title]);
  };
  json.suites.forEach((s) => recorrer(s, []));
  return { pruebas, duracionMs: json.stats?.duration ?? null };
}

function leerResultados(archivo) {
  if (!archivo || !existsSync(archivo)) return null;
  try {
    const json = JSON.parse(readFileSync(archivo, 'utf8').replace(new RegExp('^' + String.fromCharCode(0xfeff)), ''));
    return json.testResults ? desdeVitest(json) : desdePlaywright(json);
  } catch (error) {
    console.error(`No se pudo leer ${archivo}: ${error.message}`);
    return null;
  }
}

/** Estado de un CA según sus pruebas: falla > error conocido > cubierto > pendiente > sin prueba. */
function estadoCa(estados) {
  if (estados.includes(ESTADO.FALLA)) return '❌ falla';
  if (estados.includes(ESTADO.CONOCIDO)) return '⚠️ error conocido';
  if (estados.includes(ESTADO.PASA)) return '✅ cubierto';
  if (estados.includes(ESTADO.PENDIENTE)) return '⏸️ pendiente';
  return '⬜ sin prueba';
}

const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1).replace('.', ',')} %` : '—');
// Códigos de color de la terminal (ESC[...m) que traen los mensajes de error.
const COLOR_TERMINAL = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const limpiar = (texto) => String(texto ?? '').replace(COLOR_TERMINAL, '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

function generar() {
  const lineas = [`## ${SUITE}`, ''];
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) {
    const run = `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
    lineas.push(`Rama \`${process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME}\` · commit \`${(process.env.GITHUB_SHA || '').slice(0, 7)}\` · [ejecución](${run}) · ${new Date().toISOString().slice(0, 10)}`, '');
  }

  const resultados = leerResultados(args.resultados);
  if (!resultados) {
    lineas.push('> ⚠️ No se encontraron resultados: la suite no llegó a ejecutarse. Revisa los pasos anteriores del job.', '');
    return lineas.join('\n');
  }

  const { pruebas, duracionMs } = resultados;
  const cuenta = (estado) => pruebas.filter((p) => p.estado === estado).length;
  const pasan = cuenta(ESTADO.PASA);
  const fallan = cuenta(ESTADO.FALLA);
  const conocidos = cuenta(ESTADO.CONOCIDO);
  const pendientes = cuenta(ESTADO.PENDIENTE);
  const ejecutadas = pasan + fallan + conocidos;

  // Cobertura de CA: cruza los CA de los nombres de las pruebas con los CA en alcance
  const criterios = existsSync(args.criterios || '') ? JSON.parse(readFileSync(args.criterios, 'utf8')) : [];
  const porCa = new Map(criterios.map((c) => [c.ca, []]));
  for (const p of pruebas) {
    for (const ca of new Set(p.nombre.match(RE_CA) || [])) porCa.get(ca)?.push(p.estado);
  }
  const matriz = criterios.map((c) => ({ ...c, estado: estadoCa(porCa.get(c.ca)) }));
  const probados = matriz.filter((c) => /cubierto|error conocido|falla/.test(c.estado)).length;

  lineas.push(
    fallan === 0 ? '**✅ Todas las pruebas ejecutadas pasan o son errores conocidos.**' : `**❌ ${fallan} prueba(s) fallan.**`,
    '',
    '| Ejecutadas | Pasan | Errores conocidos | Fallan | Pendientes | Tasa de éxito | Cobertura de CA | Duración |',
    '|---|---|---|---|---|---|---|---|',
    `| ${ejecutadas} | ${pasan} | ${conocidos} | ${fallan} | ${pendientes} | **${pct(pasan, ejecutadas)}** | **${probados} / ${criterios.length} (${pct(probados, criterios.length)})** | ${duracionMs != null ? `${(duracionMs / 1000).toFixed(1).replace('.', ',')} s` : '—'} |`,
    '',
    '<sub>Tasa de éxito = pasan ÷ ejecutadas. Cobertura de CA = criterios con al menos una prueba ÷ criterios en alcance. ' +
      'Los errores conocidos son pruebas marcadas como fallo esperado por un defecto abierto; las pendientes no se ejecutan.</sub>',
    ''
  );

  if (fallan > 0) {
    lineas.push('### Pruebas que fallan', '', '| Prueba | Error |', '|---|---|');
    for (const p of pruebas.filter((x) => x.estado === ESTADO.FALLA)) {
      lineas.push(`| ${limpiar(p.nombre)} | ${limpiar(p.error).slice(0, 200)} |`);
    }
    lineas.push('');
  }

  // Pruebas por HU (la HU sale del primer CA del nombre, o del título del grupo)
  const porHu = new Map();
  for (const p of pruebas) {
    const ca = (p.nombre.match(RE_CA) || [])[0];
    const hu = ca ? `HU-${ca.slice(3).split('.').slice(0, 2).join('.')}` : (p.nombre.match(RE_HU) || p.contexto.match(RE_HU) || ['Otras'])[0];
    const fila = porHu.get(hu) || { pasan: 0, fallan: 0, conocidos: 0, pendientes: 0 };
    if (p.estado === ESTADO.PASA) fila.pasan += 1;
    if (p.estado === ESTADO.FALLA) fila.fallan += 1;
    if (p.estado === ESTADO.CONOCIDO) fila.conocidos += 1;
    if (p.estado === ESTADO.PENDIENTE) fila.pendientes += 1;
    porHu.set(hu, fila);
  }
  const orden = [...porHu.keys()].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  lineas.push('### Pruebas por historia de usuario', '', '| HU | Pasan | Errores conocidos | Fallan | Pendientes |', '|---|---|---|---|---|');
  for (const hu of orden) {
    const f = porHu.get(hu);
    lineas.push(`| ${hu} | ${f.pasan} | ${f.conocidos} | ${f.fallan} | ${f.pendientes} |`);
  }
  lineas.push('');

  if (matriz.length) {
    const sinCubrir = matriz.filter((c) => /pendiente|sin prueba/.test(c.estado));
    if (sinCubrir.length) {
      lineas.push('### Criterios sin prueba automática', '');
      for (const c of sinCubrir) lineas.push(`- **${c.ca}** ${c.criterio} — ${c.estado}`);
      lineas.push('');
    }
    lineas.push('<details><summary>Matriz de trazabilidad (todos los criterios)</summary>', '', '| CA | HU | Criterio | Estado |', '|---|---|---|---|');
    for (const c of matriz) lineas.push(`| ${c.ca} | ${c.hu} | ${c.criterio} | ${c.estado} |`);
    lineas.push('', '</details>', '');
  }

  return lineas.join('\n');
}

const markdown = generar();
if (args.salida) {
  mkdirSync(path.dirname(args.salida), { recursive: true });
  writeFileSync(args.salida, `# Resumen de pruebas\n\n${markdown}`);
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
console.log(markdown);
