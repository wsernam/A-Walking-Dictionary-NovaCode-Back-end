/**
 * @file RespuestaQuiz.js
 * @brief Modelo de dominio: representa la tabla "respuesta_quiz" del DER oficial.
 */

/**
 * @class RespuestaQuiz
 * @brief Respuesta de un estudiante a una pregunta de un quiz (HU-3.2). Única por
 * (resultado_id, pregunta_id) según el DER.
 */
export class RespuestaQuiz {
  /**
   * @brief Construye una RespuestaQuiz a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_respuesta - Id autoincremental (pk).
   * @param {number} config.resultado_id - Id del resultado (fk -> resultado_quiz.id_resultado).
   * @param {number} config.pregunta_id - Id de la pregunta (fk -> pregunta_quiz.id_pregunta).
   * @param {string|null} config.respuesta_estudiante - Respuesta dada (varchar 255, opcional).
   * @param {boolean|null} config.es_correcta - Si la respuesta fue correcta.
   * @param {number|null} config.puntaje_obtenido - Puntaje de esta respuesta (decimal).
   */
  constructor({
    id_respuesta,
    resultado_id,
    pregunta_id,
    respuesta_estudiante,
    es_correcta,
    puntaje_obtenido,
  }) {
    this.id_respuesta = id_respuesta;
    this.resultado_id = resultado_id;
    this.pregunta_id = pregunta_id;
    this.respuesta_estudiante = respuesta_estudiante;
    this.es_correcta = es_correcta;
    this.puntaje_obtenido = puntaje_obtenido;
  }
}