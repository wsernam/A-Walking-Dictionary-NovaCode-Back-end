// Pruebas unitarias de src/services/RegistroService.js (HU-5.1, CA-5.1.1 y CA-5.1.2).
// El registro es con Google, sin contraseña (decisión del equipo 2026-10-10): la parte de bcrypt
// y "clave débil" del backlog no aplica. Google y UsuarioRepository se simulan.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { RegistroService } from '../../src/services/RegistroService.js';
import { UsuarioRepository } from '../../src/repositories/UsuarioRepository.js';

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(function OAuth2Client() {
    this.verifyIdToken = verifyIdToken;
  }),
}));
vi.mock('../../src/repositories/UsuarioRepository.js', () => ({
  UsuarioRepository: { obtenerPorEmail: vi.fn(), crearDesdeGoogle: vi.fn() },
}));

const SECRETO = 'secreto-de-prueba-con-mas-de-32-caracteres';

function googleResponde(payload) {
  verifyIdToken.mockResolvedValue({ getPayload: () => ({ email_verified: true, ...payload }) });
}

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', SECRETO);
  vi.stubEnv('GOOGLE_CLIENT_ID', 'cliente-de-prueba.apps.googleusercontent.com');
  googleResponde({ email: 'ana@unicauca.edu.co', name: 'Ana Pérez' });
  UsuarioRepository.obtenerPorEmail.mockResolvedValue(null);
  UsuarioRepository.crearDesdeGoogle.mockImplementation(async (datos) => ({
    id_usuario: 9,
    activo: true,
    ...datos,
  }));
});

describe('RegistroService.registrarConGoogle — CA-5.1.1 (registro con correo institucional)', () => {
  it('CA-5.1.1: crea la cuenta con rol "estudiante" y entrega la sesión', async () => {
    const sesion = await RegistroService.registrarConGoogle('token-google');

    expect(UsuarioRepository.crearDesdeGoogle).toHaveBeenCalledWith({
      nombre_completo: 'Ana Pérez',
      email: 'ana@unicauca.edu.co',
      rol: 'estudiante',
    });
    expect(sesion.usuario).toMatchObject({ id_usuario: 9, rol: 'estudiante' });
    expect(jwt.verify(sesion.token, SECRETO).rol).toBe('estudiante');
  });

  it.each([
    'ana@gmail.com',
    'ana@fake-unicauca.edu.co',
    'ana@unicauca.edu.co.ejemplo.com',
  ])('CA-5.1.1 [SUPUESTO PENDIENTE D-11]: rechaza con 400 el correo no institucional %s', async (email) => {
    googleResponde({ email });

    await expect(RegistroService.registrarConGoogle('token-google')).rejects.toMatchObject({ status: 400 });
    expect(UsuarioRepository.crearDesdeGoogle).not.toHaveBeenCalled();
  });

  it('CA-5.1.1: el correo se guarda en minúsculas', async () => {
    googleResponde({ email: 'Ana@UNICAUCA.EDU.CO', name: 'Ana Pérez' });

    await RegistroService.registrarConGoogle('token-google');

    expect(UsuarioRepository.crearDesdeGoogle.mock.calls[0][0].email).toBe('ana@unicauca.edu.co');
  });

  it('CA-5.1.1: si Google no envía el nombre se usa la parte del correo antes de la @', async () => {
    googleResponde({ email: 'ana.perez@unicauca.edu.co' });

    await RegistroService.registrarConGoogle('token-google');

    expect(UsuarioRepository.crearDesdeGoogle.mock.calls[0][0].nombre_completo).toBe('ana.perez');
  });

  it('CA-5.1.1: un token de Google inválido no crea ninguna cuenta', async () => {
    verifyIdToken.mockRejectedValue(new Error('Invalid token'));

    await expect(RegistroService.registrarConGoogle('token-falso')).rejects.toMatchObject({ status: 401 });
    expect(UsuarioRepository.crearDesdeGoogle).not.toHaveBeenCalled();
  });
});

describe('RegistroService.registrarConGoogle — CA-5.1.2 (correos duplicados)', () => {
  it('CA-5.1.2: un correo ya registrado responde 409 sin crear otra cuenta', async () => {
    UsuarioRepository.obtenerPorEmail.mockResolvedValue({ id_usuario: 3, email: 'ana@unicauca.edu.co' });

    await expect(RegistroService.registrarConGoogle('token-google')).rejects.toMatchObject({ status: 409 });
    expect(UsuarioRepository.crearDesdeGoogle).not.toHaveBeenCalled();
  });

  it('CA-5.1.2: dos registros simultáneos del mismo correo (error 23505) responden 409', async () => {
    UsuarioRepository.crearDesdeGoogle.mockRejectedValue(Object.assign(new Error('duplicado'), { code: '23505' }));

    await expect(RegistroService.registrarConGoogle('token-google')).rejects.toMatchObject({ status: 409 });
  });

  it('CA-5.1.2: cualquier otro error de base de datos se propaga sin convertirse en 409', async () => {
    UsuarioRepository.crearDesdeGoogle.mockRejectedValue(new Error('conexión perdida'));

    await expect(RegistroService.registrarConGoogle('token-google')).rejects.toThrow('conexión perdida');
  });
});
