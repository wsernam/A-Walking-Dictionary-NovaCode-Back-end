/**
 * @file Rutas REST (CRUD genérico) del recurso QuizMazo: POST /, GET /,
 * GET /:quizId/:mazoId, PUT /:quizId/:mazoId, DELETE /:quizId/:mazoId.
 *
 * Sin id propio (pk compuesta quiz_id + mazo_id): los identificadores van como dos parámetros de
 * ruta (:quizId/:mazoId) en vez de un solo :id.
 *
 * @warning Este router NO está montado en app.js (solo lo importa routes/index.js, que tampoco se
 * usa) y sus rutas no llevan authenticate ni requireRole. Si algún día se monta, hay que
 * protegerlas antes. La relación quiz-mazo se crea al generar el quiz (POST /api/v1/quizzes/generate).
 */

import { Router } from 'express';
import { QuizMazoController } from '../controllers/QuizMazoController.js';

const router = Router();

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', QuizMazoController.crear);

router.get('/', QuizMazoController.listar);
router.get('/:quizId/:mazoId', QuizMazoController.obtenerPorQuizYMazo);

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:quizId/:mazoId', QuizMazoController.actualizar);

router.delete('/:quizId/:mazoId', QuizMazoController.eliminar);

export default router;
