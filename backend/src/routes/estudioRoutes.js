import { Router } from 'express';
import { EstudioController } from '../controllers/EstudioController.js';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';

const router = Router();

// Auditoría OWASP H-03 (A01): las rutas de estudio exigen JWT y rol "estudiante". La inscripción
// del body se verifica contra el usuario del token en EstudioController, no aquí.
router.post('/review-session', authenticate, requireRole('estudiante'), EstudioController.iniciarSesion);

router.post('/review-session/review', authenticate, requireRole('estudiante'), EstudioController.registrarValoracion);

export default router;