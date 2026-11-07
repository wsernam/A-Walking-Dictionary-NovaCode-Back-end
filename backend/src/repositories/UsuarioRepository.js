/**
 * @file Repositorio de Usuario: acceso a datos para la tabla "usuario" del DER oficial.
 */

import { pool } from '../config/db.js';
import { Usuario } from '../models/Usuario.js';

/**
 * Repositorio: consultas SQL a PostgreSQL.
 * @namespace
 */
export const UsuarioRepository = {
  /**
   * Crea una cuenta registrada con Google OAuth (HU-5.1): sin contraseña (password_hash en
   * NULL) y activa.
   * @param {Object} datos - Datos ya validados por RegistroService.
   * @param {string} datos.nombre_completo - Nombre que viene de la cuenta de Google.
   * @param {string} datos.email - Correo institucional.
   * @param {string} [datos.rol="estudiante"] - Rol de la cuenta.
   * @returns {Promise<Usuario>} Usuario creado.
   * @throws El error de PostgreSQL (ej. 23505 si el correo ya existe).
   */
  async crearDesdeGoogle(datos) {
    const {
      nombre_completo,
      email,
      rol = 'estudiante',
    } = datos;

    const { rows } = await pool.query(
      `INSERT INTO usuario (
        nombre_completo,
        email,
        password_hash,
        rol,
        activo
      )
      VALUES ($1, $2, NULL, $3, true)
      RETURNING *`,
      [
        nombre_completo,
        email,
        rol,
      ]
    );

    return new Usuario(rows[0]);
  },

  /**
   * Busca un usuario por su id_usuario.
   * @param {number} id_usuario - Id del usuario.
   * @returns {Promise<Usuario|null>} El usuario, o null si no existe.
   */
  async obtenerPorId(id_usuario) {
    const { rows } = await pool.query('SELECT * FROM usuario WHERE id_usuario = $1', [id_usuario]);
    return rows[0] ? new Usuario(rows[0]) : null;
  },

  /**
   * Busca un usuario por correo, sin distinguir mayúsculas de minúsculas (lo usan el login, el
   * registro con Google y la asignación de estudiantes a un curso por correo).
   * @param {string} email - Correo a buscar.
   * @returns {Promise<Usuario|null>} El usuario, o null si no hay ninguno con ese correo.
   */
  async obtenerPorEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM usuario WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    return rows[0] ? new Usuario(rows[0]) : null;
  },

  /**
   * HU-5.2 (CA-5.2.1 + CA-5.2.2): actualiza solo el perfil académico, sin tocar
   * password_hash, rol, activo ni fecha_registro.
   * @param {number} id_usuario - Usuario a actualizar.
   * @param {object} datos - nivel_ingles, codigo_estudiantil, avatar e intereses (ya validados).
   * @returns {Promise<Usuario|null>} Usuario actualizado, o null si no existe.
   */
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
};
