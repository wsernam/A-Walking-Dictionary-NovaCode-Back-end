// Repositorio de Aporte: acceso a datos para la tabla "aporte" del DER oficial.

import { pool } from '../config/db.js';
import { Aporte } from '../models/Aporte.js';

export const AporteRepository = {
  async crear(datos) {
    const {
      tarjeta_id,
      inscripcion_id,
      traduccion_aportada,
      definicion_aportada,
      ejemplo_aportado,
      tipo_aporte,
      fecha_aporte,
    } = datos;
    const { rows } = await pool.query(
      `INSERT INTO aporte (tarjeta_id, inscripcion_id, traduccion_aportada, definicion_aportada, ejemplo_aportado, tipo_aporte, fecha_aporte)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tarjeta_id, inscripcion_id, traduccion_aportada, definicion_aportada, ejemplo_aportado, tipo_aporte, fecha_aporte]
    );
    return new Aporte(rows[0]);
  },

  async obtenerPorId(id_aporte) {
    const { rows } = await pool.query('SELECT * FROM aporte WHERE id_aporte = $1', [id_aporte]);
    return rows[0] ? new Aporte(rows[0]) : null;
  },

  // HU-2.1 (CA-2.1.3): estudiante que originó la tarjeta (aporte con tipo_aporte='creada'),
  // para notificarlo cuando la docente la rechaza. Devuelve { inscripcion_id, estudiante_id }
  // o null si no se encuentra el aporte de creación.
  async obtenerAportanteCreador(tarjeta_id) {
    const { rows } = await pool.query(
      `SELECT i.id_inscripcion, i.estudiante_id
       FROM aporte a
       JOIN inscripcion i ON i.id_inscripcion = a.inscripcion_id
       WHERE a.tarjeta_id = $1 AND a.tipo_aporte = 'creada'
       ORDER BY a.fecha_aporte
       LIMIT 1`,
      [tarjeta_id]
    );
    return rows[0]
      ? { inscripcion_id: rows[0].id_inscripcion, estudiante_id: rows[0].estudiante_id }
      : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM aporte');
    return rows.map((row) => new Aporte(row));
  },

  /**
   * HU-2.3 (CA-2.3.1 / CA-2.3.2): resumen de participación por estudiante dentro de un mazo.
   * Agrega (COUNT) sobre la tabla "aporte" agrupando por usuario (el DER relaciona "aporte" con
   * "inscripcion", no con "usuario" directo, así que se une aporte -> inscripcion -> usuario).
   *
   * Incluye a TODOS los estudiantes inscritos en el curso del mazo (JOIN a inscripcion), aunque
   * no tengan ningún aporte (LEFT JOIN a aporte) — así CA-2.3.2 ("Sin aportes") puede detectarlos.
   *
   * @param {number} mazo_id
   * @returns {Promise<Array<object>>} una fila por estudiante inscrito, ordenada por nombre.
   */
  async analiticasPorMazo(mazo_id) {
    const { rows } = await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre_completo,
         i.id_inscripcion,
         COUNT(a.id_aporte)                                                 AS aportes_totales,
         COUNT(a.id_aporte) FILTER (WHERE a.tipo_aporte = 'creada')         AS palabras_creadas,
         COUNT(a.id_aporte) FILTER (WHERE a.tipo_aporte = 'coautoria')      AS coautorias,
         COUNT(a.id_aporte) FILTER (WHERE a.tipo_aporte = 'acepcion_nueva') AS acepciones_nuevas,
         COUNT(a.id_aporte) FILTER (WHERE t.estado = 'pendiente_revision')  AS aportes_pendiente_revision,
         COUNT(a.id_aporte) FILTER (WHERE t.estado = 'revisado_docente')    AS aportes_revisado_docente,
         COUNT(a.id_aporte) FILTER (WHERE t.estado = 'rechazada')           AS aportes_rechazada
       FROM mazo m
       JOIN inscripcion i ON i.curso_id = m.curso_id
       JOIN usuario u ON u.id_usuario = i.estudiante_id
       LEFT JOIN tarjeta t ON t.mazo_id = m.id_mazo
       LEFT JOIN aporte a ON a.tarjeta_id = t.id_tarjeta AND a.inscripcion_id = i.id_inscripcion
       WHERE m.id_mazo = $1
       GROUP BY u.id_usuario, u.nombre_completo, i.id_inscripcion
       ORDER BY u.nombre_completo`,
      [mazo_id]
    );
    return rows.map((r) => ({
      usuario_id: r.id_usuario,
      nombre_completo: r.nombre_completo,
      inscripcion_id: r.id_inscripcion,
      aportes_totales: Number(r.aportes_totales),
      palabras_creadas: Number(r.palabras_creadas),
      coautorias: Number(r.coautorias),
      acepciones_nuevas: Number(r.acepciones_nuevas),
      estado_revision: {
        pendiente_revision: Number(r.aportes_pendiente_revision),
        revisado_docente: Number(r.aportes_revisado_docente),
        rechazada: Number(r.aportes_rechazada),
      },
      sin_aportes: Number(r.aportes_totales) === 0,
    }));
  },

  async actualizar(id_aporte, datos) {
    const {
      tarjeta_id,
      inscripcion_id,
      traduccion_aportada,
      definicion_aportada,
      ejemplo_aportado,
      tipo_aporte,
      fecha_aporte,
    } = datos;
    const { rows } = await pool.query(
      `UPDATE aporte
       SET tarjeta_id = $2, inscripcion_id = $3, traduccion_aportada = $4, definicion_aportada = $5,
           ejemplo_aportado = $6, tipo_aporte = $7, fecha_aporte = $8
       WHERE id_aporte = $1
       RETURNING *`,
      [id_aporte, tarjeta_id, inscripcion_id, traduccion_aportada, definicion_aportada, ejemplo_aportado, tipo_aporte, fecha_aporte]
    );
    return rows[0] ? new Aporte(rows[0]) : null;
  },

  async eliminar(id_aporte) {
    const { rowCount } = await pool.query('DELETE FROM aporte WHERE id_aporte = $1', [id_aporte]);
    return rowCount > 0;
  },
};
