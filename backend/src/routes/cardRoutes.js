// Rutas REST de HE-01 para "cards" (tarjetas) que no están anidadas bajo un deck específico.

import { Router } from 'express';
import { TarjetaController } from '../controllers/TarjetaController.js';

const router = Router();

// HU-1.3: POST /api/v1/cards/check-duplicate (CA-1.3.4)
// Solo consulta si la palabra ya existe en el mazo; no crea ni modifica nada.
router.post('/check-duplicate', TarjetaController.checkDuplicate);

// HU-2.1: PATCH /api/v1/cards/:id/approve (CA-2.1.2 aprobar, CA-2.1.3 rechazar)
router.patch('/:id/approve', TarjetaController.aprobar);

// HU-2.2: PUT /api/v1/cards/:id/context (CA-2.2.1 — registro y variante dialectal)
router.put('/:id/context', TarjetaController.asignarContexto);

// HU-2.2 (CA-2.2.3): detalle de la tarjeta con sus etiquetas de contexto, para el estudiante.
router.get('/:id', TarjetaController.obtenerPorId);

export default router;
