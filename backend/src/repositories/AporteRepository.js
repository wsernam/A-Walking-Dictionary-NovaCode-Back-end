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

  async listar() {
    const { rows } = await pool.query('SELECT * FROM aporte');
    return rows.map((row) => new Aporte(row));
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
