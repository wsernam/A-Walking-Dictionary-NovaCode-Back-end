// Rutas REST del recurso Usuario.
//
// @note "/profile" está declarada ANTES de "/:id" a propósito: Express evalúa las rutas en
// orden, y "/:id" haría match con "profile" como si fuera un id (mismo motivo documentado en
// tarjetaRoutes.js para "/pending"/"/approved").
//
// @note Auditoría OWASP H-01 (A01/A07): se eliminaron POST /, GET /, PUT /:id y DELETE /:id. Eran
// públicos, aceptaban "rol" libre en el body (escalada a docente) y ninguna HU ni el frontend los
// usaba. El alta de usuarios queda solo en /auth (RegistroService fuerza el rol "estudiante").

import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController.js';
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';

const router = Router();

// HU-5.2 / CA-5.2.1: actualiza el perfil académico (nivel MCER, código estudiantil, avatar).
router.patch(  '/profile',  authenticate,  requireRole('estudiante'),  UsuarioController.actualizarPerfil);

// HU-5.2: GET /api/v1/users/:id, shape de perfil acordado con el frontend (ver PerfilService.js).
// El estudiante solo ve su propio perfil; la docente ve cualquiera (control en el controlador).
router.get('/:id', authenticate, UsuarioController.obtenerPerfil);

export default router;
