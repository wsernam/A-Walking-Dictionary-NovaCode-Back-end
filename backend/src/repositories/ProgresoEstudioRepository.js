/**
 * @file ProgresoEstudioRepository.js
 * @brief Repositorio de ProgresoEstudio: acceso a datos para la tabla "progreso_estudio" del DER
 * oficial. (inscripcion_id, tarjeta_id) es único según el DER.
 */

import { pool } from '../config/db.js';
import { ProgresoEstudio } from '../models/ProgresoEstudio.js';

export const ProgresoEstudioRepository = {
  /**
   * @brief Inserta un registro de progreso.
   * @param {Object} datos - inscripcion_id, tarjeta_id, factor_facilidad, intervalo_dias,
   * repeticiones, ultima_valoracion, fecha_ultimo_repaso, fecha_proximo_repaso.
   * @return {Promise<ProgresoEstudio>} El registro creado.
   */
  async crear(datos) {
    const {
      inscripcion_id,
      tarjeta_id,
      factor_facilidad,
      intervalo_dias,
      repeticiones,
      ultima_valoracion,
      fecha_ultimo_repaso,
      fecha_proximo_repaso,
    } = datos;
    const { rows } = await pool.query(
      `INSERT INTO progreso_estudio (inscripcion_id, tarjeta_id, factor_facilidad, intervalo_dias, repeticiones, ultima_valoracion, fecha_ultimo_repaso, fecha_proximo_repaso)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [inscripcion_id, tarjeta_id, factor_facilidad, intervalo_dias, repeticiones, ultima_valoracion, fecha_ultimo_repaso, fecha_proximo_repaso]
    );
    return new ProgresoEstudio(rows[0]);
  },

  /**
   * @brief Busca un progreso por su id.
   * @param {number} id_progreso - Id del progreso.
   * @return {Promise<ProgresoEstudio|null>} El registro, o null si no existe.
   */
  async obtenerPorId(id_progreso) {
    const { rows } = await pool.query('SELECT * FROM progreso_estudio WHERE id_progreso = $1', [id_progreso]);
    return rows[0] ? new ProgresoEstudio(rows[0]) : null;
  },

  /**
   * @brief Busca el progreso de una tarjeta para una inscripción. Lo usa EstudioService para leer
   * el estado SM-2 antes de recalcularlo.
   * @param {number} inscripcion_id - Id de la inscripción.
   * @param {number} tarjeta_id - Id de la tarjeta.
   * @return {Promise<ProgresoEstudio|null>} El registro, o null si la tarjeta aún no se ha repasado.
   */
  async obtenerPorInscripcionYTarjeta(inscripcion_id, tarjeta_id) {
    const { rows } = await pool.query(
      'SELECT * FROM progreso_estudio WHERE inscripcion_id = $1 AND tarjeta_id = $2',
      [inscripcion_id, tarjeta_id]
    );
    return rows[0] ? new ProgresoEstudio(rows[0]) : null;
  },

  /**
   * @brief Lista todos los registros de progreso.
   * @return {Promise<ProgresoEstudio[]>} Todos los registros.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM progreso_estudio');
    return rows.map((row) => new ProgresoEstudio(row));
  },

  /**
   * @brief Reemplaza todas las columnas de un registro de progreso.
   * @param {number} id_progreso - Id del progreso.
   * @param {Object} datos - Las mismas columnas que acepta crear().
   * @return {Promise<ProgresoEstudio|null>} El registro actualizado, o null si no existe.
   */
  async actualizar(id_progreso, datos) {
    const {
      inscripcion_id,
      tarjeta_id,
      factor_facilidad,
      intervalo_dias,
      repeticiones,
      ultima_valoracion,
      fecha_ultimo_repaso,
      fecha_proximo_repaso,
    } = datos;
    const { rows } = await pool.query(
      `UPDATE progreso_estudio
       SET inscripcion_id = $2, tarjeta_id = $3, factor_facilidad = $4, intervalo_dias = $5,
           repeticiones = $6, ultima_valoracion = $7, fecha_ultimo_repaso = $8, fecha_proximo_repaso = $9
       WHERE id_progreso = $1
       RETURNING *`,
      [id_progreso, inscripcion_id, tarjeta_id, factor_facilidad, intervalo_dias, repeticiones, ultima_valoracion, fecha_ultimo_repaso, fecha_proximo_repaso]
    );
    return rows[0] ? new ProgresoEstudio(rows[0]) : null;
  },

  /**
   * @brief Elimina un registro de progreso.
   * @param {number} id_progreso - Id del progreso.
   * @return {Promise<boolean>} true si se eliminó una fila.
   */
  async eliminar(id_progreso) {
    const { rowCount } = await pool.query('DELETE FROM progreso_estudio WHERE id_progreso = $1', [id_progreso]);
    return rowCount > 0;
  },

  /**
   * @brief UPSERT por (inscripcion_id, tarjeta_id): inserta el progreso o, si ya existe, actualiza
   * sus valores SM-2. Lo usa EstudioService al registrar una valoración (CA-4.1.2).
   * @param {Object} datos - Las mismas columnas que acepta crear().
   * @return {Promise<ProgresoEstudio>} El registro resultante.
   */
  async crearOActualizar(datos) {
      const {
        inscripcion_id,
        tarjeta_id,
        factor_facilidad,
        intervalo_dias,
        repeticiones,
        ultima_valoracion,
        fecha_ultimo_repaso,
        fecha_proximo_repaso,
      } = datos;

      const { rows } = await pool.query(
        `INSERT INTO progreso_estudio (
          inscripcion_id,
          tarjeta_id,
          factor_facilidad,
          intervalo_dias,
          repeticiones,
          ultima_valoracion,
          fecha_ultimo_repaso,
          fecha_proximo_repaso
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (inscripcion_id, tarjeta_id)
        DO UPDATE SET
          factor_facilidad = EXCLUDED.factor_facilidad,
          intervalo_dias = EXCLUDED.intervalo_dias,
          repeticiones = EXCLUDED.repeticiones,
          ultima_valoracion = EXCLUDED.ultima_valoracion,
          fecha_ultimo_repaso = EXCLUDED.fecha_ultimo_repaso,
          fecha_proximo_repaso = EXCLUDED.fecha_proximo_repaso
        RETURNING *`,
        [
          inscripcion_id,
          tarjeta_id,
          factor_facilidad,
          intervalo_dias,
          repeticiones,
          ultima_valoracion,
          fecha_ultimo_repaso,
          fecha_proximo_repaso,
        ]
      );

      return new ProgresoEstudio(rows[0]);
  },





};
