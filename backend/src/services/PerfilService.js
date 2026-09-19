// PerfilService.js
// HU-5.2: configurar perfil académico (nivel MCER, código estudiantil, avatar, intereses).
// Endpoints relacionados: PATCH /api/v1/users/profile (CA-5.2.1 + CA-5.2.2), GET /api/v1/users/:id
// Almacenamiento: tabla usuario (columnas codigo_estudiantil, avatar e intereses agregadas en
// esta sesión).
//
// CA-5.2.2 ("preferencias de aprendizaje / áreas a reforzar"): campo `intereses`, arreglo de
// strings con los géneros/temas que el estudiante eligió de una lista fija. Esa lista la define
// el frontend; el back solo valida la forma (arreglo de strings) y guarda la selección.

import { UsuarioRepository } from '../repositories/UsuarioRepository.js';
import { InscripcionRepository } from '../repositories/InscripcionRepository.js';

// CA-5.2.1: "selecciona su nivel MCER (A1-C2)" — selección controlada, no texto libre.
const NIVELES_MCER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Límites de las columnas usuario.codigo_estudiantil (VARCHAR(20)) y usuario.avatar (VARCHAR(500)).
const MAX_CODIGO_ESTUDIANTIL = 20;
const MAX_AVATAR = 500;

function errorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.status = 400;
  return error;
}

function validarCodigoEstudiantil(codigo_estudiantil) {
  if (codigo_estudiantil && String(codigo_estudiantil).length > MAX_CODIGO_ESTUDIANTIL) {
    throw errorValidacion(`codigo_estudiantil no puede superar ${MAX_CODIGO_ESTUDIANTIL} caracteres`);
  }
}

// El avatar se guarda como URL/ruta de una imagen fija del front (public/avatars/...), no como
// archivo: se rechaza un data URI (base64) o cualquier string que no quepa en la columna.
function validarAvatar(avatar) {
  if (!avatar) return;
  if (String(avatar).startsWith('data:') || String(avatar).length > MAX_AVATAR) {
    throw errorValidacion(
      `avatar debe ser la URL o ruta de una imagen (máx. ${MAX_AVATAR} caracteres), no el archivo en base64`
    );
  }
}

function validarIntereses(intereses) {
  if (intereses === undefined || intereses === null) return;
  if (!Array.isArray(intereses) || intereses.some((i) => typeof i !== 'string' || !i.trim())) {
    throw errorValidacion('intereses debe ser un arreglo de strings no vacíos');
  }
}

function validarNivelIngles(nivel_ingles) {
  if (nivel_ingles && !NIVELES_MCER.includes(nivel_ingles.toUpperCase())) {
    const error = new Error(`nivel_ingles inválido. Valores permitidos: ${NIVELES_MCER.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

// El front trata los campos vacíos como '' (su formulario hace String(valor).trim()), no null.
function capitalizar(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

// Shape acordado explícitamente con el frontend (no es el shape crudo del modelo Usuario):
// estudiante_id (no id_usuario), correo (no email); sin password_hash/activo/fecha_registro.
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

export const PerfilService = {
  // GET /api/v1/users/:id
  async obtenerPerfil(estudiante_id) {
    const usuario = await UsuarioRepository.obtenerPorId(estudiante_id);
    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    return mapearPerfil(usuario);
  },

  // CA-5.2.1 + CA-5.2.2: PATCH /api/v1/users/profile
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

  // GET /api/v1/students/:id/context — solo lectura. curso_asignado y semestre_activo salen de la
  // inscripción más reciente del estudiante (JOIN con curso). departamento_universidad no tiene
  // fuente en la BD todavía (pendiente de decidir), por eso se devuelve null. Si el estudiante no
  // tiene inscripción responde 200 con nulls, porque el front carga perfil y contexto juntos.
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
