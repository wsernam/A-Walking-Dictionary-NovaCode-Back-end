// Rutas REST del recurso Usuario.
//
// @note "/profile" está declarada ANTES de "/:id" a propósito: Express evalúa las rutas en
// orden, y "/:id" haría match con "profile" como si fuera un id (mismo motivo documentado en
// cardRoutes.js para "/pending"/"/approved").

import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', UsuarioController.crear);

router.get('/', UsuarioController.listar);

// HU-5.2 / CA-5.2.1: actualiza el perfil académico (nivel MCER, código estudiantil, avatar).
router.patch('/profile', UsuarioController.actualizarPerfil);

// HU-5.2: GET /api/v1/users/:id, shape de perfil acordado con el frontend (ver PerfilService.js).
router.get('/:id', UsuarioController.obtenerPerfil);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', UsuarioController.actualizar);

router.delete('/:id', UsuarioController.eliminar);

export default router;
