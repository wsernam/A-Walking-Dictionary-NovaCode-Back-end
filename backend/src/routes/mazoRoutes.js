// Rutas REST del recurso Mazo.

import { Router } from 'express';
import { MazoController } from '../controllers/MazoController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', MazoController.crear);

router.get('/', MazoController.listar);
router.get('/:id', MazoController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', MazoController.actualizar);

// CA-1.1.3: cambio de estado del mazo (ej. abierto -> cerrado)
// TODO: agregar validationMiddleware aquí cuando esté implementado
router.patch('/:id/estado', MazoController.actualizarEstado);

router.delete('/:id', MazoController.eliminar);

export default router;
