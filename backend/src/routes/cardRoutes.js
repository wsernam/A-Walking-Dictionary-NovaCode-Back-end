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

/** @brief Consulta una tarjeta por su id_tarjeta. GET /api/v1/cards/:id */
router.get('/:id', TarjetaController.obtenerPorId);

/**
 * @brief Edita/corrige una tarjeta. PUT /api/v1/cards/:id
 * Paso "editar, corregir" del flujo de revisión individual de la docente.
 */
router.put('/:id', TarjetaController.actualizar);

/**
 * @brief Aprueba una tarjeta en revisión individual. PATCH /api/v1/cards/:id/approve
 *
 * Flujo de Revisión Individual (Docente): no existe un endpoint de "rechazar" para tarjetas —
 * a propósito. La docente solo edita (PUT de arriba) y aprueba (esta ruta). El "Rechazar" vive
 * únicamente en el flujo de coautoría, ver DELETE /api/v1/contributions/:id.
 */
router.patch('/:id/approve', TarjetaController.aprobar);

export default router;
