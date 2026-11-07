/**
 * @file Usuario.js
 * @brief Modelo de dominio: representa la tabla "usuario" del DER oficial.
 */

/**
 * @class Usuario
 * @brief Usuario de la plataforma (rol docente o estudiante).
 *
 * @note password_hash es opcional en el DER: el login actual es con Google (ver
 * docs/CONTRATO_AUTENTICACION_FRONTEND.md).
 * @note codigo_estudiantil, avatar e intereses se agregaron para HU-5.2 y son opcionales
 * (no aplican a un docente); ver docs/FLUJO_PERFIL_ACADEMICO.md.
 */
export class Usuario {
  /**
   * @brief Construye un Usuario a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_usuario - Id autoincremental (pk).
   * @param {string} config.nombre_completo - Nombre completo (varchar 150).
   * @param {string} config.email - Correo electrónico (varchar 150, único).
   * @param {string|null} config.password_hash - Hash de la contraseña (varchar 255, opcional).
   * @param {string} config.rol - Rol del usuario (varchar 30: "docente" o "estudiante").
   * @param {string|null} config.nivel_ingles - Nivel MCER (varchar 10, A1-C2).
   * @param {string|null} config.codigo_estudiantil - Código estudiantil (varchar 20).
   * @param {string|null} config.avatar - URL del avatar (varchar 500; se guarda la URL, no el archivo).
   * @param {string[]|null} config.intereses - Áreas a reforzar (arreglo de strings).
   * @param {boolean} config.activo - Si la cuenta está activa (default true).
   * @param {string} config.fecha_registro - Marca de tiempo de registro (default NOW()).
   */
  constructor({
    id_usuario,
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
  }) {
    this.id_usuario = id_usuario;
    this.nombre_completo = nombre_completo;
    this.email = email;
    this.password_hash = password_hash;
    this.rol = rol;
    this.nivel_ingles = nivel_ingles;
    this.codigo_estudiantil = codigo_estudiantil;
    this.avatar = avatar;
    this.intereses = intereses;
    this.activo = activo;
    this.fecha_registro = fecha_registro;
  }
}