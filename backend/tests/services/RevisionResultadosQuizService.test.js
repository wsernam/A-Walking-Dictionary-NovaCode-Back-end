
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/RevisionResultadosQuizRepository.js', () => ({
  RevisionResultadosQuizRepository: {
    obtenerQuiz: vi.fn(),
    listarResultados: vi.fn(),
    obtenerDificultadPreguntas: vi.fn(),
  },
}));

vi.mock('../../src/repositories/ResultadoQuizRepository.js', () => ({
  ResultadoQuizRepository: {
    obtenerPorId: vi.fn(),
  },
}));

vi.mock('../../src/repositories/RespuestaQuizRepository.js', () => ({
  RespuestaQuizRepository: {
    listarPorResultado: vi.fn(),
  },
}));

vi.mock('../../src/repositories/PreguntaQuizRepository.js', () => ({
  PreguntaQuizRepository: {
    listarPorQuiz: vi.fn(),
  },
}));

import { RevisionResultadosQuizRepository as Repository }
  from '../../src/repositories/RevisionResultadosQuizRepository.js';
import { ResultadoQuizRepository }
  from '../../src/repositories/ResultadoQuizRepository.js';
import { RespuestaQuizRepository }
  from '../../src/repositories/RespuestaQuizRepository.js';
import { PreguntaQuizRepository }
  from '../../src/repositories/PreguntaQuizRepository.js';
import { RevisionResultadosQuizService as Service }
  from '../../src/services/RevisionResultadosQuizService.js';

const quiz = {
  id_quiz: 8,
  titulo: 'Quiz acumulativo',
  curso_id: 1,
  nombre_curso: 'Literatura',
};

const resultado = {
  id_resultado: 6,
  quiz_id: 8,
  estudiante_id: 21,
  puntaje_obtenido: 4,
  puntaje_maximo: 5,
  calificacion: '4.00',
  tiempo_empleado_seg: 26,
  fecha_envio: '2026-11-06T10:00:00Z',
};

const estudiantePresentado = {
  estudiante_id: 21,
  nombre_completo: 'Estudiante 1',
  id_resultado: 6,
  calificacion: '4.00',
  puntaje_obtenido: '4',
  puntaje_maximo: '5',
};

const estudianteSinEntrega = {
  estudiante_id: 22,
  nombre_completo: 'Estudiante 2',
  id_resultado: null,
  calificacion: null,
  puntaje_obtenido: null,
  puntaje_maximo: null,
};

beforeEach(() => {
  vi.resetAllMocks();

  Repository.obtenerQuiz.mockResolvedValue(quiz);
  Repository.listarResultados.mockResolvedValue([]);
  Repository.obtenerDificultadPreguntas.mockResolvedValue([]);

  ResultadoQuizRepository.obtenerPorId.mockResolvedValue(resultado);
  RespuestaQuizRepository.listarPorResultado.mockResolvedValue([]);
  PreguntaQuizRepository.listarPorQuiz.mockResolvedValue([]);
});

describe('HU-022 - RevisionResultadosQuizService', () => {
  describe('consultarResumen - CA-22.2 y CA-22.4', () => {
    it('rechaza un quiz inexistente', async () => {
      Repository.obtenerQuiz.mockResolvedValue(null);

      await expect(
        Service.consultarResumen(999)
      ).rejects.toThrow('Quiz no encontrado');

      expect(Repository.listarResultados).not.toHaveBeenCalled();
    });

    it('calcula estadísticas con estudiantes que presentaron y no presentaron', async () => {
      Repository.listarResultados.mockResolvedValue([
        estudiantePresentado,
        estudianteSinEntrega,
        {
          ...estudiantePresentado,
          estudiante_id: 23,
          id_resultado: 7,
          calificacion: '2.00',
          puntaje_obtenido: '2',
        },
      ]);

      const datos = await Service.consultarResumen(8);

      expect(Repository.obtenerQuiz).toHaveBeenCalledWith(8);
      expect(Repository.listarResultados).toHaveBeenCalledWith(8, 1);

      expect(datos.estadisticas).toEqual({
        total_inscritos: 3,
        participantes: 2,
        no_presentaron: 1,
        porcentaje_participacion: 66.67,
        promedio: 3,
        nota_maxima: 4,
        nota_minima: 2,
      });

      expect(datos.resultados[0]).toMatchObject({
        presento: true,
        respuestas_correctas: 4,
        respuestas_incorrectas: 1,
      });

      expect(datos.resultados[1]).toMatchObject({
        presento: false,
        respuestas_correctas: null,
        respuestas_incorrectas: null,
      });

      expect(datos.quiz).toMatchObject({
        id_quiz: 8,
        titulo: 'Quiz acumulativo',
        nombre_curso: 'Literatura',
      });
    });

    it('maneja un quiz sin entregas', async () => {
      Repository.listarResultados.mockResolvedValue([
        estudianteSinEntrega,
      ]);

      const datos = await Service.consultarResumen(8);

      expect(datos.estadisticas).toEqual({
        total_inscritos: 1,
        participantes: 0,
        no_presentaron: 1,
        porcentaje_participacion: 0,
        promedio: null,
        nota_maxima: null,
        nota_minima: null,
      });

      expect(datos.resultados[0].presento).toBe(false);
    });

    it('maneja un quiz sin estudiantes inscritos', async () => {
      const datos = await Service.consultarResumen(8);

      expect(datos.estadisticas.total_inscritos).toBe(0);
      expect(datos.estadisticas.participantes).toBe(0);
      expect(datos.estadisticas.porcentaje_participacion).toBe(0);
      expect(datos.estadisticas.promedio).toBeNull();
      expect(datos.resultados).toEqual([]);
    });

    it('calcula y ordena las preguntas por porcentaje de error', async () => {
      Repository.obtenerDificultadPreguntas.mockResolvedValue([
        {
          id_pregunta: 1,
          total_respuestas: 10,
          respuestas_incorrectas: 2,
        },
        {
          id_pregunta: 2,
          total_respuestas: 10,
          respuestas_incorrectas: 8,
        },
        {
          id_pregunta: 3,
          total_respuestas: 0,
          respuestas_incorrectas: 0,
        },
      ]);

      const datos = await Service.consultarResumen(8);

      expect(datos.dificultad_preguntas.map((p) => p.id_pregunta))
        .toEqual([2, 1, 3]);

      expect(datos.dificultad_preguntas.map((p) => p.porcentaje_error))
        .toEqual([80, 20, null]);
    });

    it('redondea los porcentajes de error a dos decimales', async () => {
      Repository.obtenerDificultadPreguntas.mockResolvedValue([
        {
          id_pregunta: 1,
          total_respuestas: 3,
          respuestas_incorrectas: 1,
        },
      ]);

      const datos = await Service.consultarResumen(8);

      expect(datos.dificultad_preguntas[0].porcentaje_error)
        .toBe(33.33);
    });
  });

  describe('consultarRespuestas - CA-22.3', () => {
    it('rechaza un quiz inexistente', async () => {
      Repository.obtenerQuiz.mockResolvedValue(null);

      await expect(
        Service.consultarRespuestas(999, 6)
      ).rejects.toThrow('Quiz no encontrado');

      expect(ResultadoQuizRepository.obtenerPorId)
        .not.toHaveBeenCalled();
    });

    it('rechaza un resultado inexistente', async () => {
      ResultadoQuizRepository.obtenerPorId.mockResolvedValue(null);

      await expect(
        Service.consultarRespuestas(8, 999)
      ).rejects.toThrow('Resultado no encontrado para este quiz');
    });

    it('rechaza un resultado perteneciente a otro quiz', async () => {
      ResultadoQuizRepository.obtenerPorId.mockResolvedValue({
        ...resultado,
        quiz_id: 9,
      });

      await expect(
        Service.consultarRespuestas(8, 6)
      ).rejects.toThrow('Resultado no encontrado para este quiz');

      expect(RespuestaQuizRepository.listarPorResultado)
        .not.toHaveBeenCalled();
    });

    it('devuelve las respuestas individuales y las ordena correctamente', async () => {
      PreguntaQuizRepository.listarPorQuiz.mockResolvedValue([
        {
          id_pregunta: 12,
          orden: 2,
          enunciado: 'Pregunta dos',
          opcion_a: 'A',
          opcion_b: 'B',
          opcion_c: 'C',
          opcion_d: 'D',
          respuesta_correcta: 'B',
        },
        {
          id_pregunta: 11,
          orden: 1,
          enunciado: 'Pregunta uno',
          opcion_a: 'A',
          opcion_b: 'B',
          opcion_c: 'C',
          opcion_d: 'D',
          respuesta_correcta: 'A',
        },
      ]);

      RespuestaQuizRepository.listarPorResultado.mockResolvedValue([
        {
          pregunta_id: 11,
          respuesta_estudiante: 'A',
          es_correcta: true,
          puntaje_obtenido: 1,
        },
        {
          pregunta_id: 12,
          respuesta_estudiante: 'C',
          es_correcta: false,
          puntaje_obtenido: 0,
        },
      ]);

      const datos = await Service.consultarRespuestas(8, 6);

      expect(ResultadoQuizRepository.obtenerPorId)
        .toHaveBeenCalledWith(6);
      expect(RespuestaQuizRepository.listarPorResultado)
        .toHaveBeenCalledWith(6);
      expect(PreguntaQuizRepository.listarPorQuiz)
        .toHaveBeenCalledWith(8);

      expect(datos.quiz.id_quiz).toBe(8);
      expect(datos.resultado.id_resultado).toBe(6);
      expect(datos.preguntas.map((p) => p.orden)).toEqual([1, 2]);

      expect(datos.preguntas[0]).toMatchObject({
        id_pregunta: 11,
        respuesta_estudiante: 'A',
        respuesta_correcta: 'A',
        es_correcta: true,
        puntaje_obtenido: 1,
        opciones: {
          a: 'A',
          b: 'B',
          c: 'C',
          d: 'D',
        },
      });

      expect(datos.preguntas[1]).toMatchObject({
        id_pregunta: 12,
        respuesta_estudiante: 'C',
        respuesta_correcta: 'B',
        es_correcta: false,
      });
    });

    it('identifica preguntas sin respuesta registrada', async () => {
      PreguntaQuizRepository.listarPorQuiz.mockResolvedValue([
        {
          id_pregunta: 11,
          orden: 1,
          enunciado: 'Pregunta sin responder',
          respuesta_correcta: 'A',
        },
      ]);

      const datos = await Service.consultarRespuestas(8, 6);

      expect(datos.preguntas[0]).toMatchObject({
        respuesta_estudiante: null,
        es_correcta: false,
        puntaje_obtenido: 0,
      });
    });

    it('devuelve un arreglo vacío si no existen preguntas', async () => {
      const datos = await Service.consultarRespuestas(8, 6);

      expect(datos.preguntas).toEqual([]);
      expect(datos.resultado).toMatchObject({
        id_resultado: 6,
        estudiante_id: 21,
        calificacion: '4.00',
        tiempo_empleado_seg: 26,
      });
    });
  });
});
