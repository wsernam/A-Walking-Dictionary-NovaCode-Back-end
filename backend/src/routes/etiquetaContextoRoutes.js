/**
 * @file Rutas REST (CRUD genérico) del recurso EtiquetaContexto: POST /, GET /, GET /:id,
 * PUT /:id, DELETE /:id.
 *
 * @warning Este router NO está montado en app.js (solo lo importa routes/index.js, que tampoco se
 * usa) y sus rutas no llevan authenticate ni requireRole. Si algún día se monta, hay que
 * protegerlas antes. Las etiquetas de contexto se asignan con PUT /api/v1/cards/:id/context (HU-2.2).
 */

import { Router } from 'express';
import { EtiquetaContextoController } from '../controllers/EtiquetaContextoController.js';

const router = Router();

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', EtiquetaContextoController.crear);

router.get('/', EtiquetaContextoController.listar);
router.get('/:id', EtiquetaContextoController.obtenerPorId);

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', EtiquetaContextoController.actualizar);

router.delete('/:id', EtiquetaContextoController.eliminar);

export default router;
