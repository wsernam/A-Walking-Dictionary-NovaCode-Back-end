/**
 * @file AnalyticsRepository.js
 * @brief Repositorio de solo lectura para HU-2.3 (resumen de participación por mazo). No
 * corresponde a ninguna tabla propia del DER — agrega datos de inscripcion, usuario, aporte
 * y tarjeta con una consulta SQL directa (no hay una entidad "analytics" en el DER).
 */

import { pool } from '../config/db.js';

export const AnalyticsRepository = {
  /**
   * @brief CA-2.3.1: por cada estudiante inscrito en el curso del mazo, cuenta cuántas
   * palabras aportó (tipo_aporte='creada'), cuántas coautorías/acepciones hizo, y cuántas de
   * sus tarjetas están pendientes o ya aprobadas. Incluye a los estudiantes sin ningún aporte
   * (LEFT JOIN), necesario para CA-2.3.2 ("Sin aportes").
   *
   * @param {number} mazo_id - Id del mazo a analizar.
   * @param {number} curso_id - Id del curso al que pertenece el mazo (para listar sus inscritos).
   * @return {Promise<Array<{estudiante_id:number, nombre_completo:string, palabras_aportadas:number,
   * coautorias:number, tarjetas_pendientes:number, tarjetas_aprobadas:number}>>}
   */
  async resumenParticipacionPorMazo(mazo_id, curso_id) {
    const { rows } = await pool.query(
      `SELECT
         u.id_usuario AS estudiante_id,
         u.nombre_completo,
         COUNT(*) FILTER (WHERE a.tipo_aporte = 'creada') AS palabras_aportadas,
         COUNT(*) FILTER (WHERE a.tipo_aporte IN ('coautoria', 'acepcion_nueva')) AS coautorias,
         COUNT(*) FILTER (WHERE a.tipo_aporte = 'creada' AND t.estado = 'pendiente_revision') AS tarjetas_pendientes,
         COUNT(*) FILTER (WHERE a.tipo_aporte = 'creada' AND t.estado = 'revisado_docente') AS tarjetas_aprobadas
       FROM inscripcion i
       JOIN usuario u ON u.id_usuario = i.estudiante_id
       LEFT JOIN aporte a ON a.inscripcion_id = i.id_inscripcion
       LEFT JOIN tarjeta t ON t.id_tarjeta = a.tarjeta_id AND t.mazo_id = $1
       WHERE i.curso_id = $2
         AND (a.id_aporte IS NULL OR t.id_tarjeta IS NOT NULL)
       GROUP BY u.id_usuario, u.nombre_completo
       ORDER BY u.nombre_completo`,
      [mazo_id, curso_id]
    );

    // pg devuelve los COUNT(...) como string; se convierten a number para el frontend.
    return rows.map((row) => ({
      estudiante_id: row.estudiante_id,
      nombre_completo: row.nombre_completo,
      palabras_aportadas: Number(row.palabras_aportadas),
      coautorias: Number(row.coautorias),
      tarjetas_pendientes: Number(row.tarjetas_pendientes),
      tarjetas_aprobadas: Number(row.tarjetas_aprobadas),
    }));
  },
};
