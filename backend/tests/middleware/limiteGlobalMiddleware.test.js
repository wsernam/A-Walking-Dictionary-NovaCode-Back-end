// Pruebas unitarias de src/middleware/limiteGlobalMiddleware.js (auditoría OWASP H-07, ampliación).
// No corresponde a un CA del backlog: es seguridad transversal. Levanta un Express mínimo en un
// puerto libre y le hace peticiones reales; el cableado en app.js lo cubre la prueba funcional
// pruebas-funcionales/rate-limit-global.test.js.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import {
  crearLimiteGlobal,
  LIMITE_POR_DEFECTO,
  VENTANA_MS,
} from '../../src/middleware/limiteGlobalMiddleware.js';

let servidor;
let base;

async function levantar(limitador) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(limitador);
  app.get('/ping', (_req, res) => res.status(200).json({ ok: true }));
  await new Promise((resolver) => {
    servidor = app.listen(0, '127.0.0.1', resolver);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
}

afterEach(async () => {
  await new Promise((resolver) => servidor.close(resolver));
  vi.restoreAllMocks();
  delete process.env.RATE_LIMIT_GLOBAL_MAX;
});

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('crearLimiteGlobal — límite global de la API (OWASP H-07)', () => {
  it('deja pasar hasta el límite y responde 429 RATE_LIMITED después', async () => {
    await levantar(crearLimiteGlobal({ limite: 3 }));

    for (let i = 0; i < 3; i += 1) {
      expect((await fetch(`${base}/ping`)).status).toBe(200);
    }

    const rechazada = await fetch(`${base}/ping`);
    expect(rechazada.status).toBe(429);
    expect(await rechazada.json()).toEqual({
      error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
      code: 'RATE_LIMITED',
    });
  });

  it('también cuenta las rutas que no existen (404)', async () => {
    await levantar(crearLimiteGlobal({ limite: 2 }));

    expect((await fetch(`${base}/no-existe`)).status).toBe(404);
    expect((await fetch(`${base}/no-existe`)).status).toBe(404);
    expect((await fetch(`${base}/no-existe`)).status).toBe(429);
  });

  it('informa el límite con las cabeceras estándar y Retry-After', async () => {
    await levantar(crearLimiteGlobal({ limite: 1 }));

    const permitida = await fetch(`${base}/ping`);
    expect(permitida.headers.get('ratelimit')).toContain('limit=1');
    expect(permitida.headers.get('ratelimit-policy')).toContain(`w=${VENTANA_MS / 1000}`);

    const rechazada = await fetch(`${base}/ping`);
    expect(rechazada.status).toBe(429);
    expect(Number(rechazada.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('registra una sola línea [SEGURIDAD] por ventana aunque lleguen muchas rechazadas', async () => {
    await levantar(crearLimiteGlobal({ limite: 1 }));

    for (let i = 0; i < 6; i += 1) await fetch(`${base}/ping`);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^\[SEGURIDAD\] 429 GET \/ping ip=\S+ límite global superado$/)
    );
  });

  it('toma el límite de RATE_LIMIT_GLOBAL_MAX', async () => {
    process.env.RATE_LIMIT_GLOBAL_MAX = '2';
    await levantar(crearLimiteGlobal());

    expect((await fetch(`${base}/ping`)).status).toBe(200);
    expect((await fetch(`${base}/ping`)).status).toBe(200);
    expect((await fetch(`${base}/ping`)).status).toBe(429);
  });

  it('usa el valor por defecto si RATE_LIMIT_GLOBAL_MAX no es un número válido', async () => {
    process.env.RATE_LIMIT_GLOBAL_MAX = 'abc';
    await levantar(crearLimiteGlobal());

    const respuesta = await fetch(`${base}/ping`);
    expect(respuesta.headers.get('ratelimit')).toContain(`limit=${LIMITE_POR_DEFECTO}`);
  });
});