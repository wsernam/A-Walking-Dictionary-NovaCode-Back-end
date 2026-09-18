// AuthService.js
// Historia de Usuario: HU-5.4 — Iniciar sesión y control de roles.
// Endpoint relacionado: POST /api/v1/auth/google
// Almacenamiento: tabla usuario (password_hash, rol ya existen en el DER, sin cambios de esquema).
//
// CAMBIO DE ENFOQUE (post primera entrega): el profesor pidió reemplazar el login propio
// (email + password con bcrypt) por OAuth usando Google como proveedor de identidad. Google
// verifica quién es la persona; este servicio solo confía en ese resultado y sigue emitiendo
// el MISMO tipo de JWT propio que ya emitía el login anterior (id_usuario, email, rol), así que
// authMiddleware.js no cambió en nada.
//
// NOTA: el registro (HU-5.1) tampoco existe en esta rama. Con Google no hace falta un endpoint
// de registro aparte: si el email no existe en la tabla usuario, se crea automáticamente en el
// primer login (ver "Decisión no especificada en ningún CA" más abajo).

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { UsuarioRepository } from '../repositories/UsuarioRepository.js';

const JWT_EXPIRES_IN = '8h';

let googleClient;
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
  // CA-5.4.1: recibe el idToken que el frontend obtiene de Google Identity Services, lo
  // verifica contra los servidores de Google, y retorna el JWT propio de la app.
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

    let usuario = await UsuarioRepository.obtenerPorEmail(payload.email);

    if (!usuario) {
      // Decisión no especificada en ningún CA (HU-5.1 tampoco define un default): un email de
      // Google que nunca inició sesión se crea automáticamente con rol "estudiante", igual que
      // el auto-registro de HU-5.1. No hay forma de que alguien se auto-asigne "docente" por
      // este camino; las cuentas docente se siguen creando a mano (mismo criterio que ya usaba
      // seed.sql). password_hash queda con un hash de un valor aleatorio que nadie conoce, solo
      // para satisfacer la columna NOT NULL del DER -- esta cuenta nunca hace login por password.
      usuario = await UsuarioRepository.crear({
        nombre_completo: payload.name || payload.email,
        email: payload.email,
        password_hash: await bcrypt.hash(crypto.randomUUID(), 10),
        rol: 'estudiante',
        nivel_ingles: null,
        activo: true,
        fecha_registro: new Date(),
      });
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
