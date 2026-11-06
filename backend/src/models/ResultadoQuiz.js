/**
 * @file ResultadoQuiz.js
 * @brief Modelo de dominio: representa la tabla "resultado_quiz" del DER oficial.
 */

/**
 * @class ResultadoQuiz
 * @brief Resultado de un estudiante en un quiz (HU-3.2). Único por (quiz_id, estudiante_id): es
 * lo que impide el reintento no autorizado (CA-3.2.3).
 *
 * @note Los campos DECIMAL (puntaje_obtenido, puntaje_maximo, calificacion) llegan como string
 * desde PostgreSQL; hay que convertirlos con Number() (observación abierta, sin corregir).
 * @note [SUPUESTO PENDIENTE P2] La calificación está en escala 0-5.
 */
export class ResultadoQuiz {
  /**
   * @brief Construye un ResultadoQuiz a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_resultado - Id autoincremental (pk).
   * @param {number} config.quiz_id - Id del quiz (fk -> quiz.id_quiz).
   * @param {number} config.estudiante_id - Id del estudiante (fk -> usuario.id_usuario).
   * @param {string|null} config.fecha_inicio - Marca de tiempo de inicio del intento.
   * @param {string|null} config.fecha_envio - Marca de tiempo de envío.
   * @param {number|string|null} config.puntaje_obtenido - Puntaje obtenido (decimal).
   * @param {number|string|null} config.puntaje_maximo - Puntaje máximo posible (decimal).
   * @param {number|string|null} config.calificacion - Calificación final (decimal).
   * @param {number|null} config.tiempo_empleado_seg - Segundos empleados (int).
   */
  constructor({
    id_resultado,
    quiz_id,
    estudiante_id,
    fecha_inicio,
    fecha_envio,
    puntaje_obtenido,
    puntaje_maximo,
    calificacion,
    tiempo_empleado_seg,
  }) {
    this.id_resultado = id_resultado;
    this.quiz_id = quiz_id;
    this.estudiante_id = estudiante_id;
    this.fecha_inicio = fecha_inicio;
    this.fecha_envio = fecha_envio;
    this.puntaje_obtenido = puntaje_obtenido;
    this.puntaje_maximo = puntaje_maximo;
    this.calificacion = calificacion;
    this.tiempo_empleado_seg = tiempo_empleado_seg;
  }
}