
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/RevisionResultadosQuizService.js', () => ({
  RevisionResultadosQuizService: {
    consultarResumen: vi.fn(),
    consultarRespuestas: vi.fn(),
  },
}));

import { RevisionResultadosQuizService as Service }
  from '../../src/services/RevisionResultadosQuizService.js';

import { RevisionResultadosQuizController as Controller }
  from '../../src/controllers/RevisionResultadosQuizController.js';

/**
 * @brief Simula la respuesta HTTP de Express.
 */
function crearRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const resumen = {
  quiz: {
    id_quiz: 8,
    titulo: 'Quiz acumulativo',
    nombre_curso: 'Literatura',
  },
  estadisticas: {
    total_inscritos: 2,
    participantes: 1,
    no_presentaron: 1,
    porcentaje_participacion: 50,
    promedio: 4,
    nota_maxima: 4,
    nota_minima: 4,
  },
  resultados: [],
  dificultad_preguntas: [],
};

const detalle = {
  quiz: {
    id_quiz: 8,
    titulo: 'Quiz acumulativo',
  },
  resultado: {
    id_resultado: 6,
    estudiante_id: 21,
    puntaje_obtenido: 4,
    puntaje_maximo: 5,
    calificacion: '4.00',
  },
  preguntas: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  Service.consultarResumen.mockResolvedValue(resumen);
  Service.consultarRespuestas.mockResolvedValue(detalle);
});

describe('HU-022 - RevisionResultadosQuizController', () => {

  describe('consultarResumen - CA-22.1, CA-22.2 y CA-22.4', () => {

    it('devuelve 200 con las estadísticas del quiz', async () => {
      const req = { params: { id: '8' } };
      const res = crearRes();

      await Controller.consultarResumen(req, res);

      expect(Service.consultarResumen)
        .toHaveBeenCalledWith(8);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(resumen);
    });

    it.each([
      'abc',
      '1.5',
      '0',
      '-1',
      '2147483648',
      '9007199254740992',
    ])('rechaza el identificador inválido %s', async (id) => {
      const req = { params: { id } };
      const res = crearRes();

      await Controller.consultarResumen(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_ID',
        })
      );

      expect(Service.consultarResumen)
        .not.toHaveBeenCalled();
    });

    it('acepta el identificador máximo permitido', async () => {
      const req = {
        params: { id: '2147483647' },
      };
      const res = crearRes();

      await Controller.consultarResumen(req, res);

      expect(Service.consultarResumen)
        .toHaveBeenCalledWith(2147483647);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it.each([
      [400, 'INVALID_ID'],
      [403, 'AUTH_FORBIDDEN'],
      [404, 'QUIZ_NOT_FOUND'],
    ])('propaga el error HTTP %i', async (status, code) => {
      Service.consultarResumen.mockRejectedValue(
        Object.assign(new Error('Error controlado'), {
          status,
          code,
        })
      );

      const res = crearRes();

      await Controller.consultarResumen(
        { params: { id: '8' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error controlado',
        code,
      });
    });

    it('devuelve 500 sin revelar errores internos', async () => {
      Service.consultarResumen.mockRejectedValue(
        new Error('Fallo interno de PostgreSQL')
      );

      const res = crearRes();

      await Controller.consultarResumen(
        { params: { id: '8' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No fue posible consultar los resultados',
        code: 'INTERNAL_ERROR',
      });
    });

    it('convierte un estado inesperado en 500', async () => {
      Service.consultarResumen.mockRejectedValue(
        Object.assign(new Error('Error inesperado'), {
          status: 502,
          code: 'BAD_GATEWAY',
        })
      );

      const res = crearRes();

      await Controller.consultarResumen(
        { params: { id: '8' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No fue posible consultar los resultados',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('consultarRespuestas - CA-22.3', () => {

    it('devuelve 200 con las respuestas individuales', async () => {
      const req = {
        params: {
          id: '8',
          resultadoId: '6',
        },
      };

      const res = crearRes();

      await Controller.consultarRespuestas(req, res);

      expect(Service.consultarRespuestas)
        .toHaveBeenCalledWith(8, 6);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(detalle);
    });

    it.each([
      ['abc', '6'],
      ['0', '6'],
      ['-1', '6'],
      ['2147483648', '6'],
      ['8', 'abc'],
      ['8', '0'],
      ['8', '-1'],
      ['8', '1.5'],
      ['8', '2147483648'],
    ])(
      'rechaza los identificadores inválidos %s y %s',
      async (id, resultadoId) => {
        const req = {
          params: { id, resultadoId },
        };

        const res = crearRes();

        await Controller.consultarRespuestas(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'INVALID_ID',
          })
        );

        expect(Service.consultarRespuestas)
          .not.toHaveBeenCalled();
      }
    );

    it('acepta identificadores dentro del límite permitido', async () => {
      const req = {
        params: {
          id: '2147483647',
          resultadoId: '2147483647',
        },
      };

      const res = crearRes();

      await Controller.consultarRespuestas(req, res);

      expect(Service.consultarRespuestas)
        .toHaveBeenCalledWith(2147483647, 2147483647);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it.each([
      [400, 'INVALID_ID'],
      [403, 'AUTH_FORBIDDEN'],
      [404, 'QUIZ_RESULT_NOT_FOUND'],
    ])(
      'propaga el error HTTP %i al consultar respuestas',
      async (status, code) => {
        Service.consultarRespuestas.mockRejectedValue(
          Object.assign(new Error('Error controlado'), {
            status,
            code,
          })
        );

        const res = crearRes();

        await Controller.consultarRespuestas(
          { params: { id: '8', resultadoId: '6' } },
          res
        );

        expect(res.status).toHaveBeenCalledWith(status);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Error controlado',
          code,
        });
      }
    );

    it('devuelve 500 sin exponer errores internos', async () => {
      Service.consultarRespuestas.mockRejectedValue(
        new Error('Error en la base de datos')
      );

      const res = crearRes();

      await Controller.consultarRespuestas(
        { params: { id: '8', resultadoId: '6' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No fue posible consultar las respuestas',
        code: 'INTERNAL_ERROR',
      });
    });

    it('convierte un estado inesperado en error 500', async () => {
      Service.consultarRespuestas.mockRejectedValue(
        Object.assign(new Error('Fallo de dependencia'), {
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
        })
      );

      const res = crearRes();

      await Controller.consultarRespuestas(
        { params: { id: '8', resultadoId: '6' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No fue posible consultar las respuestas',
        code: 'INTERNAL_ERROR',
      });
    });
  });
});
