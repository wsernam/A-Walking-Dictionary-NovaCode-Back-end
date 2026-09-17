/**
 * @file AporteRepository.js
 * @brief Repositorio de Aporte: acceso a datos para la tabla "aporte" del DER oficial.
 */

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

  async listar() {
    const { rows } = await pool.query('SELECT * FROM aporte');
    return rows.map((row) => new Aporte(row));
  },

  /**
   * @brief Lista los aportes de tipo 'coautoria' o 'acepcion_nueva' que siguen pendientes de
   * revisión docente, tanto a nivel de aporte como de la tarjeta a la que pertenecen.
   */
  async listarCoautoriasPendientes() {
    const { rows } = await pool.query(
      `SELECT
         ap.id_aporte,
         ap.tarjeta_id,
         ap.inscripcion_id,
         ap.traduccion_aportada,
         ap.definicion_aportada,
         ap.ejemplo_aportado,
         ap.tipo_aporte,
         ap.fecha_aporte,
         ap.estado AS estado_aporte,
         t.palabra AS palabra_tarjeta,
         t.traduccion AS traduccion_tarjeta,
         t.definicion AS definicion_tarjeta,
         t.estado AS estado_tarjeta
       FROM aporte ap
       JOIN tarjeta t ON t.id_tarjeta = ap.tarjeta_id
       WHERE ap.tipo_aporte IN ('coautoria', 'acepcion_nueva')
         AND ap.estado = 'pendiente_revision'
         AND t.estado = 'pendiente_revision'
       ORDER BY ap.fecha_aporte ASC`
    );
    return rows;
  },

  /**
   * @brief Aprueba un aporte de coautoría/acepción nueva, con correcciones opcionales.
   */
  async aprobar(id_aporte, datosEditados = {}) {
    const actual = await this.obtenerPorId(id_aporte);
    if (!actual) return null;

    const traduccion_aportada = datosEditados.traduccion_aportada ?? actual.traduccion_aportada;
    const definicion_aportada = datosEditados.definicion_aportada ?? actual.definicion_aportada;
    const ejemplo_aportado = datosEditados.ejemplo_aportado ?? actual.ejemplo_aportado;

    const { rows } = await pool.query(
      `UPDATE aporte
       SET estado = 'aprobado',
           traduccion_aportada = $2,
           definicion_aportada = $3,
           ejemplo_aportado = $4
       WHERE id_aporte = $1
       RETURNING *`,
      [id_aporte, traduccion_aportada, definicion_aportada, ejemplo_aportado]
    );
    return rows[0] ? new Aporte(rows[0]) : null;
  },

  /**
   * @brief Obtiene el inscripcion_id del aporte original (tipo_aporte='creada') de una
   * tarjeta. Placeholder mientras no exista join real hasta "usuario".
   */
  async obtenerInscripcionOriginal(tarjeta_id) {
    const { rows } = await pool.query(
      `SELECT inscripcion_id FROM aporte WHERE tarjeta_id = $1 AND tipo_aporte = 'creada' LIMIT 1`,
      [tarjeta_id]
    );
    return rows[0]?.inscripcion_id ?? null;
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