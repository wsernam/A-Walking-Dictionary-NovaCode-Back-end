/**
 * @file AuthService.js
 * @brief Servicio de autenticación mediante Google OAuth (HU-5.4).
 *
 * HU-5.4: autentica usuarios ya registrados.
 * HU-5.1: puede reutilizar la validación del token de Google para registrar usuarios.
 */

import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { UsuarioRepository } from '../repositories/UsuarioRepository.js';

const JWT_EXPIRES_IN = '8h';

let googleClient;

/**
 * Devuelve el cliente OAuth2 de Google.
 */
function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID no está configurado en el entorno');
  }

  if (!googleClient) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  return googleClient;
}

/**
 * Valida un idToken emitido por Google.
 *
 * Esta función se reutiliza tanto para:
 * - HU-5.4: iniciar sesión.
 * - HU-5.1: registrar un nuevo usuario.
 *
 * @param {string} idToken Token entregado por Google Identity Services.
 * @returns {Promise<Object>} Datos del usuario proporcionados por Google.
 */
export async function validarTokenGoogle(idToken) {
  if (!idToken) {
    const error = new Error('idToken es obligatorio');
    error.status = 400;
    throw error;
  }

  const client = getGoogleClient();

  let payload;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    payload = ticket.getPayload();
  } catch {
    const error = new Error('Token de Google inválido');
    error.status = 401;
    throw error;
  }

  if (!payload?.email || !payload.email_verified) {
    const error = new Error(
      'El email de la cuenta de Google no está verificado'
    );
    error.status = 401;
    throw error;
  }

  return payload;
}

/**
 * Firma el JWT propio de la app para un usuario y arma la respuesta de sesión.
 *
 * Se reutiliza tanto para:
 * - HU-5.4: iniciar sesión.
 * - HU-5.1: registrarse (el estudiante entra directo tras crear su cuenta).
 *
 * @param {Object} usuario Fila de la tabla usuario.
 * @returns {{ token: string, usuario: Object }} Nunca incluye password_hash.
 */
export function emitirSesion(usuario) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado en el entorno');
  }

  const token = jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      nombre_completo: usuario.nombre_completo,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}

export const AuthService = {

  /**
   * HU-5.4: inicia sesión con Google.
   *
   * Este método NO crea usuarios.
   */
  async loginConGoogle(idToken) {

    const payload = await validarTokenGoogle(idToken);

    const usuario = await UsuarioRepository.obtenerPorEmail(payload.email);

    if (!usuario) {
      const error = new Error(
        'Usuario no registrado en la plataforma'
      );
      error.status = 403;
      throw error;
    }

    if (!usuario.activo) {
      const error = new Error('Cuenta inactiva');
      error.status = 401;
      throw error;
    }

    return emitirSesion(usuario);
  },
};
