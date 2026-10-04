/**
 * @file QuizRepository.js
 * @brief Repositorio de Quiz: acceso a datos para la tabla "quiz" del DER oficial.
 * @note Solo ejecuta SQL; las reglas de negocio de los quices (HE-03) viven en src/services/.
 * crearConMazosYPreguntas guarda un quiz generado (HU-3.1) junto con sus mazos y preguntas en
 * una sola transacción.
 */

import { pool } from '../config/db.js';
import { Quiz } from '../models/Quiz.js';
import { QuizMazoRepository } from './QuizMazoRepository.js';
import { PreguntaQuizRepository } from './PreguntaQuizRepository.js';

export const QuizRepository = {
  /**
   * @brief Inserta un quiz nuevo en la base de datos.
   * @param {Object} datos - Campos de "quiz" (curso_id, titulo, semana_corte, fecha_creacion,
   * fecha_apertura, fecha_cierre, tiempo_limite_min, estado).
   * @param {import('pg').Pool|import('pg').PoolClient} [db=pool] - Conexión a usar; se pasa un
   * cliente cuando la inserción forma parte de una transacción (ver crearConMazosYPreguntas).
   * @return {Promise<Quiz>} El quiz recién creado, con su id_quiz asignado.
   */
  async crear(datos, db = pool) {
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
    const { rows } = await db.query(
      `INSERT INTO quiz (curso_id, titulo, semana_corte, fecha_creacion, fecha_apertura, fecha_cierre, tiempo_limite_min, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [curso_id, titulo, semana_corte, fecha_creacion, fecha_apertura, fecha_cierre, tiempo_limite_min, estado]
    );
    return new Quiz(rows[0]);
  },

  /**
   * @brief HU-3.1: guarda un quiz generado junto con sus filas de quiz_mazo y pregunta_quiz en
   * una sola transacción. Si cualquier inserción falla, se revierte todo y no queda un quiz a
   * medias (sin mazos o sin preguntas) en la base de datos.
   * @param {Object} datosQuiz - Campos de "quiz" (ver crear).
   * @param {number[]} mazo_ids - Mazos a asociar al quiz en quiz_mazo.
   * @param {Object[]} preguntas - Datos de cada pregunta (ver PreguntaQuizRepository.crear), sin
   * quiz_id: se asigna aquí con el id del quiz recién creado.
   * @return {Promise<{quiz:Quiz, preguntas:import('../models/PreguntaQuiz.js').PreguntaQuiz[]}>}
   * El quiz y las preguntas creadas.
   */
  async crearConMazosYPreguntas(datosQuiz, mazo_ids, preguntas) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const quiz = await this.crear(datosQuiz, client);
      for (const mazo_id of mazo_ids) {
        await QuizMazoRepository.crear({ quiz_id: quiz.id_quiz, mazo_id }, client);
      }
      const preguntasCreadas = [];
      for (const pregunta of preguntas) {
        preguntasCreadas.push(await PreguntaQuizRepository.crear({ quiz_id: quiz.id_quiz, ...pregunta }, client));
      }
      await client.query('COMMIT');
      return { quiz, preguntas: preguntasCreadas };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
