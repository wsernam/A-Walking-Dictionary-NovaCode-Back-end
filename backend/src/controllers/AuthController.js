/**
 * @file AuthController.js
 * @brief Controlador REST de autenticación (HU-5.4): recibe la petición HTTP, llama a
 * AuthService y devuelve la respuesta.
 */

import { AuthService } from '../services/AuthService.js';

export const AuthController = {
  /**
   * @brief CA-5.4.1: inicia sesión con el token de Google. POST /api/v1/auth/google
   *
   * @param {import('express').Request} req - req.body debe traer idToken (el "credential" que
   * entrega Google Identity Services en el frontend).
   * @param {import('express').Response} res - 200 con { token, usuario: { id_usuario,
   * nombre_completo, email, rol } }; 400 si falta idToken; 401 si el token de Google es
   * inválido, el correo no está verificado o la cuenta está inactiva; 403 si el correo no está
   * registrado en la plataforma; 500 ante un error de configuración del servidor. Los errores
   * siempre vienen como { error: mensaje }.
   */
  async loginGoogle(req, res) {
    try {
      const { idToken } = req.body;
      const resultado = await AuthService.loginConGoogle(idToken);
      res.status(200).json(resultado);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ error: error.message });
    }
  },

  async registrarGoogle(req, res) {
    try {
      const { idToken } = req.body;

      const resultado = await AuthService.registrarConGoogle(idToken);

      res.status(201).json(resultado);
    } catch (error) {
      const status = error.status || 500;

      res.status(status).json({
        error: error.message,
      });
    }
  },
};
