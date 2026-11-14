// Pruebas unitarias de src/services/AdminUsuarioService.js (HU-023, CA-23.1 y CA-23.2).
// Los repositorios se simulan: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUsuarioService } from '../../src/services/AdminUsuarioService.js';
import { UsuarioRepository } from '../../src/repositories/UsuarioRepository.js';
import { CursoRepository } from '../../src/repositories/CursoRepository.js';

vi.mock('../../src/repositories/UsuarioRepository.js', () => ({
  UsuarioRepository: {
    listarParaAdmin: vi.fn(), enTransaccionAdministracion: vi.fn(), obtenerParaAdmin: vi.fn(),
    contarAdministradoresActivos: vi.fn(), cambiarRol: vi.fn(), cambiarEstado: vi.fn(),
  },
}));
vi.mock('../../src/repositories/CursoRepository.js', () => ({
  CursoRepository: { contarPorDocente: vi.fn() },
}));

const admin = { id_usuario: 1, email: 'admin@unicauca.edu.co', rol: 'administrador' };
const usuario = (extra = {}) => ({
  id_usuario: 5, nombre_completo: 'Ana Pérez', email: 'ana@unicauca.edu.co', rol: 'estudiante', activo: true, ...extra,
});

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  UsuarioRepository.enTransaccionAdministracion.mockImplementation((operacion) => operacion('db'));
  UsuarioRepository.obtenerParaAdmin.mockResolvedValue(usuario());
  UsuarioRepository.contarAdministradoresActivos.mockResolvedValue(2);
  UsuarioRepository.cambiarRol.mockImplementation(async (id, rol) => usuario({ rol }));
  UsuarioRepository.cambiarEstado.mockImplementation(async (id, activo) => usuario({ activo }));
  CursoRepository.contarPorDocente.mockResolvedValue(0);
});

describe('AdminUsuarioService.listar — CA-23.1', () => {
  it('CA-23.1: pagina, normaliza filtros y no expone password_hash', async () => {
    UsuarioRepository.listarParaAdmin.mockResolvedValue({ usuarios: [usuario()], total: 45 });

    const r = await AdminUsuarioService.listar({ search: ' ana ', rol: 'docente', activo: 'false', page: '2', limit: '10' });

    expect(UsuarioRepository.listarParaAdmin).toHaveBeenCalledWith({
      busqueda: 'ana', rol: 'docente', activo: false, limite: 10, desplazamiento: 10,
    });
    expect(r).toMatchObject({ page: 2, limit: 10, total: 45, total_pages: 5 });
    expect(r.data[0]).not.toHaveProperty('password_hash');
  });

  it('usa página 1, 20 por página y limita a 100', async () => {
    UsuarioRepository.listarParaAdmin.mockResolvedValue({ usuarios: [], total: 0 });
    await AdminUsuarioService.listar({});
    expect(UsuarioRepository.listarParaAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ limite: 20, desplazamiento: 0 }));
    await AdminUsuarioService.listar({ limit: '500' });
    expect(UsuarioRepository.listarParaAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ limite: 100 }));
  });

  it.each([
    [{ rol: 'invitado' }, 'ADMIN_INVALID_ROLE'],
    [{ activo: 'quizas' }, 'ADMIN_INVALID_STATUS'],
    [{ page: '0' }, 'ADMIN_INVALID_QUERY'],
    [{ limit: 'abc' }, 'ADMIN_INVALID_QUERY'],
    [{ search: ['a', 'b'] }, 'ADMIN_INVALID_QUERY'],
  ])('filtro inválido %j responde 400 %s', async (query, code) => {
    await expect(AdminUsuarioService.listar(query)).rejects.toMatchObject({ status: 400, code });
    expect(UsuarioRepository.listarParaAdmin).not.toHaveBeenCalled();
  });
});

describe('AdminUsuarioService.cambiarRol — CA-23.2', () => {
  it('CA-23.2: cambia el rol y deja una línea de auditoría sin correos', async () => {
    const r = await AdminUsuarioService.cambiarRol(admin, 5, 'docente');
    expect(r.rol).toBe('docente');
    expect(UsuarioRepository.cambiarRol).toHaveBeenCalledWith(5, 'docente', 'db');
    const linea = console.info.mock.calls[0][0];
    expect(linea).toContain('[AUDITORIA] cambio_rol admin=1 objetivo=5 rol_anterior=estudiante rol_nuevo=docente');
    expect(linea).not.toContain('@');
  });

  it.each(['invitado', 'superadmin', undefined, 7])('rol %j fuera de los tres asignables responde 400', async (rol) => {
    await expect(AdminUsuarioService.cambiarRol(admin, 5, rol)).rejects.toMatchObject({ status: 400, code: 'ADMIN_INVALID_ROLE' });
    expect(UsuarioRepository.cambiarRol).not.toHaveBeenCalled();
  });

  it('no puede cambiarse su propio rol (409)', async () => {
    await expect(AdminUsuarioService.cambiarRol(admin, 1, 'docente')).rejects.toMatchObject({ status: 409, code: 'ADMIN_SELF_CHANGE' });
    expect(UsuarioRepository.cambiarRol).not.toHaveBeenCalled();
  });

  it('usuario inexistente responde 404', async () => {
    UsuarioRepository.obtenerParaAdmin.mockResolvedValue(null);
    await expect(AdminUsuarioService.cambiarRol(admin, 99, 'docente')).rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
  });

  it('no quita el rol al último administrador activo (409)', async () => {
    UsuarioRepository.obtenerParaAdmin.mockResolvedValue(usuario({ rol: 'administrador' }));
    UsuarioRepository.contarAdministradoresActivos.mockResolvedValue(1);
    await expect(AdminUsuarioService.cambiarRol(admin, 5, 'docente')).rejects.toMatchObject({ status: 409, code: 'ADMIN_LAST_ADMIN' });
    expect(UsuarioRepository.cambiarRol).not.toHaveBeenCalled();
  });

  it('sí permite quitar el rol a un administrador si queda otro activo', async () => {
    UsuarioRepository.obtenerParaAdmin.mockResolvedValue(usuario({ rol: 'administrador' }));
    expect((await AdminUsuarioService.cambiarRol(admin, 5, 'estudiante')).rol).toBe('estudiante');
  });

  it('un docente con cursos no puede cambiar de rol (409); sin cursos sí', async () => {
    UsuarioRepository.obtenerParaAdmin.mockResolvedValue(usuario({ rol: 'docente' }));
    CursoRepository.contarPorDocente.mockResolvedValue(2);
    await expect(AdminUsuarioService.cambiarRol(admin, 5, 'estudiante')).rejects.toMatchObject({ status: 409, code: 'ADMIN_TEACHER_HAS_COURSES' });
    CursoRepository.contarPorDocente.mockResolvedValue(0);
    expect((await AdminUsuarioService.cambiarRol(admin, 5, 'estudiante')).rol).toBe('estudiante');
  });

  it('el mismo rol no escribe ni audita', async () => {
    await AdminUsuarioService.cambiarRol(admin, 5, 'estudiante');
    expect(UsuarioRepository.cambiarRol).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });
});

describe('AdminUsuarioService.cambiarEstado — CA-23.2', () => {
  it('CA-23.2: desactiva la cuenta y audita', async () => {
    const r = await AdminUsuarioService.cambiarEstado(admin, 5, false);
    expect(r.activo).toBe(false);
    expect(UsuarioRepository.cambiarEstado).toHaveBeenCalledWith(5, false, 'db');
    expect(console.info.mock.calls[0][0]).toContain('cambio_estado admin=1 objetivo=5 activo_anterior=true activo_nuevo=false');
  });

  it.each(['false', 0, undefined])('activo %j no booleano responde 400', async (activo) => {
    await expect(AdminUsuarioService.cambiarEstado(admin, 5, activo)).rejects.toMatchObject({ status: 400, code: 'ADMIN_INVALID_STATUS' });
  });

  it('no puede desactivar su propia cuenta (409)', async () => {
    await expect(AdminUsuarioService.cambiarEstado(admin, 1, false)).rejects.toMatchObject({ status: 409, code: 'ADMIN_SELF_CHANGE' });
  });

  it('no desactiva al último administrador activo (409)', async () => {
    UsuarioRepository.obtenerParaAdmin.mockResolvedValue(usuario({ rol: 'administrador' }));
    UsuarioRepository.contarAdministradoresActivos.mockResolvedValue(1);
    await expect(AdminUsuarioService.cambiarEstado(admin, 5, false)).rejects.toMatchObject({ status: 409, code: 'ADMIN_LAST_ADMIN' });
  });

  it('reactiva una cuenta inactiva y 404 si no existe', async () => {
    UsuarioRepository.obtenerParaAdmin.mockResolvedValueOnce(usuario({ activo: false }));
    expect((await AdminUsuarioService.cambiarEstado(admin, 5, true)).activo).toBe(true);
    UsuarioRepository.obtenerParaAdmin.mockResolvedValueOnce(null);
    await expect(AdminUsuarioService.cambiarEstado(admin, 99, true)).rejects.toMatchObject({ status: 404 });
  });

    it('S3: desactivar a un docente con cursos está permitido y no consulta ni toca los cursos', async () => {
    UsuarioRepository.obtenerParaAdmin.mockResolvedValue(usuario({ rol: 'docente' }));
    CursoRepository.contarPorDocente.mockResolvedValue(3);

    const r = await AdminUsuarioService.cambiarEstado(admin, 5, false);

    expect(r.activo).toBe(false);
    expect(UsuarioRepository.cambiarEstado).toHaveBeenCalledWith(5, false, 'db');
    // La desactivación solo modifica usuario.activo: los cursos y el historial no se tocan.
    expect(CursoRepository.contarPorDocente).not.toHaveBeenCalled();
  });
});