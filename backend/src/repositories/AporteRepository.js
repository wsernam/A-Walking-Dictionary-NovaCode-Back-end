/**
 * @file AporteRepository.js
 * @brief Repositorio de Aporte: acceso a datos para la tabla "aporte" del DER oficial.
 */

import { pool } from '../config/db.js';
import { Aporte } from '../models/Aporte.js';

export const AporteRepository = {
  /**
   * @brief Inserta un aporte nuevo en la base de datos. Se usa tanto para el aporte original
   * (tipo_aporte='creada') como para coautorías/acepciones nuevas sobre una tarjeta existente.
   * @param {Object} datos - Campos de "aporte" (tarjeta_id, inscripcion_id,
   * traduccion_aportada, definicion_aportada, ejemplo_aportado, tipo_aporte, fecha_aporte).
   * @return {Promise<Aporte>} El aporte recién creado, con su id_aporte asignado.
   */
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

  /**
   * @brief Busca un aporte por su id_aporte.
   * @param {number} id_aporte - Id del aporte a buscar.
   * @return {Promise<Aporte|null>} El aporte encontrado, o null si no existe.
   */
  async obtenerPorId(id_aporte) {
    const { rows } = await pool.query('SELECT * FROM aporte WHERE id_aporte = $1', [id_aporte]);
    return rows[0] ? new Aporte(rows[0]) : null;
  },

  /**
   * @brief Lista todos los aportes, sin filtros.
   * @return {Promise<Aporte[]>} Arreglo con todos los aportes existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM aporte');
    return rows.map((row) => new Aporte(row));
  },

  /**
   * @brief Reemplaza todos los campos de un aporte existente (UPDATE completo).
   * @param {number} id_aporte - Id del aporte a actualizar.
   * @param {Object} datos - Nuevos valores de todas las columnas de "aporte".
   * @return {Promise<Aporte|null>} El aporte actualizado, o null si el id no existe.
   */
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

  /**
   * @brief Elimina un aporte por su id_aporte.
   * @param {number} id_aporte - Id del aporte a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   */
  async eliminar(id_aporte) {
    const { rowCount } = await pool.query('DELETE FROM aporte WHERE id_aporte = $1', [id_aporte]);
    return rowCount > 0;
  },
};
