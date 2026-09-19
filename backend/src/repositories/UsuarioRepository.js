/**
 * @file UsuarioRepository.js
 * @brief Repositorio de Usuario: acceso a datos para la tabla "usuario" del DER oficial.
 */

import { pool } from '../config/db.js';
import { Usuario } from '../models/Usuario.js';

export const UsuarioRepository = {
  async crear(datos) {
    const { nombre_completo, email, password_hash, rol, nivel_ingles, activo, fecha_registro } = datos;
    const { rows } = await pool.query(
      `INSERT INTO usuario (nombre_completo, email, password_hash, rol, nivel_ingles, activo, fecha_registro)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nombre_completo, email, password_hash, rol, nivel_ingles, activo, fecha_registro]
    );
    return new Usuario(rows[0]);
  },

  async obtenerPorId(id_usuario) {
    const { rows } = await pool.query('SELECT * FROM usuario WHERE id_usuario = $1', [id_usuario]);
    return rows[0] ? new Usuario(rows[0]) : null;
  },

  /**
   * @brief HU-5.4 (login con Google): busca un usuario por su correo. El correo es único en el
   * DER (usuario.email UNIQUE). Lo usa AuthService para saber si el correo que Google confirmó
   * tiene cuenta en la plataforma.
   *
   * @param {string} email - Correo a buscar (coincidencia exacta).
   * @return {Promise<Usuario|null>} El usuario, o null si no existe.
   */
  async obtenerPorEmail(email) {
    const { rows } = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
    return rows[0] ? new Usuario(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM usuario');
    return rows.map((row) => new Usuario(row));
  },

  async actualizar(id_usuario, datos) {
    const { nombre_completo, email, password_hash, rol, nivel_ingles, activo, fecha_registro } = datos;
    const { rows } = await pool.query(
      `UPDATE usuario
       SET nombre_completo = $2, email = $3, password_hash = $4, rol = $5, nivel_ingles = $6, activo = $7, fecha_registro = $8
       WHERE id_usuario = $1
       RETURNING *`,
      [id_usuario, nombre_completo, email, password_hash, rol, nivel_ingles, activo, fecha_registro]
    );
    return rows[0] ? new Usuario(rows[0]) : null;
  },

  async eliminar(id_usuario) {
    const { rowCount } = await pool.query('DELETE FROM usuario WHERE id_usuario = $1', [id_usuario]);
    return rowCount > 0;
  },
};
