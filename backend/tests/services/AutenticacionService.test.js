// Pruebas unitarias de src/services/AutenticacionService.js (HU-5.4, CA-5.4.1).
// Google (google-auth-library) y UsuarioRepository se simulan: no hay red ni base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  AutenticacionService,
  emitirSesion,
  validarTokenGoogle,
} from '../../src/services/AutenticacionService.js';
import { UsuarioRepository } from '../../src/repositories/UsuarioRepository.js';

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(function OAuth2Client() {
    this.verifyIdToken = verifyIdToken;
  }),
}));
vi.mock('../../src/repositories/UsuarioRepository.js', () => ({
  UsuarioRepository: { obtenerPorEmail: vi.fn() },
}));

const SECRETO = 'secreto-de-prueba-con-mas-de-32-caracteres';
const CLIENT_ID = 'cliente-de-prueba.apps.googleusercontent.com';
const usuarioActivo = {
  id_usuario: 2,
  nombre_completo: 'Juan Estudiante',
  email: 'juan@unicauca.edu.co',
  password_hash: 'no-debe-salir',
  rol: 'estudiante',
  activo: true,
};

function googleResponde(payload) {
  verifyIdToken.mockResolvedValue({ getPayload: () => payload });
}

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', SECRETO);
  vi.stubEnv('GOOGLE_CLIENT_ID', CLIENT_ID);
  googleResponde({ email: 'juan@unicauca.edu.co', email_verified: true, name: 'Juan Estudiante' });
  UsuarioRepository.obtenerPorEmail.mockResolvedValue(usuarioActivo);
});

describe('validarTokenGoogle — CA-5.4.1 (identidad verificada por Google)', () => {
  it('CA-5.4.1: sin idToken responde 400 sin consultar a Google', async () => {
    await expect(validarTokenGoogle('')).rejects.toMatchObject({ status: 400 });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('CA-5.4.1: verifica el token contra el GOOGLE_CLIENT_ID de esta app', async () => {
    await validarTokenGoogle('token-google');
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'token-google', audience: CLIENT_ID });
  });

  it('CA-5.4.1: un token que Google rechaza responde 401', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));
    await expect(validarTokenGoogle('token-falso')).rejects.toMatchObject({
      status: 401,
      message: 'Token de Google inválido',
    });
  });

  it('CA-5.4.1: un correo de Google sin verificar responde 401', async () => {
    googleResponde({ email: 'juan@unicauca.edu.co', email_verified: false });
    await expect(validarTokenGoogle('token-google')).rejects.toMatchObject({ status: 401 });
  });

  it('sin GOOGLE_CLIENT_ID configurado no valida ningún token', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    await expect(validarTokenGoogle('token-google')).rejects.toThrow('GOOGLE_CLIENT_ID');
  });
});

describe('emitirSesion — CA-5.4.1 (JWT con claims de rol)', () => {
  it('CA-5.4.1: firma un JWT HS256 con id_usuario, email y rol, válido por 8 horas', () => {
    const { token } = emitirSesion(usuarioActivo);
    const payload = jwt.verify(token, SECRETO, { algorithms: ['HS256'] });

    expect(payload).toMatchObject({ id_usuario: 2, email: 'juan@unicauca.edu.co', rol: 'estudiante' });
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
    expect(jwt.decode(token, { complete: true }).header.alg).toBe('HS256');
  });

  it('CA-5.4.1: la respuesta nunca incluye password_hash, ni en el usuario ni en el token', () => {
    const { token, usuario } = emitirSesion(usuarioActivo);

    expect(usuario).toEqual({
      id_usuario: 2,
      nombre_completo: 'Juan Estudiante',
      email: 'juan@unicauca.edu.co',
      rol: 'estudiante',
    });
    expect(jwt.decode(token)).not.toHaveProperty('password_hash');
  });

  it.each([
    ['ausente', ''],
    ['de menos de 32 caracteres', 'corto'],
  ])('no emite sesión con un JWT_SECRET %s (auditoría OWASP H-04)', (_caso, secreto) => {
    vi.stubEnv('JWT_SECRET', secreto);
    expect(() => emitirSesion(usuarioActivo)).toThrow('JWT_SECRET');
  });
});

describe('AutenticacionService.loginConGoogle — CA-5.4.1', () => {
  it('CA-5.4.1: un usuario registrado y activo recibe su sesión', async () => {
    const sesion = await AutenticacionService.loginConGoogle('token-google');

    expect(UsuarioRepository.obtenerPorEmail).toHaveBeenCalledWith('juan@unicauca.edu.co');
    expect(sesion.usuario.rol).toBe('estudiante');
    expect(jwt.verify(sesion.token, SECRETO).id_usuario).toBe(2);
  });

  it('CA-5.4.1: un correo que no está registrado responde 403 (el login no crea usuarios)', async () => {
    UsuarioRepository.obtenerPorEmail.mockResolvedValue(null);
    await expect(AutenticacionService.loginConGoogle('token-google')).rejects.toMatchObject({ status: 403 });
  });

  it('CA-5.4.1: una cuenta inactiva responde 401', async () => {
    UsuarioRepository.obtenerPorEmail.mockResolvedValue({ ...usuarioActivo, activo: false });
    await expect(AutenticacionService.loginConGoogle('token-google')).rejects.toMatchObject({
      status: 401,
      message: 'Cuenta inactiva',
    });
  });
});
