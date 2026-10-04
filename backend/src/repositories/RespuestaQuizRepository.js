/**
 * @file RespuestaQuizRepository.js
 * @brief Repositorio de RespuestaQuiz: acceso a datos para la tabla "respuesta_quiz" del DER
 * oficial. (resultado_id, pregunta_id) es único según el DER.
 * @note Usado por QuizService.enviarRespuestas() (HU-3.2) para guardar el desglose de
 * aciertos/errores de un estudiante, y para recuperar ese desglose cuando CA-3.2.3 bloquea un
 * reintento y hay que mostrar el resumen del envío previo.
 */

import { pool } from '../config/db.js';
import { RespuestaQuiz } from '../models/RespuestaQuiz.js';

export const RespuestaQuizRepository = {
  /**
   * @brief Inserta una respuesta nueva en la base de datos.
   * @param {Object} datos - Campos de "respuesta_quiz" (resultado_id, pregunta_id,
   * respuesta_estudiante, es_correcta, puntaje_obtenido).
   * @return {Promise<RespuestaQuiz>} La respuesta recién creada, con su id_respuesta asignado.
   */
  async crear(datos) {
    const { resultado_id, pregunta_id, respuesta_estudiante, es_correcta, puntaje_obtenido } = datos;
    const { rows } = await pool.query(
      `INSERT INTO respuesta_quiz (resultado_id, pregunta_id, respuesta_estudiante, es_correcta, puntaje_obtenido)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [resultado_id, pregunta_id, respuesta_estudiante, es_correcta, puntaje_obtenido]
    );
    return new RespuestaQuiz(rows[0]);
  },

  /**
   * @brief Busca una respuesta por su id_respuesta.
   * @param {number} id_respuesta - Id de la respuesta a buscar.
   * @return {Promise<RespuestaQuiz|null>} La respuesta encontrada, o null si no existe.
   */
  async obtenerPorId(id_respuesta) {
    const { rows } = await pool.query('SELECT * FROM respuesta_quiz WHERE id_respuesta = $1', [id_respuesta]);
    return rows[0] ? new RespuestaQuiz(rows[0]) : null;
  },

  /**
   * @brief Busca la respuesta de una pregunta puntual dentro de un resultado_quiz.
   * @param {number} resultado_id - Id del resultado_quiz.
   * @param {number} pregunta_id - Id de la pregunta.
   * @return {Promise<RespuestaQuiz|null>} La respuesta encontrada, o null si no existe.
   */
  async obtenerPorResultadoYPregunta(resultado_id, pregunta_id) {
    const { rows } = await pool.query(
      'SELECT * FROM respuesta_quiz WHERE resultado_id = $1 AND pregunta_id = $2',
      [resultado_id, pregunta_id]
    );
    return rows[0] ? new RespuestaQuiz(rows[0]) : null;
  },

  /**
   * @brief Lista todas las respuestas existentes, sin filtros.
   * @return {Promise<RespuestaQuiz[]>} Arreglo con todas las respuestas existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM respuesta_quiz');
    return rows.map((row) => new RespuestaQuiz(row));
  },

  /**
   * @brief CA-3.2.2 / CA-3.2.3: lista las respuestas registradas para un resultado_quiz
   * específico — el desglose de aciertos/errores de un estudiante, usado tanto para el
   * desglose inmediato al calificar como para mostrar el resumen de un intento previo cuando
   * se bloquea un reintento.
   * @param {number} resultado_id - Id del resultado_quiz.
   * @return {Promise<RespuestaQuiz[]>} Respuestas de ese resultado.
   */
  async listarPorResultado(resultado_id) {
    const { rows } = await pool.query(
      'SELECT * FROM respuesta_quiz WHERE resultado_id = $1',
      [resultado_id]
    );
    return rows.map((row) => new RespuestaQuiz(row));
  },

  /**
   * @brief Reemplaza todos los campos de una respuesta existente (UPDATE completo).
   * @param {number} id_respuesta - Id de la respuesta a actualizar.
   * @param {Object} datos - Nuevos valores de todas las columnas de "respuesta_quiz".
   * @return {Promise<RespuestaQuiz|null>} La respuesta actualizada, o null si el id no existe.
   */
  async actualizar(id_respuesta, datos) {
    const { resultado_id, pregunta_id, respuesta_estudiante, es_correcta, puntaje_obtenido } = datos;
    const { rows } = await pool.query(
      `UPDATE respuesta_quiz
       SET resultado_id = $2, pregunta_id = $3, respuesta_estudiante = $4, es_correcta = $5, puntaje_obtenido = $6
       WHERE id_respuesta = $1
       RETURNING *`,
      [id_respuesta, resultado_id, pregunta_id, respuesta_estudiante, es_correcta, puntaje_obtenido]
    );
    return rows[0] ? new RespuestaQuiz(rows[0]) : null;
  },

  /**
   * @brief Elimina una respuesta por su id_respuesta.
   * @param {number} id_respuesta - Id de la respuesta a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   */
  async eliminar(id_respuesta) {
    const { rowCount } = await pool.query('DELETE FROM respuesta_quiz WHERE id_respuesta = $1', [id_respuesta]);
    return rowCount > 0;
  },
};
