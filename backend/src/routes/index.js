// Agrupa y expone los 13 routers de recursos (uno por entidad del DER) bajo un único router raíz.

import { Router } from 'express';
import usuarioRoutes from './usuarioRoutes.js';
import cursoRoutes from './cursoRoutes.js';
import inscripcionRoutes from './inscripcionRoutes.js';
import mazoRoutes from './mazoRoutes.js';
import tarjetaRoutes from './tarjetaRoutes.js';
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
router.use('/mazos', mazoRoutes);
router.use('/tarjetas', tarjetaRoutes);
router.use('/aportes', aporteRoutes);
router.use('/etiquetas-contexto', etiquetaContextoRoutes);
router.use('/progresos-estudio', progresoEstudioRoutes);
router.use('/quizzes', quizRoutes);
router.use('/quiz-mazo', quizMazoRoutes);
router.use('/preguntas-quiz', preguntaQuizRoutes);
router.use('/resultados-quiz', resultadoQuizRoutes);
router.use('/respuestas-quiz', respuestaQuizRoutes);

export default router;
