// Rutas REST del recurso Aporte.
// Todas exigen JWT (authenticate); las de curaduría y las que modifican/borran aportes exigen
// además rol "docente", igual que tarjetaRoutes.js. El rechazo de coautorías sigue en
// DELETE /api/v1/contributions/:id (AporteController.rechazar), expuesto abajo como el router
// nombrado rechazoAporteRoutes porque se monta en app.js bajo otro prefijo.

import { Router } from 'express';
import { AporteController } from '../controllers/AporteController.js';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';

const router = Router();

// Va antes de '/:id' para que "pending" no se interprete como id.
router.get('/pending', authenticate, requireRole('docente'), AporteController.listarPendientes);

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', authenticate, AporteController.crear);

router.get('/', authenticate, AporteController.listar);
router.get('/:id', authenticate, AporteController.obtenerPorId);

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', authenticate, requireRole('docente'), AporteController.actualizar);

router.patch('/:id/approve', authenticate, requireRole('docente'), AporteController.aprobar);

router.delete('/:id', authenticate, requireRole('docente'), AporteController.eliminar);

export default router;

/**
 * @brief Router de rechazo de aportes, montado en app.js bajo el prefijo /api/v1/contributions.
 * URL en inglés por consistencia con decks/cards/courses.
 */
export const rechazoAporteRoutes = Router();

/**
 * @brief Rechaza (elimina) un aporte de coautoría o acepción nueva.
 * DELETE /api/v1/contributions/:id
 *
 * Flujo de Coautoría (Aportes Duplicados): esta es la ÚNICA acción de "Rechazar" del sistema.
 * Solo aplica a aportes con tipo_aporte 'coautoria' o 'acepcion_nueva' — el controlador
 * responde 403 si se intenta rechazar un aporte 'creada' (esos se manejan en el flujo de
 * revisión individual de la tarjeta, ver PATCH /api/v1/cards/:id/approve). Requiere sesión
 * iniciada; no está documentado como acción docente-only, así que no se exige rol específico.
 */
rechazoAporteRoutes.delete('/:id', authenticate, AporteController.rechazar);
