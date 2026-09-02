// Repositorio de Mazo: acceso a datos para la tabla "mazo" del DER oficial.

import { pool } from '../config/db.js';
import { Mazo } from '../models/Mazo.js';

export const MazoRepository = {
  async crear(datos) {
    const {
      curso_id,
      nombre_lectura,
      autor,
      semana,
      variante_regional_predeterminada,
      estado,
      fecha_apertura,
      fecha_cierre,
      fecha_creacion,
    } = datos;
    const { rows } = await pool.query(
      `INSERT INTO mazo (curso_id, nombre_lectura, autor, semana, variante_regional_predeterminada, estado, fecha_apertura, fecha_cierre, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [curso_id, nombre_lectura, autor, semana, variante_regional_predeterminada, estado, fecha_apertura, fecha_cierre, fecha_creacion]
    );
    return new Mazo(rows[0]);
  },

  async obtenerPorId(id_mazo) {
    const { rows } = await pool.query('SELECT * FROM mazo WHERE id_mazo = $1', [id_mazo]);
    return rows[0] ? new Mazo(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM mazo');
    return rows.map((row) => new Mazo(row));
  },

  async actualizar(id_mazo, datos) {
    const {
      curso_id,
      nombre_lectura,
      autor,
      semana,
      variante_regional_predeterminada,
      estado,
      fecha_apertura,
      fecha_cierre,
      fecha_creacion,
    } = datos;
    const { rows } = await pool.query(
      `UPDATE mazo
       SET curso_id = $2, nombre_lectura = $3, autor = $4, semana = $5, variante_regional_predeterminada = $6,
           estado = $7, fecha_apertura = $8, fecha_cierre = $9, fecha_creacion = $10
       WHERE id_mazo = $1
       RETURNING *`,
      [id_mazo, curso_id, nombre_lectura, autor, semana, variante_regional_predeterminada, estado, fecha_apertura, fecha_cierre, fecha_creacion]
    );
    return rows[0] ? new Mazo(rows[0]) : null;
  },

  async eliminar(id_mazo) {
    const { rowCount } = await pool.query('DELETE FROM mazo WHERE id_mazo = $1', [id_mazo]);
    return rowCount > 0;
  },
};
