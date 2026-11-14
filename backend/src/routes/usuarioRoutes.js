/**
 * @file usuarioRoutes.js
 * @brief Rutas REST del recurso Usuario (perfil académico, HU-5.2), montadas en app.js bajo el
 * prefijo /api/v1/users.
 *
 * @note "/profile" está declarada ANTES de "/:id" a propósito: Express evalúa las rutas en
 * orden, y "/:id" haría match con "profile" como si fuera un id (mismo motivo documentado en
 * tarjetaRoutes.js para "/pending"/"/approved").
 *
 * @note Auditoría OWASP H-01 (A01/A07): se eliminaron POST /, GET /, PUT /:id y DELETE /:id. Eran
 * públicos, aceptaban "rol" libre en el body (escalada a docente) y ninguna HU ni el frontend los
 * usaba. El alta de usuarios queda solo en /auth (RegistroService fuerza el rol "estudiante").
 */

import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController.js';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const limiteAcademico = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
    code: 'RATE_LIMITED',
  },
});

/**
 * @brief HU-5.2 / CA-5.2.1: actualiza el perfil académico (nivel MCER, código estudiantil, avatar).
 * PATCH /api/v1/users/profile. Solo estudiante.
 */
router.patch('/profile', limiteAcademico, authenticate, requireRole('estudiante'), UsuarioController.actualizarPerfil);

/**
 * @brief HU-5.2: consulta un perfil. GET /api/v1/users/:id, shape de perfil acordado con el
 * frontend (ver PerfilService.js). El estudiante solo ve su propio perfil; la docente ve
 * cualquiera (control en el controlador).
 */
router.get('/:id', limiteAcademico, authenticate,  requireRole('docente', 'estudiante'), UsuarioController.obtenerPerfil);

export default router;