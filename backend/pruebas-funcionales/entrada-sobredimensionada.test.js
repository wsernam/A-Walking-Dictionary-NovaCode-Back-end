// Entrada sobredimensionada: ninguna entrada enorme o rara debe tumbar la API.
//
// Levanta una instancia propia del backend en un puerto libre (como rate-limit-global.test.js),
// con los límites de peticiones altos para no recibir 429, y para cada caso comprueba:
//   - que la respuesta sea un error controlado (400, 404, 413 o 431; nunca 5xx);
//   - que los errores de Express lleguen como { error, code } (docs/codigos-error.md);
//   - que después del caso /health siga respondiendo 200 y el proceso siga vivo.
//
// Casos: textos de más de 150 caracteres, bodies de 1 MB o más, JSON muy anidado e intentos de
// ReDoS sobre las validaciones con regex (src/utils/validacion.js, diccionario, búsqueda admin).
// La latencia de cada caso se guarda en reportes-funcionales/entrada-sobredimensionada.json, que
// lee soporte/graficas-entrada.mjs para generar las gráficas.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { token, USUARIOS, MAZO_ABIERTO_SEED, CURSO_ID } from './soporte/cliente.js';

const CARPETA_BACKEND = fileURLToPath(new URL('../', import.meta.url));
const ARCHIVO_RESULTADOS = fileURLToPath(new URL('../reportes-funcionales/entrada-sobredimensionada.json', import.meta.url));

/** Una validación con regex que tarde más que esto se considera vulnerable a ReDoS. */
const MAXIMO_MS_REGEX = 2000;
/** Límite por defecto de express.json (100 kB). */
const LIMITE_BODY = 100 * 1024;

const ADMIN = { id_usuario: 90, email: 'admin.prueba@unicauca.edu.co', rol: 'administrador' };
const TOKENS = {
  juan: token(USUARIOS.juan),
  ana: token(USUARIOS.ana),
  admin: token(ADMIN),
};

let proceso;
let base;
let salida = '';
const resultados = [];

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
  // La instancia hereda las variables del proceso (y backend/.env). Si DB_HOST apunta a Supabase
  // (p. ej. un .env con el bloque de producción al final), no se arranca: estas pruebas mandan
  // POST que, si una validación fallara, escribirían en esa base.
  if (/supabase/i.test(process.env.DB_HOST || '')) {
    throw new Error(
      `DB_HOST apunta a Supabase (${process.env.DB_HOST}). Define DB_HOST, DB_USER, DB_PASSWORD y DB_NAME ` +
      'de la base local como variables del proceso antes de correr esta prueba.'
    );
  }
  const puerto = await puertoLibre();
  base = `http://127.0.0.1:${puerto}`;
  const alto = '1000000';
  proceso = spawn(process.execPath, ['server.js'], {
    cwd: CARPETA_BACKEND,
    env: {
      ...process.env,
      PORT: String(puerto),
      DISABLE_AUTH: 'false',
      RATE_LIMIT_GLOBAL_MAX: alto,
      RATE_LIMIT_AUTH_MAX: alto,
      RATE_LIMIT_ADMIN_MAX: alto,
      RATE_LIMIT_REPORTES_MAX: alto,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proceso.stdout.on('data', (datos) => { salida += datos; });
  proceso.stderr.on('data', (datos) => { salida += datos; });
  await esperarHealth(base);

  // Calentamiento (no se mide): la primera consulta de cada tipo abre la conexión a PostgreSQL y
  // tardaría decenas de ms, lo que deformaría la latencia del primer caso de cada endpoint.
  const auth = (como) => ({ Authorization: `Bearer ${TOKENS[como]}`, 'Content-Type': 'application/json' });
  await Promise.all([
    fetch(`${base}/api/v1/dictionary?q=a`),
    fetch(`${base}/api/v1/admin/users?search=a`, { headers: auth('admin') }),
    fetch(`${base}/api/v1/cards/check-duplicate`, {
      method: 'POST', headers: auth('juan'), body: JSON.stringify({ mazo_id: MAZO_ABIERTO_SEED, palabra: 'a', definicion: 'd' }),
    }),
    fetch(`${base}/api/v1/decks/${MAZO_ABIERTO_SEED}/cards`, { method: 'POST', headers: auth('juan'), body: '{}' }),
  ]);
}, 30000);

afterAll(() => {
  proceso?.kill();
  mkdirSync(fileURLToPath(new URL('../reportes-funcionales/', import.meta.url)), { recursive: true });
  writeFileSync(
    ARCHIVO_RESULTADOS,
    JSON.stringify({ fecha: new Date().toISOString(), node: process.version, resultados }, null, 2)
  );
});

/**
 * Envía una petición cruda (el body va tal cual, ya serializado), mide la latencia y comprueba
 * que /health siga vivo. Registra el resultado para las gráficas.
 * @return {Promise<{ status: number, body: any, ms: number }>}
 */
async function medir({ grupo, caso, endpoint, tamano, metodo = 'GET', ruta, body, como }) {
  const headers = {};
  if (como) headers.Authorization = `Bearer ${TOKENS[como]}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const inicio = performance.now();
  let status;
  let cuerpo;
  try {
    const respuesta = await fetch(`${base}${ruta}`, { method: metodo, headers, body });
    status = respuesta.status;
    const texto = await respuesta.text();
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      cuerpo = texto;
    }
  } catch (error) {
    // El servidor puede cerrar la conexión mientras el cliente sigue enviando un body enorme.
    status = 0;
    cuerpo = `conexión cerrada: ${error.cause?.code || error.message}`;
  }
  const ms = performance.now() - inicio;

  const health = await fetch(`${base}/health`).then((r) => r.status).catch(() => 0);
  const vivo = proceso.exitCode === null && health === 200;
  resultados.push({ grupo, caso, endpoint, tamano, status, code: cuerpo?.code ?? null, ms: Number(ms.toFixed(2)), vivo });

  expect(vivo, `el backend dejó de responder /health después de "${caso}"`).toBe(true);
  return { status, body: cuerpo, ms };
}

/** Comprueba un error controlado con el formato { error, code }. */
function esperarError(r, permitidos) {
  expect(r.status, JSON.stringify(r.body).slice(0, 200)).not.toBeGreaterThanOrEqual(500);
  expect(permitidos).toContain(r.status);
  if (r.status !== 431) {
    expect(typeof r.body.error).toBe('string');
    expect(typeof r.body.code).toBe('string');
  }
}

const x = (n) => 'x'.repeat(n);
const TAMANOS_BODY_TEXTO = [151, 1_000, 10_000, 90_000];
// En la URL, más de ~16 kB lo corta Node (max-http-header-size) con 431 antes de Express.
const TAMANOS_URL = [151, 1_000, 8_000, 20_000];

describe('Textos de más de 150 caracteres', () => {
  it.each(TAMANOS_BODY_TEXTO)('POST /decks/:id/cards con palabra de %i caracteres → 400 FIELD_TOO_LONG', async (n) => {
    const r = await medir({
      grupo: 'texto-body', caso: `palabra ${n}`, endpoint: 'POST /decks/:id/cards (palabra)', tamano: n,
      metodo: 'POST', ruta: `/api/v1/decks/${MAZO_ABIERTO_SEED}/cards`, como: 'juan',
      body: JSON.stringify({ palabra: x(n), traduccion: 't', definicion: 'd' }),
    });
    esperarError(r, [400]);
    expect(r.body.code).toBe('FIELD_TOO_LONG');
  });

  it.each(TAMANOS_BODY_TEXTO)('POST /decks/:id/cards con ejemplo de %i caracteres → 400 FIELD_TOO_LONG', async (n) => {
    const r = await medir({
      grupo: 'texto-body', caso: `ejemplo ${n}`, endpoint: 'POST /decks/:id/cards (ejemplo)', tamano: n,
      metodo: 'POST', ruta: `/api/v1/decks/${MAZO_ABIERTO_SEED}/cards`, como: 'juan',
      body: JSON.stringify({ palabra: 'oversized', traduccion: 't', definicion: 'd', ejemplo: x(n) }),
    });
    esperarError(r, [400]);
    expect(r.body.code).toBe('FIELD_TOO_LONG');
  });

  it.each(TAMANOS_BODY_TEXTO)('POST /decks con autor de %i caracteres → 400', async (n) => {
    const r = await medir({
      grupo: 'texto-body', caso: `autor ${n}`, endpoint: 'POST /decks (autor)', tamano: n,
      metodo: 'POST', ruta: '/api/v1/decks', como: 'ana',
      body: JSON.stringify({
        curso_id: CURSO_ID, nombre_lectura: 'Lectura', autor: x(n), semana: 30,
        fecha_apertura: '2026-10-01', fecha_cierre: '2026-12-01',
      }),
    });
    esperarError(r, [400]);
  });

  // check-duplicate solo consulta: un 200 «no hay duplicado» no tumba nada, pero se registra
  // para el resumen porque el campo palabra admite máximo 150 caracteres al crear.
  it.each(TAMANOS_BODY_TEXTO)('POST /cards/check-duplicate con palabra de %i caracteres no responde 5xx', async (n) => {
    const r = await medir({
      grupo: 'texto-body', caso: `check-duplicate ${n}`, endpoint: 'POST /cards/check-duplicate (palabra)', tamano: n,
      metodo: 'POST', ruta: '/api/v1/cards/check-duplicate', como: 'juan',
      body: JSON.stringify({ mazo_id: MAZO_ABIERTO_SEED, palabra: x(n), definicion: 'd' }),
    });
    expect(r.status).not.toBeGreaterThanOrEqual(500);
    expect([200, 400]).toContain(r.status);
  });

  it.each(TAMANOS_URL)('GET /enrichment/family/:word con %i caracteres → 400 FIELD_TOO_LONG (o 431)', async (n) => {
    const r = await medir({
      grupo: 'texto-url', caso: `family ${n}`, endpoint: 'GET /enrichment/family/:word', tamano: n,
      ruta: `/api/v1/enrichment/family/${x(n)}`,
    });
    esperarError(r, [400, 431]);
    if (r.status === 400) expect(r.body.code).toBe('FIELD_TOO_LONG');
  });

  // El diccionario no tiene longitud máxima para q: una búsqueda larga sin resultados es un 200.
  it.each(TAMANOS_URL)('GET /dictionary?q= con %i caracteres no responde 5xx', async (n) => {
    const r = await medir({
      grupo: 'texto-url', caso: `dictionary q ${n}`, endpoint: 'GET /dictionary?q=', tamano: n,
      ruta: `/api/v1/dictionary?q=${x(n)}`,
    });
    expect(r.status).not.toBeGreaterThanOrEqual(500);
    expect([200, 400, 431]).toContain(r.status);
  });
});

describe('Body JSON de gran tamaño (límite de express.json: 100 kB)', () => {
  const TAMANOS = [10 * 1024, 99 * 1024, 101 * 1024, 1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024];

  /** Body de `bytes` bytes exactos, con mazo_id inválido para no tocar la base de datos. */
  function bodyDe(bytes) {
    const envoltura = JSON.stringify({ mazo_id: 'no', relleno: '' });
    return JSON.stringify({ mazo_id: 'no', relleno: x(bytes - envoltura.length) });
  }

  it.each(TAMANOS)('POST /cards/check-duplicate con body de %i bytes → 400 si cabe, 413 si no', async (bytes) => {
    const body = bodyDe(bytes);
    expect(Buffer.byteLength(body)).toBe(bytes);
    const r = await medir({
      grupo: 'body', caso: `body ${Math.round(bytes / 1024)} kB`, endpoint: 'POST /cards/check-duplicate', tamano: bytes,
      metodo: 'POST', ruta: '/api/v1/cards/check-duplicate', como: 'juan', body,
    });
    if (bytes > LIMITE_BODY) {
      esperarError(r, [413]);
      expect(r.body).toEqual({ error: 'El cuerpo de la petición es demasiado grande', code: 'BAD_REQUEST' });
    } else {
      esperarError(r, [400]);
      expect(r.body.code).toBe('INVALID_ID');
    }
  });

  it.each(TAMANOS.filter((b) => b > LIMITE_BODY))('POST /auth/google sin sesión con body de %i bytes → 413', async (bytes) => {
    const r = await medir({
      grupo: 'body', caso: `auth ${Math.round(bytes / 1024)} kB`, endpoint: 'POST /auth/google (sin sesión)', tamano: bytes,
      metodo: 'POST', ruta: '/api/v1/auth/google', body: bodyDe(bytes),
    });
    esperarError(r, [413]);
  });
});

describe('JSON muy anidado', () => {
  // Arreglos: 2 bytes por nivel; con 50 000 niveles el body sigue por debajo de 100 kB.
  const NIVELES_ARREGLO = [20, 21, 100, 1_000, 10_000, 50_000];
  // Objetos: 6 bytes por nivel ({"a": ... }).
  const NIVELES_OBJETO = [21, 1_000, 16_000];

  it.each(NIVELES_ARREGLO)('arreglo anidado %i niveles en el body → 400', async (niveles) => {
    const body = '['.repeat(niveles) + ']'.repeat(niveles);
    const r = await medir({
      grupo: 'anidado', caso: `arreglo ${niveles}`, endpoint: 'POST /cards/check-duplicate (arreglo)', tamano: niveles,
      metodo: 'POST', ruta: '/api/v1/cards/check-duplicate', como: 'juan', body,
    });
    esperarError(r, [400]);
  });

  it.each(NIVELES_OBJETO)('objeto anidado %i niveles dentro de palabra → 400', async (niveles) => {
    const anidado = '{"a":'.repeat(niveles) + '1' + '}'.repeat(niveles);
    const body = `{"mazo_id":${MAZO_ABIERTO_SEED},"palabra":${anidado},"definicion":"d"}`;
    const r = await medir({
      grupo: 'anidado', caso: `objeto ${niveles}`, endpoint: 'POST /cards/check-duplicate (objeto)', tamano: niveles,
      metodo: 'POST', ruta: '/api/v1/cards/check-duplicate', como: 'juan', body,
    });
    esperarError(r, [400]);
  });

  it('query anidada de 1 000 niveles (q[a][a]...) en /dictionary → 400', async () => {
    const r = await medir({
      grupo: 'anidado', caso: 'query 1000', endpoint: 'GET /dictionary?q[a][a]...', tamano: 1000,
      ruta: `/api/v1/dictionary?q${'[a]'.repeat(1000)}=1`,
    });
    esperarError(r, [400]);
  });
});

describe('Intentos de ReDoS sobre las validaciones con regex', () => {
  const TAMANOS = [1_000, 10_000, 90_000];

  it.each(TAMANOS)('fecha ISO con fracción de %i dígitos y basura al final (esFechaValida) → 400 rápido', async (n) => {
    const r = await medir({
      grupo: 'redos', caso: `fecha ${n}`, endpoint: 'POST /decks (fecha_apertura)', tamano: n,
      metodo: 'POST', ruta: '/api/v1/decks', como: 'ana',
      body: JSON.stringify({
        curso_id: CURSO_ID, nombre_lectura: 'Lectura', autor: 'Autor', semana: 30,
        fecha_apertura: `2026-10-10T10:10:10.${'1'.repeat(n)}!`, fecha_cierre: '2026-12-01',
      }),
    });
    esperarError(r, [400]);
    expect(r.ms).toBeLessThan(MAXIMO_MS_REGEX);
  });

  it.each(TAMANOS)('fecha de %i dígitos sin separadores (esFechaValida) → 400 rápido', async (n) => {
    const r = await medir({
      grupo: 'redos', caso: `fecha-digitos ${n}`, endpoint: 'POST /decks (fecha_cierre)', tamano: n,
      metodo: 'POST', ruta: '/api/v1/decks', como: 'ana',
      body: JSON.stringify({
        curso_id: CURSO_ID, nombre_lectura: 'Lectura', autor: 'Autor', semana: 30,
        fecha_apertura: '2026-10-01', fecha_cierre: '9'.repeat(n),
      }),
    });
    esperarError(r, [400]);
    expect(r.ms).toBeLessThan(MAXIMO_MS_REGEX);
  });

  it.each([1_000, 8_000])('id de %i dígitos con una letra al final (leerIdRuta) → 400 INVALID_ID rápido', async (n) => {
    const r = await medir({
      grupo: 'redos', caso: `id ${n}`, endpoint: 'GET /decks/:id', tamano: n,
      ruta: `/api/v1/decks/${'1'.repeat(n)}a`,
    });
    esperarError(r, [400]);
    expect(r.body.code).toBe('INVALID_ID');
    expect(r.ms).toBeLessThan(MAXIMO_MS_REGEX);
  });

  it.each([1_000, 8_000])('card_id de %i dígitos con una letra al final (diccionario) → 400 rápido', async (n) => {
    const r = await medir({
      grupo: 'redos', caso: `card_id ${n}`, endpoint: 'GET /dictionary/:card_id', tamano: n,
      ruta: `/api/v1/dictionary/${'1'.repeat(n)}a`,
    });
    esperarError(r, [400]);
    expect(r.ms).toBeLessThan(MAXIMO_MS_REGEX);
  });

  it.each([1_000, 8_000])('q de %i caracteres con un carácter de control al final → 400 rápido', async (n) => {
    const r = await medir({
      grupo: 'redos', caso: `q-control ${n}`, endpoint: 'GET /dictionary?q= (control)', tamano: n,
      ruta: `/api/v1/dictionary?q=${x(n)}%01`,
    });
    esperarError(r, [400]);
    expect(r.ms).toBeLessThan(MAXIMO_MS_REGEX);
  });

  // q llega a PostgreSQL dentro de ILIKE '%' || $1 || '%' sin escapar los comodines: % y _ del
  // usuario son comodines. Se mide que un patrón con muchos comodines no se dispare.
  it.each([150, 1_000, 4_000, 8_000])('q de %i caracteres con comodines de LIKE (%_) no responde 5xx y es rápido', async (n) => {
    const patron = '%25_'.repeat(Math.floor(n / 2)) + 'zz';
    const r = await medir({
      grupo: 'redos', caso: `q-like ${n}`, endpoint: 'GET /dictionary?q= (comodines LIKE)', tamano: n,
      ruta: `/api/v1/dictionary?q=${patron}`,
    });
    expect(r.status).not.toBeGreaterThanOrEqual(500);
    expect([200, 400]).toContain(r.status);
    expect(r.ms).toBeLessThan(MAXIMO_MS_REGEX);
  });

  it.each([100, 1_000, 5_000])('búsqueda admin de %i caracteres con %, _ y \\ → sin 5xx y rápida', async (n) => {
    const patron = encodeURIComponent('%_\\'.repeat(Math.ceil(n / 3)).slice(0, n));
    const r = await medir({
      grupo: 'redos', caso: `admin-search ${n}`, endpoint: 'GET /admin/users?search=', tamano: n,
      ruta: `/api/v1/admin/users?search=${patron}`, como: 'admin',
    });
    expect(r.status).not.toBeGreaterThanOrEqual(500);
    expect([200, 400]).toContain(r.status);
    expect(r.ms).toBeLessThan(MAXIMO_MS_REGEX);
  });
});

describe('Al terminar', () => {
  it('el proceso sigue vivo y no registró ningún [ERROR] (5xx) en toda la prueba', async () => {
    expect(proceso.exitCode).toBeNull();
    expect((await fetch(`${base}/health`)).status).toBe(200);
    // [ERROR] lo deja erroresMiddleware; [SEGURIDAD] 5xx, registroSeguridadMiddleware.
    const errores = salida.split('\n').filter((linea) => linea.includes('[ERROR]') || /\[SEGURIDAD\] 5\d\d /.test(linea));
    expect(errores).toEqual([]);
  });
});
