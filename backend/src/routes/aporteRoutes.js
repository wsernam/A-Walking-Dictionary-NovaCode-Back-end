/**
 * @file Rutas REST del recurso Aporte, montadas en app.js bajo el prefijo /api/v1/aportes.
 *
 * Todas exigen JWT (authenticate); las de curaduría y las que modifican/borran aportes exigen
 * además rol "docente", igual que tarjetaRoutes.js. Las coautorías solo se aprueban
 * (PATCH /:id/approve); ya no existe el rechazo de coautorías.
 */

import { Router } from 'express';
import { AporteController } from '../controllers/AporteController.js';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';

const router = Router();

/**
 * Lista los aportes pendientes de revisión (curaduría de coautorías).
 * GET /api/v1/aportes/pending. Solo docente.
 * @note Va antes de '/:id' para que "pending" no se interprete como id.
 */
router.get('/pending', authenticate, requireRole('docente'), AporteController.listarPendientes);

/** Crea un aporte (CRUD genérico). POST /api/v1/aportes. Cualquier rol con sesión. */
// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', authenticate, AporteController.crear);

/** Lista todos los aportes. GET /api/v1/aportes. Cualquier rol con sesión. */
router.get('/', authenticate, AporteController.listar);

/** Consulta un aporte por su id_aporte. GET /api/v1/aportes/:id. Cualquier rol con sesión. */
router.get('/:id', authenticate, AporteController.obtenerPorId);

/** Actualiza un aporte (CRUD genérico). PUT /api/v1/aportes/:id. Solo docente. */
// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', authenticate, requireRole('docente'), AporteController.actualizar);

/** Aprueba una coautoría. PATCH /api/v1/aportes/:id/approve. Solo docente. */
router.patch('/:id/approve', authenticate, requireRole('docente'), AporteController.aprobar);

/** Elimina un aporte. DELETE /api/v1/aportes/:id. Solo docente. */
router.delete('/:id', authenticate, requireRole('docente'), AporteController.eliminar);

export default router;