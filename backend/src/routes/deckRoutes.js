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
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @brief HU-1.1: crea un mazo nuevo (CA-1.1.1, CA-1.1.2). POST /api/v1/decks
 * Acción exclusiva de docente (HU-1.1: "Como docente del curso..."); CA-5.4.2 exige rol docente.
 */
router.post('/', authenticate, requireRole('docente'), MazoController.crear);

/**
 * @brief Lista todos los mazos existentes, sin filtros. GET /api/v1/decks
 * @note No viene de un CA específico; es consulta de apoyo para probar/usar lo ya creado
 * con POST /decks. Sin autenticación: cubre el acceso de solo lectura de Invitado (CA-5.4.3).
 */
router.get('/', MazoController.listar);

/**
 * @brief Busca un mazo por su id_mazo. GET /api/v1/decks/:id
 * @note No viene de un CA específico; es consulta de apoyo. Sin autenticación (CA-5.4.3).
 */
router.get('/:id', MazoController.obtenerPorId);

/**
 * @brief CA-1.1.3: cambia el estado del mazo (ej. a "cerrado"). PATCH /api/v1/decks/:id/estado
 *
 * Cerrar el mazo inhabilita la recepción de nuevos aportes para ese mazo; esa verificación
 * vive en TarjetaController.crear, no en esta ruta. Acción de docente (CA-5.4.2).
 */
router.patch('/:id/estado', authenticate, requireRole('docente'), MazoController.actualizarEstado);

/**
 * @brief CA-2.2.2: actualiza la variante regional predeterminada del mazo y la propaga a
 * todas sus tarjetas. PATCH /api/v1/decks/:id/default-variant. Acción de docente (CA-5.4.2).
 */
router.patch(
  '/:id/default-variant',
  authenticate,
  requireRole('docente'),
  MazoController.actualizarVarianteRegional
);

/**
 * @brief HU-1.2 / HU-1.3: registra una palabra nueva dentro de un mazo específico.
 * POST /api/v1/decks/:id/cards
 *
 * Cubre CA-1.2.1, CA-1.2.2, CA-1.2.3 y la detección de duplicados de HU-1.3
 * (CA-1.3.1 a CA-1.3.4). El :id de la URL es el id_mazo (deck) al que pertenece la tarjeta.
 * Requiere sesión iniciada (authenticate); no se restringe a un rol específico, HU-1.2 solo
 * exige que el estudiante esté "inscrito", dato que esta HU no valida.
 */
router.post('/:id/cards', authenticate, TarjetaController.crear);

/**
 * @brief Elimina un mazo por su id_mazo. DELETE /api/v1/decks/:id
 * @note No viene de un CA específico; es consulta/limpieza de apoyo para pruebas. Falla con
 * 500 (violación de foreign key) si el mazo todavía tiene tarjetas asociadas.
 */
router.delete('/:id', authenticate, MazoController.eliminar);

export default router;
