/**
 * @file QuizRepository.js
 * @brief Repositorio de Quiz: acceso a datos para la tabla "quiz" del DER oficial.
 * @note Usado por HU-3.1 (generación), HU-3.2 (envío de respuestas) y HU-3.3 (exportación a
 * PDF) a través de QuizService y ExportPDFService — ver src/services/QuizService.js.
 */

import { pool } from '../config/db.js';
import { Quiz } from '../models/Quiz.js';

export const QuizRepository = {
  /**
   * @brief Inserta un quiz nuevo en la base de datos.
   * @param {Object} datos - Campos de "quiz" (curso_id, titulo, semana_corte, fecha_creacion,
   * fecha_apertura, fecha_cierre, tiempo_limite_min, estado).
   * @return {Promise<Quiz>} El quiz recién creado, con su id_quiz asignado.
   */
  async crear(datos) {
    const {
      curso_id,
      titulo,
      semana_corte,
      fecha_creacion,
      fecha_apertura,
      fecha_cierre,
      tiempo_limite_min,
      estado,
    } = datos;
    const { rows } = await pool.query(
      `INSERT INTO quiz (curso_id, titulo, semana_corte, fecha_creacion, fecha_apertura, fecha_cierre, tiempo_limite_min, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [curso_id, titulo, semana_corte, fecha_creacion, fecha_apertura, fecha_cierre, tiempo_limite_min, estado]
    );
    return new Quiz(rows[0]);
  },

  /**
   * @brief Busca un quiz por su id_quiz.
   * @param {number} id_quiz - Id del quiz a buscar.
   * @return {Promise<Quiz|null>} El quiz encontrado, o null si no existe.
   */
  async obtenerPorId(id_quiz) {
    const { rows } = await pool.query('SELECT * FROM quiz WHERE id_quiz = $1', [id_quiz]);
    return rows[0] ? new Quiz(rows[0]) : null;
  },

  /**
   * @brief Lista todos los quices existentes, sin filtros.
   * @return {Promise<Quiz[]>} Arreglo con todos los quices existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM quiz');
    return rows.map((row) => new Quiz(row));
  },

  /**
   * @brief Reemplaza todos los campos de un quiz existente (UPDATE completo).
   * @param {number} id_quiz - Id del quiz a actualizar.
   * @param {Object} datos - Nuevos valores de todas las columnas de "quiz".
   * @return {Promise<Quiz|null>} El quiz actualizado, o null si el id no existe.
   */
  async actualizar(id_quiz, datos) {
    const {
      curso_id,
      titulo,
      semana_corte,
      fecha_creacion,
      fecha_apertura,
      fecha_cierre,
      tiempo_limite_min,
      estado,
    } = datos;
    const { rows } = await pool.query(
      `UPDATE quiz
       SET curso_id = $2, titulo = $3, semana_corte = $4, fecha_creacion = $5,
           fecha_apertura = $6, fecha_cierre = $7, tiempo_limite_min = $8, estado = $9
       WHERE id_quiz = $1
       RETURNING *`,
      [id_quiz, curso_id, titulo, semana_corte, fecha_creacion, fecha_apertura, fecha_cierre, tiempo_limite_min, estado]
    );
    return rows[0] ? new Quiz(rows[0]) : null;
  },

  /**
   * @brief Elimina un quiz por su id_quiz.
   * @param {number} id_quiz - Id del quiz a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   * @note Falla (rechaza la promesa) si el quiz todavía tiene filas asociadas en quiz_mazo,
   * pregunta_quiz o resultado_quiz, por las foreign key hacia quiz.id_quiz.
   */
  async eliminar(id_quiz) {
    const { rowCount } = await pool.query('DELETE FROM quiz WHERE id_quiz = $1', [id_quiz]);
    return rowCount > 0;
  },
};
