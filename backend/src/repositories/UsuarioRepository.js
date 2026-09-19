// Repositorio de Usuario: acceso a datos para la tabla "usuario" del DER oficial.

import { pool } from '../config/db.js';
import { Usuario } from '../models/Usuario.js';

export const UsuarioRepository = {
  async crear(datos) {
    const {
      nombre_completo,
      email,
      password_hash,
      rol,
      nivel_ingles,
      codigo_estudiantil,
      avatar,
      intereses,
      activo,
      fecha_registro,
    } = datos;
    const { rows } = await pool.query(
      `INSERT INTO usuario
         (nombre_completo, email, password_hash, rol, nivel_ingles, codigo_estudiantil, avatar, intereses, activo, fecha_registro)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [nombre_completo, email, password_hash, rol, nivel_ingles, codigo_estudiantil, avatar, intereses, activo, fecha_registro]
    );
    return new Usuario(rows[0]);
  },

  async obtenerPorId(id_usuario) {
    const { rows } = await pool.query('SELECT * FROM usuario WHERE id_usuario = $1', [id_usuario]);
    return rows[0] ? new Usuario(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM usuario');
    return rows.map((row) => new Usuario(row));
  },

  async actualizar(id_usuario, datos) {
    const {
      nombre_completo,
      email,
      password_hash,
      rol,
      nivel_ingles,
      codigo_estudiantil,
      avatar,
      intereses,
      activo,
      fecha_registro,
    } = datos;
    const { rows } = await pool.query(
      `UPDATE usuario
       SET nombre_completo = $2, email = $3, password_hash = $4, rol = $5, nivel_ingles = $6,
           codigo_estudiantil = $7, avatar = $8, intereses = $9, activo = $10, fecha_registro = $11
       WHERE id_usuario = $1
       RETURNING *`,
      [id_usuario, nombre_completo, email, password_hash, rol, nivel_ingles, codigo_estudiantil, avatar, intereses, activo, fecha_registro]
    );
    return rows[0] ? new Usuario(rows[0]) : null;
  },

  // HU-5.2 (CA-5.2.1 + CA-5.2.2): actualización parcial del perfil académico, sin tocar
  // password_hash/activo/fecha_registro como sí hace el actualizar() genérico de arriba.
  async actualizarPerfil(id_usuario, { nivel_ingles, codigo_estudiantil, avatar, intereses }) {
    const { rows } = await pool.query(
      `UPDATE usuario
       SET nivel_ingles = $2, codigo_estudiantil = $3, avatar = $4, intereses = $5
       WHERE id_usuario = $1
       RETURNING *`,
      [id_usuario, nivel_ingles, codigo_estudiantil, avatar, intereses]
    );
    return rows[0] ? new Usuario(rows[0]) : null;
  },

  async eliminar(id_usuario) {
    const { rowCount } = await pool.query('DELETE FROM usuario WHERE id_usuario = $1', [id_usuario]);
    return rowCount > 0;
  },
};
