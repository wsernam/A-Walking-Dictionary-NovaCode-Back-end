// Pruebas unitarias de src/controllers/QuizController.js (HU-3.1, HU-3.2, HU-3.3).
// QuizRepository y los servicios se simulan: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuizController } from '../../src/controllers/QuizController.js';
import { QuizRepository } from '../../src/repositories/QuizRepository.js';
import { QuizService } from '../../src/services/QuizService.js';
import { ExportarPDFService } from '../../src/services/ExportarPDFService.js';
import { llamar, errorConStatus, estudiante } from '../helpers/http.js';

vi.mock('../../src/repositories/QuizRepository.js', () => ({
  QuizRepository: { crear: vi.fn(), obtenerPorId: vi.fn(), listar: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn() },
}));
vi.mock('../../src/services/QuizService.js', () => ({
  QuizService: {
    generar: vi.fn(),
    conEstadoEfectivo: vi.fn((quiz) => ({ ...quiz, estado_efectivo: 'abierto' })),
    obtenerPreguntasParaEstudiante: vi.fn(),
    listarDelEstudiante: vi.fn(),
    obtenerResultadoEstudiante: vi.fn(),
  },
}));
vi.mock('../../src/services/ExportarPDFService.js', () => ({ ExportarPDFService: { generarPdfQuiz: vi.fn() } }));

const quiz = { id_quiz: 1, curso_id: 10, titulo: 'Quiz 1', estado: 'programado' };

beforeEach(() => {
  QuizRepository.obtenerPorId.mockResolvedValue(quiz);
});

describe('QuizController.generar — HU-3.1', () => {
  it('CA-3.1.1 / CA-3.1.3: responde 201 con el quiz y las preguntas generadas', async () => {
    QuizService.generar.mockResolvedValue({ quiz, preguntas: [] });

    const { status } = await llamar(QuizController, 'generar', { body: { titulo: 'Quiz 1' } });

    expect(status).toBe(201);
    expect(QuizService.generar).toHaveBeenCalledWith({ titulo: 'Quiz 1' });
  });

  it.each([400, 404, 500])('traduce el %i del servicio', async (codigo) => {
    QuizService.generar.mockRejectedValue(codigo === 500 ? new Error('x') : errorConStatus(codigo));
    expect((await llamar(QuizController, 'generar')).status).toBe(codigo);
  });
});

describe('QuizController — lectura del quiz (CA-3.1.3, estado efectivo)', () => {
  it('CA-3.1.3: obtenerPorId agrega estado_efectivo', async () => {
    const { status, body } = await llamar(QuizController, 'obtenerPorId', { params: { id: '1' } });

    expect(status).toBe(200);
    expect(body.estado_efectivo).toBe('abierto');
  });

  it('obtenerPorId: 404 si no existe, 400 con id inválido, 500 si falla', async () => {
    QuizRepository.obtenerPorId.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(QuizController, 'obtenerPorId', { params: { id: '1' } })).status).toBe(404);
    expect((await llamar(QuizController, 'obtenerPorId', { params: { id: '1' } })).status).toBe(500);
    expect((await llamar(QuizController, 'obtenerPorId', { params: { id: 'abc' } })).status).toBe(400);
  });

  it('CA-3.1.3: listar agrega estado_efectivo a cada quiz; 500 si falla', async () => {
    QuizRepository.listar.mockResolvedValueOnce([quiz, { ...quiz, id_quiz: 2 }]).mockRejectedValueOnce(new Error('x'));

    const { status, body } = await llamar(QuizController, 'listar');
    expect(status).toBe(200);
    expect(body.every((q) => q.estado_efectivo === 'abierto')).toBe(true);
    expect((await llamar(QuizController, 'listar')).status).toBe(500);
  });
});

describe('QuizController — vista del estudiante (HU-3.2, endpoints aprobados 2026-10-07 y 2026-10-11)', () => {
  it('HU-3.2: obtenerPreguntas usa el estudiante del token', async () => {
    QuizService.obtenerPreguntasParaEstudiante.mockResolvedValue({ quiz, preguntas: [] });

    expect((await llamar(QuizController, 'obtenerPreguntas', { params: { id: '1' }, usuario: estudiante })).status).toBe(200);
    expect(QuizService.obtenerPreguntasParaEstudiante).toHaveBeenCalledWith(1, 2);
  });

  it('HU-3.2: listarMios devuelve los quices del estudiante del token', async () => {
    QuizService.listarDelEstudiante.mockResolvedValue([quiz]);

    expect((await llamar(QuizController, 'listarMios', { usuario: estudiante })).status).toBe(200);
    expect(QuizService.listarDelEstudiante).toHaveBeenCalledWith(2);
  });

  it('CA-3.2.3: obtenerResultado devuelve el resultado previo del estudiante del token', async () => {
    QuizService.obtenerResultadoEstudiante.mockResolvedValue({ resultado: { calificacion: 4 } });

    expect((await llamar(QuizController, 'obtenerResultado', { params: { id: '1' }, usuario: estudiante })).status).toBe(200);
    expect(QuizService.obtenerResultadoEstudiante).toHaveBeenCalledWith(1, 2);
  });

  it.each([
    ['obtenerPreguntas', 'obtenerPreguntasParaEstudiante', 403],
    ['obtenerPreguntas', 'obtenerPreguntasParaEstudiante', 400],
    ['obtenerResultado', 'obtenerResultadoEstudiante', 404],
    ['listarMios', 'listarDelEstudiante', 500],
  ])('%s traduce el %s → %i', async (metodo, metodoServicio, codigo) => {
    QuizService[metodoServicio].mockRejectedValue(codigo === 500 ? new Error('x') : errorConStatus(codigo));
    expect((await llamar(QuizController, metodo, { params: { id: '1' }, usuario: estudiante })).status).toBe(codigo);
  });

  it.each(['obtenerPreguntas', 'obtenerResultado', 'exportarPdf', 'actualizar', 'eliminar'])(
    '%s responde 400 si el id no es un número',
    async (metodo) => {
      expect((await llamar(QuizController, metodo, { params: { id: 'abc' }, usuario: estudiante })).status).toBe(400);
    }
  );
});

describe('QuizController.exportarPdf — CA-3.3.2', () => {
  it('CA-3.3.2: responde el PDF del quiz como descarga', async () => {
    ExportarPDFService.generarPdfQuiz.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));

    const { res } = await llamar(QuizController, 'exportarPdf', { params: { id: '1' } });

    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="quiz-1.pdf"',
    });
    expect(Buffer.isBuffer(res.send.mock.calls[0][0])).toBe(true);
  });

  it('CA-3.3.2: un quiz sin preguntas conserva el 404 del servicio', async () => {
    ExportarPDFService.generarPdfQuiz.mockRejectedValue(errorConStatus(404));
    expect((await llamar(QuizController, 'exportarPdf', { params: { id: '1' } })).status).toBe(404);
  });
});

describe('QuizController — CRUD directo (solo docente)', () => {
  const valido = { curso_id: 1, titulo: 'Quiz', semana_corte: 3, estado: 'programado' };

  it('crear exige curso_id, titulo, semana_corte y estado, con sus longitudes máximas', async () => {
    QuizRepository.crear.mockResolvedValue(quiz);

    const faltantes = await llamar(QuizController, 'crear', { body: {} });
    expect(faltantes.body.error).toContain('curso_id, titulo, semana_corte, estado');
    expect(faltantes.body.code).toBe('REQUIRED_FIELDS_MISSING');
    expect((await llamar(QuizController, 'crear', { body: { ...valido, titulo: 'x'.repeat(201) } })).status).toBe(400);
    expect((await llamar(QuizController, 'crear', { body: { ...valido, estado: 'x'.repeat(31) } })).status).toBe(400);
    expect((await llamar(QuizController, 'crear', { body: valido })).status).toBe(201);
    QuizRepository.crear.mockRejectedValueOnce(new Error('x'));
    expect((await llamar(QuizController, 'crear', { body: valido })).status).toBe(500);
  });

  // Fuzzing Schemathesis (docente): sin curso_id el INSERT violaba el NOT NULL y respondía 500.
  it('crear rechaza con 400 un quiz sin curso_id, sin llegar a la base de datos', async () => {
    QuizRepository.crear.mockReset();
    const { status, body } = await llamar(QuizController, 'crear', {
      body: { titulo: 'x', estado: 'programado', semana_corte: 1 },
    });
    expect(status).toBe(400);
    expect(body.code).toBe('REQUIRED_FIELDS_MISSING');
    expect(QuizRepository.crear).not.toHaveBeenCalled();
  });

  it('crear descarta la fecha_creacion del cliente y deja en null las fechas vacías', async () => {
    QuizRepository.crear.mockReset();
    QuizRepository.crear.mockResolvedValue(quiz);
    await llamar(QuizController, 'crear', { body: { ...valido, fecha_creacion: '1999-01-01', fecha_apertura: '' } });
    const guardado = QuizRepository.crear.mock.calls[0][0];
    expect(guardado).not.toHaveProperty('fecha_creacion');
    expect(guardado.fecha_apertura).toBeNull();
    expect(guardado.tiempo_limite_min).toBeNull();
  });

  it.each([
    ['curso_id', 0, 'INVALID_ID'],
    ['curso_id', 2147483648, 'INVALID_ID'],
    ['semana_corte', 1.5, 'INVALID_FIELD_TYPE'],
    ['tiempo_limite_min', -5, 'INVALID_FIELD_TYPE'],
    ['titulo', 42, 'INVALID_FIELD_TYPE'],
    // Fuzzing Schemathesis (docente): PostgreSQL rechaza "+22:38" con 500 (time zone displacement out of range).
    ['fecha_cierre', '0204-01-14T07:53:17+22:38', 'INVALID_FIELD_TYPE'],
    ['fecha_apertura', 'mañana', 'INVALID_FIELD_TYPE'],
  ])('crear y actualizar rechazan con 400 un %s = %s (%s)', async (campo, valor, code) => {
    for (const metodo of ['crear', 'actualizar']) {
      const { status, body } = await llamar(QuizController, metodo, { params: { id: '1' }, body: { ...valido, [campo]: valor } });
      expect(status).toBe(400);
      expect(body.code).toBe(code);
    }
  });

  it('crear y actualizar aceptan fechas ISO 8601 con zona horaria válida', async () => {
    QuizRepository.crear.mockResolvedValue(quiz);
    QuizRepository.actualizar.mockResolvedValue(quiz);
    const body = { ...valido, fecha_apertura: '2026-12-01T08:00:00-05:00', fecha_cierre: '2026-12-01T10:00:00Z', tiempo_limite_min: 30 };
    expect((await llamar(QuizController, 'crear', { body })).status).toBe(201);
    expect((await llamar(QuizController, 'actualizar', { params: { id: '1' }, body })).status).toBe(200);
  });

  it.each(['crear', 'actualizar'])('%s responde 404 COURSE_NOT_FOUND si el curso no existe', async (metodo) => {
    QuizRepository[metodo].mockRejectedValueOnce(Object.assign(new Error('fk'), { code: '23503' }));
    const { status, body } = await llamar(QuizController, metodo, { params: { id: '1' }, body: valido });
    expect(status).toBe(404);
    expect(body.code).toBe('COURSE_NOT_FOUND');
  });

  it.each([
    ['actualizar', quiz, null],
    ['eliminar', true, false],
  ])('%s: 200 si existe, 404 si no, 500 si falla', async (metodo, valor, vacio) => {
    QuizRepository[metodo].mockReset();
    QuizRepository[metodo].mockResolvedValueOnce(valor).mockResolvedValueOnce(vacio).mockRejectedValueOnce(new Error('x'));
    const peticion = { params: { id: '1' }, body: valido };

    expect((await llamar(QuizController, metodo, peticion)).status).toBe(200);
    expect((await llamar(QuizController, metodo, peticion)).status).toBe(404);
    expect((await llamar(QuizController, metodo, peticion)).status).toBe(500);
  });
});
