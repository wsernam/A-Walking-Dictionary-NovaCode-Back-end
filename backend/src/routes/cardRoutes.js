/**
 * @file cardRoutes.js
 * @brief Rutas REST de HE-01 (tarjetas) y HE-02 (curaduría docente: revisión, aprobación,
 * rechazo, contexto) para "cards" (tarjetas). Montado en app.js bajo el prefijo /api/v1/cards.
 *
 * @note El orden importa: "/pending" y "/approved" deben declararse ANTES de "/:id", porque
 * Express evalúa las rutas en orden y "/:id" haría match con esas palabras como si fueran un id.
 */

import { Router } from 'express';
import { TarjetaController } from '../controllers/TarjetaController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @brief HU-1.3: verifica si una palabra ya existe en un mazo, SIN crear ni modificar nada.
 * POST /api/v1/cards/check-duplicate
 *
 * Cubre CA-1.3.4: el frontend llama este endpoint antes de que el estudiante confirme el
 * formulario, para mostrarle el aviso de coautoría/acepción nueva. Requiere sesión iniciada.
 */
router.post('/check-duplicate', authenticate, TarjetaController.checkDuplicate);

/**
 * @brief CA-2.1.1: lista las tarjetas pendientes de revisión, para el panel de curaduría.
 * GET /api/v1/cards/pending. Panel exclusivo de docente (HU-2.1), no es la vista de
 * "diccionario" de solo lectura de CA-5.4.3.
 */
router.get('/pending', authenticate, requireRole('docente'), TarjetaController.listarPendientes);

/**
 * @brief Lista las tarjetas en estado 'revisado_docente', para la pestaña "Historial
 * Aprobadas" del panel de curaduría. GET /api/v1/cards/approved
 *
 * @note No corresponde a un CA explícito del backlog de HE-02 (HU-2.1/CA-2.1.1 solo pide
 * el filtrado de pendientes) -- agregado por pedido directo del equipo, documentado en
 * CLAUDE.md. Mismo panel docente que /pending: rol docente (CA-5.4.2).
 */
router.get('/approved', authenticate, requireRole('docente'), TarjetaController.listarAprobadas);

/**
 * @brief Consulta una tarjeta por su id_tarjeta (incluye etiquetas de contexto).
 * GET /api/v1/cards/:id
 * @note CA-2.2.3 la describe como vista del estudiante sobre una tarjeta ya aprobada; queda
 * sin autenticación junto con el resto de GET de "diccionario" (CA-5.4.3).
 */
router.get('/:id', TarjetaController.obtenerPorId);

/**
 * @brief CA-2.1.2 (paso "editar, corregir"): edita una tarjeta en revisión individual.
 * PUT /api/v1/cards/:id
 * Exige que la tarjeta esté 'pendiente_revision' (ver TarjetaController.editarRevision).
 * Acción de docente (CA-5.4.2).
 */
router.put('/:id', authenticate, requireRole('docente'), TarjetaController.editarRevision);

/**
 * @brief CA-2.2.1: asigna registro y/o variante regional a la tarjeta.
 * PUT /api/v1/cards/:id/context. Acción de docente (CA-5.4.2).
 */
router.put(
  '/:id/context',
  authenticate,
  requireRole('docente'),
  TarjetaController.actualizarContexto
);

/**
 * @brief CA-2.1.2 (paso "aprobar"): aprueba una tarjeta en revisión individual.
 * PATCH /api/v1/cards/:id/approve
 *
 * @note A propósito NO existe un endpoint de "rechazar" para revisión individual: en este
 * flujo la docente solo edita (PUT de arriba) y aprueba. Ver TarjetaController.aprobar.
 * Acción de docente (CA-5.4.2).
 */
router.patch('/:id/approve', authenticate, requireRole('docente'), TarjetaController.aprobar);

export default router;
