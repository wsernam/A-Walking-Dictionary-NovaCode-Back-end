// Rutas REST del recurso PreguntaQuiz.

import { Router } from 'express';
import { PreguntaQuizController } from '../controllers/PreguntaQuizController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', PreguntaQuizController.crear);

router.get('/', PreguntaQuizController.listar);
router.get('/:id', PreguntaQuizController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', PreguntaQuizController.actualizar);

router.delete('/:id', PreguntaQuizController.eliminar);

export default router;
