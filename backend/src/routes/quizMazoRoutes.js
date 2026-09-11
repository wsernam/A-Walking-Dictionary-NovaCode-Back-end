// Rutas REST del recurso QuizMazo.
// Sin id propio (pk compuesta quiz_id + mazo_id): los identificadores van como dos
// parámetros de ruta (:quizId/:mazoId) en vez de un solo :id.

import { Router } from 'express';
import { QuizMazoController } from '../controllers/QuizMazoController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', QuizMazoController.crear);

router.get('/', QuizMazoController.listar);
router.get('/:quizId/:mazoId', QuizMazoController.obtenerPorQuizYMazo);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:quizId/:mazoId', QuizMazoController.actualizar);

router.delete('/:quizId/:mazoId', QuizMazoController.eliminar);

export default router;
