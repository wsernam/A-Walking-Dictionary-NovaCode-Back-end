/**
 * @file Rutas REST (CRUD genérico) del recurso ResultadoQuiz: POST /, GET /, GET /:id,
 * PUT /:id, DELETE /:id.
 *
 * @warning Este router NO está montado en app.js (solo lo importa routes/index.js, que tampoco se
 * usa) y sus rutas no llevan authenticate ni requireRole. Si algún día se monta, hay que
 * protegerlas antes. El resultado se registra con POST /api/v1/quizzes/:id/submit y se consulta
 * con GET /api/v1/quizzes/:id/result (HU-3.2).
 */

import { Router } from 'express';
import { ResultadoQuizController } from '../controllers/ResultadoQuizController.js';

const router = Router();

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', ResultadoQuizController.crear);

router.get('/', ResultadoQuizController.listar);
router.get('/:id', ResultadoQuizController.obtenerPorId);

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', ResultadoQuizController.actualizar);

router.delete('/:id', ResultadoQuizController.eliminar);

export default router;
