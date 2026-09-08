// Rutas REST de HE-02 para la docente. Se montan en app.js bajo /api/v1/teacher.
// Nombres de URL en inglés por acuerdo con el equipo (igual que decks/cards); los campos del
// body y de la respuesta siguen en español, alineados al DER.

import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController.js';

const router = Router();

// HU-2.3: GET /api/v1/teacher/analytics/deck/:id (CA-2.3.1, CA-2.3.2, CA-2.3.3)
// Filtro opcional CA-2.3.2: ?filtro=sin_aportes
router.get('/analytics/deck/:id', AnalyticsController.analiticasPorMazo);

export default router;
