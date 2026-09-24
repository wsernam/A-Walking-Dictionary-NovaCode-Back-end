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
   * Responde 201 con { mensaje, token, usuario } (mismo token y usuario que el login);
   * 400 si falta idToken o el correo no es institucional; 401 si el token de Google es
   * inválido o el correo no está verificado; 409 si el correo ya está registrado.
   */
  async registrarConGoogle(req, res) {
    try {
      const { idToken } = req.body;

      const { token, usuario } = await RegistroService.registrarConGoogle(idToken);

      res.status(201).json({
        mensaje: 'Usuario registrado correctamente',
        token,
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