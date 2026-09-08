// Rutas REST de HE-02 para las notificaciones al estudiante (CA-2.1.3).
// Se montan en app.js bajo /api/v1/notifications.
// Entidad de la migración 002 — PROPUESTA de corrección al DER pendiente de aprobar en Slack.

import { Router } from 'express';
import { NotificacionController } from '../controllers/NotificacionController.js';

const router = Router();

router.get('/', NotificacionController.listar);
router.patch('/:id/read', NotificacionController.marcarLeida);

export default router;
