/**
 * @file respuestaQuizRoutes.js
 * @brief Rutas REST (CRUD genérico) del recurso RespuestaQuiz: POST /, GET /, GET /:id,
 * PUT /:id, DELETE /:id.
 *
 * @warning Este router NO está montado en app.js (solo lo importa routes/index.js, que tampoco se
 * usa) y sus rutas no llevan authenticate ni requireRole. Si algún día se monta, hay que
 * protegerlas antes. Las respuestas se registran al enviar el quiz con
 * POST /api/v1/quizzes/:id/submit (HU-3.2).
 */

import { Router } from 'express';
import { RespuestaQuizController } from '../controllers/RespuestaQuizController.js';

const router = Router();

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', RespuestaQuizController.crear);

router.get('/', RespuestaQuizController.listar);
router.get('/:id', RespuestaQuizController.obtenerPorId);

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', RespuestaQuizController.actualizar);

router.delete('/:id', RespuestaQuizController.eliminar);

export default router;
