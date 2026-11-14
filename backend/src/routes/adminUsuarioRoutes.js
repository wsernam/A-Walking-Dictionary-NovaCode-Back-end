/**
 * @file adminUsuarioRoutes.js
 * @brief HU-023: rutas de administración de usuarios, montadas en app.js bajo /api/v1/admin.
 * Todas exigen JWT y rol "administrador" (CA-5.4.2: 403 para cualquier otro rol).
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';
import { AdminUsuarioController } from '../controllers/AdminUsuarioController.js';

const router = Router();

// Consultan y modifican la BD: se limitan por IP (CodeQL js/missing-rate-limiting). Ajustable con
// RATE_LIMIT_ADMIN_MAX; el contador está en memoria y se reinicia si Render reinicia el servicio.
const limiteAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_ADMIN_MAX) || 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.', code: 'RATE_LIMITED' },
});

router.use(limiteAdmin, authenticate, requireRole('administrador'));

/** @brief CA-23.1: lista y busca usuarios. GET /api/v1/admin/users */
router.get('/users', AdminUsuarioController.listar);

/** @brief CA-23.2: cambia el rol. PATCH /api/v1/admin/users/:id/role */
router.patch('/users/:id/role', AdminUsuarioController.cambiarRol);

/** @brief CA-23.2: activa o desactiva la cuenta. PATCH /api/v1/admin/users/:id/status */
router.patch('/users/:id/status', AdminUsuarioController.cambiarEstado);

export default router;