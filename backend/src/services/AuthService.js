// AuthService.js
// Historia de Usuario: HU-5.4 — Iniciar sesión y control de roles.
// Endpoint relacionado: POST /api/v1/auth/login
// Almacenamiento: tabla usuario (password_hash, rol ya existen en el DER, sin cambios de esquema).
//
// NOTA: el registro (HU-5.1, POST /api/v1/auth/register) se implementa en otra rama; este
// servicio asume que el usuario y su password_hash ya existen en la tabla usuario.

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UsuarioRepository } from '../repositories/UsuarioRepository.js';

const JWT_EXPIRES_IN = '8h';

export const AuthService = {
  // CA-5.4.1: valida credenciales y retorna un JWT con claims de rol.
  async login(email, password) {
    if (!email || !password) {
      const error = new Error('email y password son obligatorios');
      error.status = 400;
      throw error;
    }

    const usuario = await UsuarioRepository.obtenerPorEmail(email);

    // Mensaje genérico igual si el email no existe o si la contraseña no coincide, para no
    // revelar cuál de los dos campos fue el incorrecto.
    const credencialesInvalidas = () => {
      const error = new Error('Credenciales inválidas');
      error.status = 401;
      throw error;
    };

    if (!usuario || !usuario.activo) {
      credencialesInvalidas();
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      credencialesInvalidas();
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
