/**
 * @file Modelo de dominio: representa la tabla "pregunta_quiz" del DER oficial.
 */

/**
 * Pregunta de un quiz, generada a partir de una tarjeta aprobada (HU-3.1).
 */
export class PreguntaQuiz {
  /**
   * Construye una PreguntaQuiz a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_pregunta - Id autoincremental (pk).
   * @param {number} config.quiz_id - Id del quiz (fk -> quiz.id_quiz).
   * @param {number} config.tarjeta_id - Id de la tarjeta de origen (fk -> tarjeta.id_tarjeta).
   * @param {string} config.tipo_pregunta - Tipo de pregunta (varchar 50, obligatorio).
   * @param {string} config.enunciado - Texto de la pregunta (text, obligatorio).
   * @param {string|null} config.opcion_a - Opción A (varchar 255, opcional).
   * @param {string|null} config.opcion_b - Opción B (varchar 255, opcional).
   * @param {string|null} config.opcion_c - Opción C (varchar 255, opcional).
   * @param {string|null} config.opcion_d - Opción D (varchar 255, opcional).
   * @param {string} config.respuesta_correcta - Respuesta correcta (varchar 255, obligatoria).
   * @param {number|null} config.orden - Posición de la pregunta dentro del quiz.
   */
  constructor({
    id_pregunta,
    quiz_id,
    tarjeta_id,
    tipo_pregunta,
    enunciado,
    opcion_a,
    opcion_b,
    opcion_c,
    opcion_d,
    respuesta_correcta,
    orden,
  }) {
    this.id_pregunta = id_pregunta;
    this.quiz_id = quiz_id;
    this.tarjeta_id = tarjeta_id;
    this.tipo_pregunta = tipo_pregunta;
    this.enunciado = enunciado;
    this.opcion_a = opcion_a;
    this.opcion_b = opcion_b;
    this.opcion_c = opcion_c;
    this.opcion_d = opcion_d;
    this.respuesta_correcta = respuesta_correcta;
    this.orden = orden;
  }
}