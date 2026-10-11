// Pruebas unitarias de src/middleware/autenticacionMiddleware.js (HU-5.4, CA-5.4.1 a CA-5.4.3).
// Se usan tokens reales firmados con un secreto de prueba; no se necesita base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  authenticate,
  autenticacionOpcional,
  requireRole,
} from '../../src/middleware/autenticacionMiddleware.js';

const SECRETO = 'secreto-de-prueba-con-mas-de-32-caracteres';
const usuarioEstudiante = { id_usuario: 2, email: 'juan@unicauca.edu.co', rol: 'estudiante' };

function firmar(payload = usuarioEstudiante, secreto = SECRETO, opciones = {}) {
  return jwt.sign(payload, secreto, { expiresIn: '5m', ...opciones });
}

function crearReq(authorization) {
  return { headers: authorization === undefined ? {} : { authorization } };
}

function crearRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', SECRETO);
  vi.stubEnv('DISABLE_AUTH', 'false');
  vi.stubEnv('NODE_ENV', 'test');
});

describe('authenticate — CA-5.4.1 (autenticación con JWT)', () => {
  it('CA-5.4.1: sin cabecera Authorization responde 401', () => {
    const res = crearRes();
    const next = vi.fn();

    authenticate(crearReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('CA-5.4.1: una cabecera sin el prefijo "Bearer " responde 401', () => {
    const res = crearRes();
    const next = vi.fn();

    authenticate(crearReq(firmar()), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('CA-5.4.1: un token firmado con otro secreto responde 401', () => {
    const res = crearRes();
    const next = vi.fn();

    authenticate(crearReq(`Bearer ${firmar(usuarioEstudiante, 'otro-secreto')}`), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('CA-5.4.1: un token expirado responde 401', () => {
    const res = crearRes();
    const next = vi.fn();
    const vencido = firmar(usuarioEstudiante, SECRETO, { expiresIn: -60 }); // venció hace 1 minuto

    authenticate(crearReq(`Bearer ${vencido}`), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('CA-5.4.1: un token firmado con un algoritmo distinto de HS256 responde 401', () => {
    const res = crearRes();
    const next = vi.fn();

    authenticate(crearReq(`Bearer ${firmar(usuarioEstudiante, SECRETO, { algorithm: 'HS512' })}`), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('CA-5.4.1: un token válido deja el usuario en req.usuario y continúa', () => {
    const req = crearReq(`Bearer ${firmar()}`);
    const res = crearRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.usuario).toMatchObject(usuarioEstudiante);
  });
});

describe('requireRole — CA-5.4.2 (control de acceso por roles)', () => {
  it('CA-5.4.2: sin req.usuario responde 401', () => {
    const res = crearRes();
    const next = vi.fn();

    requireRole('docente')({ headers: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('CA-5.4.2: un estudiante en una ruta de docente recibe 403', () => {
    const res = crearRes();
    const next = vi.fn();

    requireRole('docente')({ usuario: usuarioEstudiante }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('CA-5.4.2: un rol permitido continúa', () => {
    const res = crearRes();
    const next = vi.fn();

    requireRole('docente')({ usuario: { ...usuarioEstudiante, rol: 'docente' } }, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('CA-5.4.2: con varios roles permitidos, cualquiera de ellos continúa', () => {
    const next = vi.fn();

    requireRole('docente', 'estudiante')({ usuario: usuarioEstudiante }, crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });
});

describe('DISABLE_AUTH — interruptor de desarrollo (auditoría OWASP H-04)', () => {
  it('con DISABLE_AUTH=true en desarrollo deja pasar sin token como docente', () => {
    vi.stubEnv('DISABLE_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    const req = crearReq();
    const next = vi.fn();

    authenticate(req, crearRes(), next);
    requireRole('docente')(req, crearRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(req.usuario.rol).toBe('docente');
  });

  it('con DISABLE_AUTH=true usa el rol de DISABLE_AUTH_ROL si está definido', () => {
    vi.stubEnv('DISABLE_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DISABLE_AUTH_ROL', 'estudiante');
    const req = crearReq();

    authenticate(req, crearRes(), vi.fn());

    expect(req.usuario.rol).toBe('estudiante');
  });

  it('con DISABLE_AUTH=true y NODE_ENV=production se ignora y exige token', () => {
    vi.stubEnv('DISABLE_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    const res = crearRes();
    const next = vi.fn();

    authenticate(crearReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('autenticacionOpcional — CA-5.4.3 (acceso de solo lectura como Invitado)', () => {
  it('CA-5.4.3: sin token continúa como invitado, sin req.usuario y sin 401', () => {
    const req = crearReq();
    const res = crearRes();
    const next = vi.fn();

    autenticacionOpcional(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.usuario).toBeUndefined();
  });

  it('CA-5.4.3: con un token inválido continúa como invitado, sin 401', () => {
    const req = crearReq('Bearer token.falso.invalido');
    const res = crearRes();
    const next = vi.fn();

    autenticacionOpcional(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.usuario).toBeUndefined();
  });

  it('CA-5.4.3: con un token válido deja el usuario en req.usuario', () => {
    const req = crearReq(`Bearer ${firmar()}`);
    const next = vi.fn();

    autenticacionOpcional(req, crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.usuario).toMatchObject(usuarioEstudiante);
  });
});
