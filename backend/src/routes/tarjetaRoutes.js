// Rutas REST del recurso Tarjeta.

import { Router } from 'express';
import { TarjetaController } from '../controllers/TarjetaController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', TarjetaController.crear);

router.get('/', TarjetaController.listar);
router.get('/:id', TarjetaController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', TarjetaController.actualizar);

router.delete('/:id', TarjetaController.eliminar);

export default router;
