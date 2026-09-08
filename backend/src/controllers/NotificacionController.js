// Controlador REST de Notificacion (HE-02, CA-2.1.3, lado del estudiante).
// Entidad de la migración 002 — PROPUESTA de corrección al DER pendiente de aprobar en Slack.
//
// NOTA: sin capa de autenticación todavía, el usuario destinatario se pasa por query string
// (?usuario_id=). Cuando exista auth, saldrá del token y este parámetro se elimina.

import { NotificacionRepository } from '../repositories/NotificacionRepository.js';

export const NotificacionController = {
  /**
   * Lista las notificaciones de un estudiante (más recientes primero).
   * Ruta: GET /api/v1/notifications?usuario_id=1&no_leidas=true
   */
  async listar(req, res) {
    try {
      const usuarioId = Number(req.query.usuario_id);
      if (Number.isNaN(usuarioId)) {
        return res.status(400).json({ error: 'usuario_id es obligatorio y debe ser numérico' });
      }
      const soloNoLeidas = req.query.no_leidas === 'true';
      const notificaciones = await NotificacionRepository.listarPorUsuario(usuarioId, { soloNoLeidas });
      res.status(200).json(notificaciones);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Marca una notificación como leída.
   * Ruta: PATCH /api/v1/notifications/:id/read
   */
  async marcarLeida(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const notificacion = await NotificacionRepository.marcarLeida(id);
      if (!notificacion) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }
      res.status(200).json(notificacion);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
