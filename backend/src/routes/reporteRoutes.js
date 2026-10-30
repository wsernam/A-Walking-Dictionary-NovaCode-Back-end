import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/autenticacionMiddleware.js';
import { ReporteEstudioController } from '../controllers/ReporteEstudioController.js';

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

export default router;