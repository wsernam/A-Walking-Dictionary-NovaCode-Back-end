import { StudyService } from '../services/StudyService.js';

export const StudyController = {
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

      const sesion = await StudyService.iniciarSesion(id);

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

      const progreso = await StudyService.registrarValoracion(
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