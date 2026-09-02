// Rutas REST del recurso Quiz.

import { Router } from 'express';
import { QuizController } from '../controllers/QuizController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', QuizController.crear);

router.get('/', QuizController.listar);
router.get('/:id', QuizController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', QuizController.actualizar);

router.delete('/:id', QuizController.eliminar);

export default router;
