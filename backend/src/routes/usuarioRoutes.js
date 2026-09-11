// Rutas REST del recurso Usuario.

import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', UsuarioController.crear);

router.get('/', UsuarioController.listar);
router.get('/:id', UsuarioController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', UsuarioController.actualizar);

router.delete('/:id', UsuarioController.eliminar);

export default router;
