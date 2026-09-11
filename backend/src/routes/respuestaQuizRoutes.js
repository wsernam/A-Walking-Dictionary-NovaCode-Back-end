// Rutas REST del recurso RespuestaQuiz.

import { Router } from 'express';
import { RespuestaQuizController } from '../controllers/RespuestaQuizController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', RespuestaQuizController.crear);

router.get('/', RespuestaQuizController.listar);
router.get('/:id', RespuestaQuizController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', RespuestaQuizController.actualizar);

router.delete('/:id', RespuestaQuizController.eliminar);

export default router;
