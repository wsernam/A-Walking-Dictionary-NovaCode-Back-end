/**
 * @file contributionRoutes.js
 * @brief Ruta REST de Aporte ("contribution"), requerida por el flujo de gestión de
 * coautorías/acepciones nuevas de la docente. Montada en app.js bajo el prefijo
 * /api/v1/contributions.
 *
 * Nombre de URL en inglés por consistencia con decks/cards/courses; "aporte" en el DER y en el
 * resto del código sigue en español.
 */

import { Router } from 'express';
import { AporteController } from '../controllers/AporteController.js';

const router = Router();

/**
 * @brief Rechaza (elimina) un aporte de coautoría o acepción nueva.
 * DELETE /api/v1/contributions/:id
 *
 * Flujo de Coautoría (Aportes Duplicados): esta es la ÚNICA acción de "Rechazar" del sistema.
 * Solo aplica a aportes con tipo_aporte 'coautoria' o 'acepcion_nueva' — el controlador
 * responde 403 si se intenta rechazar un aporte 'creada' (esos se manejan en el flujo de
 * revisión individual de la tarjeta, ver PATCH /api/v1/cards/:id/approve).
 */
router.delete('/:id', AporteController.rechazar);

export default router;
