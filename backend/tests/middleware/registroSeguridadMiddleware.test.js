// Pruebas unitarias de src/middleware/registroSeguridadMiddleware.js (auditoría OWASP H-09).
// No corresponde a un CA del backlog: es seguridad transversal (decisión del equipo 2026-10-08).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { registroSeguridad } from '../../src/middleware/registroSeguridadMiddleware.js';

function peticion(extra = {}) {
  return {
    method: 'GET',
    originalUrl: '/api/v1/users/8',
    ip: '10.0.0.5',
    headers: { authorization: 'Bearer token-secreto-que-no-debe-salir' },
    ...extra,
  };
}

/** @brief Simula que Express terminó de enviar la respuesta con el código indicado. */
function responder(req, statusCode) {
  const res = new EventEmitter();
  const next = vi.fn();
  registroSeguridad(req, res, next);
  res.statusCode = statusCode;
  res.emit('finish');
  return next;
}

let warn;
let error;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('registroSeguridad — auditoría OWASP H-09 (A09)', () => {
  it('siempre deja continuar la petición', () => {
    expect(responder(peticion(), 200)).toHaveBeenCalledOnce();
  });

  it.each([401, 403])('registra un %i como advertencia con método, ruta e IP', (status) => {
    responder(peticion(), status);

    expect(warn).toHaveBeenCalledWith(`[SEGURIDAD] ${status} GET /api/v1/users/8 ip=10.0.0.5 usuario=anonimo`);
    expect(error).not.toHaveBeenCalled();
  });

  it('incluye usuario y rol cuando la petición traía sesión', () => {
    responder(peticion({ usuario: { id_usuario: 2, rol: 'estudiante' } }), 403);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('usuario=2 rol=estudiante'));
  });

  it.each([500, 503])('registra un %i como error', (status) => {
    responder(peticion(), status);

    expect(error).toHaveBeenCalledWith(expect.stringContaining(`[SEGURIDAD] ${status}`));
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([200, 201, 400, 404, 409])('no registra un %i', (status) => {
    responder(peticion(), status);

    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('nunca escribe el token ni la cabecera Authorization en el log', () => {
    responder(peticion(), 401);
    responder(peticion(), 500);

    const todo = [...warn.mock.calls, ...error.mock.calls].flat().join(' ');
    expect(todo).not.toContain('token-secreto');
    expect(todo).not.toContain('Bearer');
  });

  it('no registra nada hasta que la respuesta termina', () => {
    const res = new EventEmitter();
    registroSeguridad(peticion(), res, vi.fn());
    res.statusCode = 401;

    expect(warn).not.toHaveBeenCalled();
  });
});
