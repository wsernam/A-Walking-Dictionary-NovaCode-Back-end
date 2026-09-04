// Repositorio de ProgresoEstudio: acceso a datos para la tabla "progreso_estudio" del DER oficial.
// (inscripcion_id, tarjeta_id) es único según el DER.

import { pool } from '../config/db.js';
import { ProgresoEstudio } from '../models/ProgresoEstudio.js';

export const ProgresoEstudioRepository = {
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

  async obtenerPorId(id_progreso) {
    const { rows } = await pool.query('SELECT * FROM progreso_estudio WHERE id_progreso = $1', [id_progreso]);
    return rows[0] ? new ProgresoEstudio(rows[0]) : null;
  },

  async obtenerPorInscripcionYTarjeta(inscripcion_id, tarjeta_id) {
    const { rows } = await pool.query(
      'SELECT * FROM progreso_estudio WHERE inscripcion_id = $1 AND tarjeta_id = $2',
      [inscripcion_id, tarjeta_id]
    );
    return rows[0] ? new ProgresoEstudio(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM progreso_estudio');
    return rows.map((row) => new ProgresoEstudio(row));
  },

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

  async eliminar(id_progreso) {
    const { rowCount } = await pool.query('DELETE FROM progreso_estudio WHERE id_progreso = $1', [id_progreso]);
    return rowCount > 0;
  },
};
