/**
 * @file UsuarioController.js
 * @brief Controlador REST de Usuario: recibe la petición HTTP, llama a PerfilService (HU-5.2) y
 * devuelve la respuesta.
 */

import { PerfilService } from '../services/PerfilService.js';

export const UsuarioController = {
  /**
   * @brief HU-5.2: obtiene el perfil académico. GET /api/v1/users/:id
   *
   * @note Shape acordado con el frontend (estudiante_id, correo, sin password_hash), distinto del
   * obtenerPorId() genérico. Ver PerfilService.js.
   *
   * @note Auditoría OWASP H-01: el estudiante solo puede ver su propio perfil; la docente puede ver
   * el de cualquier estudiante (decisión del equipo 2026-10-08).
   *
   * @param {import('express').Request} req - req.params.id es el id_usuario; req.usuario viene del JWT.
   * @param {import('express').Response} res - 200 con el perfil, 400 si el id no es numérico,
   * 403 si un estudiante pide un perfil ajeno, 404 si no existe, 500 ante error inesperado.
   */
  async obtenerPerfil(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      if (req.usuario.rol !== 'docente' && req.usuario.id_usuario !== id) {
        return res.status(403).json({ error: 'No tiene permisos para ver este perfil' });
      }
      const perfil = await PerfilService.obtenerPerfil(id);
      res.status(200).json(perfil);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ error: error.message });
    }
  },

  /**
   * @brief CA-5.2.1 + CA-5.2.2: actualiza el perfil académico. PATCH /api/v1/users/profile
   *
   * @note estudiante_id viaja en el body (no en la URL) porque esta rama todavía no tiene auth
   * real -- mismo patrón que ya usan mazos/tarjetas/inscripción (contrato acordado con frontend).
   *
   * @param {import('express').Request} req - req.body: estudiante_id (obligatorio, numérico) y,
   * opcionales, nivel_ingles, codigo_estudiantil, avatar e intereses.
   * @param {import('express').Response} res - 200 con el perfil actualizado, 400 si falta
   * estudiante_id o falla una validación, 404 si el usuario no existe, 500 ante error inesperado.
   */
  async actualizarPerfil(req, res) {
  try {
    const { nivel_ingles, codigo_estudiantil, avatar, intereses } = req.body;

    // El usuario se obtiene del JWT generado mediante Google OAuth.
    const id = req.usuario.id_usuario;

    const perfil = await PerfilService.actualizarPerfil(id, {
      nivel_ingles,
      codigo_estudiantil,
      avatar,
      intereses,
    });

    res.status(200).json(perfil);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message });
  }
},

  /**
   * @brief HU-5.2: contexto académico (curso y semestre) de solo lectura.
   * GET /api/v1/students/:id/context
   *
   * @param {import('express').Request} req - req.params.id es el id_usuario del estudiante.
   * @param {import('express').Response} res - 200 con curso_asignado, semestre_activo y
   * departamento_universidad, 400 si el id no es numérico, 404 si no existe, 500 ante error
   * inesperado.
   */
  async obtenerContextoAcademico(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const contexto = await PerfilService.obtenerContextoAcademico(id);
      res.status(200).json(contexto);
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ error: error.message });
    }
  },
};
