// Pruebas unitarias de src/controllers/InscripcionController.js (HU-5.3, CA-5.3.1 y CA-5.3.2).
// InscripcionService e InscripcionRepository se simulan: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InscripcionController } from '../../src/controllers/InscripcionController.js';
import { InscripcionRepository } from '../../src/repositories/InscripcionRepository.js';
import { InscripcionService } from '../../src/services/InscripcionService.js';
import { llamar, errorConStatus, estudiante } from '../helpers/http.js';

vi.mock('../../src/repositories/InscripcionRepository.js', () => ({
  InscripcionRepository: {
    crear: vi.fn(),
    obtenerPorId: vi.fn(),
    listar: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    listarEstudiantesPorCurso: vi.fn(),
  },
}));
vi.mock('../../src/services/InscripcionService.js', () => ({
  InscripcionService: { generarCodigoAcceso: vi.fn(), inscribirsePorCodigo: vi.fn(), asignarPorCorreo: vi.fn() },
}));

const inscripcion = { id_inscripcion: 5, curso_id: 10, estudiante_id: 2, estado: 'activa' };

beforeEach(() => {
  InscripcionService.inscribirsePorCodigo.mockResolvedValue(inscripcion);
  InscripcionService.asignarPorCorreo.mockResolvedValue(inscripcion);
  InscripcionService.generarCodigoAcceso.mockResolvedValue({ id_curso: 10, codigo_acceso: 'K7M2P9QX' });
});

describe('InscripcionController.inscribirsePorCodigo — CA-5.3.1', () => {
  it('CA-5.3.1: inscribe al estudiante del token con el código normalizado (sin espacios, en mayúscula)', async () => {
    const { status } = await llamar(InscripcionController, 'inscribirsePorCodigo', {
      body: { codigo_acceso: '  k7m2p9qx ', estudiante_id: 99 },
      usuario: estudiante,
    });

    expect(status).toBe(201);
    expect(InscripcionService.inscribirsePorCodigo).toHaveBeenCalledWith(2, 'K7M2P9QX');
  });

  it('CA-5.3.1: sin código responde 400 sin llamar al servicio', async () => {
    expect((await llamar(InscripcionController, 'inscribirsePorCodigo', { usuario: estudiante })).status).toBe(400);
    expect(InscripcionService.inscribirsePorCodigo).not.toHaveBeenCalled();
  });

  it.each([404, 409, 400])('CA-5.3.1: traduce el %i del servicio', async (codigo) => {
    InscripcionService.inscribirsePorCodigo.mockRejectedValue(errorConStatus(codigo));
    const { status } = await llamar(InscripcionController, 'inscribirsePorCodigo', {
      body: { codigo_acceso: 'X' },
      usuario: estudiante,
    });
    expect(status).toBe(codigo);
  });
});

describe('InscripcionController.asignarPorCorreo — CA-5.3.2', () => {
  it('CA-5.3.2: asigna al estudiante por su correo (sin espacios) en el curso de la URL', async () => {
    const { status } = await llamar(InscripcionController, 'asignarPorCorreo', {
      params: { id: '10' },
      body: { email: ' juan@unicauca.edu.co ' },
    });

    expect(status).toBe(201);
    expect(InscripcionService.asignarPorCorreo).toHaveBeenCalledWith(10, 'juan@unicauca.edu.co');
  });

  it('CA-5.3.2: sin correo o con id de curso inválido responde 400', async () => {
    expect((await llamar(InscripcionController, 'asignarPorCorreo', { params: { id: '10' } })).status).toBe(400);
    expect((await llamar(InscripcionController, 'asignarPorCorreo', { params: { id: 'abc' }, body: { email: 'x' } })).status).toBe(400);
  });

  it('CA-5.3.2: traduce el 409 del servicio (ya inscrito)', async () => {
    InscripcionService.asignarPorCorreo.mockRejectedValue(errorConStatus(409));
    const { status } = await llamar(InscripcionController, 'asignarPorCorreo', { params: { id: '10' }, body: { email: 'x' } });
    expect(status).toBe(409);
  });
});

describe('InscripcionController.generarCodigoAcceso — CA-5.3.1', () => {
  it('CA-5.3.1: devuelve el código generado para el curso', async () => {
    expect(await llamar(InscripcionController, 'generarCodigoAcceso', { params: { id: '10' } })).toMatchObject({
      status: 200,
      body: { id_curso: 10, codigo_acceso: 'K7M2P9QX' },
    });
  });

  it('CA-5.3.1: id inválido responde 400; curso inexistente conserva el 404', async () => {
    expect((await llamar(InscripcionController, 'generarCodigoAcceso', { params: { id: 'abc' } })).status).toBe(400);
    InscripcionService.generarCodigoAcceso.mockRejectedValue(errorConStatus(404));
    expect((await llamar(InscripcionController, 'generarCodigoAcceso', { params: { id: '10' } })).status).toBe(404);
  });
});

describe('InscripcionController.listarEstudiantesPorCurso — CA-5.3.2', () => {
  it('CA-5.3.2: lista los estudiantes del curso; id inválido 400; error 500', async () => {
    InscripcionRepository.listarEstudiantesPorCurso.mockResolvedValueOnce([estudiante]).mockRejectedValueOnce(new Error('x'));

    expect(await llamar(InscripcionController, 'listarEstudiantesPorCurso', { params: { id: '10' } })).toMatchObject({
      status: 200,
      body: [estudiante],
    });
    expect((await llamar(InscripcionController, 'listarEstudiantesPorCurso', { params: { id: '10' } })).status).toBe(500);
    expect((await llamar(InscripcionController, 'listarEstudiantesPorCurso', { params: { id: 'abc' } })).status).toBe(400);
  });
});

describe('InscripcionController — CRUD genérico [SIN RUTA MONTADA]', () => {
  it('crear exige estado (máx. 30 caracteres) y responde 201', async () => {
    InscripcionRepository.crear.mockResolvedValue(inscripcion);

    expect((await llamar(InscripcionController, 'crear', { body: {} })).status).toBe(400);
    expect((await llamar(InscripcionController, 'crear', { body: { estado: 'x'.repeat(31) } })).status).toBe(400);
    expect((await llamar(InscripcionController, 'crear', { body: { estado: 'activa' } })).status).toBe(201);
    InscripcionRepository.crear.mockRejectedValueOnce(new Error('x'));
    expect((await llamar(InscripcionController, 'crear', { body: { estado: 'activa' } })).status).toBe(500);
  });

  it('listar responde 200 o 500', async () => {
    InscripcionRepository.listar.mockResolvedValueOnce([inscripcion]).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(InscripcionController, 'listar')).status).toBe(200);
    expect((await llamar(InscripcionController, 'listar')).status).toBe(500);
  });

  it.each([
    ['obtenerPorId', 'obtenerPorId', inscripcion, null],
    ['actualizar', 'actualizar', inscripcion, null],
    ['eliminar', 'eliminar', true, false],
  ])('%s: 200 si existe, 404 si no, 400 con id inválido, 500 si falla', async (metodo, metodoRepo, valor, vacio) => {
    InscripcionRepository[metodoRepo]
      .mockResolvedValueOnce(valor)
      .mockResolvedValueOnce(vacio)
      .mockRejectedValueOnce(new Error('x'));

    expect((await llamar(InscripcionController, metodo, { params: { id: '5' } })).status).toBe(200);
    expect((await llamar(InscripcionController, metodo, { params: { id: '5' } })).status).toBe(404);
    expect((await llamar(InscripcionController, metodo, { params: { id: '5' } })).status).toBe(500);
    expect((await llamar(InscripcionController, metodo, { params: { id: 'abc' } })).status).toBe(400);
  });
});
