/**
 * @file UsuarioRepository.js
 * @brief Repositorio de Usuario: acceso a datos para la tabla "usuario" del DER oficial.
 */

import { pool } from '../config/db.js';
import { Usuario } from '../models/Usuario.js';

// Llave del candado de PostgreSQL (pg_advisory_xact_lock) que serializa los registros con rol
// inicial. Es un número fijo cualquiera; solo tiene que ser el mismo en todas las llamadas.
const LLAVE_CANDADO_DOCENTE_INICIAL = 51001;

export const UsuarioRepository = {
  /**
   * @brief Registro con Google con rol inicial (decisión 2026-11-06, pendiente de aprobación P2):
   * si en la tabla usuario todavía no hay ningún docente, la cuenta se crea con rol "docente";
   * si ya hay al menos uno, con rol "estudiante".
   *
   * Pensado para el lanzamiento con la base de datos vacía (sin seed.sql): la primera persona que
   * se registra queda como docente y puede crear el curso. La consulta y el INSERT van en una
   * misma transacción con un candado de PostgreSQL, para que dos registros simultáneos no puedan
   * quedar ambos como docente.
   *
   * @param {{ nombre_completo: string, email: string }} datos - Datos ya validados por el servicio.
   * @returns {Promise<Usuario>} Usuario creado, con el rol que se le asignó.
   * @throws El error de PostgreSQL (ej. 23505 si el correo ya existe) tras deshacer la transacción.
   */
  async crearDesdeGoogleConRolInicial({ nombre_completo, email }) {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      // El candado se libera solo al terminar la transacción (COMMIT o ROLLBACK).
      await cliente.query('SELECT pg_advisory_xact_lock($1)', [LLAVE_CANDADO_DOCENTE_INICIAL]);

      const { rows: [{ hay_docente: hayDocente }] } = await cliente.query(
        "SELECT EXISTS (SELECT 1 FROM usuario WHERE rol = 'docente') AS hay_docente"
      );
      const rol = hayDocente ? 'estudiante' : 'docente';

      const { rows } = await cliente.query(
        `INSERT INTO usuario (nombre_completo, email, password_hash, rol, activo)
         VALUES ($1, $2, NULL, $3, true)
         RETURNING *`,
        [nombre_completo, email, rol]
      );

      await cliente.query('COMMIT');
      return new Usuario(rows[0]);
    } catch (error) {
      // Si el ROLLBACK también falla, se propaga el error original, que es el que explica la causa.
      await cliente.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      cliente.release();
    }
  },

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

  async obtenerPorId(id_usuario) {
    const { rows } = await pool.query('SELECT * FROM usuario WHERE id_usuario = $1', [id_usuario]);
    return rows[0] ? new Usuario(rows[0]) : null;
  },

  async obtenerPorEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM usuario WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    return rows[0] ? new Usuario(rows[0]) : null;
  },

  /**
   * @brief HU-5.2 (CA-5.2.1 + CA-5.2.2): actualiza solo el perfil académico, sin tocar
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
