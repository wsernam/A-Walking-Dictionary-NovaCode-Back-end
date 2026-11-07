/**
 * @file Repositorio de EtiquetaContexto: acceso a datos para la tabla "etiqueta_contexto" del
 * DER oficial.
 */

import { pool } from '../config/db.js';
import { EtiquetaContexto } from '../models/EtiquetaContexto.js';

/**
 * Repositorio: consultas SQL a PostgreSQL.
 * @namespace
 */
export const EtiquetaContextoRepository = {
  /**
   * Inserta una etiqueta de contexto para una tarjeta (CA-2.2.1).
   * @param {Object} datos - tarjeta_id, tipo ('registro' | 'variante_regional') y valor.
   * fecha_asignacion se ignora: la pone la base de datos.
   * @return {Promise<EtiquetaContexto>} La etiqueta creada.
   */
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

  /**
   * Busca una etiqueta por su id_etiqueta.
   * @param {number} id_etiqueta - Id de la etiqueta.
   * @return {Promise<EtiquetaContexto|null>} La etiqueta, o null si no existe.
   */
  async obtenerPorId(id_etiqueta) {
    const { rows } = await pool.query('SELECT * FROM etiqueta_contexto WHERE id_etiqueta = $1', [id_etiqueta]);
    return rows[0] ? new EtiquetaContexto(rows[0]) : null;
  },

  /**
   * Lista todas las etiquetas de contexto, sin filtros.
   * @return {Promise<EtiquetaContexto[]>} Todas las etiquetas existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM etiqueta_contexto');
    return rows.map((row) => new EtiquetaContexto(row));
  },

  /**
   * Reemplaza todos los campos de una etiqueta existente (UPDATE completo).
   * @param {number} id_etiqueta - Id de la etiqueta a actualizar.
   * @param {Object} datos - tarjeta_id, tipo, valor y fecha_asignacion.
   * @return {Promise<EtiquetaContexto|null>} La etiqueta actualizada, o null si el id no existe.
   */
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

  /**
   * Elimina una etiqueta por su id_etiqueta.
   * @param {number} id_etiqueta - Id de la etiqueta a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   */
  async eliminar(id_etiqueta) {
    const { rowCount } = await pool.query('DELETE FROM etiqueta_contexto WHERE id_etiqueta = $1', [id_etiqueta]);
    return rowCount > 0;
  },



  /**
   * Lista las etiquetas de una tarjeta (registro y variante regional, CA-2.2.3).
   * @param {number} tarjeta_id - Id de la tarjeta.
   * @return {Promise<EtiquetaContexto[]>} Etiquetas de esa tarjeta (vacío si no tiene).
   */
  async listarPorTarjeta(tarjeta_id) {
  const { rows } = await pool.query(
    'SELECT * FROM etiqueta_contexto WHERE tarjeta_id = $1',
    [tarjeta_id]
    );

    return rows.map((row) => new EtiquetaContexto(row));
  },

  /**
   * Igual que listarPorTarjeta pero para varias tarjetas en una sola consulta (evita N+1).
   * @param {number[]} tarjetaIds - Ids de las tarjetas.
   * @return {Promise<EtiquetaContexto[]>} Etiquetas de todas esas tarjetas; vacío si no se pasan ids.
   */
  async listarPorTarjetas(tarjetaIds) {
    if (tarjetaIds.length === 0) return [];
    const { rows } = await pool.query(
      'SELECT * FROM etiqueta_contexto WHERE tarjeta_id = ANY($1)',
      [tarjetaIds]
    );
    return rows.map((row) => new EtiquetaContexto(row));
  },

  /**
   * Elimina todas las etiquetas de una tarjeta, de cualquier tipo.
   * @param {number} tarjeta_id - Id de la tarjeta.
   * @return {Promise<boolean>} true si se eliminó al menos una fila.
   */
  async eliminarPorTarjeta(tarjeta_id) {
    const { rowCount } = await pool.query(
      'DELETE FROM etiqueta_contexto WHERE tarjeta_id = $1',
      [tarjeta_id]
    );

    return rowCount > 0;
  },

  /**
   * Elimina solo las etiquetas de un tipo específico ('registro' o 'variante_regional')
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
