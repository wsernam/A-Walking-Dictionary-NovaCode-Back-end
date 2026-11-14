/**
 * @file AdminUsuarioController.js
 * @brief HU-023: controlador REST de la administración de usuarios (/api/v1/admin/users).
 * Delega todas las reglas en AdminUsuarioService; el administrador sale siempre del JWT.
 */

import { AdminUsuarioService } from '../services/AdminUsuarioService.js';

const ID_MAXIMO = 2147483647;

/** @return {number|null} El id de la ruta, o null si no es un entero válido. */
function leerId(req) {
  const id = Number(req.params.id);
  return Number.isSafeInteger(id) && id >= 1 && id <= ID_MAXIMO ? id : null;
}

function responderError(res, error) {
  res.status(error.status || 500).json({ error: error.message, code: error.code });
}

const idInvalido = (res) => res.status(400).json({ error: 'id inválido', code: 'ADMIN_INVALID_ID' });

export const AdminUsuarioController = {
  /** @brief CA-23.1: GET /api/v1/admin/users?search=&rol=&activo=&page=&limit= */
  async listar(req, res) {
    try {
      res.status(200).json(await AdminUsuarioService.listar(req.query));
    } catch (error) {
      responderError(res, error);
    }
  },

  /** @brief CA-23.2: PATCH /api/v1/admin/users/:id/role  body { rol } */
  async cambiarRol(req, res) {
    try {
      const id = leerId(req);
      if (id === null) return idInvalido(res);
      res.status(200).json(await AdminUsuarioService.cambiarRol(req.usuario, id, req.body?.rol));
    } catch (error) {
      responderError(res, error);
    }
  },

  /** @brief CA-23.2: PATCH /api/v1/admin/users/:id/status  body { activo } */
  async cambiarEstado(req, res) {
    try {
      const id = leerId(req);
      if (id === null) return idInvalido(res);
      res.status(200).json(await AdminUsuarioService.cambiarEstado(req.usuario, id, req.body?.activo));
    } catch (error) {
      responderError(res, error);
    }
  },
};