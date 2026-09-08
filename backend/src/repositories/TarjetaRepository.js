// Repositorio de Tarjeta: acceso a datos para la tabla "tarjeta" del DER oficial.
// (mazo_id, palabra) es único según el DER.
//
// "motivo_rechazo" es de la migración 002 (HE-02, CA-2.1.3), PROPUESTA de corrección al DER
// pendiente de aprobar en Slack. Las queries de abajo ya la incluyen: si la migración NO se
// aplicó, crear()/actualizar() fallarán con 'column "motivo_rechazo" does not exist'.

import { pool } from '../config/db.js';
import { Tarjeta } from '../models/Tarjeta.js';

export const TarjetaRepository = {
  async crear(datos) {
    const { mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision, motivo_rechazo } = datos;
    const { rows } = await pool.query(
      `INSERT INTO tarjeta (mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision, motivo_rechazo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision, motivo_rechazo ?? null]
    );
    return new Tarjeta(rows[0]);
  },

  async obtenerPorId(id_tarjeta) {
    const { rows } = await pool.query('SELECT * FROM tarjeta WHERE id_tarjeta = $1', [id_tarjeta]);
    return rows[0] ? new Tarjeta(rows[0]) : null;
  },

  async obtenerPorMazoYPalabra(mazo_id, palabra) {
    const { rows } = await pool.query(
      'SELECT * FROM tarjeta WHERE mazo_id = $1 AND palabra = $2',
      [mazo_id, palabra]
    );
    return rows[0] ? new Tarjeta(rows[0]) : null;
  },

  // HU-2.1 (CA-2.1.1): tarjetas de un mazo, opcionalmente filtradas por estado
  // (p.ej. estado='pendiente_revision' para el panel de curaduría de la docente).
  async listarPorMazo(mazo_id, estado = null) {
    const { rows } = await pool.query(
      `SELECT * FROM tarjeta
       WHERE mazo_id = $1 ${estado ? 'AND estado = $2' : ''}
       ORDER BY fecha_creacion`,
      estado ? [mazo_id, estado] : [mazo_id]
    );
    return rows.map((row) => new Tarjeta(row));
  },

  // HU-2.2 (CA-2.2.2): ids de las tarjetas del mazo que NO tienen todavía una etiqueta
  // de contexto del tipo indicado. Se usa para propagar la variante predeterminada del mazo
  // solo a las tarjetas que no fueron curadas individualmente.
  async idsSinEtiquetaDeTipo(mazo_id, tipo) {
    const { rows } = await pool.query(
      `SELECT t.id_tarjeta
       FROM tarjeta t
       WHERE t.mazo_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM etiqueta_contexto e
           WHERE e.tarjeta_id = t.id_tarjeta AND e.tipo = $2
         )`,
      [mazo_id, tipo]
    );
    return rows.map((row) => row.id_tarjeta);
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM tarjeta');
    return rows.map((row) => new Tarjeta(row));
  },

  // HU-2.3 (CA-2.3.1): conteo de tarjetas del mazo agrupado por estado de revisión.
  // Devuelve siempre las 3 claves conocidas (en 0 si no hay tarjetas en ese estado).
  async resumenEstadosPorMazo(mazo_id) {
    const { rows } = await pool.query(
      `SELECT estado, COUNT(*)::int AS total
       FROM tarjeta
       WHERE mazo_id = $1
       GROUP BY estado`,
      [mazo_id]
    );
    const resumen = { pendiente_revision: 0, revisado_docente: 0, rechazada: 0 };
    for (const row of rows) {
      resumen[row.estado] = row.total;
    }
    return resumen;
  },

  async actualizar(id_tarjeta, datos) {
    const {
      mazo_id, palabra, traduccion, definicion, ejemplo, estado,
      fecha_creacion, fecha_revision, motivo_rechazo,
    } = datos;
    const { rows } = await pool.query(
      `UPDATE tarjeta
       SET mazo_id = $2, palabra = $3, traduccion = $4, definicion = $5, ejemplo = $6,
           estado = $7, fecha_creacion = $8, fecha_revision = $9, motivo_rechazo = $10
       WHERE id_tarjeta = $1
       RETURNING *`,
      [id_tarjeta, mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision, motivo_rechazo ?? null]
    );
    return rows[0] ? new Tarjeta(rows[0]) : null;
  },

  async eliminar(id_tarjeta) {
    const { rowCount } = await pool.query('DELETE FROM tarjeta WHERE id_tarjeta = $1', [id_tarjeta]);
    return rowCount > 0;
  },
};
