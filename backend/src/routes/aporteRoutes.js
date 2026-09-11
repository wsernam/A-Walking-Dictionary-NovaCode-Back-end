// Rutas REST del recurso Aporte.

import { Router } from 'express';
import { AporteController } from '../controllers/AporteController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', AporteController.crear);

router.get('/', AporteController.listar);
router.get('/:id', AporteController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', AporteController.actualizar);

router.delete('/:id', AporteController.eliminar);

export default router;
