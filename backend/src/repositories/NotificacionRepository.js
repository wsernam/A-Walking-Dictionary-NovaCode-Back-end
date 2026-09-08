// Repositorio de Notificacion: acceso a datos para la tabla "notificacion".
// Entidad de la migración 002 (HE-02, CA-2.1.3) — pendiente de aprobación del DER en Slack.

import { pool } from '../config/db.js';
import { Notificacion } from '../models/Notificacion.js';

export const NotificacionRepository = {
  async crear(datos) {
    const { usuario_id, tarjeta_id, tipo, mensaje } = datos;
    const { rows } = await pool.query(
      `INSERT INTO notificacion (usuario_id, tarjeta_id, tipo, mensaje)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [usuario_id, tarjeta_id ?? null, tipo, mensaje]
    );
    return new Notificacion(rows[0]);
  },

  // CA-2.1.3 (lado del estudiante): sus notificaciones, más recientes primero.
  async listarPorUsuario(usuario_id, { soloNoLeidas = false } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM notificacion
       WHERE usuario_id = $1 ${soloNoLeidas ? 'AND leida = false' : ''}
       ORDER BY fecha_creacion DESC`,
      [usuario_id]
    );
    return rows.map((row) => new Notificacion(row));
  },

  async marcarLeida(id_notificacion) {
    const { rows } = await pool.query(
      'UPDATE notificacion SET leida = true WHERE id_notificacion = $1 RETURNING *',
      [id_notificacion]
    );
    return rows[0] ? new Notificacion(rows[0]) : null;
  },
};
