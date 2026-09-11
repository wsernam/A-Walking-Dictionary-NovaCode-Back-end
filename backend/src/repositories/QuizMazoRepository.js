// Repositorio de QuizMazo: acceso a datos para la tabla puente "quiz_mazo" del DER oficial.
// No tiene id propio: su llave es la pk compuesta (quiz_id, mazo_id), por lo que obtenerPorId/actualizar/eliminar
// reciben ese par en vez de un id único.

import { pool } from '../config/db.js';
import { QuizMazo } from '../models/QuizMazo.js';

export const QuizMazoRepository = {
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

  async obtenerPorQuizYMazo(quiz_id, mazo_id) {
    const { rows } = await pool.query(
      'SELECT * FROM quiz_mazo WHERE quiz_id = $1 AND mazo_id = $2',
      [quiz_id, mazo_id]
    );
    return rows[0] ? new QuizMazo(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM quiz_mazo');
    return rows.map((row) => new QuizMazo(row));
  },

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

  async eliminar(quiz_id, mazo_id) {
    const { rowCount } = await pool.query(
      'DELETE FROM quiz_mazo WHERE quiz_id = $1 AND mazo_id = $2',
      [quiz_id, mazo_id]
    );
    return rowCount > 0;
  },
};
