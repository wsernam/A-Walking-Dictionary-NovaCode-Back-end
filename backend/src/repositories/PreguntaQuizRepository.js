// Repositorio de PreguntaQuiz: acceso a datos para la tabla "pregunta_quiz" del DER oficial.

import { pool } from '../config/db.js';
import { PreguntaQuiz } from '../models/PreguntaQuiz.js';

export const PreguntaQuizRepository = {
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

  async obtenerPorId(id_pregunta) {
    const { rows } = await pool.query('SELECT * FROM pregunta_quiz WHERE id_pregunta = $1', [id_pregunta]);
    return rows[0] ? new PreguntaQuiz(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM pregunta_quiz');
    return rows.map((row) => new PreguntaQuiz(row));
  },

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

  async eliminar(id_pregunta) {
    const { rowCount } = await pool.query('DELETE FROM pregunta_quiz WHERE id_pregunta = $1', [id_pregunta]);
    return rowCount > 0;
  },
};
