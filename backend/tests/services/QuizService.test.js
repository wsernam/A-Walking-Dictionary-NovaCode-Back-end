// Pruebas unitarias de src/services/QuizService.js (HU-3.1 y HU-3.2).
// Todos los repositorios se simulan: las pruebas no necesitan PostgreSQL.
// El reloj se fija con fake timers para que las pruebas de fechas no dependan del día en que corren.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuizService } from '../../src/services/QuizService.js';
import { CursoRepository } from '../../src/repositories/CursoRepository.js';
import { InscripcionRepository } from '../../src/repositories/InscripcionRepository.js';
import { MazoRepository } from '../../src/repositories/MazoRepository.js';
import { QuizRepository } from '../../src/repositories/QuizRepository.js';
import { PreguntaQuizRepository } from '../../src/repositories/PreguntaQuizRepository.js';
import { ResultadoQuizRepository } from '../../src/repositories/ResultadoQuizRepository.js';
import { RespuestaQuizRepository } from '../../src/repositories/RespuestaQuizRepository.js';
import { TarjetaRepository } from '../../src/repositories/TarjetaRepository.js';

vi.mock('../../src/repositories/CursoRepository.js', () => ({ CursoRepository: { obtenerPorId: vi.fn() } }));
vi.mock('../../src/repositories/InscripcionRepository.js', () => ({
  InscripcionRepository: { obtenerPorCursoYEstudiante: vi.fn() },
}));
vi.mock('../../src/repositories/MazoRepository.js', () => ({ MazoRepository: { obtenerPorId: vi.fn() } }));
vi.mock('../../src/repositories/QuizRepository.js', () => ({
  QuizRepository: { obtenerPorId: vi.fn(), crearConMazosYPreguntas: vi.fn(), listarPorEstudiante: vi.fn() },
}));
vi.mock('../../src/repositories/PreguntaQuizRepository.js', () => ({
  PreguntaQuizRepository: { listarPorQuiz: vi.fn() },
}));
vi.mock('../../src/repositories/ResultadoQuizRepository.js', () => ({
  ResultadoQuizRepository: { obtenerPorQuizYEstudiante: vi.fn(), crearConRespuestas: vi.fn() },
}));
vi.mock('../../src/repositories/RespuestaQuizRepository.js', () => ({
  RespuestaQuizRepository: { listarPorResultado: vi.fn() },
}));
vi.mock('../../src/repositories/TarjetaRepository.js', () => ({
  TarjetaRepository: { listarAprobadasPorMazos: vi.fn() },
}));

const AHORA = new Date('2026-10-10T12:00:00Z');
const MIN = 60 * 1000;
const enMinutos = (minutos) => new Date(AHORA.getTime() + minutos * MIN).toISOString();

// Pool de tarjetas revisado_docente: "Cocinar " repite (sin mayúsculas ni espacios) la traducción
// de "cook", así que hay 5 traducciones distintas entre 6 tarjetas.
const POOL = [
  { id_tarjeta: 1, palabra: 'cook', traduccion: 'cocinar' },
  { id_tarjeta: 2, palabra: 'bake', traduccion: 'hornear' },
  { id_tarjeta: 3, palabra: 'fry', traduccion: 'freír' },
  { id_tarjeta: 4, palabra: 'boil', traduccion: 'hervir' },
  { id_tarjeta: 5, palabra: 'roast', traduccion: 'asar' },
  { id_tarjeta: 6, palabra: 'cook up', traduccion: 'Cocinar ' },
];
const normalizar = (texto) => String(texto).trim().toLowerCase();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AHORA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('QuizService.calcularEstadoEfectivo — CA-3.1.3 [SUPUESTO PENDIENTE P6]', () => {
  const quiz = { estado: 'programado', fecha_apertura: enMinutos(-60), fecha_cierre: enMinutos(60) };

  it('CA-3.1.3: antes de fecha_apertura el quiz sigue "programado"', () => {
    expect(QuizService.calcularEstadoEfectivo({ ...quiz, fecha_apertura: enMinutos(10) })).toBe('programado');
  });

  it('CA-3.1.3: entre apertura y cierre el quiz se publica como "abierto"', () => {
    expect(QuizService.calcularEstadoEfectivo(quiz)).toBe('abierto');
  });

  it('CA-3.1.3: después de fecha_cierre el quiz queda "cerrado"', () => {
    expect(QuizService.calcularEstadoEfectivo({ ...quiz, fecha_cierre: enMinutos(-1) })).toBe('cerrado');
  });

  it('CA-3.1.3: un estado guardado distinto de "programado" se respeta sin mirar las fechas', () => {
    expect(QuizService.calcularEstadoEfectivo({ ...quiz, estado: 'cerrado' })).toBe('cerrado');
  });
});

describe('QuizService.generar — HU-3.1 (CA-3.1.1, CA-3.1.2, CA-3.1.3)', () => {
  const datosValidos = () => ({
    curso_id: 10,
    titulo: 'Quiz acumulativo 1',
    mazo_ids: [1, 2, 2],
    fecha_apertura: enMinutos(60),
    fecha_cierre: enMinutos(180),
    tiempo_limite_min: 30,
  });

  beforeEach(() => {
    CursoRepository.obtenerPorId.mockResolvedValue({ id_curso: 10 });
    MazoRepository.obtenerPorId.mockImplementation(async (id) => ({
      id_mazo: id,
      curso_id: 10,
      semana: id === 1 ? 2 : 5,
    }));
    TarjetaRepository.listarAprobadasPorMazos.mockResolvedValue(POOL);
    QuizRepository.crearConMazosYPreguntas.mockImplementation(async (quiz, _mazoIds, preguntas) => ({
      quiz: { id_quiz: 99, ...quiz },
      preguntas,
    }));
  });

  it('CA-3.1.3: si faltan campos obligatorios responde 400 indicando cuáles', async () => {
    await expect(QuizService.generar({})).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining(
        'curso_id, titulo, mazo_ids, fecha_apertura, fecha_cierre, tiempo_limite_min'
      ),
    });
  });

  it.each([
    ['fecha_apertura no es una fecha', { fecha_apertura: 'no-es-fecha' }],
    ['fecha_cierre no es posterior a fecha_apertura', { fecha_cierre: enMinutos(60) }],
    ['tiempo_limite_min no es entero', { tiempo_limite_min: 1.5 }],
    ['la ventana es menor que tiempo_limite_min', { tiempo_limite_min: 121 }],
    ['titulo supera 200 caracteres', { titulo: 'x'.repeat(201) }],
    ['cantidad_preguntas es 0', { cantidad_preguntas: 0 }],
    ['mazo_ids contiene valores no enteros', { mazo_ids: [1, 'a'] }],
  ])('CA-3.1.3: responde 400 cuando %s', async (_caso, cambios) => {
    await expect(QuizService.generar({ ...datosValidos(), ...cambios })).rejects.toMatchObject({ status: 400 });
    expect(QuizRepository.crearConMazosYPreguntas).not.toHaveBeenCalled();
  });

  it('responde 404 si el curso no existe', async () => {
    CursoRepository.obtenerPorId.mockResolvedValue(null);
    await expect(QuizService.generar(datosValidos())).rejects.toMatchObject({ status: 404 });
  });

  it('responde 404 si algún mazo no existe', async () => {
    MazoRepository.obtenerPorId.mockImplementation(async (id) =>
      id === 2 ? null : { id_mazo: id, curso_id: 10, semana: 2 }
    );
    await expect(QuizService.generar(datosValidos())).rejects.toMatchObject({
      status: 404,
      message: 'El mazo 2 no existe',
    });
  });

  it('responde 404 si un mazo pertenece a otro curso', async () => {
    MazoRepository.obtenerPorId.mockImplementation(async (id) => ({ id_mazo: id, curso_id: id === 2 ? 11 : 10, semana: 2 }));
    await expect(QuizService.generar(datosValidos())).rejects.toMatchObject({ status: 404 });
  });

  it('CA-3.1.1: consulta solo las tarjetas aprobadas de los mazos elegidos, sin repetir mazos', async () => {
    await QuizService.generar(datosValidos());

    expect(TarjetaRepository.listarAprobadasPorMazos).toHaveBeenCalledWith([1, 2]);
    expect(QuizRepository.crearConMazosYPreguntas.mock.calls[0][1]).toEqual([1, 2]);
  });

  it('CA-3.1.2: con menos de 4 traducciones distintas (sin distinguir mayúsculas) responde 400', async () => {
    TarjetaRepository.listarAprobadasPorMazos.mockResolvedValue([POOL[0], POOL[1], POOL[2], POOL[5]]);

    await expect(QuizService.generar(datosValidos())).rejects.toMatchObject({ status: 400 });
    expect(QuizRepository.crearConMazosYPreguntas).not.toHaveBeenCalled();
  });

  it('CA-3.1.2: cada pregunta tiene 4 opciones distintas tomadas del pool, incluida la correcta (50 generaciones)', async () => {
    const traduccionesDelPool = new Set(POOL.map((t) => t.traduccion));

    for (let i = 0; i < 50; i += 1) {
      const { preguntas } = await QuizService.generar(datosValidos());

      for (const p of preguntas) {
        const opciones = [p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d];
        expect(opciones.every((o) => o !== null)).toBe(true);
        expect(new Set(opciones.map(normalizar)).size).toBe(4);
        expect(opciones).toContain(p.respuesta_correcta);
        expect(opciones.every((o) => traduccionesDelPool.has(o))).toBe(true);
      }
    }
  });

  it('CA-3.1.2: la respuesta correcta es la traducción de la tarjeta y el orden va de 1 a n', async () => {
    const { preguntas } = await QuizService.generar(datosValidos());

    expect(preguntas.map((p) => p.orden)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const p of preguntas) {
      const tarjeta = POOL.find((t) => t.id_tarjeta === p.tarjeta_id);
      expect(p.respuesta_correcta).toBe(tarjeta.traduccion);
      expect(p.enunciado).toContain(tarjeta.palabra);
    }
  });

  it('CA-3.1.2: cantidad_preguntas limita la cantidad de preguntas', async () => {
    const { preguntas } = await QuizService.generar({ ...datosValidos(), cantidad_preguntas: 2 });
    expect(preguntas).toHaveLength(2);
  });

  it('CA-3.1.2: si cantidad_preguntas supera el pool se usan todas las tarjetas aprobadas', async () => {
    const { preguntas } = await QuizService.generar({ ...datosValidos(), cantidad_preguntas: 100 });
    expect(preguntas).toHaveLength(POOL.length);
  });

  it('CA-3.1.3: guarda el quiz en estado "programado" con sus fechas y tiempo límite', async () => {
    const datos = datosValidos();
    const { quiz } = await QuizService.generar(datos);

    expect(QuizRepository.crearConMazosYPreguntas.mock.calls[0][0]).toMatchObject({
      estado: 'programado',
      fecha_apertura: datos.fecha_apertura,
      fecha_cierre: datos.fecha_cierre,
      tiempo_limite_min: 30,
    });
    expect(quiz.estado_efectivo).toBe('programado');
  });

  it('CA-3.1.3 [SUPUESTO PENDIENTE P5]: semana_corte es la semana más alta de los mazos incluidos', async () => {
    await QuizService.generar(datosValidos());
    expect(QuizRepository.crearConMazosYPreguntas.mock.calls[0][0].semana_corte).toBe(5);
  });
});

describe('QuizService.enviarRespuestas — HU-3.2 (CA-3.2.1, CA-3.2.2, CA-3.2.3)', () => {
  const quizAbierto = {
    id_quiz: 1,
    curso_id: 10,
    estado: 'programado',
    fecha_apertura: enMinutos(-60),
    fecha_cierre: enMinutos(60),
    tiempo_limite_min: 20,
  };
  const PREGUNTAS = [
    { id_pregunta: 1, respuesta_correcta: 'cocinar' },
    { id_pregunta: 2, respuesta_correcta: 'hornear' },
    { id_pregunta: 3, respuesta_correcta: 'freír' },
    { id_pregunta: 4, respuesta_correcta: 'hervir' },
  ];
  const tresDeCuatro = [
    { pregunta_id: 1, respuesta_estudiante: 'cocinar' },
    { pregunta_id: 2, respuesta_estudiante: 'hornear' },
    { pregunta_id: 3, respuesta_estudiante: 'freír' },
    { pregunta_id: 4, respuesta_estudiante: 'asar' },
  ];
  const resultadoPrevio = { id_resultado: 50, quiz_id: 1, estudiante_id: 2, calificacion: 3.75 };

  beforeEach(() => {
    QuizRepository.obtenerPorId.mockResolvedValue(quizAbierto);
    InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue({ id_inscripcion: 5 });
    ResultadoQuizRepository.obtenerPorQuizYEstudiante.mockResolvedValue(null);
    PreguntaQuizRepository.listarPorQuiz.mockResolvedValue(PREGUNTAS);
    ResultadoQuizRepository.crearConRespuestas.mockImplementation(async (resultado, respuestas) => ({
      resultado,
      respuestas,
    }));
    RespuestaQuizRepository.listarPorResultado.mockResolvedValue([{ id_respuesta: 1 }]);
  });

  it('responde 400 si respuestas no es un arreglo', async () => {
    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: 'x' })).rejects.toMatchObject({ status: 400 });
    expect(QuizRepository.obtenerPorId).not.toHaveBeenCalled();
  });

  it('responde 404 si el quiz no existe', async () => {
    QuizRepository.obtenerPorId.mockResolvedValue(null);
    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: [] })).rejects.toMatchObject({ status: 404 });
  });

  it('responde 403 si el estudiante no está inscrito en el curso del quiz', async () => {
    InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue(null);
    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: [] })).rejects.toMatchObject({ status: 403 });
    expect(InscripcionRepository.obtenerPorCursoYEstudiante).toHaveBeenCalledWith(10, 2);
  });

  it('CA-3.1.3: responde 400 si el quiz todavía no abre', async () => {
    QuizRepository.obtenerPorId.mockResolvedValue({ ...quizAbierto, fecha_apertura: enMinutos(5) });
    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: [] })).rejects.toMatchObject({ status: 400 });
  });

  it('CA-3.1.3: responde 400 si el quiz ya cerró hace más del margen', async () => {
    QuizRepository.obtenerPorId.mockResolvedValue({ ...quizAbierto, fecha_cierre: enMinutos(-1) });
    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: [] })).rejects.toMatchObject({ status: 400 });
  });

  it('CA-3.2.1 [SUPUESTO PENDIENTE P3]: acepta un envío hasta 30 s después del cierre (autoenvío con latencia)', async () => {
    QuizRepository.obtenerPorId.mockResolvedValue({ ...quizAbierto, fecha_cierre: enMinutos(-10 / 60) });
    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: tresDeCuatro })).resolves.toBeDefined();
  });

  it('CA-3.2.1: un quiz cerrado manualmente no tiene margen de gracia', async () => {
    QuizRepository.obtenerPorId.mockResolvedValue({
      ...quizAbierto,
      estado: 'cerrado',
      fecha_cierre: enMinutos(-10 / 60),
    });
    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: tresDeCuatro })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('CA-3.2.2: calcula aciertos, puntaje y el desglose de cada respuesta', async () => {
    const { resultado, respuestas } = await QuizService.enviarRespuestas(1, 2, { respuestas: tresDeCuatro });

    expect(resultado).toMatchObject({ quiz_id: 1, estudiante_id: 2, puntaje_obtenido: 3, puntaje_maximo: 4 });
    expect(respuestas.map((r) => [r.pregunta_id, r.es_correcta, r.puntaje_obtenido])).toEqual([
      [1, true, 1],
      [2, true, 1],
      [3, true, 1],
      [4, false, 0],
    ]);
  });

  it('CA-3.2.2 [SUPUESTO PENDIENTE P2]: la calificación usa la escala 0-5 (3 de 4 → 3.75)', async () => {
    const { resultado } = await QuizService.enviarRespuestas(1, 2, { respuestas: tresDeCuatro });
    expect(resultado.calificacion).toBe(3.75);
  });

  it('CA-3.2.1: las preguntas sin responder o con respuesta null cuentan como incorrectas', async () => {
    const { resultado, respuestas } = await QuizService.enviarRespuestas(1, 2, {
      respuestas: [
        { pregunta_id: 1, respuesta_estudiante: 'cocinar' },
        { pregunta_id: 2, respuesta_estudiante: null },
      ],
    });

    expect(resultado.puntaje_obtenido).toBe(1);
    expect(respuestas.filter((r) => r.respuesta_estudiante === null)).toHaveLength(3);
    expect(respuestas.filter((r) => !r.es_correcta)).toHaveLength(3);
  });

  it('CA-3.2.1: rechaza con 400 un envío que excede el tiempo límite más el margen', async () => {
    await expect(
      QuizService.enviarRespuestas(1, 2, { respuestas: tresDeCuatro, fecha_inicio: enMinutos(-21) })
    ).rejects.toMatchObject({ status: 400 });
    expect(ResultadoQuizRepository.crearConRespuestas).not.toHaveBeenCalled();
  });

  it('CA-3.2.1: dentro del margen califica lo contestado y limita tiempo_empleado_seg al máximo', async () => {
    const { resultado } = await QuizService.enviarRespuestas(1, 2, {
      respuestas: tresDeCuatro,
      fecha_inicio: enMinutos(-20 - 10 / 60),
    });
    expect(resultado.tiempo_empleado_seg).toBe(20 * 60);
  });

  it('CA-3.2.3: un reintento responde 409 con el resumen del resultado previo', async () => {
    ResultadoQuizRepository.obtenerPorQuizYEstudiante.mockResolvedValue(resultadoPrevio);

    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: tresDeCuatro })).rejects.toMatchObject({
      status: 409,
      resultado: resultadoPrevio,
      respuestas: [{ id_respuesta: 1 }],
    });
    expect(RespuestaQuizRepository.listarPorResultado).toHaveBeenCalledWith(50);
    expect(ResultadoQuizRepository.crearConRespuestas).not.toHaveBeenCalled();
  });

  it('CA-3.2.3: si dos envíos simultáneos chocan con el índice único (23505) el segundo recibe 409', async () => {
    ResultadoQuizRepository.obtenerPorQuizYEstudiante
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(resultadoPrevio);
    ResultadoQuizRepository.crearConRespuestas.mockRejectedValue(Object.assign(new Error('duplicado'), { code: '23505' }));

    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: tresDeCuatro })).rejects.toMatchObject({
      status: 409,
      resultado: resultadoPrevio,
    });
  });

  it('CA-3.2.2: responde 404 si el quiz no tiene preguntas generadas', async () => {
    PreguntaQuizRepository.listarPorQuiz.mockResolvedValue([]);
    await expect(QuizService.enviarRespuestas(1, 2, { respuestas: [] })).rejects.toMatchObject({ status: 404 });
  });
});

describe('QuizService.obtenerPreguntasParaEstudiante — HU-3.2 (endpoint aprobado 2026-10-07)', () => {
  const quizAbierto = { id_quiz: 1, curso_id: 10, estado: 'programado', fecha_apertura: enMinutos(-60), fecha_cierre: enMinutos(60) };

  beforeEach(() => {
    QuizRepository.obtenerPorId.mockResolvedValue(quizAbierto);
    InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue({ id_inscripcion: 5 });
    PreguntaQuizRepository.listarPorQuiz.mockResolvedValue([
      {
        id_pregunta: 1,
        quiz_id: 1,
        tarjeta_id: 7,
        tipo_pregunta: 'seleccion_multiple',
        enunciado: '¿Cuál es la traducción correcta de "cook"?',
        opcion_a: 'asar',
        opcion_b: 'cocinar',
        opcion_c: 'hervir',
        opcion_d: 'freír',
        respuesta_correcta: 'cocinar',
        orden: 1,
      },
    ]);
  });

  it('nunca devuelve respuesta_correcta ni tarjeta_id', async () => {
    const { preguntas, quiz } = await QuizService.obtenerPreguntasParaEstudiante(1, 2);

    expect(preguntas[0]).not.toHaveProperty('respuesta_correcta');
    expect(preguntas[0]).not.toHaveProperty('tarjeta_id');
    expect(preguntas[0]).toMatchObject({ id_pregunta: 1, opcion_b: 'cocinar', orden: 1 });
    expect(quiz.estado_efectivo).toBe('abierto');
  });

  it('responde 403 si el estudiante no está inscrito', async () => {
    InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue(null);
    await expect(QuizService.obtenerPreguntasParaEstudiante(1, 2)).rejects.toMatchObject({ status: 403 });
  });

  it('responde 400 si el quiz no está abierto', async () => {
    QuizRepository.obtenerPorId.mockResolvedValue({ ...quizAbierto, fecha_apertura: enMinutos(5) });
    await expect(QuizService.obtenerPreguntasParaEstudiante(1, 2)).rejects.toMatchObject({ status: 400 });
  });
});

describe('QuizService.listarDelEstudiante — HU-3.2 (endpoint aprobado 2026-10-11)', () => {
  it('devuelve los quices del estudiante con estado_efectivo y su resultado si ya lo envió', async () => {
    QuizRepository.listarPorEstudiante.mockResolvedValue([
      { quiz: { id_quiz: 1, estado: 'programado', fecha_apertura: enMinutos(-60), fecha_cierre: enMinutos(60) }, resultado: null },
      { quiz: { id_quiz: 2, estado: 'cerrado' }, resultado: { calificacion: 4.5 } },
    ]);

    const quices = await QuizService.listarDelEstudiante(2);

    expect(QuizRepository.listarPorEstudiante).toHaveBeenCalledWith(2);
    expect(quices).toEqual([
      expect.objectContaining({ id_quiz: 1, estado_efectivo: 'abierto', resultado: null }),
      expect.objectContaining({ id_quiz: 2, estado_efectivo: 'cerrado', resultado: { calificacion: 4.5 } }),
    ]);
  });
});

describe('QuizService.obtenerResultadoEstudiante — CA-3.2.3 (resumen del resultado previo)', () => {
  const quizCerrado = { id_quiz: 1, curso_id: 10, estado: 'cerrado' };

  beforeEach(() => {
    QuizRepository.obtenerPorId.mockResolvedValue(quizCerrado);
    InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue({ id_inscripcion: 5 });
    ResultadoQuizRepository.obtenerPorQuizYEstudiante.mockResolvedValue({ id_resultado: 50, calificacion: 3.75 });
    RespuestaQuizRepository.listarPorResultado.mockResolvedValue([{ id_respuesta: 1, es_correcta: true }]);
    PreguntaQuizRepository.listarPorQuiz.mockResolvedValue([
      { id_pregunta: 1, tarjeta_id: 7, enunciado: '¿...?', opcion_a: 'cocinar', respuesta_correcta: 'cocinar', orden: 1 },
    ]);
  });

  it('CA-3.2.3: devuelve resultado, respuestas y preguntas sin la clave de respuestas', async () => {
    const { resultado, respuestas, preguntas } = await QuizService.obtenerResultadoEstudiante(1, 2);

    expect(resultado.calificacion).toBe(3.75);
    expect(RespuestaQuizRepository.listarPorResultado).toHaveBeenCalledWith(50);
    expect(respuestas).toHaveLength(1);
    expect(preguntas[0]).not.toHaveProperty('respuesta_correcta');
    expect(preguntas[0]).not.toHaveProperty('tarjeta_id');
  });

  it('responde 404 si el estudiante aún no envió el quiz o si el quiz no existe', async () => {
    ResultadoQuizRepository.obtenerPorQuizYEstudiante.mockResolvedValueOnce(null);
    await expect(QuizService.obtenerResultadoEstudiante(1, 2)).rejects.toMatchObject({ status: 404 });

    QuizRepository.obtenerPorId.mockResolvedValueOnce(null);
    await expect(QuizService.obtenerResultadoEstudiante(1, 2)).rejects.toMatchObject({ status: 404 });
  });

  it('responde 403 si el estudiante no está inscrito en el curso del quiz', async () => {
    InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue(null);
    await expect(QuizService.obtenerResultadoEstudiante(1, 2)).rejects.toMatchObject({ status: 403 });
  });
});
