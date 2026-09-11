// Rutas REST del recurso EtiquetaContexto.

import { Router } from 'express';
import { EtiquetaContextoController } from '../controllers/EtiquetaContextoController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', EtiquetaContextoController.crear);

router.get('/', EtiquetaContextoController.listar);
router.get('/:id', EtiquetaContextoController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', EtiquetaContextoController.actualizar);

router.delete('/:id', EtiquetaContextoController.eliminar);

export default router;
