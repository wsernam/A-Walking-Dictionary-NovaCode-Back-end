/**
 * @file analyticsRoutes.js
 * @brief Rutas REST de analíticas de participación (HU-2.3). Montado en app.js bajo el
 * prefijo /api/v1/teacher/analytics (mismo path que las "Tareas Técnicas" del backlog).
 */

import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController.js';

const router = Router();

/**
 * @brief CA-2.3.1/CA-2.3.2: resumen de participación por mazo.
 * GET /api/v1/teacher/analytics/deck/:id
 * GET /api/v1/teacher/analytics/deck/:id?sinAportes=true
 */
router.get('/deck/:id', AnalyticsController.resumenPorMazo);

export default router;
