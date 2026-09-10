/**
 * @file cardRoutes.js
 * @brief Rutas REST de HE-01 para "cards" (tarjetas) que no están anidadas bajo un deck
 * específico. Montado en app.js bajo el prefijo /api/v1/cards.
 */

import { Router } from 'express';
import { TarjetaController } from '../controllers/TarjetaController.js';

const router = Router();

/**
 * @brief HU-1.3: verifica si una palabra ya existe en un mazo, SIN crear ni modificar nada.
 * POST /api/v1/cards/check-duplicate
 *
 * Cubre CA-1.3.4: el frontend llama este endpoint antes de que el estudiante confirme el
 * formulario, para mostrarle el aviso de coautoría/acepción nueva.
 */
router.post('/check-duplicate', TarjetaController.checkDuplicate);

export default router;
