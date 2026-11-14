import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/repositories/ReporteCursoRepository.js', () => ({
  ReporteCursoRepository: {
    obtenerCurso: vi.fn(),
    listarEstudiantes: vi.fn(),
    listarQuices: vi.fn(),
    listarCalificaciones: vi.fn(),
  },
}));

import { ReporteCursoRepository } from '../../src/repositories/ReporteCursoRepository.js';
import { ReporteCursoService } from '../../src/services/ReporteCursoService.js';

const docente = { id_usuario: 7, rol: 'docente' };

function fila(extra = {}) {
  return {
    estudiante_id: 3,
    nombre_completo: 'Juan Estudiante',
    codigo_estudiantil: '104618021234',
    nivel_ingles: 'B2',
    palabras_anadidas: 5,
    palabras_aprobadas: 3,
    coautorias: 2,
    ...extra,
  };
}

describe('ReporteCursoService.obtenerDatos — HU-020 (CA-20.1, CA-20.2, CA-20.3)', () => {
  beforeEach(() => {
    // Un DISABLE_AUTH=true del entorno local no debe alterar las pruebas.
    vi.stubEnv('DISABLE_AUTH', 'false');
    vi.mocked(ReporteCursoRepository.obtenerCurso)
      .mockReset()
      .mockResolvedValue({ id_curso: 1, nombre: 'Literatura Anglófona', docente_id: 7 });
    vi.mocked(ReporteCursoRepository.listarEstudiantes).mockReset().mockResolvedValue([]);
    vi.mocked(ReporteCursoRepository.listarQuices).mockReset().mockResolvedValue([]);
    vi.mocked(ReporteCursoRepository.listarCalificaciones).mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('CA-20.1: devuelve el nombre del curso y la fecha de generación', async () => {
    const datos = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(datos.generado_en).toBeInstanceOf(Date);
    expect(datos.curso).toEqual({ id_curso: 1, nombre: 'Literatura Anglófona' });
  });

  it('CA-20.1: cada estudiante trae nombre, código, nivel MCER, palabras añadidas, aprobadas y coautorías', async () => {
    ReporteCursoRepository.listarEstudiantes.mockResolvedValue([fila()]);

    const { estudiantes } = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(estudiantes).toHaveLength(1);
    expect(estudiantes[0]).toMatchObject({
      estudiante_id: 3,
      nombre_completo: 'Juan Estudiante',
      codigo_estudiantil: '104618021234',
      nivel_ingles: 'B2',
      palabras_anadidas: 5,
      palabras_aprobadas: 3,
      coautorias: 2,
    });
  });

  it('CA-20.1: convierte a número los conteos y suma los totales del grupo', async () => {
    ReporteCursoRepository.listarEstudiantes.mockResolvedValue([
      fila({ estudiante_id: 3, palabras_anadidas: '5', palabras_aprobadas: '3', coautorias: '2' }),
      fila({ estudiante_id: 4, palabras_anadidas: '4', palabras_aprobadas: '1', coautorias: '0' }),
      fila({ estudiante_id: 5, palabras_anadidas: '0', palabras_aprobadas: '0', coautorias: '6' }),
    ]);

    const { totales } = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(totales).toEqual({ estudiantes: 3, palabras_anadidas: 9, palabras_aprobadas: 4, coautorias: 8 });
  });

  it('CA-20.1: un estudiante sin aportes aparece con ceros, sin error', async () => {
    ReporteCursoRepository.listarEstudiantes.mockResolvedValue([
      fila({ palabras_anadidas: 0, palabras_aprobadas: 0, coautorias: 0 }),
    ]);

    const { estudiantes, totales } = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(estudiantes[0]).toMatchObject({ palabras_anadidas: 0, palabras_aprobadas: 0, coautorias: 0 });
    expect(totales.palabras_anadidas).toBe(0);
  });

  it('CA-20.1: un curso sin estudiantes devuelve la lista vacía y totales en cero, sin error', async () => {
    const datos = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(datos.estudiantes).toEqual([]);
    expect(datos.totales).toEqual({ estudiantes: 0, palabras_anadidas: 0, palabras_aprobadas: 0, coautorias: 0 });
  });

  it('CA-20.2: arma la nota de cada estudiante en cada quiz y su promedio', async () => {
    ReporteCursoRepository.listarEstudiantes.mockResolvedValue([fila({ estudiante_id: 3 }), fila({ estudiante_id: 4 })]);
    ReporteCursoRepository.listarQuices.mockResolvedValue([
      { id_quiz: 10, titulo: 'Quiz 1' },
      { id_quiz: 11, titulo: 'Quiz 2' },
    ]);
    ReporteCursoRepository.listarCalificaciones.mockResolvedValue([
      { quiz_id: 10, estudiante_id: 3, calificacion: '4.00' },
      { quiz_id: 11, estudiante_id: 3, calificacion: '3.00' },
      { quiz_id: 10, estudiante_id: 4, calificacion: '2.50' },
      { quiz_id: 11, estudiante_id: 4, calificacion: '5' },
    ]);

    const { estudiantes, quices } = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(quices).toEqual([
      { id_quiz: 10, titulo: 'Quiz 1' },
      { id_quiz: 11, titulo: 'Quiz 2' },
    ]);
    expect(estudiantes[0].notas).toEqual([4, 3]);
    expect(estudiantes[0].promedio).toBe(3.5);
    expect(estudiantes[1].notas).toEqual([2.5, 5]);
    expect(estudiantes[1].promedio).toBe(3.75);
  });

  it('CA-20.2: el quiz que no presentó queda en null ("No presentó") y no cuenta como 0 en el promedio', async () => {
    ReporteCursoRepository.listarEstudiantes.mockResolvedValue([fila({ estudiante_id: 3 })]);
    ReporteCursoRepository.listarQuices.mockResolvedValue([
      { id_quiz: 10, titulo: 'Quiz 1' },
      { id_quiz: 11, titulo: 'Quiz 2' },
      { id_quiz: 12, titulo: 'Quiz 3' },
    ]);
    ReporteCursoRepository.listarCalificaciones.mockResolvedValue([
      { quiz_id: 10, estudiante_id: 3, calificacion: '4.00' },
      { quiz_id: 12, estudiante_id: 3, calificacion: '3.00' },
    ]);

    const { estudiantes } = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(estudiantes[0].notas).toEqual([4, null, 3]);
    expect(estudiantes[0].promedio).toBe(3.5);
  });

  it('CA-20.2: una calificación de 0 es una nota presentada, no "No presentó"', async () => {
    ReporteCursoRepository.listarEstudiantes.mockResolvedValue([fila({ estudiante_id: 3 })]);
    ReporteCursoRepository.listarQuices.mockResolvedValue([{ id_quiz: 10, titulo: 'Quiz 1' }]);
    ReporteCursoRepository.listarCalificaciones.mockResolvedValue([
      { quiz_id: 10, estudiante_id: 3, calificacion: '0' },
    ]);

    const { estudiantes } = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(estudiantes[0].notas).toEqual([0]);
    expect(estudiantes[0].promedio).toBe(0);
  });

  it('CA-20.2: un estudiante que no presentó ningún quiz tiene promedio null', async () => {
    ReporteCursoRepository.listarEstudiantes.mockResolvedValue([fila({ estudiante_id: 3 })]);
    ReporteCursoRepository.listarQuices.mockResolvedValue([{ id_quiz: 10, titulo: 'Quiz 1' }]);

    const { estudiantes } = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(estudiantes[0].notas).toEqual([null]);
    expect(estudiantes[0].promedio).toBeNull();
  });

  it('CA-20.2: un curso sin quices devuelve la lista vacía y notas vacías, sin error', async () => {
    ReporteCursoRepository.listarEstudiantes.mockResolvedValue([fila()]);

    const { quices, estudiantes } = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(quices).toEqual([]);
    expect(estudiantes[0].notas).toEqual([]);
    expect(estudiantes[0].promedio).toBeNull();
  });

  it('la nota de un estudiante no se mezcla con la de otro quiz ni de otro estudiante', async () => {
    ReporteCursoRepository.listarEstudiantes.mockResolvedValue([fila({ estudiante_id: 3 }), fila({ estudiante_id: 4 })]);
    ReporteCursoRepository.listarQuices.mockResolvedValue([
      { id_quiz: 1, titulo: 'Quiz A' },
      { id_quiz: 11, titulo: 'Quiz B' },
    ]);
    // "1:14" y "11:4" no deben confundirse con "11:4"/"1:14" de otro par.
    ReporteCursoRepository.listarCalificaciones.mockResolvedValue([
      { quiz_id: 11, estudiante_id: 4, calificacion: '5.00' },
    ]);

    const { estudiantes } = await ReporteCursoService.obtenerDatos(docente, '1');

    expect(estudiantes[0].notas).toEqual([null, null]);
    expect(estudiantes[1].notas).toEqual([null, 5]);
  });

  it('consulta el repositorio con el id del curso como número', async () => {
    await ReporteCursoService.obtenerDatos(docente, '1');

    expect(ReporteCursoRepository.obtenerCurso).toHaveBeenCalledWith(1);
    expect(ReporteCursoRepository.listarEstudiantes).toHaveBeenCalledWith(1);
    expect(ReporteCursoRepository.listarQuices).toHaveBeenCalledWith(1);
    expect(ReporteCursoRepository.listarCalificaciones).toHaveBeenCalledWith(1);
  });

  it('acepta el id del curso como número', async () => {
    await expect(ReporteCursoService.obtenerDatos(docente, 1)).resolves.toBeDefined();
  });

  it('CA-20.3: un estudiante recibe 403 (REPORT_FORBIDDEN) y no se consulta la BD', async () => {
    await expect(
      ReporteCursoService.obtenerDatos({ id_usuario: 3, rol: 'estudiante' }, '1')
    ).rejects.toMatchObject({
      status: 403,
      code: 'REPORT_FORBIDDEN',
      message: 'No tiene permisos para acceder a este recurso',
    });
    expect(ReporteCursoRepository.obtenerCurso).not.toHaveBeenCalled();
  });

  it('CA-20.3: un rol distinto de docente (invitado) recibe 403', async () => {
    await expect(
      ReporteCursoService.obtenerDatos({ id_usuario: 9, rol: 'invitado' }, '1')
    ).rejects.toMatchObject({ status: 403, code: 'REPORT_FORBIDDEN' });
    expect(ReporteCursoRepository.obtenerCurso).not.toHaveBeenCalled();
  });

  it('CA-20.3: cualquier docente puede consultar el reporte de un curso de otra docente', async () => {
    ReporteCursoRepository.obtenerCurso.mockResolvedValue({
      id_curso: 2,
      nombre: 'Otro curso',
      docente_id: 99,
    });

    const datos = await ReporteCursoService.obtenerDatos(docente, '2');

    expect(datos.curso).toEqual({id_curso: 2,nombre: 'Otro curso',});
    expect(ReporteCursoRepository.obtenerCurso).toHaveBeenCalledWith(2);
    expect(ReporteCursoRepository.listarEstudiantes).toHaveBeenCalledWith(2);
    expect(ReporteCursoRepository.listarQuices).toHaveBeenCalledWith(2);
    expect(ReporteCursoRepository.listarCalificaciones).toHaveBeenCalledWith(2);
  });

  it('un curso que no existe responde 404 (COURSE_NOT_FOUND)', async () => {
    ReporteCursoRepository.obtenerCurso.mockResolvedValue(null);

    await expect(ReporteCursoService.obtenerDatos(docente, '999')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
      message: 'Curso no encontrado',
    });
    expect(ReporteCursoRepository.listarEstudiantes).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '1.5', '', undefined, null])('un curso_id inválido (%s) responde 400 INVALID_ID', async (valor) => {
    await expect(ReporteCursoService.obtenerDatos(docente, valor)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_ID',
      message: 'id inválido',
    });
    expect(ReporteCursoRepository.obtenerCurso).not.toHaveBeenCalled();
  });

  it('con DISABLE_AUTH (solo desarrollo) la docente puede pedir el curso de cualquier docente', async () => {
    vi.stubEnv('DISABLE_AUTH', 'true');
    ReporteCursoRepository.obtenerCurso.mockResolvedValue({ id_curso: 2, nombre: 'Otro curso', docente_id: 99 });

    await expect(
      ReporteCursoService.obtenerDatos({ id_usuario: 0, rol: 'docente' }, '2')
    ).resolves.toBeDefined();
  });
});
