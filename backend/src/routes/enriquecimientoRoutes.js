/**
 * @file enriquecimientoRoutes.js
 * @brief Rutas REST para las sugerencias léxicas mediante WordNet.
 *
 * HU-011: Sugerencias léxicas (WordNet)
 *
 * La URL "enrichment/family" se mantiene en inglés porque
 * es el endpoint definido en la historia de usuario.
 */

import { Router } from 'express';
import { EnriquecimientoController } from '../controllers/EnriquecimientoController.js';

const router = Router();

/**
 * HU-011
 *
 * GET /api/v1/enrichment/family/:word
 *
 * Obtiene términos relacionados con una palabra mediante
 * WordNet 3.1 y la caché wordnet_cache.
 */
router.get(
  '/family/:word',
  EnriquecimientoController.obtenerFamilia
);

export default router;