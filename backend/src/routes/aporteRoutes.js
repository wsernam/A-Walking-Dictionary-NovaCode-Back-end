/**
 * @file aporteRoutes.js
 * @brief Rutas REST del recurso Aporte, montadas en app.js bajo el prefijo /api/v1/aportes.
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
 * @brief Lista los aportes pendientes de revisión (curaduría de coautorías).
 * GET /api/v1/aportes/pending. Solo docente.
 * @note Va antes de '/:id' para que "pending" no se interprete como id.
 */
router.get('/pending', authenticate, requireRole('docente'), AporteController.listarPendientes);

/** @brief Crea un aporte (CRUD genérico). POST /api/v1/aportes. Sólo docente o estudiante. */
// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', authenticate, requireRole('docente', 'estudiante'), AporteController.crear);

/** @brief Lista todos los aportes. GET /api/v1/aportes.Sólo docente o estudiante. */
router.get('/', authenticate, requireRole('docente', 'estudiante'), AporteController.listar);

/** @brief Consulta un aporte por su id_aporte. GET /api/v1/aportes/:id. Sólo docente o estudiante. */
router.get('/:id', authenticate, requireRole('docente', 'estudiante'), AporteController.obtenerPorId);

/** @brief Actualiza un aporte (CRUD genérico). PUT /api/v1/aportes/:id. Solo docente. */
// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', authenticate, requireRole('docente'), AporteController.actualizar);

/** @brief Aprueba una coautoría. PATCH /api/v1/aportes/:id/approve. Solo docente. */
router.patch('/:id/approve', authenticate, requireRole('docente'), AporteController.aprobar);

/** @brief Elimina un aporte. DELETE /api/v1/aportes/:id. Solo docente. */
router.delete('/:id', authenticate, requireRole('docente'), AporteController.eliminar);

export default router;