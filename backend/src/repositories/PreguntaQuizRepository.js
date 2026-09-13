/**
 * @file PreguntaQuizRepository.js
 * @brief Repositorio de PreguntaQuiz: acceso a datos para la tabla "pregunta_quiz" del DER
 * oficial.
 * @note Usado por QuizService (HU-3.1 para crear las preguntas generadas, HU-3.2 para
 * calificar el envío de un estudiante) y por ExportPDFService (HU-3.3, hoja de preguntas y
 * hoja de respuestas del PDF del quiz).
 */

import { pool } from '../config/db.js';
import { PreguntaQuiz } from '../models/PreguntaQuiz.js';

export const PreguntaQuizRepository = {
  /**
   * @brief Inserta una pregunta nueva en la base de datos.
   * @param {Object} datos - Campos de "pregunta_quiz" (quiz_id, tarjeta_id, tipo_pregunta,
   * enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden).
   * @return {Promise<PreguntaQuiz>} La pregunta recién creada, con su id_pregunta asignado.
   */
  async crear(datos) {
    const {
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
    } = datos;
    const { rows } = await pool.query(
      `INSERT INTO pregunta_quiz (quiz_id, tarjeta_id, tipo_pregunta, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [quiz_id, tarjeta_id, tipo_pregunta, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden]
    );
    return new PreguntaQuiz(rows[0]);
  },

  /**
   * @brief Busca una pregunta por su id_pregunta.
   * @param {number} id_pregunta - Id de la pregunta a buscar.
   * @return {Promise<PreguntaQuiz|null>} La pregunta encontrada, o null si no existe.
   */
  async obtenerPorId(id_pregunta) {
    const { rows } = await pool.query('SELECT * FROM pregunta_quiz WHERE id_pregunta = $1', [id_pregunta]);
    return rows[0] ? new PreguntaQuiz(rows[0]) : null;
  },

  /**
   * @brief Lista todas las preguntas existentes, sin filtros.
   * @return {Promise<PreguntaQuiz[]>} Arreglo con todas las preguntas existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM pregunta_quiz');
    return rows.map((row) => new PreguntaQuiz(row));
  },

  /**
   * @brief HU-3.1 / HU-3.2 / HU-3.3: lista las preguntas de un quiz específico, en el orden en
   * que fueron generadas. Usado para devolver el quiz recién generado, para calificar el envío
   * de un estudiante y para exportar el PDF con hoja de preguntas y hoja de respuestas.
   * @param {number} quiz_id - Id del quiz.
   * @return {Promise<PreguntaQuiz[]>} Preguntas del quiz, ordenadas por "orden" ascendente.
   */
  async listarPorQuiz(quiz_id) {
    const { rows } = await pool.query(
      'SELECT * FROM pregunta_quiz WHERE quiz_id = $1 ORDER BY orden ASC, id_pregunta ASC',
      [quiz_id]
    );
    return rows.map((row) => new PreguntaQuiz(row));
  },

  /**
   * @brief Reemplaza todos los campos de una pregunta existente (UPDATE completo).
   * @param {number} id_pregunta - Id de la pregunta a actualizar.
   * @param {Object} datos - Nuevos valores de todas las columnas de "pregunta_quiz".
   * @return {Promise<PreguntaQuiz|null>} La pregunta actualizada, o null si el id no existe.
   */
  async actualizar(id_pregunta, datos) {
    const {
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
    } = datos;
    const { rows } = await pool.query(
      `UPDATE pregunta_quiz
       SET quiz_id = $2, tarjeta_id = $3, tipo_pregunta = $4, enunciado = $5, opcion_a = $6,
           opcion_b = $7, opcion_c = $8, opcion_d = $9, respuesta_correcta = $10, orden = $11
       WHERE id_pregunta = $1
       RETURNING *`,
      [id_pregunta, quiz_id, tarjeta_id, tipo_pregunta, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden]
    );
    return rows[0] ? new PreguntaQuiz(rows[0]) : null;
  },

  /**
   * @brief Elimina una pregunta por su id_pregunta.
   * @param {number} id_pregunta - Id de la pregunta a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   */
  async eliminar(id_pregunta) {
    const { rowCount } = await pool.query('DELETE FROM pregunta_quiz WHERE id_pregunta = $1', [id_pregunta]);
    return rowCount > 0;
  },
};
