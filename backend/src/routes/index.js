// Agrupa y expone los routers de recursos genéricos que aún no forman parte de ningún flujo
// de negocio activo (Mazo y Tarjeta ya NO están aquí: su creación vive en deckRoutes.js/
// cardRoutes.js, montados directamente en app.js). Este archivo mismo tampoco se importa desde
// app.js por ahora; queda como referencia para cuando se decida exponer estas 11 entidades.

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
