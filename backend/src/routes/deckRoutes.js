// Rutas REST de HE-01 para "decks" (mazos) y "cards" (tarjetas) anidadas bajo un deck.
// Nombres de URL en inglés por acuerdo con el equipo; los campos del body siguen en español,
// alineados al DER (mazo_id, palabra, traduccion, definicion, etc.).

import { Router } from 'express';
import { MazoController } from '../controllers/MazoController.js';
import { TarjetaController } from '../controllers/TarjetaController.js';

const router = Router();

// HU-1.1: POST /api/v1/decks (CA-1.1.1, CA-1.1.2)
router.post('/', MazoController.crear);

// Listar decks / buscar un deck por id (no vienen de un CA específico, son consulta de apoyo
// para probar/usar lo ya creado con POST /decks).
router.get('/', MazoController.listar);
router.get('/:id', MazoController.obtenerPorId);

// CA-1.1.3: cambia el estado del mazo (ej. a "cerrado"), lo que inhabilita la recepción
// de nuevos aportes para ese mazo (esa verificación vive en TarjetaController.crear).
router.patch('/:id/estado', MazoController.actualizarEstado);

// HU-1.2 / HU-1.3: POST /api/v1/decks/:id/cards (CA-1.2.1, CA-1.2.2, CA-1.2.3, CA-1.3.1-CA-1.3.4)
router.post('/:id/cards', TarjetaController.crear);

// Eliminar un deck (no viene de un CA específico, es consulta/limpieza de apoyo para pruebas).
router.delete('/:id', MazoController.eliminar);

export default router;
