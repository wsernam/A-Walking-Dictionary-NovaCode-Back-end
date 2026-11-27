/**
 * @file AporteController.js
 * @brief Controlador REST de Aporte: recibe la petición HTTP, llama directamente al
 * repositorio (AporteRepository) y devuelve la respuesta.
 *
 * @note Las coautorías/acepciones nuevas solo se pueden editar y aprobar (aprobar()); no existe
 * rechazo en ningún flujo del sistema. Lo mismo aplica a la tarjeta individual, ver
 * TarjetaController.aprobar.
 */

import { AporteRepository } from '../repositories/AporteRepository.js';
import { esFechaValida, esIdValido } from '../utils/validacion.js';

/** @brief SQLSTATE de PostgreSQL para una foreign key violada (foreign_key_violation). */
const PG_FOREIGN_KEY_VIOLATION = '23503';

/** @brief Valores de aporte.tipo_aporte (HU-1.2 y HU-1.3), los mismos que documenta openapi.yaml. */
const TIPOS_APORTE = ['creada', 'coautoria', 'acepcion_nueva'];

/**
 * @brief Valida el body de POST y PUT /aportes contra las columnas de "aporte" del DER, para que
 * un dato inválido responda 400 en vez de llegar a PostgreSQL y salir como 500.
 *
 * Obligatorios (NOT NULL): tarjeta_id, inscripcion_id, traduccion_aportada (varchar 255),
 * definicion_aportada (text) y tipo_aporte (varchar 40). Opcionales: ejemplo_aportado
 * (varchar 150) y fecha_aporte (fecha ISO 8601; si no llega la pone la base de datos).
 * @param {Object} body - req.body.
 * @return {{ status: number, error: string, code: string } | null} El error a responder, o null
 * si el body es válido.
 */
function validarDatosAporte(body) {
  const { traduccion_aportada, definicion_aportada, ejemplo_aportado, tipo_aporte, fecha_aporte } = body;
  const vacio = (valor) => valor === undefined || valor === null || valor === '';

  const obligatorios = ['tarjeta_id', 'inscripcion_id', 'traduccion_aportada', 'definicion_aportada', 'tipo_aporte'];
  const camposFaltantes = obligatorios.filter((campo) => vacio(body[campo]));
  if (camposFaltantes.length > 0) {
    return {
      status: 400,
      error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
      code: 'REQUIRED_FIELDS_MISSING',
    };
  }

  if (
    typeof traduccion_aportada !== 'string' ||
    typeof definicion_aportada !== 'string' ||
    typeof tipo_aporte !== 'string' ||
    (!vacio(ejemplo_aportado) && typeof ejemplo_aportado !== 'string')
  ) {
    return {
      status: 400,
      error: 'traduccion_aportada, definicion_aportada, tipo_aporte y ejemplo_aportado deben ser cadenas de texto',
      code: 'INVALID_FIELD_TYPE',
    };
  }

  // Longitud máxima según el DER: traduccion_aportada varchar(255), tipo_aporte varchar(40),
  // ejemplo_aportado varchar(150) (nullable).
  const erroresLongitud = [];
  if (traduccion_aportada.length > 255) {
    erroresLongitud.push(
      `El campo traduccion_aportada no puede superar 255 caracteres (tiene ${traduccion_aportada.length} caracteres).`
    );
  }
  if (tipo_aporte.length > 40) {
    erroresLongitud.push(`El campo tipo_aporte no puede superar 40 caracteres (tiene ${tipo_aporte.length} caracteres).`);
  }
  if (ejemplo_aportado && ejemplo_aportado.length > 150) {
    erroresLongitud.push(
      `El campo ejemplo_aportado no puede superar 150 caracteres (tiene ${ejemplo_aportado.length} caracteres).`
    );
  }
  if (erroresLongitud.length > 0) {
    return { status: 400, error: erroresLongitud.join(' '), code: 'FIELD_TOO_LONG' };
  }

  if (!TIPOS_APORTE.includes(tipo_aporte)) {
    return {
      status: 400,
      error: `tipo_aporte debe ser uno de: ${TIPOS_APORTE.join(', ')}`,
      code: 'INVALID_FIELD_TYPE',
    };
  }
  for (const campo of ['tarjeta_id', 'inscripcion_id']) {
    if (!esIdValido(body[campo])) {
      return { status: 400, error: `${campo} debe ser un entero positivo valido`, code: 'INVALID_ID' };
    }
  }
  if (!vacio(fecha_aporte) && !esFechaValida(fecha_aporte)) {
    return { status: 400, error: 'fecha_aporte debe ser una fecha ISO 8601 valida', code: 'INVALID_FIELD_TYPE' };
  }
  return null;
}

/**
 * @brief Traduce la foreign key violada al guardar un aporte a una respuesta 404.
 * @param {Error & { code?: string, constraint?: string }} error - Error de PostgreSQL.
 * @return {{ error: string, code: string } | null} Cuerpo del 404, o null si no es una foreign key.
 */
function respuestaReferenciaInexistente(error) {
  if (error.code !== PG_FOREIGN_KEY_VIOLATION) return null;
  if (error.constraint === 'fk_aporte_inscripcion') {
    return { error: 'La inscripción no existe', code: 'ENROLLMENT_NOT_FOUND' };
  }
  return { error: 'La tarjeta no existe', code: 'CARD_NOT_FOUND' };
}

export const AporteController = {
  /**
   * @brief Crea un aporte (CRUD genérico). POST /api/v1/aportes
   * @param {import('express').Request} req - req.body con las columnas de "aporte" (ver
   * validarDatosAporte).
   * @param {import('express').Response} res - 201 con el aporte creado, 400 si falta un campo NOT
   * NULL o alguno es inválido, 404 si la tarjeta o la inscripción no existen, 500 ante error
   * inesperado.
   */
  async crear(req, res) {
    try {
      const invalido = validarDatosAporte(req.body);
      if (invalido) {
        return res.status(invalido.status).json({ error: invalido.error, code: invalido.code });
      }
      const aporte = await AporteRepository.crear(req.body);
      res.status(201).json(aporte);
    } catch (error) {
      const noExiste = respuestaReferenciaInexistente(error);
      if (noExiste) return res.status(404).json(noExiste);
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerPorId(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }
      const aporte = await AporteRepository.obtenerPorId(id);
      if (!aporte) {
        return res.status(404).json({ error: 'Aporte no encontrado', code: 'CONTRIBUTION_NOT_FOUND' });
      }
      res.status(200).json(aporte);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const aportes = await AporteRepository.listar();
      res.status(200).json(aportes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Lista las coautorías/acepciones nuevas pendientes de revisión docente
   * (GET /api/v1/aportes/pending). Endpoint adicional, fuera de los CA de HU-1.3.
   * Incluye los aportes pendientes aunque su palabra (tarjeta) ya esté aprobada.
   * @param {import('express').Request} req
   * @param {import('express').Response} res - 200 con el arreglo, 500 ante error inesperado.
   */
  async listarPendientes(req, res) {
    try {
      const aportes = await AporteRepository.listarCoautoriasPendientes();
      res.set('Cache-Control', 'no-store');
      res.status(200).json(aportes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Aprueba una coautoría/acepción nueva, con correcciones opcionales
   * (PATCH /api/v1/aportes/:id/approve). Endpoint adicional, fuera de los CA de HU-1.3.
   *
   * No aplica a aportes 'creada': esos se aprueban por la revisión individual de la tarjeta
   * (PATCH /cards/:id/approve).
   *
   * @param {import('express').Request} req - req.params.id es el id_aporte; req.body puede traer
   * traduccion_aportada, definicion_aportada y ejemplo_aportado corregidos.
   * @param {import('express').Response} res - 200 con el aporte aprobado, 400 si el id no es
   * numérico o una corrección excede la longitud del DER, 403 si es tipo 'creada', 404 si no
   * existe, 500 ante error inesperado.
   */
  async aprobar(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }

      // Mismos límites del DER que valida crear().
      const { traduccion_aportada, ejemplo_aportado } = req.body;
      const erroresLongitud = [];
      if (traduccion_aportada && traduccion_aportada.length > 255) {
        erroresLongitud.push(
          `El campo traduccion_aportada no puede superar 255 caracteres (tiene ${traduccion_aportada.length} caracteres).`
        );
      }
      if (ejemplo_aportado && ejemplo_aportado.length > 150) {
        erroresLongitud.push(
          `El campo ejemplo_aportado no puede superar 150 caracteres (tiene ${ejemplo_aportado.length} caracteres).`
        );
      }
      if (erroresLongitud.length > 0) {
        return res.status(400).json({ error: erroresLongitud.join(' '), code: 'FIELD_TOO_LONG' });
      }

      const actual = await AporteRepository.obtenerPorId(id);
      if (!actual) {
        return res.status(404).json({ error: 'Aporte no encontrado', code: 'CONTRIBUTION_NOT_FOUND' });
      }
      if (actual.tipo_aporte === 'creada') {
        return res.status(403).json({
          error:
            'No se puede aprobar un aporte de creación original por esta vía; use el flujo de revisión individual de la tarjeta (PATCH /cards/:id/approve).',
          code: 'CONTRIBUTION_NOT_APPROVABLE',
        });
      }
      const aporte = await AporteRepository.aprobar(id, req.body);
      res.status(200).json({ mensaje: 'Aporte aprobado correctamente', aporte });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Reemplaza todos los campos de un aporte (UPDATE completo vía PUT).
   * PUT /api/v1/aportes/:id
   * @param {import('express').Request} req - req.params.id es el id_aporte; req.body trae las
   * columnas nuevas de "aporte" (ver validarDatosAporte). Si no trae fecha_aporte, se conserva la
   * actual.
   * @param {import('express').Response} res - 200 con el aporte actualizado, 400 si el id o el
   * body son inválidos, 404 si el aporte, la tarjeta o la inscripción no existen, 500 ante error
   * inesperado.
   */
  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }
      const invalido = validarDatosAporte(req.body);
      if (invalido) {
        return res.status(invalido.status).json({ error: invalido.error, code: invalido.code });
      }
      const aporte = await AporteRepository.actualizar(id, req.body);
      if (!aporte) {
        return res.status(404).json({ error: 'Aporte no encontrado', code: 'CONTRIBUTION_NOT_FOUND' });
      }
      res.status(200).json(aporte);
    } catch (error) {
      const noExiste = respuestaReferenciaInexistente(error);
      if (noExiste) return res.status(404).json(noExiste);
      res.status(500).json({ error: error.message });
    }
  },

  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }
      const eliminado = await AporteRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Aporte no encontrado', code: 'CONTRIBUTION_NOT_FOUND' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};