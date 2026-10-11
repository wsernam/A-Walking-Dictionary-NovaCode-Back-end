// Pruebas unitarias de src/controllers/UsuarioController.js (HU-5.2 y auditoría OWASP H-01/H-03).
// PerfilService se simula: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsuarioController } from '../../src/controllers/UsuarioController.js';
import { PerfilService } from '../../src/services/PerfilService.js';
import { llamar, errorConStatus, docente, estudiante } from '../helpers/http.js';

vi.mock('../../src/services/PerfilService.js', () => ({
  PerfilService: { obtenerPerfil: vi.fn(), actualizarPerfil: vi.fn(), obtenerContextoAcademico: vi.fn() },
}));

beforeEach(() => {
  PerfilService.obtenerPerfil.mockResolvedValue({ estudiante_id: 2 });
  PerfilService.obtenerContextoAcademico.mockResolvedValue({ id_inscripcion: 5 });
  PerfilService.actualizarPerfil.mockResolvedValue({ estudiante_id: 2, nivel_ingles: 'B2' });
});

describe.each([
  ['obtenerPerfil', 'obtenerPerfil'],
  ['obtenerContextoAcademico', 'obtenerContextoAcademico'],
])('UsuarioController.%s — CA-5.2.1 (H-01 / H-03)', (metodo, metodoServicio) => {
  it('CA-5.2.1: el estudiante ve sus propios datos', async () => {
    expect((await llamar(UsuarioController, metodo, { params: { id: '2' }, usuario: estudiante })).status).toBe(200);
    expect(PerfilService[metodoServicio]).toHaveBeenCalledWith(2);
  });

  it('un estudiante que pide los datos de otro recibe 403 sin consultarlos', async () => {
    expect((await llamar(UsuarioController, metodo, { params: { id: '8' }, usuario: estudiante })).status).toBe(403);
    expect(PerfilService[metodoServicio]).not.toHaveBeenCalled();
  });

  it('la docente ve los datos de cualquier estudiante (decisión 2026-10-08)', async () => {
    expect((await llamar(UsuarioController, metodo, { params: { id: '8' }, usuario: docente })).status).toBe(200);
  });

  it('id inválido responde 400; usuario inexistente conserva el 404 del servicio; error 500', async () => {
    expect((await llamar(UsuarioController, metodo, { params: { id: 'abc' }, usuario: docente })).status).toBe(400);
    PerfilService[metodoServicio].mockRejectedValueOnce(errorConStatus(404)).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(UsuarioController, metodo, { params: { id: '8' }, usuario: docente })).status).toBe(404);
    expect((await llamar(UsuarioController, metodo, { params: { id: '8' }, usuario: docente })).status).toBe(500);
  });
});

describe('UsuarioController.actualizarPerfil — CA-5.2.1, CA-5.2.2', () => {
  it('CA-5.2.1: actualiza el perfil del usuario del token, nunca el de un id enviado en el body', async () => {
    const { status } = await llamar(UsuarioController, 'actualizarPerfil', {
      body: { nivel_ingles: 'B2', intereses: ['Poesía'], estudiante_id: 8, rol: 'docente' },
      usuario: estudiante,
    });

    expect(status).toBe(200);
    expect(PerfilService.actualizarPerfil).toHaveBeenCalledWith(2, {
      nivel_ingles: 'B2',
      codigo_estudiantil: undefined,
      avatar: undefined,
      intereses: ['Poesía'],
    });
  });

  it('CA-5.2.1: conserva el 400 de validación del servicio; error inesperado 500', async () => {
    PerfilService.actualizarPerfil.mockRejectedValueOnce(errorConStatus(400)).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(UsuarioController, 'actualizarPerfil', { usuario: estudiante })).status).toBe(400);
    expect((await llamar(UsuarioController, 'actualizarPerfil', { usuario: estudiante })).status).toBe(500);
  });
});
