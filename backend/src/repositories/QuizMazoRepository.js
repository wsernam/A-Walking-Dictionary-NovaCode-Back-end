/**
 * @file QuizMazoRepository.js
 * @brief Repositorio de QuizMazo: acceso a datos para la tabla puente "quiz_mazo" del DER
 * oficial. No tiene id propio: su llave es la pk compuesta (quiz_id, mazo_id), por lo que
 * obtenerPorQuizYMazo/actualizar/eliminar reciben ese par en vez de un id único.
 * @note Usado por QuizService.generar() (HU-3.1) para registrar qué mazos quedaron incluidos
 * en el rango de un quiz recién generado.
 */

import { pool } from '../config/db.js';
import { QuizMazo } from '../models/QuizMazo.js';

export const QuizMazoRepository = {
  /**
   * @brief Inserta una fila quiz_mazo nueva (asocia un mazo a un quiz).
   * @param {Object} datos - { quiz_id, mazo_id }.
   * @return {Promise<QuizMazo>} La fila quiz_mazo recién creada.
   */
  async crear(datos) {
    const { quiz_id, mazo_id } = datos;
    const { rows } = await pool.query(
      `INSERT INTO quiz_mazo (quiz_id, mazo_id)
       VALUES ($1, $2)
       RETURNING *`,
      [quiz_id, mazo_id]
    );
    return new QuizMazo(rows[0]);
  },

  /**
   * @brief Busca una fila quiz_mazo por su llave compuesta.
   * @param {number} quiz_id - Id del quiz.
   * @param {number} mazo_id - Id del mazo.
   * @return {Promise<QuizMazo|null>} La fila encontrada, o null si no existe esa asociación.
   */
  async obtenerPorQuizYMazo(quiz_id, mazo_id) {
    const { rows } = await pool.query(
      'SELECT * FROM quiz_mazo WHERE quiz_id = $1 AND mazo_id = $2',
      [quiz_id, mazo_id]
    );
    return rows[0] ? new QuizMazo(rows[0]) : null;
  },

  /**
   * @brief Lista todas las filas quiz_mazo existentes, sin filtros.
   * @return {Promise<QuizMazo[]>} Arreglo con todas las asociaciones quiz-mazo existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM quiz_mazo');
    return rows.map((row) => new QuizMazo(row));
  },

  /**
   * @brief HU-3.1 / HU-3.3: lista los mazos incluidos en un quiz específico. Usado por
   * QuizService.generar() al armar la respuesta y por ExportPDFService para saber qué mazos
   * cubre el quiz al exportarlo a PDF.
   * @param {number} quiz_id - Id del quiz.
   * @return {Promise<QuizMazo[]>} Filas quiz_mazo asociadas a ese quiz.
   */
  async listarPorQuiz(quiz_id) {
    const { rows } = await pool.query('SELECT * FROM quiz_mazo WHERE quiz_id = $1', [quiz_id]);
    return rows.map((row) => new QuizMazo(row));
  },

  /**
   * @brief Reemplaza la llave compuesta de una fila quiz_mazo existente.
   * @param {number} quiz_id - Id del quiz actual de la fila a actualizar.
   * @param {number} mazo_id - Id del mazo actual de la fila a actualizar.
   * @param {Object} datos - { quiz_id, mazo_id } con los nuevos valores.
   * @return {Promise<QuizMazo|null>} La fila actualizada, o null si la llave original no existe.
   */
  async actualizar(quiz_id, mazo_id, datos) {
    const { quiz_id: nuevo_quiz_id, mazo_id: nuevo_mazo_id } = datos;
    const { rows } = await pool.query(
      `UPDATE quiz_mazo
       SET quiz_id = $3, mazo_id = $4
       WHERE quiz_id = $1 AND mazo_id = $2
       RETURNING *`,
      [quiz_id, mazo_id, nuevo_quiz_id, nuevo_mazo_id]
    );
    return rows[0] ? new QuizMazo(rows[0]) : null;
  },

  /**
   * @brief Elimina una fila quiz_mazo por su llave compuesta.
   * @param {number} quiz_id - Id del quiz.
   * @param {number} mazo_id - Id del mazo.
   * @return {Promise<boolean>} true si se eliminó una fila, false si esa asociación no existía.
   */
  async eliminar(quiz_id, mazo_id) {
    const { rowCount } = await pool.query(
      'DELETE FROM quiz_mazo WHERE quiz_id = $1 AND mazo_id = $2',
      [quiz_id, mazo_id]
    );
    return rowCount > 0;
  },
};
