// Seguridad de sesión (OWASP A07 — fallas de autenticación): se construyen tokens "malos" y se
// verifica que la API los rechace con 401. Corre contra el backend de pruebas (nunca producción),
// con la misma preparación y el mismo cliente que el resto de pruebas-funcionales/.
//
// Casos:
//   SES-01..03  Control: sin token, formato de cabecera incorrecto y token válido (línea base).
//   SES-04..06  Token manipulado: firma alterada, payload modificado (rol) y firma con otro secreto.
//   SES-07..10  alg:none (y variantes) y confusión de algoritmo (HS384/HS512).
//   SES-11..12  Token vencido y token todavía no válido (nbf).
//   SES-13      Token reutilizado tras cerrar sesión.            [RIESGO CONOCIDO]
//   SES-14      Cuenta desactivada con token todavía vigente.    [RIESGO CONOCIDO]
//
// [RIESGO CONOCIDO]: el backend NO cumple todavía el comportamiento seguro. Esos casos declaran
// el resultado SEGURO (401) y corren con it.fails, igual que los HALLAZGOS de rbac-idor.test.js:
// la integración continua sigue en verde, el hueco queda visible en el reporte y, cuando el
// backend se corrija, el caso empieza a pasar, it.fails lo reporta como fallo y basta con
// cambiar it.fails por it.
//
// Los datos que se modifican (la cuenta de thalia) se restauran al terminar.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { api, token, USUARIOS } from './soporte/cliente.js';
import { API_URL, JWT_SECRET } from './soporte/entorno.js';

const ADMIN = { id_usuario: 90, email: 'admin.prueba@unicauca.edu.co', rol: 'administrador' };
const comoAdmin = { tokenCrudo: token(ADMIN) };

const THALIA = USUARIOS.thalia;
const RUTA_PROTEGIDA = '/users/2'; // perfil de juan: 200 solo para juan, sin efectos secundarios
const RUTA_DOCENTE = '/courses/1/students'; // exclusiva de docente (control de escalada de rol)

const SEGUNDOS = () => Math.floor(Date.now() / 1000);
const b64url = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
const payloadDe = (usuario) => ({ id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol });

/** Firma un JWT con el algoritmo, el secreto y los claims indicados (sin opciones extra). */
function firmar(usuario, { algoritmo = 'HS256', secreto = JWT_SECRET, claims = {} } = {}) {
  return jwt.sign({ ...payloadDe(usuario), ...claims }, secreto, { algorithm: algoritmo, noTimestamp: true });
}

/** Parte un JWT en { cabecera, payload, firma } ya decodificados. */
function partir(jwtCompleto) {
  const [h, p, f] = jwtCompleto.split('.');
  return {
    cabecera: JSON.parse(Buffer.from(h, 'base64url').toString()),
    payload: JSON.parse(Buffer.from(p, 'base64url').toString()),
    firma: f,
  };
}

/** Pide la ruta protegida con un token crudo y exige 401 con el código esperado. */
async function esperarRechazo(tokenCrudo, codigo = 'AUTH_TOKEN_INVALID', ruta = RUTA_PROTEGIDA) {
  const { status, body } = await api('GET', ruta, { tokenCrudo });
  expect(status, '429: se agotó el límite de solicitudes; reinicie el backend').not.toBe(429);
  expect(status).toBe(401);
  expect(body.code).toBe(codigo);
}

const juanValido = () => token(USUARIOS.juan);

// ---------------------------------------------------------------------------------------------
describe('Sesión — controles (línea base)', () => {
  it('SES-01 Sin token responde 401 AUTH_TOKEN_MISSING', async () => {
    const { status, body } = await api('GET', RUTA_PROTEGIDA);
    expect(status).toBe(401);
    expect(body.code).toBe('AUTH_TOKEN_MISSING');
  });

  it.each([
    ['esquema Basic', (t) => `Basic ${t}`],
    ['token sin esquema Bearer', (t) => t],
  ])('SES-02 Cabecera Authorization (%s) responde 401 AUTH_TOKEN_MISSING', async (_nombre, armar) => {
    const respuesta = await fetch(`${API_URL}/api/v1${RUTA_PROTEGIDA}`, {
      headers: { Authorization: armar(juanValido()) },
    });
    expect(respuesta.status).toBe(401);
    expect((await respuesta.json()).code).toBe('AUTH_TOKEN_MISSING');
  });

  // Sin este control, un 401 en los demás casos podría deberse a que la ruta o el usuario están mal.
  it('SES-03 Un token legítimo SÍ accede (200) y el de otro estudiante no (403)', async () => {
    expect((await api('GET', RUTA_PROTEGIDA, { tokenCrudo: juanValido() })).status).toBe(200);
    expect((await api('GET', RUTA_PROTEGIDA, { como: 'maria' })).status).toBe(403);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Sesión — token manipulado', () => {
  it('SES-04 Firma alterada → 401', async () => {
    const { cabecera, payload } = partir(juanValido());
    const alterado = `${b64url(cabecera)}.${b64url(payload)}.${'A'.repeat(43)}`;
    await esperarRechazo(alterado);
  });

  it('SES-05 Payload modificado (rol "docente") con la firma original → 401 y sin acceso a rutas de docente', async () => {
    const [h, p, f] = juanValido().split('.');
    const payload = { ...JSON.parse(Buffer.from(p, 'base64url').toString()), rol: 'docente' };
    const escalado = `${h}.${b64url(payload)}.${f}`;

    await esperarRechazo(escalado);
    await esperarRechazo(escalado, 'AUTH_TOKEN_INVALID', RUTA_DOCENTE);
  });

  it('SES-06 Token firmado con otro secreto → 401', async () => {
    await esperarRechazo(firmar(USUARIOS.ana, { secreto: 'otro-secreto-que-no-es-el-del-backend-0123456789' }), 'AUTH_TOKEN_INVALID', RUTA_DOCENTE);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Sesión — alg:none y confusión de algoritmo', () => {
  const claims = () => ({ ...payloadDe(USUARIOS.ana), iat: SEGUNDOS(), exp: SEGUNDOS() + 3600 });

  it.each(['none', 'None', 'NONE', 'nOnE'])('SES-07 alg:"%s" sin firma → 401', async (alg) => {
    const sinFirma = `${b64url({ alg, typ: 'JWT' })}.${b64url(claims())}.`;
    await esperarRechazo(sinFirma, 'AUTH_TOKEN_INVALID', RUTA_DOCENTE);
  });

  it('SES-08 alg:none conservando la firma HS256 original → 401', async () => {
    const [, p, f] = token(USUARIOS.ana).split('.');
    await esperarRechazo(`${b64url({ alg: 'none', typ: 'JWT' })}.${p}.${f}`, 'AUTH_TOKEN_INVALID', RUTA_DOCENTE);
  });

  it('SES-09 alg:none con payload de otro rol y sin tercer segmento → 401', async () => {
    const admin = { ...payloadDe(ADMIN), iat: SEGUNDOS(), exp: SEGUNDOS() + 3600 };
    await esperarRechazo(`${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(admin)}`, 'AUTH_TOKEN_INVALID', '/admin/users');
  });

  // El backend fija algorithms: ['HS256']; HS384/HS512 con el secreto CORRECTO también se rechazan.
  it.each(['HS384', 'HS512'])('SES-10 Firma %s válida pero algoritmo no permitido → 401', async (algoritmo) => {
    await esperarRechazo(firmar(USUARIOS.ana, { algoritmo, claims: { iat: SEGUNDOS(), exp: SEGUNDOS() + 3600 } }), 'AUTH_TOKEN_INVALID', RUTA_DOCENTE);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Sesión — vigencia del token', () => {
  it('SES-11 Token vencido → 401', async () => {
    const vencido = firmar(USUARIOS.juan, { claims: { iat: SEGUNDOS() - 7200, exp: SEGUNDOS() - 3600 } });
    await esperarRechazo(vencido);
  });

  it('SES-12 Token con nbf en el futuro (aún no válido) → 401', async () => {
    const futuro = firmar(USUARIOS.juan, { claims: { iat: SEGUNDOS(), nbf: SEGUNDOS() + 3600, exp: SEGUNDOS() + 7200 } });
    await esperarRechazo(futuro);
  });
});

// ---------------------------------------------------------------------------------------------
// Casos [RIESGO CONOCIDO]: se declara el resultado SEGURO y corren con it.fails (ver cabecera).

describe('Sesión — token reutilizado tras cerrar sesión', () => {
  // AutenticacionService no guarda sesiones ni lista de revocación: el JWT (8 h) es sin estado y el
  // "cerrar sesión" del front solo borra el token del navegador. Tampoco existe POST /auth/logout.
  // Este caso replica a un atacante que copió el token antes de que el usuario saliera.
  const jwtCopiado = juanValido();

  it('SES-13a Control: antes de cerrar sesión el token funciona (200)', async () => {
    expect((await api('GET', RUTA_PROTEGIDA, { tokenCrudo: jwtCopiado })).status).toBe(200);
  });

  it.fails('SES-13b [RIESGO CONOCIDO] Un token ya usado en un cierre de sesión se rechaza (401) — el backend no revoca tokens', async () => {
    // Si se implementa el cierre de sesión con revocación, ajustar la ruta (POST /auth/logout).
    await api('POST', '/auth/logout', { tokenCrudo: jwtCopiado });

    const { status } = await api('GET', RUTA_PROTEGIDA, { tokenCrudo: jwtCopiado });
    expect(status).toBe(401);
  });
});

describe('Sesión — cuenta desactivada con token vigente', () => {
  // authenticate solo verifica la firma y la vigencia del JWT; no consulta usuario.activo. La
  // desactivación solo bloquea el NUEVO inicio de sesión (AUTH_ACCOUNT_INACTIVE), no los tokens ya
  // emitidos, que siguen valiendo hasta 8 h.
  const tokenDeThalia = token(THALIA);

  beforeAll(async () => {
    await api('PATCH', `/admin/users/${THALIA.id_usuario}/status`, { ...comoAdmin, body: { activo: false } });
  });

  afterAll(async () => {
    await api('PATCH', `/admin/users/${THALIA.id_usuario}/status`, { ...comoAdmin, body: { activo: true } });
  });

  it('SES-14a Control: la cuenta de thalia quedó desactivada', async () => {
    const { status, body } = await api('GET', '/admin/users?activo=false&search=thaliabernal', comoAdmin);
    expect(status).toBe(200);
    expect(body.data.map((u) => u.id_usuario)).toContain(THALIA.id_usuario);
  });

  it.fails('SES-14b [RIESGO CONOCIDO] Con la cuenta desactivada, su token vigente se rechaza (401) — el backend no consulta "activo"', async () => {
    const { status } = await api('GET', `/users/${THALIA.id_usuario}`, { tokenCrudo: tokenDeThalia });
    expect(status).toBe(401);
  });
});
