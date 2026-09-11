// Rutas REST del recurso Curso.

import { Router } from 'express';
import { CursoController } from '../controllers/CursoController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', CursoController.crear);

router.get('/', CursoController.listar);
router.get('/:id', CursoController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', CursoController.actualizar);

router.delete('/:id', CursoController.eliminar);

export default router;
