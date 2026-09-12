/**
 * @file TarjetaRepository.js
 * @brief Repositorio de Tarjeta: acceso a datos para la tabla "tarjeta" del DER oficial.
 * @note (mazo_id, palabra) es único según el DER — obtenerPorMazoYPalabra() se apoya en ese
 * índice para la detección de duplicados de HU-1.3.
 */

import { pool } from '../config/db.js';
import { Tarjeta } from '../models/Tarjeta.js';

export const TarjetaRepository = {
  /**
   * @brief Inserta una tarjeta nueva en la base de datos.
   * @param {Object} datos - Campos de "tarjeta" (mazo_id, palabra, traduccion, definicion,
   * ejemplo, estado, fecha_creacion, fecha_revision).
   * @return {Promise<Tarjeta>} La tarjeta recién creada, con su id_tarjeta asignado.
   */
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

  /**
   * @brief Busca una tarjeta por su id_tarjeta.
   * @param {number} id_tarjeta - Id de la tarjeta a buscar.
   * @return {Promise<Tarjeta|null>} La tarjeta encontrada, o null si no existe.
   */
  async obtenerPorId(id_tarjeta) {
    const { rows } = await pool.query('SELECT * FROM tarjeta WHERE id_tarjeta = $1', [id_tarjeta]);
    return rows[0] ? new Tarjeta(rows[0]) : null;
  },

  /**
   * @brief Busca una tarjeta por mazo + palabra exacta. Usado por
   * DeduplicacionService.buscarDuplicado() para HU-1.3; la palabra debe llegar ya normalizada
   * (trim + minúsculas) para que la comparación sea insensible a mayúsculas (CA-1.3.3).
   * @param {number} mazo_id - Id del mazo donde buscar.
   * @param {string} palabra - Palabra normalizada a buscar.
   * @return {Promise<Tarjeta|null>} La tarjeta encontrada, o null si esa palabra no existe
   * todavía en ese mazo.
   */
  async obtenerPorMazoYPalabra(mazo_id, palabra) {
    const { rows } = await pool.query(
      'SELECT * FROM tarjeta WHERE mazo_id = $1 AND palabra = $2',
      [mazo_id, palabra]
    );
    return rows[0] ? new Tarjeta(rows[0]) : null;
  },

  /**
   * @brief Lista todas las tarjetas, sin filtros.
   * @return {Promise<Tarjeta[]>} Arreglo con todas las tarjetas existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM tarjeta');
    return rows.map((row) => new Tarjeta(row));
  },

  /**
   * @brief Reemplaza todos los campos de una tarjeta existente (UPDATE completo).
   * @param {number} id_tarjeta - Id de la tarjeta a actualizar.
   * @param {Object} datos - Nuevos valores de todas las columnas de "tarjeta".
   * @return {Promise<Tarjeta|null>} La tarjeta actualizada, o null si el id no existe.
   */

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

  /**
   * @brief Elimina una tarjeta por su id_tarjeta.
   * @param {number} id_tarjeta - Id de la tarjeta a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   */
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

  /**
   * @brief Lista todas las tarjetas de un mazo específico. Usado por
   * ContextoService.aplicarVarianteRegionalPorMazo (CA-2.2.2, asignación masiva de variante
   * regional al guardar el mazo).
   * @param {number} mazo_id - Id del mazo.
   * @return {Promise<Tarjeta[]>} Arreglo con las tarjetas de ese mazo.
   */
  async listarPorMazo(mazo_id) {
    const { rows } = await pool.query('SELECT * FROM tarjeta WHERE mazo_id = $1', [mazo_id]);
    return rows.map((row) => new Tarjeta(row));
  },
};
