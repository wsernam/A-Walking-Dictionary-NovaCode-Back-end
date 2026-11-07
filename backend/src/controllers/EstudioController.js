/**
 * @file Controlador REST del modo de estudio (HU-4.1): inicia la sesión de repaso y registra la
 * valoración de cada tarjeta (rutas en estudioRoutes.js, solo estudiante).
 */

import { EstudioService } from '../services/EstudioService.js';
import { InscripcionRepository } from '../repositories/InscripcionRepository.js';
import { authDeshabilitado } from '../middleware/autenticacionMiddleware.js';

/**
 * Auditoría OWASP H-03 (A01): comprueba que la inscripción pertenece al usuario del token.
 * Si la inscripción no existe responde igual que si fuera ajena (403), para no revelar qué ids
 * existen. Con DISABLE_AUTH=true (solo desarrollo local) no hay usuario real, así que se omite.
 */
async function esPropietario(req, inscripcionId) {
  if (authDeshabilitado()) return true;
  const inscripcion = await InscripcionRepository.obtenerPorId(inscripcionId);
  return (
    Boolean(inscripcion) &&
    Number(inscripcion.estudiante_id) === Number(req.usuario.id_usuario)
  );
}

/**
 * Controlador REST: cada método recibe una petición HTTP y responde.
 * @namespace
 */
export const EstudioController = {
  /**
   * HU-4.1: inicia una sesión de repaso. POST /api/v1/study/review-session. Solo estudiante, y
   * solo sobre una inscripción propia (Auditoría OWASP H-03).
   * @param {import('express').Request} req - req.body.inscripcion_id es la inscripción del
   * estudiante en el curso.
   * @param {import('express').Response} res - 200 con la sesión (tarjetas ordenadas por SM-2),
   * 400 si falta o es inválido inscripcion_id, 403 si la inscripción no es del usuario, el status
   * del error del servicio o 500 ante error inesperado.
   */
  async iniciarSesion(req, res) {
    try {
      const { inscripcion_id } = req.body;

      if (!inscripcion_id) {
        return res.status(400).json({
          error: 'El campo inscripcion_id es obligatorio',
          code: 'REQUIRED_FIELDS_MISSING',
        });
      }

      const id = Number(inscripcion_id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          error: 'inscripcion_id inválido',
          code: 'INVALID_ID',
        });
      }

      if (!(await esPropietario(req, id))) {
        return res.status(403).json({
          error: 'No tiene permisos sobre esta inscripción',
          code: 'ENROLLMENT_FORBIDDEN',
        });
      }

      const sesion = await EstudioService.iniciarSesion(id);

      return res.status(200).json(sesion);
    } catch (error) {
      return res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
      });
    }
  },

  /**
   * HU-4.1 / CA-4.1.2: registra la valoración de una tarjeta y recalcula su próximo repaso con
   * SM-2. POST /api/v1/study/review-session/review. Solo estudiante, sobre una inscripción propia.
   * @param {import('express').Request} req - req.body trae inscripcion_id, tarjeta_id y
   * valoracion ("Repetir", "Difícil", "Buena" o "Fácil").
   * @param {import('express').Response} res - 200 con el progreso actualizado, 400 si falta un
   * campo o un id no es numérico, 403 si la inscripción no es del usuario, el status del error
   * del servicio o 500 ante error inesperado.
   */
  async registrarValoracion(req, res) {
    try {
      const { inscripcion_id, tarjeta_id, valoracion } = req.body;

      if (!inscripcion_id || !tarjeta_id || !valoracion) {
        return res.status(400).json({
          error:
            'Los campos inscripcion_id, tarjeta_id y valoracion son obligatorios',
          code: 'REQUIRED_FIELDS_MISSING',
        });
      }

      const inscripcionId = Number(inscripcion_id);
      const tarjetaId = Number(tarjeta_id);

      if (Number.isNaN(inscripcionId) || Number.isNaN(tarjetaId)) {
        return res.status(400).json({
          error: 'inscripcion_id y tarjeta_id deben ser números válidos',
          code: 'INVALID_ID',
        });
      }

      if (!(await esPropietario(req, inscripcionId))) {
        return res.status(403).json({
          error: 'No tiene permisos sobre esta inscripción',
          code: 'ENROLLMENT_FORBIDDEN',
        });
      }

      const progreso = await EstudioService.registrarValoracion(
        inscripcionId,
        tarjetaId,
        valoracion
      );

      return res.status(200).json(progreso);
    } catch (error) {
      return res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
      });
    }
  },
};