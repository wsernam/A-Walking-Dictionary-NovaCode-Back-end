// Límite global de peticiones (auditoría OWASP H-07, ampliación): comprueba el cableado REAL en
// src/app.js. Levanta una segunda instancia del backend en un puerto libre con un límite bajo
// (RATE_LIMIT_GLOBAL_MAX=5) y verifica que:
//   - toda la API cuenta, también una ruta inexistente, no solo /auth y los reportes;
//   - al superar el límite responde 429 con { error, code: 'RATE_LIMITED' } y cabeceras CORS;
//   - /health queda fuera del conteo.
// No toca el backend principal de la suite, así que no consume su contador.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const CARPETA_BACKEND = fileURLToPath(new URL('../', import.meta.url));
const LIMITE = 5;
const ORIGEN = 'http://localhost:3000';

let proceso;
let base;
let salida = '';

function puertoLibre() {
  return new Promise((resolver, rechazar) => {
    const servidor = createServer();
    servidor.on('error', rechazar);
    servidor.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address();
      servidor.close(() => resolver(port));
    });
  });
}

async function esperarHealth(url) {
  const limite = Date.now() + 20000;
  while (Date.now() < limite) {
    try {
      if ((await fetch(`${url}/health`)).ok) return;
    } catch {
      // el servidor todavía no escucha
    }
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
  throw new Error(`El backend de prueba no respondió en ${url}/health.\n${salida}`);
}

beforeAll(async () => {
  const puerto = await puertoLibre();
  base = `http://127.0.0.1:${puerto}`;
  proceso = spawn(process.execPath, ['server.js'], {
    cwd: CARPETA_BACKEND,
    env: {
      ...process.env,
      PORT: String(puerto),
      RATE_LIMIT_GLOBAL_MAX: String(LIMITE),
      DISABLE_AUTH: 'false',
      CORS_ORIGINS: ORIGEN,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proceso.stdout.on('data', (datos) => { salida += datos; });
  proceso.stderr.on('data', (datos) => { salida += datos; });
  await esperarHealth(base);
}, 30000);

afterAll(() => {
  proceso?.kill();
});

describe('Límite global — toda la API tiene techo (OWASP H-07)', () => {
  it('/health no cuenta: responde 200 muchas más veces que el límite', async () => {
    for (let i = 0; i < LIMITE * 3; i += 1) {
      expect((await fetch(`${base}/health`)).status).toBe(200);
    }
  });

  it('una ruta sin límite propio se corta al superar el límite global y la respuesta trae CORS', async () => {
    const ruta = `${base}/api/v1/ruta-que-no-existe`;
    const cabeceras = { Origin: ORIGEN };

    for (let i = 0; i < LIMITE; i += 1) {
      expect((await fetch(ruta, { headers: cabeceras })).status).toBe(404);
    }

    const rechazada = await fetch(ruta, { headers: cabeceras });
    expect(rechazada.status).toBe(429);
    expect(await rechazada.json()).toEqual({
      error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
      code: 'RATE_LIMITED',
    });
    expect(rechazada.headers.get('access-control-allow-origin')).toBe(ORIGEN);
    expect(Number(rechazada.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('con el límite superado, una ruta real de la API también responde 429', async () => {
    const respuesta = await fetch(`${base}/api/v1/dictionary`);
    expect(respuesta.status).toBe(429);
    expect((await respuesta.json()).code).toBe('RATE_LIMITED');
  });

  it('/health sigue respondiendo 200 aunque la IP esté bloqueada en el resto de la API', async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200);
  });
});