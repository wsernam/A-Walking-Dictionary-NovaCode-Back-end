/**
 * @file InscripcionController.js
 * @brief Controlador REST de Inscripcion (HU-5.3). Los métodos de inscripción por código,
 * asignación por correo, código de acceso y listado de estudiantes delegan en InscripcionService
 * o InscripcionRepository y se exponen en cursoRoutes.js (/api/v1/courses/...). Los métodos
 * crear, obtenerPorId, listar, actualizar y eliminar son CRUD genérico sobre
 * InscripcionRepository.
 *
 * @note El CRUD genérico solo lo usa inscripcionRoutes.js, que no está montado en app.js. Sus
 * errores no llevan el campo "code" en el 500.
 */

import { InscripcionRepository } from '../repositories/InscripcionRepository.js';
import { InscripcionService } from '../services/InscripcionService.js';

export const InscripcionController = {

  /**
   * @brief Crea una inscripción (CRUD genérico). El único campo validado es estado, obligatorio
   * y de máximo 30 caracteres (varchar 30 del DER).
   * @param {import('express').Request} req - req.body: columnas de inscripcion.
   * @param {import('express').Response} res - 201 con la inscripción, 400 (REQUIRED_FIELDS_MISSING o FIELD_TOO_LONG), 500 ante error inesperado.
   */
  async crear(req, res) {
    try {
      const { estado } = req.body;

      // estado es el único varchar de "inscripcion" y es NOT NULL en el DER
      // (curso_id, estudiante_id son int; fecha_inscripcion es date).
      if (!estado) {
        return res.status(400).json({
          error: 'El campo estado es obligatorio',
          code: 'REQUIRED_FIELDS_MISSING',
        });
      }

      // Longitud máxima según el DER: estado varchar(30).
      if (estado.length > 30) {
        return res.status(400).json({
          error: `El campo estado no puede superar 30 caracteres (tiene ${estado.length} caracteres).`,
          code: 'FIELD_TOO_LONG',
        });
      }

      const inscripcion =
        await InscripcionRepository.crear(req.body);

      res.status(201).json(inscripcion);
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  /**
   * @brief Consulta una inscripción por su id_inscripcion (CRUD genérico).
   * @param {import('express').Request} req - req.params.id es el id_inscripcion.
   * @param {import('express').Response} res - 200 con la inscripción, 400 (INVALID_ID), 404 (ENROLLMENT_NOT_FOUND), 500 ante error inesperado.
   */
  async obtenerPorId(req, res) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          error: 'id inválido',
          code: 'INVALID_ID',
        });
      }

      const inscripcion =
        await InscripcionRepository.obtenerPorId(id);

      if (!inscripcion) {
        return res.status(404).json({
          error: 'Inscripcion no encontrada',
          code: 'ENROLLMENT_NOT_FOUND',
        });
      }

      res.status(200).json(inscripcion);
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  /**
   * @brief Lista todas las inscripciones (CRUD genérico).
   * @param {import('express').Request} req - Sin parámetros.
   * @param {import('express').Response} res - 200 con el listado, 500 ante error inesperado.
   */
  async listar(req, res) {
    try {
      const inscripciones =
        await InscripcionRepository.listar();

      res.status(200).json(inscripciones);
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  /**
   * @brief Actualiza una inscripción (CRUD genérico).
   * @param {import('express').Request} req - req.params.id es el id_inscripcion; req.body trae las columnas.
   * @param {import('express').Response} res - 200 con la inscripción actualizada, 400 (INVALID_ID), 404 (ENROLLMENT_NOT_FOUND), 500 ante error inesperado.
   */
  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          error: 'id inválido',
          code: 'INVALID_ID',
        });
      }

      const inscripcion =
        await InscripcionRepository.actualizar(
          id,
          req.body
        );

      if (!inscripcion) {
        return res.status(404).json({
          error: 'Inscripcion no encontrada',
          code: 'ENROLLMENT_NOT_FOUND',
        });
      }

      res.status(200).json(inscripcion);
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  /**
   * @brief Elimina una inscripción (CRUD genérico).
   * @param {import('express').Request} req - req.params.id es el id_inscripcion.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 (INVALID_ID), 404 (ENROLLMENT_NOT_FOUND), 500 ante error inesperado.
   */
  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          error: 'id inválido',
          code: 'INVALID_ID',
        });
      }

      const eliminado =
        await InscripcionRepository.eliminar(id);

      if (!eliminado) {
        return res.status(404).json({
          error: 'Inscripcion no encontrada',
          code: 'ENROLLMENT_NOT_FOUND',
        });
      }

      res.status(200).json({
        eliminado: true,
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  },

  /**
   * @brief HU-5.3: genera el código de acceso de un curso. POST /api/v1/courses/:id/access-code
   * (solo docente, ver cursoRoutes.js). La lógica está en InscripcionService.
   * @param {import('express').Request} req - req.params.id es el id_curso.
   * @param {import('express').Response} res - 200 con el resultado del servicio, 400 (INVALID_ID) o el status y code que lance el servicio.
   */
  async generarCodigoAcceso(req, res) {
    try {
      const id_curso = Number(req.params.id);

      if (!Number.isSafeInteger(id_curso) || id_curso < 1 || id_curso > 2147483647) {
        return res.status(400).json({
          error: 'id de curso inválido',
          code: 'INVALID_ID',
        });
      }

      const resultado =
        await InscripcionService.generarCodigoAcceso(
          id_curso
        );

      res.status(200).json(resultado);
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
      });
    }
  },

  /**
   * @brief HU-5.3 (CA-5.3.1): inscribe al estudiante del token en el curso del código. El
   * estudiante_id sale del JWT (req.usuario.id_usuario), no del body; el código se normaliza con
   * trim y mayúsculas. POST /api/v1/courses/enroll (solo estudiante).
   * @param {import('express').Request} req - req.body.codigo_acceso es el código del curso.
   * @param {import('express').Response} res - 201 con la inscripción, 400 (REQUIRED_FIELDS_MISSING) o el status y code que lance el servicio.
   */
  async inscribirsePorCodigo(req, res) {
      try {
        const { codigo_acceso } = req.body;

        if (!codigo_acceso) {
          return res.status(400).json({
            error: 'codigo_acceso es obligatorio',
            code: 'REQUIRED_FIELDS_MISSING',
          });
        }

        if (typeof codigo_acceso !== 'string') {
          return res.status(400).json({
            error: 'codigo_acceso debe ser una cadena de texto',
            code: 'INVALID_FIELD_TYPE',
          });
        }

        const estudiante_id = req.usuario.id_usuario;

        const inscripcion =
          await InscripcionService.inscribirsePorCodigo(
            estudiante_id,
            codigo_acceso.trim().toUpperCase()
          );

        res.status(201).json(inscripcion);
      } catch (error) {
        res.status(error.status || 500).json({
          error: error.message,
          code: error.code,
        });
      }
    },

  /**
   * @brief HU-5.3 (CA-5.3.2): inscribe a un estudiante en un curso a partir de su correo.
   * POST /api/v1/courses/:id/assign (solo docente).
   * @param {import('express').Request} req - req.params.id es el id_curso; req.body.email es el correo del estudiante.
   * @param {import('express').Response} res - 201 con la inscripción, 400 (INVALID_ID o REQUIRED_FIELDS_MISSING) o el status y code que lance el servicio.
   */
  async asignarPorCorreo(req, res) {
    try {
      const id_curso = Number(req.params.id);

      if (!Number.isSafeInteger(id_curso) || id_curso < 1 || id_curso > 2147483647) {
        return res.status(400).json({
          error: 'id de curso inválido',
          code: 'INVALID_ID',
        });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'El correo electrónico es obligatorio',
          code: 'REQUIRED_FIELDS_MISSING',
        });
      }

      const inscripcion =
        await InscripcionService.asignarPorCorreo(
          id_curso,
          email.trim()
        );

      res.status(201).json(inscripcion);
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
      });
    }
  },

  /**
   * @brief HU-5.3: lista los estudiantes inscritos en un curso. GET /api/v1/courses/:id/students
   * (solo docente).
   * @param {import('express').Request} req - req.params.id es el id_curso.
   * @param {import('express').Response} res - 200 con los estudiantes, 400 (INVALID_ID), 500 ante error inesperado.
   */
  async listarEstudiantesPorCurso(req, res) {
    try {
      const id_curso = Number(req.params.id);

      if (!Number.isSafeInteger(id_curso) || id_curso < 1 || id_curso > 2147483647) {
        return res.status(400).json({
          error: 'id de curso inválido',
          code: 'INVALID_ID',
        });
      }

      const estudiantes =
        await InscripcionRepository.listarEstudiantesPorCurso(
          id_curso
        );

      res.status(200).json(estudiantes);
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  },
};