/**
 * @file progresoEstudioRoutes.js
 * @brief Rutas REST (CRUD genérico) del recurso ProgresoEstudio: POST /, GET /, GET /:id,
 * PUT /:id, DELETE /:id.
 *
 * @warning Este router NO está montado en app.js (solo lo importa routes/index.js, que tampoco se
 * usa) y sus rutas no llevan authenticate ni requireRole. Si algún día se monta, hay que
 * protegerlas antes. El progreso SM-2 se registra con las rutas de estudioRoutes.js
 * (/api/v1/study/review-session).
 */

import { Router } from 'express';
import { ProgresoEstudioController } from '../controllers/ProgresoEstudioController.js';

const router = Router();

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', ProgresoEstudioController.crear);

router.get('/', ProgresoEstudioController.listar);
router.get('/:id', ProgresoEstudioController.obtenerPorId);

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', ProgresoEstudioController.actualizar);

router.delete('/:id', ProgresoEstudioController.eliminar);

export default router;
