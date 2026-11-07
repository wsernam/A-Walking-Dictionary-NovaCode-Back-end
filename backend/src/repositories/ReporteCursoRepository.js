// Repositorio del reporte de estudiantes del curso (HU-020): consultas de solo lectura sobre
// "curso", "inscripcion", "usuario", "aporte", "tarjeta", "quiz" y "resultado_quiz" del DER oficial.
//
// Todas las consultas reciben el id del curso (curso.id_curso) que ya validó ReporteCursoService:
// que existe y que pertenece a la docente del JWT. Aquí no se aplica ningún filtro por docente.
//
// Las fechas de quiz son TIMESTAMP sin zona y se guardan en UTC (ver config/db.js), por eso
// "ahora" se calcula explícitamente en UTC y no depende de la zona de la sesión de PostgreSQL.

import { pool } from '../config/db.js';

export const ReporteCursoRepository = {
  /**
   * CA-20.1: datos del curso para el encabezado del reporte (nombre) y para la regla de acceso
   * (docente_id). Devuelve null si el curso no existe: el servicio lo responde como 404.
   */
  async obtenerCurso(cursoId) {
    const { rows } = await pool.query(
      `SELECT id_curso, nombre, docente_id
       FROM curso
       WHERE id_curso = $1`,
      [cursoId]
    );
    return rows[0] ?? null;
  },

  /**
   * CA-20.1: una fila por estudiante con inscripción activa en el curso, con sus palabras añadidas
   * (aportes 'creada'), las aprobadas (de esas, tarjeta 'revisado_docente') y sus coautorías
   * (aportes 'coautoria' y 'acepcion_nueva', el mismo criterio que AnaliticaRepository y HU-018).
   * Un estudiante sin aportes aparece igual, con ceros.
   */
  async listarEstudiantes(cursoId) {
    const { rows } = await pool.query(
      `SELECT u.id_usuario AS estudiante_id,
              u.nombre_completo,
              u.codigo_estudiantil,
              u.nivel_ingles,
              COUNT(*) FILTER (WHERE ap.tipo_aporte = 'creada')::int AS palabras_anadidas,
              COUNT(*) FILTER (
                WHERE ap.tipo_aporte = 'creada' AND t.estado = 'revisado_docente'
              )::int AS palabras_aprobadas,
              COUNT(*) FILTER (
                WHERE ap.tipo_aporte IN ('coautoria', 'acepcion_nueva')
              )::int AS coautorias
       FROM inscripcion i
       JOIN usuario u ON u.id_usuario = i.estudiante_id
       LEFT JOIN aporte ap ON ap.inscripcion_id = i.id_inscripcion
       LEFT JOIN tarjeta t ON t.id_tarjeta = ap.tarjeta_id
       WHERE i.curso_id = $1
         AND i.estado = 'activa'
       GROUP BY u.id_usuario, u.nombre_completo, u.codigo_estudiantil, u.nivel_ingles
       ORDER BY u.nombre_completo ASC, u.id_usuario ASC`,
      [cursoId]
    );
    return rows;
  },

  /**
   * CA-20.2: quices del curso que ya abrieron (los programados a futuro no se pueden presentar, así
   * que listarlos solo llenaría el reporte de "No presentó"). Se ordenan por apertura y luego por
   * id para que las columnas del PDF sigan el orden cronológico.
   */
  async listarQuices(cursoId) {
    const { rows } = await pool.query(
      `SELECT id_quiz, titulo, fecha_apertura
       FROM quiz
       WHERE curso_id = $1
         AND (
           estado <> 'programado'
           OR fecha_apertura IS NULL
           OR fecha_apertura <= (NOW() AT TIME ZONE 'UTC')
         )
       ORDER BY fecha_apertura ASC NULLS LAST, id_quiz ASC`,
      [cursoId]
    );
    return rows;
  },

  /**
   * CA-20.2: calificación de cada estudiante en cada quiz del curso que ya envió. Los que no
   * enviaron no tienen fila: el servicio los marca como "No presentó".
   * calificacion llega como string (DECIMAL de pg): el servicio la convierte con Number().
   */
  async listarCalificaciones(cursoId) {
    const { rows } = await pool.query(
      `SELECT rq.quiz_id, rq.estudiante_id, rq.calificacion
       FROM resultado_quiz rq
       JOIN quiz q ON q.id_quiz = rq.quiz_id
       WHERE q.curso_id = $1
         AND rq.fecha_envio IS NOT NULL
         AND rq.calificacion IS NOT NULL`,
      [cursoId]
    );
    return rows;
  },
};
