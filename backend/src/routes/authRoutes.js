/**
 * @file authRoutes.js
 * @brief Rutas REST de autenticación (HU-5.4, login con Google/OAuth). Montado en app.js bajo
 * el prefijo /api/v1/auth.
 */

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { RegistroController } from '../controllers/RegistroController.js';

const router = Router();

/**
 * @brief CA-5.4.1: recibe el idToken de Google (obtenido en el frontend con Google Identity
 * Services), lo valida y retorna el JWT propio de la app con claims de rol.
 * POST /api/v1/auth/google
 */
router.post('/google', AuthController.loginGoogle);

router.post('/register', RegistroController.registrarConGoogle);

router.post('/register', AuthController.registrarGoogle);

export default router;
