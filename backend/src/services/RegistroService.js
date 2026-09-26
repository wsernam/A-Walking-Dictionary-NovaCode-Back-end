import { validarTokenGoogle, emitirSesion } from './AuthService.js';
import { UsuarioRepository } from '../repositories/UsuarioRepository.js';

const DOMINIO_INSTITUCIONAL = '@unicauca.edu.co';

export const RegistroService = {

  /**
   * HU-5.1: registra un estudiante mediante Google OAuth.
   *
   * No hay contraseña: la identidad la verifica Google (el login de HU-5.4 es solo con Google),
   * por eso no se usa bcrypt ni aplica la validación de "clave débil" de CA-5.1.2.
   *
   * @param {string} idToken Token entregado por Google Identity Services.
   * @returns {Promise<{ token: string, usuario: Object }>} Misma forma que el login, para que el
   * estudiante entre directo tras registrarse.
   */
  async registrarConGoogle(idToken) {

    // 1. Google valida la identidad del usuario.
    const payload = await validarTokenGoogle(idToken);
    const email = payload.email.toLowerCase();

    // 2. CA-5.1.1: solo correo institucional.
    if (!email.endsWith(DOMINIO_INSTITUCIONAL)) {
      const error = new Error(
        `Debe utilizar un correo institucional ${DOMINIO_INSTITUCIONAL}`
      );
      error.status = 400;
      throw error;
    }

    // 3. CA-5.1.2: el correo no puede estar registrado.
    const usuarioExistente = await UsuarioRepository.obtenerPorEmail(email);

    if (usuarioExistente) {
      throw correoYaRegistrado();
    }

    // 4. CA-5.1.1: se crea siempre con rol "estudiante".
    let usuario;
    try {
      usuario = await UsuarioRepository.crearDesdeGoogle({
        nombre_completo: payload.name || email.split('@')[0],
        email,
        rol: 'estudiante',
      });
    } catch (error) {
      // Dos registros simultáneos del mismo correo: la restricción UNIQUE de usuario.email
      // rechaza el segundo.
      if (error.code === '23505') {
        throw correoYaRegistrado();
      }
      throw error;
    }

    return emitirSesion(usuario);
  },
};

function correoYaRegistrado() {
  const error = new Error('El correo ya está registrado en la plataforma');
  error.status = 409;
  return error;
}
