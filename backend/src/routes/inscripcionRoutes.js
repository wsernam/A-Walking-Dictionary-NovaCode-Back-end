// Rutas REST del recurso Inscripcion.

import { Router } from 'express';
import { InscripcionController } from '../controllers/InscripcionController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', InscripcionController.crear);

router.get('/', InscripcionController.listar);
router.get('/:id', InscripcionController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', InscripcionController.actualizar);

router.delete('/:id', InscripcionController.eliminar);

export default router;
