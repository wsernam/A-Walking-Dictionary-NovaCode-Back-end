// Repositorio de reportes del modo de estudio (HU-019): consultas de solo lectura sobre
// "progreso_estudio", "inscripcion", "curso", "usuario" y "tarjeta" del DER oficial.
//
// Filtros de alcance (el servicio decide cuál usar según el rol del JWT):
//   - docenteId:    solo inscripciones de cursos donde curso.docente_id = docenteId.
//   - estudianteId: solo inscripciones de ese estudiante (usuario.id_usuario).
// Con un filtro en null no se aplica esa restricción.
//
// Las fechas de progreso_estudio son TIMESTAMP sin zona y se guardan en UTC (ver config/db.js),
// por eso "ahora" se calcula explícitamente en UTC (S4) y no depende de la zona de la sesión.

import { pool } from '../config/db.js';

export const ReporteEstudioRepository = {
  /**
   * CA-19.1: una fila por inscripción activa con tarjetas repasadas, último repaso,
   * distribución de la última valoración de cada tarjeta y tarjetas con repaso vencido.
   * Las inscripciones sin progreso aparecen con tarjetas_repasadas = 0 y fecha_ultimo_repaso = null
   * (el servicio las presenta como "Sin actividad de estudio").
   */
  async resumenPorInscripcion({ docenteId = null, estudianteId = null } = {}) {
    const { rows } = await pool.query(
      `SELECT i.id_inscripcion,
              u.id_usuario AS estudiante_id,
              u.nombre_completo,
              u.email,
              c.id_curso,
              c.nombre AS curso_nombre,
              COUNT(p.id_progreso)::int AS tarjetas_repasadas,
              MAX(p.fecha_ultimo_repaso) AS fecha_ultimo_repaso,
              COUNT(*) FILTER (WHERE p.ultima_valoracion = 'Repetir')::int AS repetir,
              COUNT(*) FILTER (WHERE p.ultima_valoracion = 'Difícil')::int AS dificil,
              COUNT(*) FILTER (WHERE p.ultima_valoracion = 'Buena')::int AS buena,
              COUNT(*) FILTER (WHERE p.ultima_valoracion = 'Fácil')::int AS facil,
              COUNT(*) FILTER (
                WHERE p.fecha_proximo_repaso < (NOW() AT TIME ZONE 'UTC')
              )::int AS vencidas
       FROM inscripcion i
       JOIN usuario u ON u.id_usuario = i.estudiante_id
       JOIN curso c ON c.id_curso = i.curso_id
       LEFT JOIN progreso_estudio p ON p.inscripcion_id = i.id_inscripcion
       WHERE i.estado = 'activa'
         AND ($1::int IS NULL OR c.docente_id = $1)
         AND ($2::int IS NULL OR i.estudiante_id = $2)
       GROUP BY i.id_inscripcion, u.id_usuario, u.nombre_completo, u.email, c.id_curso, c.nombre
       ORDER BY u.nombre_completo, c.nombre`,
      [docenteId, estudianteId]
    );
    return rows;
  },

  /**
   * CA-19.2: por inscripción, las `limite` tarjetas con menor factor de facilidad SM-2,
   * con su última valoración y su próxima fecha de repaso (S7: 10 por defecto).
   * El orden de desempate es la fecha de próximo repaso y luego la palabra.
   * factor_facilidad llega como string (DECIMAL de pg): el servicio debe convertirlo con Number().
   */
  async palabrasDificiles({ docenteId = null, estudianteId = null, limite = 10 } = {}) {
    const { rows } = await pool.query(
      `SELECT inscripcion_id, palabra, factor_facilidad, ultima_valoracion, fecha_proximo_repaso
       FROM (
         SELECT p.inscripcion_id,
                t.palabra,
                p.factor_facilidad,
                p.ultima_valoracion,
                p.fecha_proximo_repaso,
                ROW_NUMBER() OVER (
                  PARTITION BY p.inscripcion_id
                  ORDER BY p.factor_facilidad ASC, p.fecha_proximo_repaso ASC, t.palabra ASC
                ) AS posicion
         FROM progreso_estudio p
         JOIN tarjeta t ON t.id_tarjeta = p.tarjeta_id
         JOIN inscripcion i ON i.id_inscripcion = p.inscripcion_id
         JOIN curso c ON c.id_curso = i.curso_id
         WHERE i.estado = 'activa'
           AND ($1::int IS NULL OR c.docente_id = $1)
           AND ($2::int IS NULL OR i.estudiante_id = $2)
       ) ranking
       WHERE posicion <= $3
       ORDER BY inscripcion_id, posicion`,
      [docenteId, estudianteId, limite]
    );
    return rows;
  },
};