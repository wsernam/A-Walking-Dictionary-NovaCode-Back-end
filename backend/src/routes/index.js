/**
 * @file index.js
 * @brief Agrupa los routers de recursos genéricos (CRUD) que aún no forman parte de ningún flujo
 * de negocio activo.
 *
 * @note Este archivo NO se importa desde app.js por ahora; queda como referencia para cuando se
 * decida exponer estas 6 entidades. Mazo y Tarjeta ya no están aquí: su creación vive en
 * mazoRoutes.js y tarjetaRoutes.js, montados directamente en app.js. Los routers CRUD de etiqueta
 * de contexto, pregunta de quiz, respuesta de quiz, progreso de estudio y quiz-mazo (y sus
 * controladores) se eliminaron el 2026-11-27: no cumplían ninguna función y no tenían autenticación.
 */

import { Router } from 'express';
import usuarioRoutes from './usuarioRoutes.js';
import cursoRoutes from './cursoRoutes.js';
import inscripcionRoutes from './inscripcionRoutes.js';
import aporteRoutes from './aporteRoutes.js';
import quizRoutes from './quizRoutes.js';
import resultadoQuizRoutes from './resultadoQuizRoutes.js';

const router = Router();

router.use('/usuarios', usuarioRoutes);
router.use('/cursos', cursoRoutes);
router.use('/inscripciones', inscripcionRoutes);
router.use('/aportes', aporteRoutes);
router.use('/quizzes', quizRoutes);
router.use('/resultados-quiz', resultadoQuizRoutes);

export default router;
