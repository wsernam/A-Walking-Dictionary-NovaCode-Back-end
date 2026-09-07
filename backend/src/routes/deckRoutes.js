// Rutas REST de HE-01 para "decks" (mazos) y "cards" (tarjetas) anidadas bajo un deck.
// Nombres de URL en inglés por acuerdo con el equipo; los campos del body siguen en español,
// alineados al DER (mazo_id, palabra, traduccion, definicion, etc.).

import { Router } from 'express';
import { MazoController } from '../controllers/MazoController.js';
import { TarjetaController } from '../controllers/TarjetaController.js';

const router = Router();

// HU-1.1: POST /api/v1/decks (CA-1.1.1, CA-1.1.2)
router.post('/', MazoController.crear);

// HU-1.2 / HU-1.3: POST /api/v1/decks/:id/cards (CA-1.2.1, CA-1.2.2, CA-1.2.3, CA-1.3.1-CA-1.3.4)
router.post('/:id/cards', TarjetaController.crear);

export default router;
