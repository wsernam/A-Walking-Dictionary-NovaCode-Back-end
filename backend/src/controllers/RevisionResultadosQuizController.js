
/**
 * @file RevisionResultadosQuizController.js
 * @brief HU-022: respuestas HTTP del panel docente.
 */

import { RevisionResultadosQuizService }
  from '../services/RevisionResultadosQuizService.js';

export const RevisionResultadosQuizController = {
  async consultarResumen(req, res) {
    try {
      const quizId = Number(req.params.id);

      if (
        !Number.isSafeInteger(quizId) ||
        quizId < 1 ||
        quizId > 2147483647
      ) {
        return res.status(400).json({
          error: 'Identificador de quiz inválido',
          code: 'INVALID_ID',
        });
      }

    const datos =
  await RevisionResultadosQuizService.consultarResumen(quizId);

      return res.status(200).json(datos);
    } catch (error) {
      const status =
        [400, 403, 404].includes(error.status)
          ? error.status
          : 500;

      return res.status(status).json({
        error: status === 500
          ? 'No fue posible consultar los resultados'
          : error.message,
        code: status === 500
          ? 'INTERNAL_ERROR'
          : error.code,
      });
    }
  },

/**
 * @brief HU-022 (CA-22.3):
 * consulta las respuestas individuales de un estudiante.
 *
 * GET /api/v1/quizzes/:id/teacher-results/:resultadoId
 */
async consultarRespuestas(req, res) {
  try {
    const quizId = Number(req.params.id);
    const resultadoId = Number(req.params.resultadoId);

    // Validar ambos identificadores.
    const idValido = (id) =>
      Number.isSafeInteger(id) &&
      id >= 1 &&
      id <= 2147483647;

    if (!idValido(quizId) || !idValido(resultadoId)) {
      return res.status(400).json({
        error: 'Identificador inválido',
        code: 'INVALID_ID',
      });
    }

    // Consultar el detalle desde el servicio.
    const datos =
      await RevisionResultadosQuizService.consultarRespuestas(
        quizId,
        resultadoId
      );

    return res.status(200).json(datos);
  } catch (error) {
    const status =
      [400, 403, 404].includes(error.status)
        ? error.status
        : 500;

    return res.status(status).json({
      error: status === 500
        ? 'No fue posible consultar las respuestas'
        : error.message,
      code: status === 500
        ? 'INTERNAL_ERROR'
        : error.code,
    });
  }
},

};
