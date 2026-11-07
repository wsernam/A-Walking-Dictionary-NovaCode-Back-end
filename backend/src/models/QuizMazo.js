/**
 * @file Modelo de dominio: representa la tabla "quiz_mazo" del DER oficial (tabla puente, pk
 * compuesta quiz_id + mazo_id).
 */

/**
 * Relación entre un quiz y los mazos de los que toma sus tarjetas (HU-3.1).
 */
export class QuizMazo {
  /**
   * Construye un QuizMazo a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.quiz_id - Id del quiz (fk -> quiz.id_quiz; parte de la pk).
   * @param {number} config.mazo_id - Id del mazo (fk -> mazo.id_mazo; parte de la pk).
   */
  constructor({
    quiz_id,
    mazo_id,
  }) {
    this.quiz_id = quiz_id;
    this.mazo_id = mazo_id;
  }
}