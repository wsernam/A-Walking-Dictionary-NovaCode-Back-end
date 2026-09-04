// Repositorio de Tarjeta: acceso a datos para la tabla "tarjeta" del DER oficial.
// (mazo_id, palabra) es único según el DER.

import { pool } from '../config/db.js';
import { Tarjeta } from '../models/Tarjeta.js';

export const TarjetaRepository = {
  async crear(datos) {
    const { mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision } = datos;
    const { rows } = await pool.query(
      `INSERT INTO tarjeta (mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision]
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

  async listar() {
    const { rows } = await pool.query('SELECT * FROM tarjeta');
    return rows.map((row) => new Tarjeta(row));
  },


  async listarPorEstado(estado) {
  const { rows } = await pool.query(
    'SELECT * FROM tarjeta WHERE estado = $1 ORDER BY fecha_creacion ASC',
    [estado]
  );

    return rows.map((row) => new Tarjeta(row));
  },
    
  
  async actualizar(id_tarjeta, datos) {
    const { mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision } = datos;
    const { rows } = await pool.query(
      `UPDATE tarjeta
       SET mazo_id = $2, palabra = $3, traduccion = $4, definicion = $5, ejemplo = $6,
           estado = $7, fecha_creacion = $8, fecha_revision = $9
       WHERE id_tarjeta = $1
       RETURNING *`,
      [id_tarjeta, mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision]
    );
    return rows[0] ? new Tarjeta(rows[0]) : null;
  },

  async actualizarEstado(id_tarjeta, estado, fecha_revision) {
  const { rows } = await pool.query(
    `UPDATE tarjeta
     SET estado = $2,
         fecha_revision = $3
     WHERE id_tarjeta = $1
     RETURNING *`,
    [id_tarjeta, estado, fecha_revision]
  );

    return rows[0] ? new Tarjeta(rows[0]) : null;
  },

  async eliminar(id_tarjeta) {
    const { rowCount } = await pool.query('DELETE FROM tarjeta WHERE id_tarjeta = $1', [id_tarjeta]);
    return rowCount > 0;
  },
};
