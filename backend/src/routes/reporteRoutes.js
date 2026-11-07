/**
 * @file reporteRoutes.js
 * @brief Rutas REST de los reportes en PDF (HU-018, HU-019, HU-020, HU-021), montadas en app.js bajo el
 * prefijo /api/v1/reports. Las cuatro comparten el límite de peticiones por IP.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';
import { ReporteEstudioController } from '../controllers/ReporteEstudioController.js';
import { ReporteProgresoController } from '../controllers/ReporteProgresoController.js';
import { ReporteCursoController } from '../controllers/ReporteCursoController.js';
import { ReporteResultadosQuizController } from '../controllers/ReporteResultadosQuizController.js';

const router = Router();

// Generar el PDF consulta la BD y arma el documento en memoria, por eso se limitan las
// peticiones por IP (CodeQL js/missing-rate-limiting). El valor se puede ajustar con la variable
// de entorno RATE_LIMIT_REPORTES_MAX sin cambiar el código. El contador está en memoria y se
// reinicia si Render reinicia el servicio. Cuentan todas las peticiones, no solo las fallidas.
const limiteReportes = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_REPORTES_MAX) || 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de reportes. Intenta de nuevo en unos minutos.', code: 'RATE_LIMITED' },
});

/**
 * @brief HU-019: reporte del modo de estudio en PDF. GET /api/v1/reports/study-mode/export-pdf
 * Docente (todos sus estudiantes) y estudiante (solo el propio repaso). No lleva requireRole: la
 * regla de acceso por rol y por student_id está en ReporteEstudioService (CA-19.3).
 */
router.get('/study-mode/export-pdf', limiteReportes, authenticate, ReporteEstudioController.exportarPdf);

/**
 * @brief HU-018: reporte de progreso individual en PDF.
 * GET /api/v1/reports/students/:id/progress/export-pdf
 * La docente descarga el progreso de cualquier estudiante de sus cursos y el estudiante solo el
 * suyo. Igual que HU-019, no lleva requireRole: la regla de acceso (CA-18.3) está en
 * ReporteProgresoService y responde 403 antes de consultar la BD.
 */
router.get('/students/:id/progress/export-pdf', limiteReportes, authenticate, ReporteProgresoController.exportarPdf);

/**
 * @brief HU-020: reporte de estudiantes del curso en PDF.
 * GET /api/v1/reports/students/export-pdf?curso_id=
 * La docente descarga el reporte consolidado de los estudiantes de UN curso suyo. A diferencia de
 * HU-018 y HU-019, aquí sí va requireRole('docente'): ningún otro rol puede pedirlo (CA-20.3) y el
 * contrato del front espera el mismo 403 de las demás rutas de docente. Que el curso sea de la
 * docente del JWT lo comprueba ReporteCursoService (403 si no).
 */
router.get('/students/export-pdf', limiteReportes, authenticate, requireRole('docente'), ReporteCursoController.exportarPdf);

/**
 * @brief HU-021 (CA-21.3): reporte de resultados por quiz en PDF.
 * GET /api/v1/reports/quizzes/:id/results/export-pdf
 * Solo docente. Además, ReporteResultadosQuizService exige que el quiz sea de un curso de la
 * docente que inicia sesión.
 */
router.get(
  '/quizzes/:id/results/export-pdf',
  limiteReportes,
  authenticate,
  requireRole('docente'),
  ReporteResultadosQuizController.exportarPdf,
);

export default router;