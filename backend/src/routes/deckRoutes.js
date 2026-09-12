/**
 * @file deckRoutes.js
 * @brief Rutas REST de HE-01 para "decks" (mazos) y "cards" (tarjetas) anidadas bajo un deck.
 *
 * Nombres de URL en inglés por acuerdo con el equipo; los campos del body siguen en español,
 * alineados al DER (mazo_id, palabra, traduccion, definicion, etc.). Montado en app.js bajo
 * el prefijo /api/v1/decks.
 */

import { Router } from 'express';
import { MazoController } from '../controllers/MazoController.js';
import { TarjetaController } from '../controllers/TarjetaController.js';

const router = Router();

/** @brief HU-1.1: crea un mazo nuevo (CA-1.1.1, CA-1.1.2). POST /api/v1/decks */
router.post('/', MazoController.crear);

/**
 * @brief Lista todos los mazos existentes, sin filtros. GET /api/v1/decks
 * @note No viene de un CA específico; es consulta de apoyo para probar/usar lo ya creado
 * con POST /decks.
 */
router.get('/', MazoController.listar);

/**
 * @brief Busca un mazo por su id_mazo. GET /api/v1/decks/:id
 * @note No viene de un CA específico; es consulta de apoyo.
 */
router.get('/:id', MazoController.obtenerPorId);

/**
 * @brief CA-1.1.3: cambia el estado del mazo (ej. a "cerrado"). PATCH /api/v1/decks/:id/estado
 *
 * Cerrar el mazo inhabilita la recepción de nuevos aportes para ese mazo; esa verificación
 * vive en TarjetaController.crear, no en esta ruta.
 */
router.patch('/:id/estado', MazoController.actualizarEstado);

/**
 * @brief CA-2.2.2: actualiza la variante regional predeterminada del mazo y la propaga a
 * todas sus tarjetas. PATCH /api/v1/decks/:id/default-variant
 */
router.patch('/:id/default-variant', MazoController.actualizarVarianteRegional);

/**
 * @brief HU-1.2 / HU-1.3: registra una palabra nueva dentro de un mazo específico.
 * POST /api/v1/decks/:id/cards
 *
 * Cubre CA-1.2.1, CA-1.2.2, CA-1.2.3 y la detección de duplicados de HU-1.3
 * (CA-1.3.1 a CA-1.3.4). El :id de la URL es el id_mazo (deck) al que pertenece la tarjeta.
 */
router.post('/:id/cards', TarjetaController.crear);

/**
 * @brief Elimina un mazo por su id_mazo. DELETE /api/v1/decks/:id
 * @note No viene de un CA específico; es consulta/limpieza de apoyo para pruebas. Falla con
 * 500 (violación de foreign key) si el mazo todavía tiene tarjetas asociadas.
 */
router.delete('/:id', MazoController.eliminar);

export default router;
