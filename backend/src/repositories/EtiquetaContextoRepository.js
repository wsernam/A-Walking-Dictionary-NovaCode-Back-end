// Repositorio de EtiquetaContexto: acceso a datos para la tabla "etiqueta_contexto" del DER oficial.

import { pool } from '../config/db.js';
import { EtiquetaContexto } from '../models/EtiquetaContexto.js';

export const EtiquetaContextoRepository = {
  async crear(datos) {
    const { tarjeta_id, tipo, valor, fecha_asignacion } = datos;
    const { rows } = await pool.query(
      `INSERT INTO etiqueta_contexto (tarjeta_id, tipo, valor, fecha_asignacion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tarjeta_id, tipo, valor, fecha_asignacion]
    );
    return new EtiquetaContexto(rows[0]);
  },

  async obtenerPorId(id_etiqueta) {
    const { rows } = await pool.query('SELECT * FROM etiqueta_contexto WHERE id_etiqueta = $1', [id_etiqueta]);
    return rows[0] ? new EtiquetaContexto(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM etiqueta_contexto');
    return rows.map((row) => new EtiquetaContexto(row));
  },

  async actualizar(id_etiqueta, datos) {
    const { tarjeta_id, tipo, valor, fecha_asignacion } = datos;
    const { rows } = await pool.query(
      `UPDATE etiqueta_contexto
       SET tarjeta_id = $2, tipo = $3, valor = $4, fecha_asignacion = $5
       WHERE id_etiqueta = $1
       RETURNING *`,
      [id_etiqueta, tarjeta_id, tipo, valor, fecha_asignacion]
    );
    return rows[0] ? new EtiquetaContexto(rows[0]) : null;
  },

  async eliminar(id_etiqueta) {
    const { rowCount } = await pool.query('DELETE FROM etiqueta_contexto WHERE id_etiqueta = $1', [id_etiqueta]);
    return rowCount > 0;
  },
};
