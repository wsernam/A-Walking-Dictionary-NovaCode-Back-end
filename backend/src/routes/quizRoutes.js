/**
 * @file quizRoutes.js
 * @brief Rutas REST del recurso Quiz, montadas en app.js bajo el prefijo /api/v1/quizzes.
 * Combina los endpoints de negocio de HE-03 (generar, preguntas, submit, export-pdf) con el CRUD
 * genérico de QuizController/ResultadoQuizController.
 */

import { Router } from 'express';
import { QuizController } from '../controllers/QuizController.js';
import { ResultadoQuizController } from '../controllers/ResultadoQuizController.js';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';

const router = Router();

/**
 * @brief HU-3.1 (CA-3.1.1, CA-3.1.2, CA-3.1.3): genera un quiz acumulativo a partir de las
 * tarjetas revisado_docente de los mazos elegidos. POST /api/v1/quizzes/generate
 * Solo docente (CA-5.4.2).
 */
router.post('/generate', authenticate, requireRole('docente'), QuizController.generar);

/**
 * @brief Crea un quiz nuevo (CRUD genérico). POST /api/v1/quizzes
 * @note No viene de un CA específico; para la generación de HU-3.1 usar POST /generate.
 */
// TODO: agregar validacionMiddleware aquí cuando esté implementado
// Solo docente: sin token cualquiera podía crear quices (contrato-quiz-estudiante.md, 2.3).
router.post('/', authenticate, requireRole('docente'), QuizController.crear);

/**
 * @brief Lista todos los quices, cada uno con estado_efectivo calculado (CA-3.1.3).
 * GET /api/v1/quizzes. Cualquier rol con sesión; el estudiante usa GET /mine.
 */
router.get('/', authenticate, QuizController.listar);

/**
 * @brief HU-3.2: quices de los cursos donde el estudiante tiene inscripción activa, con su
 * resultado si ya los envió. GET /api/v1/quizzes/mine
 * @note Endpoint adicional pedido por el frontend (contrato-quiz-estudiante.md, 2.1). Va antes
 * de GET /:id para que Express no tome "mine" como un id.
 */
router.get('/mine', authenticate, requireRole('estudiante'), QuizController.listarMios);

/**
 * @brief Busca un quiz por su id_quiz, con estado_efectivo calculado (CA-3.1.3).
 * GET /api/v1/quizzes/:id
 */
router.get('/:id', authenticate, QuizController.obtenerPorId);

/**
 * @brief HU-3.3 (CA-3.3.2): exporta el quiz a PDF con hoja de preguntas y hoja de respuestas
 * separada. GET /api/v1/quizzes/:id/export-pdf
 * @note Endpoint adicional aprobado por el equipo (D-06, 2026-10-07): el backlog solo lista
 * export-pdf de mazos. Solo docente (D-07): el PDF incluye la clave de respuestas.
 */
router.get('/:id/export-pdf', authenticate, requireRole('docente'), QuizController.exportarPdf);

/**
 * @brief HU-3.2: preguntas del quiz para el estudiante, sin respuesta_correcta.
 * GET /api/v1/quizzes/:id/preguntas
 * @note Endpoint adicional (no listado en el backlog), aprobado por el equipo: sin él no hay
 * forma de pintar el formulario del quiz. Solo estudiante inscrito en el curso del quiz.
 */
router.get('/:id/preguntas', authenticate, requireRole('estudiante'), QuizController.obtenerPreguntas);

/**
 * @brief HU-3.2 (CA-3.2.1, CA-3.2.2, CA-3.2.3): registra las respuestas de un estudiante y
 * calcula su calificación. POST /api/v1/quizzes/:id/submit
 * Solo estudiante (CA-5.4.2); el estudiante_id sale del JWT.
 */
router.post('/:id/submit', authenticate, requireRole('estudiante'), ResultadoQuizController.submit);

/**
 * @brief CA-3.2.3: resultado previo del estudiante (resultado, respuestas y preguntas sin
 * respuesta_correcta), aunque el quiz esté cerrado. GET /api/v1/quizzes/:id/result
 * @note Endpoint adicional pedido por el frontend (contrato-quiz-estudiante.md, 2.2). Solo
 * estudiante inscrito en el curso del quiz.
 */
router.get('/:id/result', authenticate, requireRole('estudiante'), QuizController.obtenerResultado);

/**
 * @brief Reemplaza todos los campos de un quiz existente (CRUD genérico).
 * PUT /api/v1/quizzes/:id
 */
// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', authenticate, requireRole('docente'), QuizController.actualizar);

/**
 * @brief Elimina un quiz por su id_quiz (CRUD genérico). DELETE /api/v1/quizzes/:id
 * @note Falla con 500 (violación de foreign key) si el quiz todavía tiene filas asociadas en
 * quiz_mazo, pregunta_quiz o resultado_quiz.
 */
router.delete('/:id', authenticate, requireRole('docente'), QuizController.eliminar);

export default router;
