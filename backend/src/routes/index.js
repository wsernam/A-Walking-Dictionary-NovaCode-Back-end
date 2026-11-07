/**
 * @file Agrupa los routers de recursos genéricos (CRUD) que aún no forman parte de ningún flujo
 * de negocio activo.
 *
 * @note Este archivo NO se importa desde app.js por ahora; queda como referencia para cuando se
 * decida exponer estas 11 entidades. Mazo y Tarjeta ya no están aquí: su creación vive en
 * mazoRoutes.js y tarjetaRoutes.js, montados directamente en app.js.
 */

import { Router } from 'express';
import usuarioRoutes from './usuarioRoutes.js';
import cursoRoutes from './cursoRoutes.js';
import inscripcionRoutes from './inscripcionRoutes.js';
import aporteRoutes from './aporteRoutes.js';
import etiquetaContextoRoutes from './etiquetaContextoRoutes.js';
import progresoEstudioRoutes from './progresoEstudioRoutes.js';
import quizRoutes from './quizRoutes.js';
import quizMazoRoutes from './quizMazoRoutes.js';
import preguntaQuizRoutes from './preguntaQuizRoutes.js';
import resultadoQuizRoutes from './resultadoQuizRoutes.js';
import respuestaQuizRoutes from './respuestaQuizRoutes.js';

const router = Router();

router.use('/usuarios', usuarioRoutes);
router.use('/cursos', cursoRoutes);
router.use('/inscripciones', inscripcionRoutes);
router.use('/aportes', aporteRoutes);
router.use('/etiquetas-contexto', etiquetaContextoRoutes);
router.use('/progresos-estudio', progresoEstudioRoutes);
router.use('/quizzes', quizRoutes);
router.use('/quiz-mazo', quizMazoRoutes);
router.use('/preguntas-quiz', preguntaQuizRoutes);
router.use('/resultados-quiz', resultadoQuizRoutes);
router.use('/respuestas-quiz', respuestaQuizRoutes);

export default router;
