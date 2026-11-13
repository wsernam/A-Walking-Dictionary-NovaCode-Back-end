
/**
 * @file RevisionResultadosQuizRepository.js
 * @brief HU-022: consultas de resultados para el panel docente.
 */

import { pool } from '../config/db.js';

export const RevisionResultadosQuizRepository = {
  async obtenerQuiz(quizId) {
    const { rows } = await pool.query(
      `SELECT q.id_quiz, q.titulo, q.curso_id,
              c.nombre AS nombre_curso, c.docente_id
       FROM quiz q
       JOIN curso c ON c.id_curso = q.curso_id
       WHERE q.id_quiz = $1`,
      [quizId]
    );

    return rows[0] ?? null;
  },

  async listarResultados(quizId, cursoId) {
    const { rows } = await pool.query(
      `SELECT
         u.id_usuario AS estudiante_id,
         u.nombre_completo AS estudiante,
         r.id_resultado,
         r.puntaje_obtenido,
         r.puntaje_maximo,
         r.calificacion,
         r.tiempo_empleado_seg,
         r.fecha_envio
       FROM inscripcion i
       JOIN usuario u ON u.id_usuario = i.estudiante_id
       LEFT JOIN resultado_quiz r
         ON r.estudiante_id = i.estudiante_id
         AND r.quiz_id = $1
       WHERE i.curso_id = $2
       ORDER BY u.nombre_completo ASC`,
      [quizId, cursoId]
    );

    return rows;
  },

  async obtenerDificultadPreguntas(quizId) {
    const { rows } = await pool.query(
      `SELECT
         p.id_pregunta,
         p.enunciado,
         COUNT(rp.id_respuesta)::int AS total_respuestas,
         COUNT(rp.id_respuesta)
           FILTER (WHERE rp.es_correcta = false)::int
           AS respuestas_incorrectas
       FROM pregunta_quiz p
       LEFT JOIN respuesta_quiz rp
         ON rp.pregunta_id = p.id_pregunta
       LEFT JOIN resultado_quiz r
         ON r.id_resultado = rp.resultado_id
       WHERE p.quiz_id = $1
       GROUP BY p.id_pregunta, p.enunciado, p.orden
       ORDER BY p.orden ASC, p.id_pregunta ASC`,
      [quizId]
    );

    return rows;
  },
};
