/**
 * @file AdminUsuarioService.js
 * @brief HU-023: administración de usuarios y roles desde la aplicación (CA-23.1, CA-23.2).
 *
 * El rol "invitado" no existe en la base de datos, por eso no es asignable. Las salvaguardas
 * (autoedición, último administrador activo, docente con cursos) se evalúan dentro de una
 * transacción con candado para que no se puedan saltar con peticiones simultáneas.
 */

import { UsuarioRepository } from '../repositories/UsuarioRepository.js';
import { CursoRepository } from '../repositories/CursoRepository.js';
import { errorApi } from '../utils/codigosError.js';

export const ROLES_ASIGNABLES = ['estudiante', 'docente', 'administrador'];
const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;
const BUSQUEDA_MAXIMA = 100;

const vacio = (valor) => valor === undefined || valor === '';

function enteroPositivo(valor, porDefecto) {
  if (vacio(valor)) return porDefecto;
  const numero = Number(valor);
  if (typeof valor !== 'string' || !Number.isSafeInteger(numero) || numero < 1) {
    throw errorApi(400, 'ADMIN_INVALID_QUERY', 'Parámetros de paginación inválidos');
  }
  return numero;
}

function leerBusqueda(valor) {
  if (vacio(valor)) return undefined;
  if (typeof valor !== 'string' || valor.length > BUSQUEDA_MAXIMA) {
    throw errorApi(400, 'ADMIN_INVALID_QUERY', 'El texto de búsqueda no es válido');
  }
  return valor.trim() || undefined;
}

function leerEstado(valor) {
  if (vacio(valor)) return undefined;
  if (valor !== 'true' && valor !== 'false') {
    throw errorApi(400, 'ADMIN_INVALID_STATUS', 'El filtro activo debe ser true o false');
  }
  return valor === 'true';
}

/**
 * Quita saltos de línea y tabulaciones para que ningún valor pueda falsificar líneas del log
 * (CWE-117, Log Injection).
 */
const limpiarParaLog = (valor) => String(valor).replace(/[\r\n\t]/g, ' ');

/**
 * @brief Auditoría por log (CA-23.2). Solo ids y valores de rol/estado: no se registran correos
 * ni datos personales.
 */
function registrarAuditoria(accion, admin, objetivo, detalle) {
  console.info(
    limpiarParaLog(`[AUDITORIA] ${accion} admin=${Number(admin.id_usuario)} objetivo=${Number(objetivo)} ${detalle}`)
  );
}

export const AdminUsuarioService = {
  /**
   * @brief CA-23.1: lista paginada con búsqueda (nombre o correo) y filtros por rol y estado.
   * @param {{ search?: string, rol?: string, activo?: string, page?: string, limit?: string }} query
   * @returns {Promise<{ data: object[], page: number, limit: number, total: number, total_pages: number }>}
   */
  async listar(query = {}) {
    const page = enteroPositivo(query.page, 1);
    const limit = Math.min(enteroPositivo(query.limit, LIMITE_POR_DEFECTO), LIMITE_MAXIMO);
    const busqueda = leerBusqueda(query.search);
    const activo = leerEstado(query.activo);
    const rol = vacio(query.rol) ? undefined : query.rol;
    if (rol !== undefined && !ROLES_ASIGNABLES.includes(rol)) {
      throw errorApi(400, 'ADMIN_INVALID_ROLE', 'El filtro de rol debe ser estudiante, docente o administrador');
    }

    const { usuarios, total } = await UsuarioRepository.listarParaAdmin({
      busqueda, rol, activo, limite: limit, desplazamiento: (page - 1) * limit,
    });
    return { data: usuarios, page, limit, total, total_pages: Math.ceil(total / limit) };
  },

  /**
   * @brief CA-23.2: cambia el rol de una cuenta.
   * 400 rol fuera de los tres asignables (incluye "invitado"); 409 si es el propio administrador,
   * el último administrador activo, o un docente con cursos; 404 si no existe.
   * @param {{ id_usuario: number }} admin - Usuario del JWT que hace el cambio.
   * @param {number} id - Cuenta a modificar.
   * @param {string} rol - Rol nuevo.
   */
  async cambiarRol(admin, id, rol) {
    if (!ROLES_ASIGNABLES.includes(rol)) {
      throw errorApi(400, 'ADMIN_INVALID_ROLE', 'El rol debe ser estudiante, docente o administrador');
    }
    if (id === admin.id_usuario) {
      throw errorApi(409, 'ADMIN_SELF_CHANGE', 'No puede cambiar su propio rol');
    }

    const resultado = await UsuarioRepository.enTransaccionAdministracion(async (db) => {
      const objetivo = await UsuarioRepository.obtenerParaAdmin(id, db);
      if (!objetivo) throw errorApi(404, 'ADMIN_USER_NOT_FOUND', 'Usuario no encontrado');
      if (objetivo.rol === rol) return { usuario: objetivo, cambio: false };

      if (objetivo.rol === 'administrador' && objetivo.activo
        && (await UsuarioRepository.contarAdministradoresActivos(db)) <= 1) {
        throw errorApi(409, 'ADMIN_LAST_ADMIN', 'No se puede quitar el rol al último administrador activo');
      }
      if (objetivo.rol === 'docente' && (await CursoRepository.contarPorDocente(id, db)) > 0) {
        throw errorApi(409, 'ADMIN_TEACHER_HAS_COURSES', 'El docente tiene cursos asignados');
      }

      const usuario = await UsuarioRepository.cambiarRol(id, rol, db);
      return { usuario, cambio: true, anterior: objetivo.rol };
    });

    if (resultado.cambio) {
      registrarAuditoria('cambio_rol', admin, id, `rol_anterior=${resultado.anterior} rol_nuevo=${resultado.usuario?.rol}`);
    }
    return resultado.usuario;
  },

  /**
   * @brief CA-23.2: activa o desactiva una cuenta (la desactivada no inicia sesión: el login
   * ya rechaza usuario.activo = false con AUTH_ACCOUNT_INACTIVE).
   * 400 si activo no es booleano; 409 si es el propio administrador o el último administrador
   * activo; 404 si no existe.
   */
  async cambiarEstado(admin, id, activo) {
    if (typeof activo !== 'boolean') {
      throw errorApi(400, 'ADMIN_INVALID_STATUS', 'El campo activo debe ser true o false');
    }
    if (id === admin.id_usuario) {
      throw errorApi(409, 'ADMIN_SELF_CHANGE', 'No puede cambiar el estado de su propia cuenta');
    }

    const resultado = await UsuarioRepository.enTransaccionAdministracion(async (db) => {
      const objetivo = await UsuarioRepository.obtenerParaAdmin(id, db);
      if (!objetivo) throw errorApi(404, 'ADMIN_USER_NOT_FOUND', 'Usuario no encontrado');
      if (objetivo.activo === activo) return { usuario: objetivo, cambio: false };

      if (!activo && objetivo.rol === 'administrador'
        && (await UsuarioRepository.contarAdministradoresActivos(db)) <= 1) {
        throw errorApi(409, 'ADMIN_LAST_ADMIN', 'No se puede desactivar al último administrador activo');
      }

      const usuario = await UsuarioRepository.cambiarEstado(id, activo, db);
      return { usuario, cambio: true, anterior: objetivo.activo };
    });

    if (resultado.cambio) {
      registrarAuditoria('cambio_estado', admin, id, `activo_anterior=${resultado.anterior} activo_nuevo=${resultado.usuario?.activo}`);
    }
    return resultado.usuario;
  },
};