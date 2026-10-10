
/**
 * @file diccionarioRoutes.js
 * @brief Rutas REST del Diccionario Global.
 *
 * HU-016 / HU-1.4
 *
 * Permite consultar el vocabulario aprobado
 * y obtener el detalle de una tarjeta.
 */

import { Router } from 'express';
import { DiccionarioController } from '../controllers/DiccionarioController.js';

const router = Router();

/**
 * @brief Consulta el vocabulario aprobado.
 *
 * CA-1.4.1: Consulta del vocabulario aprobado.
 * CA-1.4.2: Búsqueda de palabras.
 * CA-1.4.3: Ausencia de resultados.
 *
 * GET /api/v1/dictionary
 * GET /api/v1/dictionary?q=house
 */
router.get('/', DiccionarioController.listar);

/**
 * @brief Consulta el detalle de una tarjeta aprobada.
 *
 * GET /api/v1/dictionary/:card_id
 */
router.get('/:card_id', DiccionarioController.obtenerPorId);

export default router;
