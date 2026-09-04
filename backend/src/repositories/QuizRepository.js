// Repositorio de Quiz: acceso a datos para la tabla "quiz" del DER oficial.

import { pool } from '../config/db.js';
import { Quiz } from '../models/Quiz.js';

export const QuizRepository = {
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

  async obtenerPorId(id_quiz) {
    const { rows } = await pool.query('SELECT * FROM quiz WHERE id_quiz = $1', [id_quiz]);
    return rows[0] ? new Quiz(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM quiz');
    return rows.map((row) => new Quiz(row));
  },

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

  async eliminar(id_quiz) {
    const { rowCount } = await pool.query('DELETE FROM quiz WHERE id_quiz = $1', [id_quiz]);
    return rowCount > 0;
  },
};
