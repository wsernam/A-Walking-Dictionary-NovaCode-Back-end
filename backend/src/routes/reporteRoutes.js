import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';
import { ReporteEstudioController } from '../controllers/ReporteEstudioController.js';
import { ReporteProgresoController } from '../controllers/ReporteProgresoController.js';
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

// HU-019: docente (todos sus estudiantes) y estudiante (solo el propio repaso). No lleva
// requireRole: la regla de acceso por rol y por student_id está en ReporteEstudioService (CA-19.3).
router.get('/study-mode/export-pdf', limiteReportes, authenticate, ReporteEstudioController.exportarPdf);

// HU-018: la docente descarga el progreso de cualquier estudiante de sus cursos y el estudiante
// solo el suyo. Igual que HU-019, no lleva requireRole: la regla de acceso (CA-18.3) está en
// ReporteProgresoService y responde 403 antes de consultar la BD. Comparte el límite de peticiones.
router.get('/students/:id/progress/export-pdf', limiteReportes, authenticate, ReporteProgresoController.exportarPdf);

// HU-021 (CA-21.3): solo docente. Además, ReporteResultadosQuizService exige que el quiz sea de
// un curso de la docente que inicia sesión.
router.get(
  '/quizzes/:id/results/export-pdf',
  limiteReportes,
  authenticate,
  requireRole('docente'),
  ReporteResultadosQuizController.exportarPdf,
);

export default router;