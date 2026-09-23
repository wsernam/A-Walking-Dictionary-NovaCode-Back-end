import { validarTokenGoogle } from './AuthService.js';
import { UsuarioRepository } from '../repositories/UsuarioRepository.js';

export const RegistroService = {

  /**
   * HU-5.1: registra un estudiante mediante Google OAuth.
   */
  async registrarConGoogle(idToken) {

    // 1. Google valida la identidad del usuario.
    const payload = await validarTokenGoogle(idToken);

    // 2. Verificar que el correo no esté registrado.
    const usuarioExistente =
      await UsuarioRepository.obtenerPorEmail(payload.email);

    if (usuarioExistente) {
      const error = new Error(
        'El correo ya está registrado en la plataforma'
      );
      error.status = 409;
      throw error;
    }

    // 3. Crear automáticamente un estudiante.
    const usuario = await UsuarioRepository.crear({
      nombre_completo: payload.name,
      email: payload.email,
      password_hash: null,
      rol: 'estudiante',
      nivel_ingles: null,
      activo: true,
      fecha_registro: new Date(),
    });

    // 4. Nunca devolver password_hash.
    return {
      id_usuario: usuario.id_usuario,
      nombre_completo: usuario.nombre_completo,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      fecha_registro: usuario.fecha_registro,
    };
  },
};