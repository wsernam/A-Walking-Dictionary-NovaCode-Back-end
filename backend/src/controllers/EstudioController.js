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

export const EstudioController = {
  async iniciarSesion(req, res) {
    try {
      const { inscripcion_id } = req.body;

      if (!inscripcion_id) {
        return res.status(400).json({
          error: 'El campo inscripcion_id es obligatorio',
        });
      }

      const id = Number(inscripcion_id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          error: 'inscripcion_id inválido',
        });
      }

      if (!(await esPropietario(req, id))) {
        return res.status(403).json({
          error: 'No tiene permisos sobre esta inscripción',
        });
      }

      const sesion = await EstudioService.iniciarSesion(id);

      return res.status(200).json(sesion);
    } catch (error) {
      return res.status(error.status || 500).json({
        error: error.message,
      });
    }
  },

  async registrarValoracion(req, res) {
    try {
      const { inscripcion_id, tarjeta_id, valoracion } = req.body;

      if (!inscripcion_id || !tarjeta_id || !valoracion) {
        return res.status(400).json({
          error:
            'Los campos inscripcion_id, tarjeta_id y valoracion son obligatorios',
        });
      }

      const inscripcionId = Number(inscripcion_id);
      const tarjetaId = Number(tarjeta_id);

      if (Number.isNaN(inscripcionId) || Number.isNaN(tarjetaId)) {
        return res.status(400).json({
          error: 'inscripcion_id y tarjeta_id deben ser números válidos',
        });
      }

      if (!(await esPropietario(req, inscripcionId))) {
        return res.status(403).json({
          error: 'No tiene permisos sobre esta inscripción',
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
      });
    }
  },
};