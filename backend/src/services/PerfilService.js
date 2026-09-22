/**
 * @file PerfilService.js
 * @brief Lógica de negocio de HU-5.2 (configurar perfil académico): valida y persiste nivel MCER,
 * código estudiantil, avatar e intereses, y arma el shape de perfil acordado con el frontend.
 *
 * Endpoints relacionados: PATCH /api/v1/users/profile (CA-5.2.1 + CA-5.2.2),
 * GET /api/v1/users/:id y GET /api/v1/students/:id/context.
 * Almacenamiento: tabla usuario (columnas codigo_estudiantil, avatar e intereses).
 *
 * @note CA-5.2.2 ("preferencias de aprendizaje / áreas a reforzar"): campo `intereses`, arreglo
 * de strings con los géneros/temas que el estudiante eligió de una lista fija. Esa lista la define
 * el frontend; el back solo valida la forma (arreglo de strings) y guarda la selección.
 * Los errores de validación se lanzan como Error con `status` (400/404) para que el controlador
 * los traduzca a la respuesta HTTP.
 */

import { UsuarioRepository } from '../repositories/UsuarioRepository.js';
import { InscripcionRepository } from '../repositories/InscripcionRepository.js';

/** @brief CA-5.2.1: niveles MCER permitidos (A1-C2); selección controlada, no texto libre. */
const NIVELES_MCER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** @brief Longitud máxima de usuario.codigo_estudiantil (VARCHAR(20)). */
const MAX_CODIGO_ESTUDIANTIL = 20;
/** @brief Longitud máxima de usuario.avatar (VARCHAR(500)). */
const MAX_AVATAR = 500;

/**
 * @brief Crea un Error de validación con status HTTP 400.
 * @param {string} mensaje - Mensaje que llegará al cliente.
 * @returns {Error} Error con la propiedad `status = 400`.
 */
function errorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.status = 400;
  return error;
}

/**
 * @brief Valida que el código estudiantil no supere la longitud de la columna.
 * @param {string} [codigo_estudiantil] - Valor recibido (opcional).
 * @throws {Error} status 400 si supera MAX_CODIGO_ESTUDIANTIL caracteres.
 */
function validarCodigoEstudiantil(codigo_estudiantil) {
  if (codigo_estudiantil && String(codigo_estudiantil).length > MAX_CODIGO_ESTUDIANTIL) {
    throw errorValidacion(`codigo_estudiantil no puede superar ${MAX_CODIGO_ESTUDIANTIL} caracteres`);
  }
}

/**
 * @brief Valida el avatar (CA-5.2.1).
 *
 * @note Se guarda como URL/ruta de una imagen fija del front (public/avatars/...), no como
 * archivo: se rechaza un data URI (base64) o cualquier string que no quepa en la columna.
 *
 * @param {string} [avatar] - URL o ruta de la imagen (opcional).
 * @throws {Error} status 400 si es un data URI o supera MAX_AVATAR caracteres.
 */
function validarAvatar(avatar) {
  if (!avatar) return;
  if (String(avatar).startsWith('data:') || String(avatar).length > MAX_AVATAR) {
    throw errorValidacion(
      `avatar debe ser la URL o ruta de una imagen (máx. ${MAX_AVATAR} caracteres), no el archivo en base64`
    );
  }
}

/**
 * @brief Valida los intereses (CA-5.2.2).
 * @param {string[]} [intereses] - Arreglo de strings no vacíos; undefined/null se acepta (no cambia).
 * @throws {Error} status 400 si no es un arreglo o contiene elementos no string o vacíos.
 */
function validarIntereses(intereses) {
  if (intereses === undefined || intereses === null) return;
  if (!Array.isArray(intereses) || intereses.some((i) => typeof i !== 'string' || !i.trim())) {
    throw errorValidacion('intereses debe ser un arreglo de strings no vacíos');
  }
}

/**
 * @brief Valida el nivel MCER (CA-5.2.1), sin distinguir mayúsculas/minúsculas.
 * @param {string} [nivel_ingles] - Nivel recibido (opcional).
 * @throws {Error} status 400 si no está en NIVELES_MCER.
 */
function validarNivelIngles(nivel_ingles) {
  if (nivel_ingles && !NIVELES_MCER.includes(nivel_ingles.toUpperCase())) {
    const error = new Error(`nivel_ingles inválido. Valores permitidos: ${NIVELES_MCER.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

/**
 * @brief Pone en mayúscula la primera letra (ej. "estudiante" -> "Estudiante").
 * @param {string} texto - Texto a capitalizar.
 * @returns {string} Texto capitalizado, o el mismo valor si es falsy.
 */
function capitalizar(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

/**
 * @brief Convierte un Usuario al shape de perfil acordado con el frontend.
 *
 * @note No es el shape crudo del modelo: estudiante_id (no id_usuario), correo (no email); sin
 * password_hash/activo/fecha_registro. El front trata los campos vacíos como '' (su formulario
 * hace String(valor).trim()), por eso los nulos salen como '' (e intereses como []).
 *
 * @param {import('../models/Usuario.js').Usuario} usuario - Usuario leído de la BD.
 * @returns {{estudiante_id:number, nombre_completo:string, correo:string, rol:string,
 * nivel_ingles:string, codigo_estudiantil:string, avatar:string, intereses:string[]}}
 */
function mapearPerfil(usuario) {
  return {
    estudiante_id: usuario.id_usuario,
    nombre_completo: usuario.nombre_completo,
    correo: usuario.email,
    rol: capitalizar(usuario.rol),
    nivel_ingles: usuario.nivel_ingles ?? '',
    codigo_estudiantil: usuario.codigo_estudiantil ?? '',
    avatar: usuario.avatar ?? '',
    intereses: usuario.intereses ?? [],
  };
}

/**
 * @brief Servicio de perfil académico (HU-5.2).
 */
export const PerfilService = {
  /**
   * @brief Obtiene el perfil de un usuario. GET /api/v1/users/:id
   * @param {number} estudiante_id - id_usuario.
   * @returns {Promise<object>} Perfil con el shape de mapearPerfil().
   * @throws {Error} status 404 si el usuario no existe.
   */
  async obtenerPerfil(estudiante_id) {
    const usuario = await UsuarioRepository.obtenerPorId(estudiante_id);
    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    return mapearPerfil(usuario);
  },

  /**
   * @brief CA-5.2.1 + CA-5.2.2: actualiza el perfil académico. PATCH /api/v1/users/profile
   *
   * Actualización parcial: los campos omitidos (undefined/null) conservan su valor actual.
   *
   * @param {number} estudiante_id - id_usuario a actualizar.
   * @param {object} datos
   * @param {string} [datos.nivel_ingles] - Nivel MCER (A1-C2).
   * @param {string} [datos.codigo_estudiantil] - Código estudiantil (máx. 20).
   * @param {string} [datos.avatar] - URL o ruta de imagen (máx. 500, no base64).
   * @param {string[]} [datos.intereses] - Áreas a reforzar / géneros de interés.
   * @returns {Promise<object>} Perfil actualizado con el shape de mapearPerfil().
   * @throws {Error} status 404 si el usuario no existe, 400 si alguna validación falla.
   */
  async actualizarPerfil(estudiante_id, { nivel_ingles, codigo_estudiantil, avatar, intereses }) {
    const usuarioActual = await UsuarioRepository.obtenerPorId(estudiante_id);
    if (!usuarioActual) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    validarNivelIngles(nivel_ingles);
    validarCodigoEstudiantil(codigo_estudiantil);
    validarAvatar(avatar);
    validarIntereses(intereses);

    const usuarioActualizado = await UsuarioRepository.actualizarPerfil(estudiante_id, {
      nivel_ingles: nivel_ingles ?? usuarioActual.nivel_ingles,
      codigo_estudiantil: codigo_estudiantil ?? usuarioActual.codigo_estudiantil,
      avatar: avatar ?? usuarioActual.avatar,
      intereses: intereses ?? usuarioActual.intereses,
    });

    return mapearPerfil(usuarioActualizado);
  },

  /**
   * @brief Contexto académico de solo lectura. GET /api/v1/students/:id/context
   *
   * @note curso_asignado y semestre_activo salen de la inscripción más reciente del estudiante
   * (JOIN con curso). departamento_universidad no tiene fuente en la BD todavía (supuesto
   * pendiente de validar), por eso se devuelve null. Si el estudiante no tiene inscripción
   * responde con nulls (no 404), porque el front carga perfil y contexto juntos.
   *
   * @param {number} estudiante_id - id_usuario.
   * @returns {Promise<{curso_asignado:(string|null), semestre_activo:(string|null),
   * departamento_universidad:null}>}
   * @throws {Error} status 404 si el usuario no existe.
   */
  async obtenerContextoAcademico(estudiante_id) {
    const usuario = await UsuarioRepository.obtenerPorId(estudiante_id);
    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    const contexto = await InscripcionRepository.obtenerContextoAcademico(estudiante_id);
    return {
      curso_asignado: contexto?.curso_asignado ?? null,
      semestre_activo: contexto?.semestre_activo ?? null,
      departamento_universidad: null,
    };
  },
};
