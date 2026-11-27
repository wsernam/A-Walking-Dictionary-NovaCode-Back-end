// Pruebas unitarias de src/middleware/erroresMiddleware.js (respuestas de error en JSON).
// Origen: alerta «Unexpected Content-Type» de OWASP ZAP (run #42). Seguridad transversal.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rutaNoEncontrada, manejarErrorPeticion } from '../../src/middleware/erroresMiddleware.js';
import { crearRes, respuesta } from '../helpers/http.js';

const req = { method: 'POST', path: '/api/v1/decks' };
const errorDe = (props) => Object.assign(new Error('detalle interno'), props);

let error;
beforeEach(() => {
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => error.mockRestore());

describe('rutaNoEncontrada', () => {
  it('responde 404 NOT_FOUND en JSON, sin repetir la ruta pedida', () => {
    const res = crearRes();
    rutaNoEncontrada({ method: 'GET', path: '/api/v1/<script>' }, res);

    expect(respuesta(res)).toEqual({ status: 404, body: { error: 'Ruta no encontrada', code: 'NOT_FOUND' } });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('script');
  });
});

describe('manejarErrorPeticion', () => {
  it('un JSON mal formado responde 400 BAD_REQUEST en JSON', () => {
    const res = crearRes();
    manejarErrorPeticion(errorDe({ type: 'entity.parse.failed', status: 400 }), req, res, vi.fn());
    expect(respuesta(res)).toEqual({ status: 400, body: { error: expect.any(String), code: 'BAD_REQUEST' } });
  });

  it('un body demasiado grande responde 413 BAD_REQUEST en JSON', () => {
    const res = crearRes();
    manejarErrorPeticion(errorDe({ type: 'entity.too.large', status: 413 }), req, res, vi.fn());
    expect(respuesta(res)).toEqual({ status: 413, body: { error: expect.any(String), code: 'BAD_REQUEST' } });
  });

  it('otro error 4xx conserva su status con code BAD_REQUEST', () => {
    const res = crearRes();
    manejarErrorPeticion(errorDe({ status: 415 }), req, res, vi.fn());
    expect(respuesta(res)).toEqual({ status: 415, body: { error: 'Petición inválida', code: 'BAD_REQUEST' } });
  });

  it('un error sin status responde 500 INTERNAL_ERROR sin exponer el detalle (OWASP H-08)', () => {
    const res = crearRes();
    manejarErrorPeticion(errorDe({}), req, res, vi.fn());

    expect(respuesta(res)).toEqual({ status: 500, body: { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' } });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('detalle interno');
    expect(error).toHaveBeenCalledWith('[ERROR] POST /api/v1/decks: detalle interno');
  });

  it('si la respuesta ya empezó a enviarse, delega en el manejador de Express', () => {
    const res = { ...crearRes(), headersSent: true };
    const next = vi.fn();
    const err = errorDe({});
    manejarErrorPeticion(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
