// "Una ruta sin permiso declarado no debería existir" (documento Matriz RBAC, sección 9).
//
// Compara las rutas realmente montadas en src/app.js con datos/matriz-rbac.json, en las dos
// direcciones: toda ruta del backend debe estar en la matriz y toda fila de la matriz debe existir
// en el backend. No hace peticiones HTTP: lee la tabla de rutas de Express en un proceso aparte.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const MATRIZ = JSON.parse(readFileSync(new URL('./datos/matriz-rbac.json', import.meta.url), 'utf8'));

/** "/decks/{id}/estado" y "/decks/:id/estado" quedan como "/decks/:p/estado". */
function normalizar(ruta) {
  return ruta
    .replace(/\{[^}]+\}/g, ':p')
    .replace(/:[A-Za-z_]+/g, ':p')
    .replace(/\/+$/, '');
}

function rutasMontadas() {
  const salida = execFileSync(process.execPath, [fileURLToPath(new URL('./soporte/listar-rutas.mjs', import.meta.url))], {
    encoding: 'utf8',
    env: { ...process.env, DISABLE_AUTH: 'false' },
  });
  return new Set(JSON.parse(salida).map(([metodo, ruta]) => `${metodo} ${normalizar(ruta)}`));
}

describe('Matriz RBAC — cobertura de rutas', () => {
  const montadas = rutasMontadas();
  const enMatriz = new Set(MATRIZ.endpoints.map((e) => `${e.metodo} ${normalizar(e.ruta)}`));

  it('se detectan las rutas del backend', () => {
    expect(montadas.size).toBeGreaterThan(50);
  });

  it('toda ruta montada en app.js está en la matriz', () => {
    const faltantes = [...montadas].filter((r) => !enMatriz.has(r));
    expect(faltantes, `rutas sin permiso declarado en matriz-rbac.json: ${faltantes.join(', ')}`).toEqual([]);
  });

  it('toda fila de la matriz existe en el backend', () => {
    const sobrantes = [...enMatriz].filter((r) => !montadas.has(r));
    expect(sobrantes, `filas de la matriz sin ruta en el backend: ${sobrantes.join(', ')}`).toEqual([]);
  });
});