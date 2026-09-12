/**
 * @file cardRoutes.js
 * @brief Rutas REST de HE-01 (tarjetas) y HE-02 (curaduría docente: revisión, aprobación,
 * rechazo, contexto) para "cards" (tarjetas). Montado en app.js bajo el prefijo /api/v1/cards.
 *
 * @note El orden importa: "/pending" debe declararse ANTES de "/:id", porque Express evalúa
 * las rutas en orden y "/:id" haría match con la palabra "pending" como si fuera un id.
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

/**
 * @brief CA-2.1.1: lista las tarjetas pendientes de revisión, para el panel de curaduría.
 * GET /api/v1/cards/pending
 */
router.get('/pending', TarjetaController.listarPendientes);

/** @brief Consulta una tarjeta por su id_tarjeta (incluye etiquetas de contexto). GET /api/v1/cards/:id */
router.get('/:id', TarjetaController.obtenerPorId);

/**
 * @brief CA-2.1.2 (paso "editar, corregir"): edita una tarjeta en revisión individual.
 * PUT /api/v1/cards/:id
 * Exige que la tarjeta esté 'pendiente_revision' (ver TarjetaController.editarRevision).
 */
router.put('/:id', TarjetaController.editarRevision);

/**
 * @brief CA-2.2.1: asigna registro y/o variante regional a la tarjeta.
 * PUT /api/v1/cards/:id/context
 */
router.put('/:id/context', TarjetaController.actualizarContexto);

/**
 * @brief CA-2.1.2 (paso "aprobar"): aprueba una tarjeta en revisión individual.
 * PATCH /api/v1/cards/:id/approve
 *
 * @note A propósito NO existe un endpoint de "rechazar" para revisión individual: en este
 * flujo la docente solo edita (PUT de arriba) y aprueba. Ver TarjetaController.aprobar.
 */
router.patch('/:id/approve', TarjetaController.aprobar);

export default router;
