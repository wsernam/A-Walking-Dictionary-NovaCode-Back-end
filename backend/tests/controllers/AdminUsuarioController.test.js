// Pruebas unitarias de src/controllers/AdminUsuarioController.js (HU-023).
// AdminUsuarioService se simula: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUsuarioController } from '../../src/controllers/AdminUsuarioController.js';
import { AdminUsuarioService } from '../../src/services/AdminUsuarioService.js';
import { llamar, errorConStatus } from '../helpers/http.js';

vi.mock('../../src/services/AdminUsuarioService.js', () => ({
  AdminUsuarioService: { listar: vi.fn(), cambiarRol: vi.fn(), cambiarEstado: vi.fn() },
}));

const administrador = { id_usuario: 1, email: 'admin@unicauca.edu.co', rol: 'administrador' };

beforeEach(() => {
  AdminUsuarioService.listar.mockResolvedValue({ data: [], page: 1, limit: 20, total: 0, total_pages: 0 });
  AdminUsuarioService.cambiarRol.mockResolvedValue({ id_usuario: 5, rol: 'docente' });
  AdminUsuarioService.cambiarEstado.mockResolvedValue({ id_usuario: 5, activo: false });
});

describe('AdminUsuarioController — HU-023', () => {
  it('CA-23.1: listar responde 200 y pasa la query al servicio', async () => {
    const { status } = await llamar(AdminUsuarioController, 'listar', { usuario: administrador, query: { search: 'ana' } });
    expect(status).toBe(200);
    expect(AdminUsuarioService.listar).toHaveBeenCalledWith({ search: 'ana' });
  });

  it('CA-23.2: cambiarRol usa el administrador del JWT y el id numérico de la ruta', async () => {
    const { status, body } = await llamar(AdminUsuarioController, 'cambiarRol', {
      usuario: administrador, params: { id: '5' }, body: { rol: 'docente' },
    });
    expect(status).toBe(200);
    expect(body.rol).toBe('docente');
    expect(AdminUsuarioService.cambiarRol).toHaveBeenCalledWith(administrador, 5, 'docente');
  });

  it('CA-23.2: cambiarEstado delega con el booleano del body', async () => {
    const { status } = await llamar(AdminUsuarioController, 'cambiarEstado', {
      usuario: administrador, params: { id: '5' }, body: { activo: false },
    });
    expect(status).toBe(200);
    expect(AdminUsuarioService.cambiarEstado).toHaveBeenCalledWith(administrador, 5, false);
  });

  it.each(['cambiarRol', 'cambiarEstado'])('%s: id inválido responde 400 ADMIN_INVALID_ID sin llamar al servicio', async (metodo) => {
    const { status, body } = await llamar(AdminUsuarioController, metodo, { usuario: administrador, params: { id: 'abc' }, body: {} });
    expect(status).toBe(400);
    expect(body.code).toBe('ADMIN_INVALID_ID');
    expect(AdminUsuarioService[metodo]).not.toHaveBeenCalled();
  });

  it('conserva el status y code del servicio (409) y responde 500 ante un error inesperado', async () => {
    AdminUsuarioService.cambiarRol
      .mockRejectedValueOnce(Object.assign(errorConStatus(409, 'No puede cambiar su propio rol'), { code: 'ADMIN_SELF_CHANGE' }))
      .mockRejectedValueOnce(new Error('boom'));
    const op = { usuario: administrador, params: { id: '1' }, body: { rol: 'docente' } };
    const r1 = await llamar(AdminUsuarioController, 'cambiarRol', op);
    expect(r1.status).toBe(409);
    expect(r1.body.code).toBe('ADMIN_SELF_CHANGE');
    expect((await llamar(AdminUsuarioController, 'cambiarRol', op)).status).toBe(500);
  });

  it('listar y cambiarEstado devuelven el error del servicio', async () => {
    AdminUsuarioService.listar.mockRejectedValueOnce(Object.assign(errorConStatus(400, 'x'), { code: 'ADMIN_INVALID_QUERY' }));
    expect((await llamar(AdminUsuarioController, 'listar', { usuario: administrador, query: { page: '0' } })).status).toBe(400);
    AdminUsuarioService.cambiarEstado.mockRejectedValueOnce(new Error('boom'));
    expect((await llamar(AdminUsuarioController, 'cambiarEstado', { usuario: administrador, params: { id: '5' }, body: { activo: false } })).status).toBe(500);
  });
});