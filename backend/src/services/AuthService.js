/**
 * @file AuthService.js
 * @brief Servicio de autenticación (HU-5.4): valida el token de Google (OAuth) y emite el JWT
 * propio de la app.
 *
 * Endpoint relacionado: POST /api/v1/auth/google. Almacenamiento: tabla usuario (columnas
 * rol y activo del DER, sin cambios de esquema).
 *
 * @note CAMBIO DE ENFOQUE (post primera entrega): el profesor pidió reemplazar el login propio
 * (email + password con bcrypt) por OAuth usando Google como proveedor de identidad. Google
 * verifica quién es la persona; este servicio solo confía en ese resultado y emite el MISMO tipo
 * de JWT propio que ya emitía el login anterior (id_usuario, email, rol), así que
 * authMiddleware.js no cambió.
 *
 * @note ALCANCE: este servicio SOLO autentica. No crea usuarios: el registro/creación de
 * usuarios (con su rol) le corresponde a otra HU. Si el correo de Google no existe en la tabla
 * usuario, el login se rechaza (403).
 */

import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { UsuarioRepository } from '../repositories/UsuarioRepository.js';

/** @brief Duración del JWT propio de la app (no está fijada por ningún CA del backlog). */
const JWT_EXPIRES_IN = '8h';

let googleClient;

/**
 * @brief Devuelve el cliente OAuth2 de Google, creándolo la primera vez (patrón singleton).
 * @return {OAuth2Client} Cliente configurado con GOOGLE_CLIENT_ID.
 * @throws {Error} Si la variable de entorno GOOGLE_CLIENT_ID no está definida (error de
 * configuración del servidor, se responde como 500).
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

export const AuthService = {
  /**
   * @brief CA-5.4.1: recibe el idToken que el frontend obtiene de Google Identity Services, lo
   * verifica contra Google y retorna el JWT propio de la app junto con los datos del usuario.
   *
   * Pasos: (1) valida que venga el idToken; (2) verifica su firma y que fue emitido para este
   * GOOGLE_CLIENT_ID; (3) exige que el correo esté verificado en Google; (4) busca el usuario
   * por correo en la tabla usuario; (5) firma el JWT con { id_usuario, email, rol }.
   *
   * @param {string} idToken - Campo "credential" que entrega Google en el frontend.
   * @return {Promise<{token: string, usuario: {id_usuario: number, nombre_completo: string,
   * email: string, rol: string}}>} JWT propio (dura 8 h) y datos básicos del usuario. Nunca
   * incluye password_hash.
   * @throws {Error} status 400 si falta idToken; 401 si el token de Google es inválido, el
   * correo no está verificado o la cuenta está inactiva; 403 si el correo no existe en usuario
   * (este servicio NO crea usuarios). Sin status (500) si falta GOOGLE_CLIENT_ID o JWT_SECRET.
   */
  async loginConGoogle(idToken) {
    if (!idToken) {
      const error = new Error('idToken es obligatorio');
      error.status = 400;
      throw error;
    }

    const client = getGoogleClient(); // fuera del try: un GOOGLE_CLIENT_ID mal configurado debe
    // dar 500 "no configurado", no confundirse con un idToken realmente inválido (401).

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
      const error = new Error('El email de la cuenta de Google no está verificado');
      error.status = 401;
      throw error;
    }

    const usuario = await UsuarioRepository.obtenerPorEmail(payload.email);

    if (!usuario) {
      // Google confirmó la identidad, pero esa persona no tiene cuenta en la plataforma.
      // Crearla no es responsabilidad de este servicio.
      const error = new Error('Usuario no registrado en la plataforma');
      error.status = 403;
      throw error;
    }

    if (!usuario.activo) {
      const error = new Error('Cuenta inactiva');
      error.status = 401;
      throw error;
    }

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
  },
};
