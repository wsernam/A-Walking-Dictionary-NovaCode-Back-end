// Pruebas unitarias de src/controllers/RegistroController.js (HU-5.1, CA-5.1.1 y CA-5.1.2).
// RegistroService se simula: no hay red ni base de datos.

import { describe, it, expect, vi } from 'vitest';
import { RegistroController } from '../../src/controllers/RegistroController.js';
import { RegistroService } from '../../src/services/RegistroService.js';
import { llamar, errorConStatus } from '../helpers/http.js';

vi.mock('../../src/services/RegistroService.js', () => ({ RegistroService: { registrarConGoogle: vi.fn() } }));

describe('RegistroController.registrarConGoogle — HU-5.1', () => {
  it('CA-5.1.1: responde 201 con el token y el usuario creado', async () => {
    RegistroService.registrarConGoogle.mockResolvedValue({ token: 'jwt', usuario: { id_usuario: 9, rol: 'estudiante' } });

    const { status, body } = await llamar(RegistroController, 'registrarConGoogle', { body: { idToken: 'token-google' } });

    expect(status).toBe(201);
    expect(body).toMatchObject({ token: 'jwt', usuario: { rol: 'estudiante' } });
    expect(RegistroService.registrarConGoogle).toHaveBeenCalledWith('token-google');
  });

  it.each([
    ['correo no institucional', 400],
    ['token de Google inválido', 401],
    ['correo ya registrado (CA-5.1.2)', 409],
  ])('traduce el error del servicio por %s a HTTP %i', async (_caso, codigo) => {
    RegistroService.registrarConGoogle.mockRejectedValue(errorConStatus(codigo));
    expect((await llamar(RegistroController, 'registrarConGoogle', { body: { idToken: 'x' } })).status).toBe(codigo);
  });

  it('responde 500 ante un error inesperado', async () => {
    RegistroService.registrarConGoogle.mockRejectedValue(new Error('x'));
    expect((await llamar(RegistroController, 'registrarConGoogle', { body: { idToken: 'x' } })).status).toBe(500);
  });
});
