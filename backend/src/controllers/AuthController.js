// Controlador REST de Auth: recibe la petición HTTP, llama a AuthService y devuelve la
// respuesta. Historia de Usuario: HU-5.4.

import { AuthService } from '../services/AuthService.js';

export const AuthController = {
  // CA-5.4.1: POST /api/v1/auth/google
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
};
