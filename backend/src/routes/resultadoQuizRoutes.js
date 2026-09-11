// Rutas REST del recurso ResultadoQuiz.

import { Router } from 'express';
import { ResultadoQuizController } from '../controllers/ResultadoQuizController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', ResultadoQuizController.crear);

router.get('/', ResultadoQuizController.listar);
router.get('/:id', ResultadoQuizController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', ResultadoQuizController.actualizar);

router.delete('/:id', ResultadoQuizController.eliminar);

export default router;
