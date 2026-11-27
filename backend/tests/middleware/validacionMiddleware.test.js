// Pruebas unitarias de src/middleware/validacionMiddleware.js (rechazo del byte nulo).
// Origen: escaneo activo de OWASP ZAP por rol (run #42). Seguridad transversal, sin CA del backlog.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { contieneByteNulo, rechazarByteNulo } from '../../src/middleware/validacionMiddleware.js';
import { crearRes, respuesta } from '../helpers/http.js';

function peticion({ body, query = {}, path = '/api/v1/decks' } = {}) {
  return { method: 'POST', path, ip: '10.0.0.5', body, query, headers: {} };
}

let warn;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe('contieneByteNulo', () => {
  it.each([
    ['un texto', 'auto\u0000r'],
    ['un objeto', { autor: 'x\u0000' }],
    ['un arreglo', { intereses: ['ok', 'x\u0000'] }],
    ['un objeto anidado', { a: { b: { c: '\u0000' } } }],
    ['una clave', { ['cla\u0000ve']: 'valor' }],
  ])('lo detecta en %s', (_caso, valor) => {
    expect(contieneByteNulo(valor)).toBe(true);
  });

  it.each([
    ['texto normal', 'Chinua Achebe'],
    ['saltos de línea y tabulaciones', { definicion: 'línea 1\nlínea 2\tfin' }],
    ['números, booleanos y null', { semana: 4, activo: true, ejemplo: null }],
    ['undefined', undefined],
    ['un objeto vacío', {}],
    ['emojis y tildes', { nombre: 'María 👍' }],
  ])('no lo marca con %s', (_caso, valor) => {
    expect(contieneByteNulo(valor)).toBe(false);
  });

  it('trata como inválido un body anidado más allá del límite de profundidad', () => {
    let valor = 'fin';
    for (let i = 0; i < 30; i++) valor = { v: valor };
    expect(contieneByteNulo(valor)).toBe(true);
  });
});

describe('rechazarByteNulo — hallazgo de ZAP run #42', () => {
  it.each([
    ['el body', peticion({ body: { autor: 'John Doe\u0000' } })],
    ['la query', peticion({ query: { q: 'ho\u0000use' } })],
    ['la ruta (%00)', peticion({ path: '/api/v1/enrichment/family/word%00' })],
    ['una ruta mal codificada', peticion({ path: '/api/v1/decks/%E0%A4%A' })],
  ])('responde 400 BAD_REQUEST si el byte nulo viene en %s, sin seguir a la ruta', (_caso, req) => {
    const res = crearRes();
    const next = vi.fn();
    rechazarByteNulo(req, res, next);

    expect(respuesta(res)).toEqual({
      status: 400,
      body: { error: expect.any(String), code: 'BAD_REQUEST' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('deja una línea [SEGURIDAD] con método, ruta e IP, sin el contenido ni la query', () => {
    rechazarByteNulo(
      peticion({ body: { secreto: 'clave\u0000' }, query: { search: 'privado' }, path: '/api/v1/courses' }),
      crearRes(),
      vi.fn()
    );
    const linea = warn.mock.calls[0][0];
    expect(linea).toBe('[SEGURIDAD] 400 byte nulo en la entrada POST /api/v1/courses ip=10.0.0.5');
    expect(linea).not.toContain('clave');
    expect(linea).not.toContain('privado');
  });

  it('deja pasar una petición normal', () => {
    const res = crearRes();
    const next = vi.fn();
    rechazarByteNulo(peticion({ body: { autor: 'Chinua Achebe', definicion: 'a\nb' }, query: { q: 'house' } }), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
