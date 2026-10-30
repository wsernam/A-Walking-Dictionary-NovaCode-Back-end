import { Router } from 'express';
import { authenticate } from '../middleware/autenticacionMiddleware.js';
import { ReporteEstudioController } from '../controllers/ReporteEstudioController.js';

const router = Router();

// HU-019: docente (todos sus estudiantes) y estudiante (solo el propio repaso). No lleva
// requireRole: la regla de acceso por rol y por student_id está en ReporteEstudioService (CA-19.3).
router.get('/study-mode/export-pdf', authenticate, ReporteEstudioController.exportarPdf);

export default router;