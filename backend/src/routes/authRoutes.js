/**
 * @file authRoutes.js
 * @brief Rutas REST de autenticación (HU-5.4). Montado en app.js bajo el prefijo /api/v1/auth.
 */

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';

const router = Router();

/** @brief CA-5.4.1: valida credenciales y retorna un JWT con claims de rol. POST /api/v1/auth/login */
router.post('/login', AuthController.login);

export default router;
