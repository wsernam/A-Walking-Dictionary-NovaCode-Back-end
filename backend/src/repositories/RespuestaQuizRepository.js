// Repositorio de RespuestaQuiz: acceso a datos para la tabla "respuesta_quiz" del DER oficial.
// (resultado_id, pregunta_id) es único según el DER.

import { pool } from '../config/db.js';
import { RespuestaQuiz } from '../models/RespuestaQuiz.js';

export const RespuestaQuizRepository = {
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

  async obtenerPorId(id_respuesta) {
    const { rows } = await pool.query('SELECT * FROM respuesta_quiz WHERE id_respuesta = $1', [id_respuesta]);
    return rows[0] ? new RespuestaQuiz(rows[0]) : null;
  },

  async obtenerPorResultadoYPregunta(resultado_id, pregunta_id) {
    const { rows } = await pool.query(
      'SELECT * FROM respuesta_quiz WHERE resultado_id = $1 AND pregunta_id = $2',
      [resultado_id, pregunta_id]
    );
    return rows[0] ? new RespuestaQuiz(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM respuesta_quiz');
    return rows.map((row) => new RespuestaQuiz(row));
  },

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

  async eliminar(id_respuesta) {
    const { rowCount } = await pool.query('DELETE FROM respuesta_quiz WHERE id_respuesta = $1', [id_respuesta]);
    return rowCount > 0;
  },
};
