// Repositorio del reporte de progreso individual (HU-018): consultas de solo lectura sobre
// "usuario", "inscripcion", "curso", "aporte", "tarjeta", "mazo", "resultado_quiz", "quiz" y
// "progreso_estudio" del DER oficial.
//
// Filtros de alcance (el servicio decide cuál usar según el rol del JWT):
//   - estudianteId: el estudiante del reporte (usuario.id_usuario). Obligatorio.
//   - docenteId:    solo inscripciones de cursos donde curso.docente_id = docenteId.
// Con docenteId en null no se aplica esa restricción (estudiante viendo lo suyo).

import { pool } from '../config/db.js';

export const ReporteProgresoRepository = {
  /**
   * CA-18.1: datos personales del estudiante (nombre, código, nivel MCER) y los cursos en los que
   * está inscrito dentro del alcance. Devuelve null si el usuario no existe, no es estudiante o no
   * tiene inscripción activa visible para el filtro: el servicio lo responde como 404.
   */
  async obtenerEstudiante({ estudianteId, docenteId = null }) {
    const { rows } = await pool.query(
      `SELECT u.id_usuario AS estudiante_id,
              u.nombre_completo,
              u.email,
              u.codigo_estudiantil,
              u.nivel_ingles,
              string_agg(DISTINCT c.nombre, ', ' ORDER BY c.nombre) AS cursos
       FROM usuario u
       JOIN inscripcion i ON i.estudiante_id = u.id_usuario
       JOIN curso c ON c.id_curso = i.curso_id
       WHERE u.id_usuario = $1
         AND u.rol = 'estudiante'
         AND i.estado = 'activa'
         AND ($2::int IS NULL OR c.docente_id = $2)
       GROUP BY u.id_usuario, u.nombre_completo, u.email, u.codigo_estudiantil, u.nivel_ingles`,
      [estudianteId, docenteId]
    );
    return rows[0] ?? null;
  },

  /**
   * CA-18.1: todos los aportes del estudiante (palabras creadas, coautorías y acepciones nuevas)
   * con la palabra, el estado de su tarjeta y la semana del mazo. El servicio separa los tipos.
   */
  async listarAportes({ estudianteId, docenteId = null }) {
    const { rows } = await pool.query(
      `SELECT ap.id_aporte,
              ap.tipo_aporte,
              ap.traduccion_aportada,
              ap.fecha_aporte,
              t.palabra,
              t.estado AS estado_tarjeta,
              m.semana
       FROM aporte ap
       JOIN inscripcion i ON i.id_inscripcion = ap.inscripcion_id
       JOIN curso c ON c.id_curso = i.curso_id
       JOIN tarjeta t ON t.id_tarjeta = ap.tarjeta_id
       JOIN mazo m ON m.id_mazo = t.mazo_id
       WHERE i.estudiante_id = $1
         AND i.estado = 'activa'
         AND ($2::int IS NULL OR c.docente_id = $2)
       ORDER BY m.semana ASC, t.palabra ASC, ap.fecha_aporte ASC`,
      [estudianteId, docenteId]
    );
    return rows;
  },

  /**
   * CA-18.2: quices que el estudiante ya envió, con fecha de envío y calificación.
   * calificacion, puntaje_obtenido y puntaje_maximo llegan como string (NUMERIC de pg): el
   * servicio los convierte con Number().
   */
  async listarResultadosQuiz({ estudianteId, docenteId = null }) {
    const { rows } = await pool.query(
      `SELECT q.id_quiz,
              q.titulo,
              rq.fecha_envio,
              rq.calificacion,
              rq.puntaje_obtenido,
              rq.puntaje_maximo
       FROM resultado_quiz rq
       JOIN quiz q ON q.id_quiz = rq.quiz_id
       JOIN curso c ON c.id_curso = q.curso_id
       WHERE rq.estudiante_id = $1
         AND rq.fecha_envio IS NOT NULL
         AND ($2::int IS NULL OR c.docente_id = $2)
       ORDER BY rq.fecha_envio ASC, q.id_quiz ASC`,
      [estudianteId, docenteId]
    );
    return rows;
  },

  /**
   * CA-18.2: avance de repaso (modo de estudio): tarjetas repasadas y fecha del último repaso.
   * Mismo criterio que el reporte de HU-019: una fila de progreso_estudio por tarjeta repasada.
   */
  async resumenRepaso({ estudianteId, docenteId = null }) {
    const { rows } = await pool.query(
      `SELECT COUNT(p.id_progreso)::int AS tarjetas_repasadas,
              MAX(p.fecha_ultimo_repaso) AS fecha_ultimo_repaso
       FROM progreso_estudio p
       JOIN inscripcion i ON i.id_inscripcion = p.inscripcion_id
       JOIN curso c ON c.id_curso = i.curso_id
       WHERE i.estudiante_id = $1
         AND i.estado = 'activa'
         AND ($2::int IS NULL OR c.docente_id = $2)`,
      [estudianteId, docenteId]
    );
    return rows[0] ?? { tarjetas_repasadas: 0, fecha_ultimo_repaso: null };
  },
};
