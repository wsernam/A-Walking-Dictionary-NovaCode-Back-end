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
   * @brief Lista los aportes de tipo 'coautoria' o 'acepcion_nueva' que siguen pendientes de
   * revisión docente, tanto a nivel de aporte como de la tarjeta a la que pertenecen.
   * @note Depende de la columna aporte.estado (supuesto pendiente de validar, no está en el DER).
   * @return {Promise<Object[]>} Filas del aporte + palabra/traducción/definición/estado de su tarjeta.
   */
  async listarCoautoriasPendientes() {
    const { rows } = await pool.query(
      `SELECT
         ap.id_aporte,
         ap.tarjeta_id,
         ap.inscripcion_id,
         ap.traduccion_aportada,
         ap.definicion_aportada,
         ap.ejemplo_aportado,
         ap.tipo_aporte,
         ap.fecha_aporte,
         ap.estado AS estado_aporte,
         t.palabra AS palabra_tarjeta,
         t.traduccion AS traduccion_tarjeta,
         t.definicion AS definicion_tarjeta,
         t.estado AS estado_tarjeta
       FROM aporte ap
       JOIN tarjeta t ON t.id_tarjeta = ap.tarjeta_id
       WHERE ap.tipo_aporte IN ('coautoria', 'acepcion_nueva')
         AND ap.estado = 'pendiente_revision'
         AND t.estado = 'pendiente_revision'
       ORDER BY ap.fecha_aporte ASC`
    );
    return rows;
  },

  /**
   * @brief Ids de las coautorías/acepciones nuevas de una tarjeta que siguen pendientes de revisión.
   * @param {number} tarjeta_id - Id de la tarjeta.
   * @return {Promise<number[]>} Ids de aporte pendientes (vacío si no hay).
   */
  async listarIdsPendientesPorTarjeta(tarjeta_id) {
    const { rows } = await pool.query(
      `SELECT id_aporte FROM aporte
       WHERE tarjeta_id = $1
         AND tipo_aporte IN ('coautoria', 'acepcion_nueva')
         AND estado = 'pendiente_revision'
       ORDER BY id_aporte`,
      [tarjeta_id]
    );
    return rows.map((row) => row.id_aporte);
  },

  /**
   * @brief Aprueba un aporte de coautoría/acepción nueva, con correcciones opcionales de la docente.
   * @note Depende de la columna aporte.estado (supuesto pendiente de validar, no está en el DER).
   * @param {number} id_aporte - Id del aporte a aprobar.
   * @param {Object} [datosEditados] - traduccion_aportada/definicion_aportada/ejemplo_aportado
   * corregidos; los que no vengan conservan su valor actual.
   * @return {Promise<Aporte|null>} El aporte aprobado, o null si el id no existe.
   */
  async aprobar(id_aporte, datosEditados = {}) {
    const actual = await this.obtenerPorId(id_aporte);
    if (!actual) return null;

    const traduccion_aportada = datosEditados.traduccion_aportada ?? actual.traduccion_aportada;
    const definicion_aportada = datosEditados.definicion_aportada ?? actual.definicion_aportada;
    const ejemplo_aportado = datosEditados.ejemplo_aportado ?? actual.ejemplo_aportado;

    const { rows } = await pool.query(
      `UPDATE aporte
       SET estado = 'aprobado',
           traduccion_aportada = $2,
           definicion_aportada = $3,
           ejemplo_aportado = $4
       WHERE id_aporte = $1
       RETURNING *`,
      [id_aporte, traduccion_aportada, definicion_aportada, ejemplo_aportado]
    );
    return rows[0] ? new Aporte(rows[0]) : null;
  },

  /**
   * @brief Obtiene, en una sola consulta, el nombre del estudiante que creó cada tarjeta
   * (aporte tipo 'creada' -> inscripcion -> usuario).
   * @param {number[]} tarjetaIds - Ids de las tarjetas a consultar.
   * @return {Promise<Map<number, string>>} Mapa tarjeta_id -> nombre_completo del autor.
   */
  async obtenerAutoresOriginales(tarjetaIds) {
    if (tarjetaIds.length === 0) return new Map();
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (ap.tarjeta_id) ap.tarjeta_id, u.nombre_completo
       FROM aporte ap
       JOIN inscripcion i ON i.id_inscripcion = ap.inscripcion_id
       JOIN usuario u ON u.id_usuario = i.estudiante_id
       WHERE ap.tarjeta_id = ANY($1) AND ap.tipo_aporte = 'creada'
       ORDER BY ap.tarjeta_id, ap.fecha_aporte ASC`,
      [tarjetaIds]
    );
    return new Map(rows.map((row) => [row.tarjeta_id, row.nombre_completo]));
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
