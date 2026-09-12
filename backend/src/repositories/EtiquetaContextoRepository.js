// Repositorio de EtiquetaContexto: acceso a datos para la tabla "etiqueta_contexto" del DER oficial.

import { pool } from '../config/db.js';
import { EtiquetaContexto } from '../models/EtiquetaContexto.js';

export const EtiquetaContextoRepository = {
  async crear(datos) {
    const { tarjeta_id, tipo, valor, fecha_asignacion } = datos;
    const { rows } = await pool.query(
          `INSERT INTO etiqueta_contexto (tarjeta_id, tipo, valor)
          VALUES ($1, $2, $3)
          RETURNING *`,
      [tarjeta_id, tipo, valor]
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



  async listarPorTarjeta(tarjeta_id) {
  const { rows } = await pool.query(
    'SELECT * FROM etiqueta_contexto WHERE tarjeta_id = $1',
    [tarjeta_id]
    );

    return rows.map((row) => new EtiquetaContexto(row));
  },

  async eliminarPorTarjeta(tarjeta_id) {
    const { rowCount } = await pool.query(
      'DELETE FROM etiqueta_contexto WHERE tarjeta_id = $1',
      [tarjeta_id]
    );

    return rowCount > 0;
  },

  /**
   * @brief Elimina solo las etiquetas de un tipo específico ('registro' o 'variante_regional')
   * de una tarjeta, sin tocar las del otro tipo. Usado por la asignación masiva de variante
   * regional por mazo (CA-2.2.2), para no borrar la etiqueta de "registro" que la docente ya
   * haya asignado individualmente a esa tarjeta.
   * @param {number} tarjeta_id - Id de la tarjeta.
   * @param {string} tipo - 'registro' | 'variante_regional'.
   * @return {Promise<boolean>} true si se eliminó al menos una fila.
   */
  async eliminarPorTarjetaYTipo(tarjeta_id, tipo) {
    const { rowCount } = await pool.query(
      'DELETE FROM etiqueta_contexto WHERE tarjeta_id = $1 AND tipo = $2',
      [tarjeta_id, tipo]
    );

    return rowCount > 0;
  },
};
