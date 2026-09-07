// Rutas REST de HE-01 para "cards" (tarjetas) que no están anidadas bajo un deck específico.

import { Router } from 'express';
import { TarjetaController } from '../controllers/TarjetaController.js';

const router = Router();

// HU-1.3: POST /api/v1/cards/check-duplicate (CA-1.3.4)
// Solo consulta si la palabra ya existe en el mazo; no crea ni modifica nada.
router.post('/check-duplicate', TarjetaController.checkDuplicate);

export default router;
