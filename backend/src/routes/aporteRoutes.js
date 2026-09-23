// Rutas REST del recurso Aporte.
// Todas exigen JWT (authenticate); las de curaduría y las que modifican/borran aportes exigen
// además rol "docente", igual que cardRoutes.js. El rechazo de coautorías sigue en
// DELETE /api/v1/contributions/:id (AporteController.rechazar).

import { Router } from 'express';
import { AporteController } from '../controllers/AporteController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Va antes de '/:id' para que "pending" no se interprete como id.
router.get('/pending', authenticate, requireRole('docente'), AporteController.listarPendientes);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', authenticate, AporteController.crear);

router.get('/', authenticate, AporteController.listar);
router.get('/:id', authenticate, AporteController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', authenticate, requireRole('docente'), AporteController.actualizar);

router.patch('/:id/approve', authenticate, requireRole('docente'), AporteController.aprobar);

router.delete('/:id', authenticate, requireRole('docente'), AporteController.eliminar);

export default router;
