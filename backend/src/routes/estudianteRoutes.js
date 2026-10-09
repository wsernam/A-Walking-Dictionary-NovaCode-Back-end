/**
 * @file estudianteRoutes.js
 * @brief Rutas de lectura asociadas a un estudiante. Montadas en app.js bajo /api/v1/students.
 */

import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController.js';
import { authenticate } from '../middleware/autenticacionMiddleware.js';

const router = Router();

/**
 * @brief Contexto académico (curso asignado, semestre activo). GET /api/v1/students/:id/context
 * @note Auditoría OWASP H-03 (A01): exige JWT. El estudiante solo consulta su propio contexto y
 * la docente el de cualquiera (misma regla que GET /users/:id, ver UsuarioController).
 */
router.get('/:id/context', authenticate, UsuarioController.obtenerContextoAcademico);

export default router;