// Pruebas unitarias de src/services/InscripcionService.js (HU-5.3, CA-5.3.1 y CA-5.3.2).
// Los repositorios se simulan: no hay base de datos.
// [SUPUESTO PENDIENTE P10]: la inscripción nueva queda "activa" y el código vive en
// curso.codigo_acceso, columna que no está en el DER (D-04).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InscripcionService } from '../../src/services/InscripcionService.js';
import { CursoRepository } from '../../src/repositories/CursoRepository.js';
import { UsuarioRepository } from '../../src/repositories/UsuarioRepository.js';
import { InscripcionRepository } from '../../src/repositories/InscripcionRepository.js';

vi.mock('../../src/repositories/CursoRepository.js', () => ({
  CursoRepository: { obtenerPorId: vi.fn(), obtenerPorCodigoAcceso: vi.fn(), guardarCodigoAcceso: vi.fn() },
}));
vi.mock('../../src/repositories/UsuarioRepository.js', () => ({
  UsuarioRepository: { obtenerPorId: vi.fn(), obtenerPorEmail: vi.fn() },
}));
vi.mock('../../src/repositories/InscripcionRepository.js', () => ({
  InscripcionRepository: { obtenerPorCursoYEstudiante: vi.fn(), crear: vi.fn() },
}));

const curso = { id_curso: 10, nombre: 'Literatura Anglófona', codigo_acceso: 'K7M2P9QX' };
const estudiante = { id_usuario: 2, email: 'juan@unicauca.edu.co', rol: 'estudiante' };
const docente = { id_usuario: 1, email: 'siler@unicauca.edu.co', rol: 'docente' };

beforeEach(() => {
  CursoRepository.obtenerPorId.mockResolvedValue(curso);
  CursoRepository.obtenerPorCodigoAcceso.mockResolvedValue(curso);
  UsuarioRepository.obtenerPorId.mockResolvedValue(estudiante);
  UsuarioRepository.obtenerPorEmail.mockResolvedValue(estudiante);
  InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue(null);
  InscripcionRepository.crear.mockImplementation(async (datos) => ({ id_inscripcion: 5, ...datos }));
});

describe('InscripcionService.inscribirsePorCodigo — CA-5.3.1 (inscripción con código)', () => {
  it('CA-5.3.1 [SUPUESTO PENDIENTE P10]: un código válido vincula al estudiante con el curso en estado "activa"', async () => {
    const inscripcion = await InscripcionService.inscribirsePorCodigo(2, 'K7M2P9QX');

    expect(CursoRepository.obtenerPorCodigoAcceso).toHaveBeenCalledWith('K7M2P9QX');
    expect(inscripcion).toMatchObject({ curso_id: 10, estudiante_id: 2, estado: 'activa' });
    expect(inscripcion.fecha_inscripcion).toBeInstanceOf(Date);
  });

  it('CA-5.3.1: un código que no existe responde 404', async () => {
    CursoRepository.obtenerPorCodigoAcceso.mockResolvedValue(null);

    await expect(InscripcionService.inscribirsePorCodigo(2, 'NOEXISTE')).rejects.toMatchObject({ status: 404 });
    expect(InscripcionRepository.crear).not.toHaveBeenCalled();
  });

  it('CA-5.3.1: un usuario que no es estudiante no puede inscribirse (400)', async () => {
    UsuarioRepository.obtenerPorId.mockResolvedValue(docente);
    await expect(InscripcionService.inscribirsePorCodigo(1, 'K7M2P9QX')).rejects.toMatchObject({ status: 400 });
  });

  it('CA-5.3.1: un estudiante inexistente responde 404', async () => {
    UsuarioRepository.obtenerPorId.mockResolvedValue(null);
    await expect(InscripcionService.inscribirsePorCodigo(99, 'K7M2P9QX')).rejects.toMatchObject({ status: 404 });
  });

  it('CA-5.3.1: un estudiante ya inscrito en el curso recibe 409 sin duplicar la inscripción', async () => {
    InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue({ id_inscripcion: 5 });

    await expect(InscripcionService.inscribirsePorCodigo(2, 'K7M2P9QX')).rejects.toMatchObject({ status: 409 });
    expect(InscripcionRepository.crear).not.toHaveBeenCalled();
  });
});

describe('InscripcionService.asignarPorCorreo — CA-5.3.2 (inscripción directa por la docente)', () => {
  it('CA-5.3.2: busca al estudiante por correo y lo inscribe en el curso', async () => {
    const inscripcion = await InscripcionService.asignarPorCorreo(10, 'juan@unicauca.edu.co');

    expect(UsuarioRepository.obtenerPorEmail).toHaveBeenCalledWith('juan@unicauca.edu.co');
    expect(inscripcion).toMatchObject({ curso_id: 10, estudiante_id: 2, estado: 'activa' });
  });

  it('CA-5.3.2: un curso que no existe responde 404', async () => {
    CursoRepository.obtenerPorId.mockResolvedValue(null);
    await expect(InscripcionService.asignarPorCorreo(99, 'juan@unicauca.edu.co')).rejects.toMatchObject({ status: 404 });
  });

  it('CA-5.3.2: un correo que no está registrado responde 404', async () => {
    UsuarioRepository.obtenerPorEmail.mockResolvedValue(null);
    await expect(InscripcionService.asignarPorCorreo(10, 'nadie@unicauca.edu.co')).rejects.toMatchObject({ status: 404 });
  });

  it('CA-5.3.2: no se puede inscribir a un docente como estudiante (400)', async () => {
    UsuarioRepository.obtenerPorEmail.mockResolvedValue(docente);
    await expect(InscripcionService.asignarPorCorreo(10, 'siler@unicauca.edu.co')).rejects.toMatchObject({ status: 400 });
  });

  it('CA-5.3.2: un estudiante ya inscrito recibe 409 sin duplicar la inscripción', async () => {
    InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue({ id_inscripcion: 5 });

    await expect(InscripcionService.asignarPorCorreo(10, 'juan@unicauca.edu.co')).rejects.toMatchObject({ status: 409 });
    expect(InscripcionRepository.crear).not.toHaveBeenCalled();
  });
});

describe('InscripcionService.generarCodigoAcceso — CA-5.3.1 (código que entrega la docente)', () => {
  beforeEach(() => {
    CursoRepository.guardarCodigoAcceso.mockImplementation(async (id_curso, codigo_acceso) => ({
      ...curso,
      id_curso,
      codigo_acceso,
    }));
  });

  it('CA-5.3.1: genera un código de 8 caracteres sin letras ni números ambiguos (O, 0, I, 1)', async () => {
    CursoRepository.obtenerPorCodigoAcceso.mockResolvedValue(null);

    for (let i = 0; i < 20; i += 1) {
      const { codigo_acceso } = await InscripcionService.generarCodigoAcceso(10);
      expect(codigo_acceso).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it('CA-5.3.1: si el código generado ya existe, genera otro hasta encontrar uno libre', async () => {
    CursoRepository.obtenerPorCodigoAcceso
      .mockResolvedValueOnce({ id_curso: 11 })
      .mockResolvedValueOnce({ id_curso: 12 })
      .mockResolvedValueOnce(null);

    const resultado = await InscripcionService.generarCodigoAcceso(10);

    expect(CursoRepository.obtenerPorCodigoAcceso).toHaveBeenCalledTimes(3);
    expect(CursoRepository.guardarCodigoAcceso).toHaveBeenCalledWith(10, resultado.codigo_acceso);
  });

  it('CA-5.3.1: responde 404 si el curso no existe', async () => {
    CursoRepository.obtenerPorId.mockResolvedValue(null);
    await expect(InscripcionService.generarCodigoAcceso(99)).rejects.toMatchObject({ status: 404 });
  });
});
