/**
 * @file MazoRepository.js
 * @brief Repositorio de Mazo: acceso a datos para la tabla "mazo" del DER oficial.
 *
 * @note "docente_id" es redundante con curso.docente_id, pero el equipo confirmó mantenerlo
 * duplicado en "mazo" por conveniencia de consulta. Decisión confirmada, ya no es un pendiente.
 */

import { pool } from '../config/db.js';
import { Mazo } from '../models/Mazo.js';

export const MazoRepository = {
  /**
   * @brief Inserta un mazo nuevo en la base de datos. fecha_creacion la calcula Postgres
   * con NOW(), no se recibe por parámetro.
   * @param {Object} datos - Campos de "mazo" (curso_id, docente_id, nombre_lectura, autor,
   * semana, variante_regional_predeterminada, estado, fecha_apertura, fecha_cierre).
   * @return {Promise<Mazo>} El mazo recién creado, con su id_mazo y fecha_creacion asignados.
   */
  async crear(datos) {
    const {
      curso_id,
      docente_id,
      nombre_lectura,
      autor,
      semana,
      variante_regional_predeterminada,
      estado,
      fecha_apertura,
      fecha_cierre,
    } = datos;
    const { rows } = await pool.query(
      `INSERT INTO mazo (curso_id, docente_id, nombre_lectura, autor, semana, variante_regional_predeterminada, estado, fecha_apertura, fecha_cierre, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [curso_id, docente_id, nombre_lectura, autor, semana, variante_regional_predeterminada, estado, fecha_apertura, fecha_cierre]
    );
    return new Mazo(rows[0]);
  },

  /**
   * @brief Busca un mazo por su id_mazo.
   * @param {number} id_mazo - Id del mazo a buscar.
   * @return {Promise<Mazo|null>} El mazo encontrado, o null si no existe.
   */
  async obtenerPorId(id_mazo) {
    const { rows } = await pool.query('SELECT * FROM mazo WHERE id_mazo = $1', [id_mazo]);
    return rows[0] ? new Mazo(rows[0]) : null;
  },

  /**
   * @brief Lista todos los mazos, sin filtros.
   * @return {Promise<Mazo[]>} Arreglo con todos los mazos existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM mazo');
    return rows.map((row) => new Mazo(row));
  },

  /**
   * @brief Reemplaza todos los campos de un mazo existente (UPDATE completo).
   * @param {number} id_mazo - Id del mazo a actualizar.
   * @param {Object} datos - Nuevos valores de todas las columnas de "mazo".
   * @return {Promise<Mazo|null>} El mazo actualizado, o null si el id no existe.
   */
  async actualizar(id_mazo, datos) {
    const {
      curso_id,
      docente_id,
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
       SET curso_id = $2, docente_id = $3, nombre_lectura = $4, autor = $5, semana = $6,
           variante_regional_predeterminada = $7, estado = $8, fecha_apertura = $9,
           fecha_cierre = $10, fecha_creacion = $11
       WHERE id_mazo = $1
       RETURNING *`,
      [id_mazo, curso_id, docente_id, nombre_lectura, autor, semana, variante_regional_predeterminada, estado, fecha_apertura, fecha_cierre, fecha_creacion]
    );
    return rows[0] ? new Mazo(rows[0]) : null;
  },

  /**
   * @brief Elimina un mazo por su id_mazo.
   * @param {number} id_mazo - Id del mazo a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   * @note Falla (rechaza la promesa) si el mazo todavía tiene tarjetas asociadas, por la
   * foreign key tarjeta.mazo_id -> mazo.id_mazo.
   */
  async eliminar(id_mazo) {
    const { rowCount } = await pool.query('DELETE FROM mazo WHERE id_mazo = $1', [id_mazo]);
    return rowCount > 0;
  },

  /**
   * @brief Cambia únicamente variante_regional_predeterminada de un mazo. Usado por
   * MazoController.actualizarVarianteRegional (CA-2.2.2).
   * @param {number} id_mazo - Id del mazo.
   * @param {string} variante_regional_predeterminada - Nuevo valor por defecto.
   * @return {Promise<Mazo|null>} El mazo actualizado, o null si el id no existe.
   */
  async actualizarVarianteRegional(id_mazo, variante_regional_predeterminada) {
    const { rows } = await pool.query(
      `UPDATE mazo
       SET variante_regional_predeterminada = $2
       WHERE id_mazo = $1
       RETURNING *`,
      [id_mazo, variante_regional_predeterminada]
    );
    return rows[0] ? new Mazo(rows[0]) : null;
  },
};
