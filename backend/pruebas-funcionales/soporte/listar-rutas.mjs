// Imprime en JSON las rutas montadas en src/app.js: [["GET", "/decks/:id"], ...] (sin /api/v1).
// Se ejecuta en un proceso aparte (lo llama rbac-cobertura.test.js) porque importar app.js dentro
// de Vitest altera Promise y rompe el ejecutor de pruebas.

import app from '../../src/app.js';

/** Convierte la expresión regular de un router montado ("^\/api\/v1\/decks\/?(?=\/|$)") en "/api/v1/decks". */
function prefijoDe(capa) {
  return capa.regexp.source
    .replace('^', '')
    .replace('\\/?(?=\\/|$)', '')
    .replace(/\\\//g, '/');
}

const rutas = [];
for (const capa of app._router.stack) {
  if (capa.name !== 'router') continue;
  const prefijo = prefijoDe(capa).replace(/^\/api\/v1/, '');
  for (const subcapa of capa.handle.stack) {
    if (!subcapa.route) continue;
    for (const metodo of Object.keys(subcapa.route.methods)) {
      const ruta = subcapa.route.path === '/' ? '' : subcapa.route.path;
      rutas.push([metodo.toUpperCase(), `${prefijo}${ruta}` || '/']);
    }
  }
}

console.log(JSON.stringify(rutas));
process.exit(0);