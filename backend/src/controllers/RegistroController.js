/**
 * @file RegistroController.js
 * @brief Controlador REST para el registro autónomo mediante Google OAuth (HU-5.1).
 */

import { RegistroService } from '../services/RegistroService.js';

export const RegistroController = {

  /**
   * @brief CA-5.1.1: registra un estudiante mediante Google.
   *
   * POST /api/v1/auth/register
   *
   * El frontend envía el idToken obtenido de Google Identity Services.
   */
  async registrarConGoogle(req, res) {
    try {
      const { idToken } = req.body;

      const usuario = await RegistroService.registrarConGoogle(idToken);

      res.status(201).json({
        mensaje: 'Usuario registrado correctamente',
        usuario,
      });

    } catch (error) {
      const status = error.status || 500;

      res.status(status).json({
        error: error.message,
      });
    }
  },
};