// Repositorio de ResultadoQuiz: acceso a datos para la tabla "resultado_quiz" del DER oficial.
// (quiz_id, estudiante_id) es único según el DER.

import { pool } from '../config/db.js';
import { ResultadoQuiz } from '../models/ResultadoQuiz.js';

export const ResultadoQuizRepository = {
  async crear(datos) {
    const {
      quiz_id,
      estudiante_id,
      fecha_inicio,
      fecha_envio,
      puntaje_obtenido,
      puntaje_maximo,
      calificacion,
      tiempo_empleado_seg,
    } = datos;
    const { rows } = await pool.query(
      `INSERT INTO resultado_quiz (quiz_id, estudiante_id, fecha_inicio, fecha_envio, puntaje_obtenido, puntaje_maximo, calificacion, tiempo_empleado_seg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [quiz_id, estudiante_id, fecha_inicio, fecha_envio, puntaje_obtenido, puntaje_maximo, calificacion, tiempo_empleado_seg]
    );
    return new ResultadoQuiz(rows[0]);
  },

  async obtenerPorId(id_resultado) {
    const { rows } = await pool.query('SELECT * FROM resultado_quiz WHERE id_resultado = $1', [id_resultado]);
    return rows[0] ? new ResultadoQuiz(rows[0]) : null;
  },

  async obtenerPorQuizYEstudiante(quiz_id, estudiante_id) {
    const { rows } = await pool.query(
      'SELECT * FROM resultado_quiz WHERE quiz_id = $1 AND estudiante_id = $2',
      [quiz_id, estudiante_id]
    );
    return rows[0] ? new ResultadoQuiz(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM resultado_quiz');
    return rows.map((row) => new ResultadoQuiz(row));
  },

  async actualizar(id_resultado, datos) {
    const {
      quiz_id,
      estudiante_id,
      fecha_inicio,
      fecha_envio,
      puntaje_obtenido,
      puntaje_maximo,
      calificacion,
      tiempo_empleado_seg,
    } = datos;
    const { rows } = await pool.query(
      `UPDATE resultado_quiz
       SET quiz_id = $2, estudiante_id = $3, fecha_inicio = $4, fecha_envio = $5,
           puntaje_obtenido = $6, puntaje_maximo = $7, calificacion = $8, tiempo_empleado_seg = $9
       WHERE id_resultado = $1
       RETURNING *`,
      [id_resultado, quiz_id, estudiante_id, fecha_inicio, fecha_envio, puntaje_obtenido, puntaje_maximo, calificacion, tiempo_empleado_seg]
    );
    return rows[0] ? new ResultadoQuiz(rows[0]) : null;
  },

  async eliminar(id_resultado) {
    const { rowCount } = await pool.query('DELETE FROM resultado_quiz WHERE id_resultado = $1', [id_resultado]);
    return rowCount > 0;
  },
};
