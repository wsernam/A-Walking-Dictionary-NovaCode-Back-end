// Rutas REST del recurso ProgresoEstudio.

import { Router } from 'express';
import { ProgresoEstudioController } from '../controllers/ProgresoEstudioController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', ProgresoEstudioController.crear);

router.get('/', ProgresoEstudioController.listar);
router.get('/:id', ProgresoEstudioController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', ProgresoEstudioController.actualizar);

router.delete('/:id', ProgresoEstudioController.eliminar);

export default router;
