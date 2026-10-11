// Pruebas unitarias de src/controllers/AutenticacionController.js (HU-5.4, CA-5.4.1).
// AutenticacionService se simula: no hay red ni base de datos.

import { describe, it, expect, vi } from 'vitest';
import { AutenticacionController } from '../../src/controllers/AutenticacionController.js';
import { AutenticacionService } from '../../src/services/AutenticacionService.js';
import { llamar, errorConStatus } from '../helpers/http.js';

vi.mock('../../src/services/AutenticacionService.js', () => ({ AutenticacionService: { loginConGoogle: vi.fn() } }));

describe('AutenticacionController.loginGoogle — HU-5.4', () => {
  it('CA-5.4.1: responde 200 con el JWT y el usuario', async () => {
    AutenticacionService.loginConGoogle.mockResolvedValue({ token: 'jwt', usuario: { id_usuario: 2, rol: 'estudiante' } });

    const { status, body } = await llamar(AutenticacionController, 'loginGoogle', { body: { idToken: 'token-google' } });

    expect(status).toBe(200);
    expect(body.token).toBe('jwt');
    expect(AutenticacionService.loginConGoogle).toHaveBeenCalledWith('token-google');
  });

  it.each([
    ['sin idToken', 400],
    ['token inválido o cuenta inactiva', 401],
    ['usuario no registrado', 403],
  ])('CA-5.4.1: %s responde %i', async (_caso, codigo) => {
    AutenticacionService.loginConGoogle.mockRejectedValue(errorConStatus(codigo));
    expect((await llamar(AutenticacionController, 'loginGoogle', { body: {} })).status).toBe(codigo);
  });

  it('responde 500 ante un error inesperado', async () => {
    AutenticacionService.loginConGoogle.mockRejectedValue(new Error('x'));
    expect((await llamar(AutenticacionController, 'loginGoogle', { body: {} })).status).toBe(500);
  });
});
