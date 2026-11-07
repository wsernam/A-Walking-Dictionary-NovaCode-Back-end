/**
 * @file Rutas REST (CRUD genérico) del recurso PreguntaQuiz: POST /, GET /, GET /:id,
 * PUT /:id, DELETE /:id.
 *
 * @warning Este router NO está montado en app.js (solo lo importa routes/index.js, que tampoco se
 * usa) y sus rutas no llevan authenticate ni requireRole. Si algún día se monta, hay que
 * protegerlas antes. Las preguntas del estudiante salen de GET /api/v1/quizzes/:id/preguntas.
 */

import { Router } from 'express';
import { PreguntaQuizController } from '../controllers/PreguntaQuizController.js';

const router = Router();

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', PreguntaQuizController.crear);

router.get('/', PreguntaQuizController.listar);
router.get('/:id', PreguntaQuizController.obtenerPorId);

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', PreguntaQuizController.actualizar);

router.delete('/:id', PreguntaQuizController.eliminar);

export default router;
