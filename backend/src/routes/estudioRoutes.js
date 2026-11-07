/**
 * @file Rutas REST de HU-4.1 (estudio con repetición espaciada SM-2), montadas en app.js bajo
 * el prefijo /api/v1/study.
 */

import { Router } from 'express';
import { EstudioController } from '../controllers/EstudioController.js';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';

const router = Router();

/**
 * HU-4.1 (CA-4.1.1): inicia una sesión de repaso con las tarjetas del estudiante.
 * POST /api/v1/study/review-session
 * Auditoría OWASP H-03 (A01): exige JWT y rol "estudiante". La inscripción del body se verifica
 * contra el usuario del token en EstudioController, no aquí.
 */
router.post('/review-session', authenticate, requireRole('estudiante'), EstudioController.iniciarSesion);

/**
 * HU-4.1 (CA-4.1.2): registra la valoración de una tarjeta y recalcula SM-2.
 * POST /api/v1/study/review-session/review. Mismas restricciones que la ruta anterior.
 */
router.post('/review-session/review', authenticate, requireRole('estudiante'), EstudioController.registrarValoracion);

export default router;