/**
 * @file studentRoutes.js
 * @brief Rutas de lectura asociadas a un estudiante. Montadas en app.js bajo /api/v1/students.
 */

import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController.js';

const router = Router();

/** @brief Contexto académico (curso asignado, semestre activo). GET /api/v1/students/:id/context */
router.get('/:id/context', UsuarioController.obtenerContextoAcademico);

export default router;
