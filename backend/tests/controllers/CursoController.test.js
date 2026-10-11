// Pruebas unitarias de src/controllers/CursoController.js (HU-5.3 y auditoría OWASP H-02/H-13).
// CursoRepository se simula: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CursoController } from '../../src/controllers/CursoController.js';
import { CursoRepository } from '../../src/repositories/CursoRepository.js';
import { llamar, docente, estudiante } from '../helpers/http.js';

vi.mock('../../src/repositories/CursoRepository.js', () => ({
  CursoRepository: { crear: vi.fn(), obtenerPorId: vi.fn(), listar: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn() },
}));

const curso = { id_curso: 10, nombre: 'Literatura Anglófona', periodo: '2026-2', docente_id: 1, codigo_acceso: 'K7M2P9QX' };
const datosNuevos = { nombre: 'Literatura Anglófona', periodo: '2026-2', estado: 'activo', fecha_inicio: '2026-08-01', fecha_fin: '2026-12-01' };

beforeEach(() => {
  vi.stubEnv('DISABLE_AUTH', 'false');
  CursoRepository.obtenerPorId.mockResolvedValue(curso);
  CursoRepository.listar.mockResolvedValue([curso]);
  CursoRepository.crear.mockImplementation(async (datos) => ({ id_curso: 10, ...datos }));
});

describe('CursoController — código de acceso solo para la docente (CA-5.3.1, auditoría H-02)', () => {
  it.each([
    ['un estudiante', estudiante],
    ['un invitado sin sesión', undefined],
  ])('CA-5.3.1: %s no ve el código de acceso al listar ni al consultar un curso', async (_caso, usuario) => {
    const lista = await llamar(CursoController, 'listar', { usuario });
    const uno = await llamar(CursoController, 'obtenerPorId', { params: { id: '10' }, usuario });

    expect(lista.body[0]).not.toHaveProperty('codigo_acceso');
    expect(uno.body).not.toHaveProperty('codigo_acceso');
    expect(uno.body.nombre).toBe('Literatura Anglófona');
  });

  it('CA-5.3.1: la docente sí ve el código de acceso', async () => {
    expect((await llamar(CursoController, 'listar', { usuario: docente })).body[0].codigo_acceso).toBe('K7M2P9QX');
    expect((await llamar(CursoController, 'obtenerPorId', { params: { id: '10' }, usuario: docente })).body.codigo_acceso).toBe('K7M2P9QX');
  });

  it('obtenerPorId: 404 si no existe, 400 con id inválido, 500 si falla; listar: 500 si falla', async () => {
    CursoRepository.obtenerPorId.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(CursoController, 'obtenerPorId', { params: { id: '10' } })).status).toBe(404);
    expect((await llamar(CursoController, 'obtenerPorId', { params: { id: '10' } })).status).toBe(500);
    expect((await llamar(CursoController, 'obtenerPorId', { params: { id: 'abc' } })).status).toBe(400);
    CursoRepository.listar.mockRejectedValueOnce(new Error('x'));
    expect((await llamar(CursoController, 'listar')).status).toBe(500);
  });
});

describe('CursoController.crear — auditoría OWASP H-13 (identidad desde el token)', () => {
  it('el docente_id sale del token, no del body', async () => {
    const { status } = await llamar(CursoController, 'crear', { body: { ...datosNuevos, docente_id: 99 }, usuario: docente });

    expect(status).toBe(201);
    expect(CursoRepository.crear.mock.calls[0][0].docente_id).toBe(1);
  });

  it('indica los campos obligatorios que faltan (400)', async () => {
    const { status, body } = await llamar(CursoController, 'crear', { body: {}, usuario: docente });
    expect(status).toBe(400);
    expect(body.error).toContain('nombre, periodo, estado, fecha_inicio, fecha_fin');
  });

  it.each([
    ['nombre', 151],
    ['periodo', 21],
    ['estado', 31],
  ])('rechaza con 400 un %s de %i caracteres', async (campo, largo) => {
    expect((await llamar(CursoController, 'crear', { body: { ...datosNuevos, [campo]: 'x'.repeat(largo) }, usuario: docente })).status).toBe(400);
  });

  it('con DISABLE_AUTH en desarrollo toma docente_id del body y lo exige', async () => {
    vi.stubEnv('DISABLE_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'development');

    expect((await llamar(CursoController, 'crear', { body: datosNuevos })).body.error).toContain('docente_id');
    await llamar(CursoController, 'crear', { body: { ...datosNuevos, docente_id: 7 } });
    expect(CursoRepository.crear.mock.calls[0][0].docente_id).toBe(7);
  });

  it('responde 500 ante un error inesperado', async () => {
    CursoRepository.crear.mockRejectedValue(new Error('x'));
    expect((await llamar(CursoController, 'crear', { body: datosNuevos, usuario: docente })).status).toBe(500);
  });
});

describe('CursoController — editar y borrar [SIN RUTA MONTADA]', () => {
  it.each([
    ['actualizar', curso, null],
    ['eliminar', true, false],
  ])('%s: 200 si existe, 404 si no, 400 con id inválido, 500 si falla', async (metodo, valor, vacio) => {
    CursoRepository[metodo].mockResolvedValueOnce(valor).mockResolvedValueOnce(vacio).mockRejectedValueOnce(new Error('x'));

    expect((await llamar(CursoController, metodo, { params: { id: '10' } })).status).toBe(200);
    expect((await llamar(CursoController, metodo, { params: { id: '10' } })).status).toBe(404);
    expect((await llamar(CursoController, metodo, { params: { id: '10' } })).status).toBe(500);
    expect((await llamar(CursoController, metodo, { params: { id: 'abc' } })).status).toBe(400);
  });
});
