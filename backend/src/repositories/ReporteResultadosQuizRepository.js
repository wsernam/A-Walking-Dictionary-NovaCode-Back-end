// Repositorio del reporte de resultados por quiz (HU-021): consultas de solo lectura sobre
// "quiz", "curso", "inscripcion", "usuario", "resultado_quiz", "pregunta_quiz" y "respuesta_quiz".
import { pool } from '../config/db.js';

export const ReporteResultadosQuizRepository = {
  /** Encabezado del quiz con el nombre del curso y su docente (S1). Null si no existe. */
  async obtenerQuiz(idQuiz) {
    const { rows } = await pool.query(
      `SELECT q.id_quiz, q.titulo, q.semana_corte, q.fecha_apertura, q.fecha_cierre,
              q.curso_id, c.nombre AS curso_nombre, c.docente_id
       FROM quiz q
       JOIN curso c ON c.id_curso = q.curso_id
       WHERE q.id_quiz = $1`,
      [idQuiz]
    );
    return rows[0] ?? null;
  },

  /**
   * CA-21.1: una fila por inscrito activo del curso del quiz, más quien tenga resultado aunque ya
   * no esté activo (S2). Sin fila en resultado_quiz => id_resultado = null ("No presentó").
   */
  async resultadosPorEstudiante(idQuiz, cursoId) {
    const { rows } = await pool.query(
      `SELECT u.id_usuario AS estudiante_id, u.nombre_completo,
              r.id_resultado, r.calificacion, r.puntaje_obtenido, r.puntaje_maximo,
              r.tiempo_empleado_seg, r.fecha_envio
       FROM usuario u
       LEFT JOIN resultado_quiz r ON r.estudiante_id = u.id_usuario AND r.quiz_id = $1
       WHERE r.id_resultado IS NOT NULL
          OR EXISTS (SELECT 1 FROM inscripcion i
                     WHERE i.curso_id = $2 AND i.estudiante_id = u.id_usuario
                       AND i.estado = 'activa')
       ORDER BY u.nombre_completo`,
      [idQuiz, cursoId]
    );
    return rows;
  },

  /**
   * CA-21.2: preguntas con mayor % de error (S4, S5). El JOIN interno deja fuera las preguntas
   * sin respuestas.
   */
  async preguntasConMasError(idQuiz, limite) {
    const { rows } = await pool.query(
      `SELECT p.id_pregunta, p.enunciado, p.orden,
              COUNT(*)::int AS total_respuestas,
              (COUNT(*) FILTER (WHERE rq.es_correcta = false))::int AS incorrectas
       FROM pregunta_quiz p
       JOIN respuesta_quiz rq ON rq.pregunta_id = p.id_pregunta
       WHERE p.quiz_id = $1
       GROUP BY p.id_pregunta, p.enunciado, p.orden
       ORDER BY (COUNT(*) FILTER (WHERE rq.es_correcta = false))::float / COUNT(*) DESC,
                p.orden ASC NULLS LAST, p.id_pregunta
       LIMIT $2`,
      [idQuiz, limite]
    );
    return rows;
  },
};