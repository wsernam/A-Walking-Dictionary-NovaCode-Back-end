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

/**
 * @brief CA-5.1.1 / CA-5.1.2: registro autónomo de estudiante con Google. Recibe el mismo
 * idToken que /google y, si el correo es institucional y no existe, crea la cuenta con rol
 * "estudiante" y retorna el JWT propio de la app.
 * POST /api/v1/auth/register
 */
router.post('/register', RegistroController.registrarConGoogle);

export default router;
