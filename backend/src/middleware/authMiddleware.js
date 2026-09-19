/**
 * @file authMiddleware.js
 * @brief Middlewares de autenticación y control de acceso por rol (HU-5.4).
 *
 * Depende de: la variable de entorno JWT_SECRET (con la que AuthService firma el token).
 * Se aplican por ruta, en los archivos de src/routes/, no de forma global en app.js.
 */

import jwt from 'jsonwebtoken';

/**
 * @brief Indica si el interruptor de desarrollo DISABLE_AUTH está activo.
 *
 * Interruptor SOLO para desarrollo/pruebas locales: con DISABLE_AUTH=true en el entorno,
 * authenticate y requireRole dejan pasar todo sin pedir token, simulando un usuario con el rol
 * indicado en DISABLE_AUTH_ROL (por defecto "docente", para poder probar también las rutas
 * exclusivas de docente).
 *
 * @note No es parte de ningún CA del backlog: es una salida de escape de conveniencia, apagada
 * por defecto. NUNCA debe quedar en true en un entorno real.
 * @return {boolean} true si DISABLE_AUTH === 'true'.
 */
const authDeshabilitado = () => process.env.DISABLE_AUTH === 'true';

/**
 * @brief CA-5.4.1: verifica el token JWT del header "Authorization: Bearer <token>".
 *
 * Si es válido, adjunta el payload decodificado ({ id_usuario, email, rol }) en req.usuario para
 * que las rutas y controladores siguientes lo usen, y continúa con next().
 *
 * @param {import('express').Request} req - Debe traer el header Authorization con el JWT.
 * @param {import('express').Response} res - Responde 401 si falta el header o si el token es
 * inválido o expiró ({ error: mensaje }).
 * @param {import('express').NextFunction} next - Se invoca si el token es válido.
 * @return {void}
 */
export function authenticate(req, res, next) {
  if (authDeshabilitado()) {
    req.usuario = {
      id_usuario: 0,
      email: 'dev@local',
      rol: process.env.DISABLE_AUTH_ROL || 'docente',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación no proporcionado' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * @brief CA-5.4.2: crea un middleware que deniega con 403 si el rol del usuario autenticado no
 * está entre los permitidos.
 *
 * Debe usarse DESPUÉS de authenticate, porque necesita req.usuario ya poblado.
 * Ejemplo: router.post('/', authenticate, requireRole('docente'), Controller.crear);
 *
 * @param {...string} rolesPermitidos - Roles autorizados para la ruta (p. ej. 'docente').
 * @return {import('express').RequestHandler} Middleware que responde 401 si no hay
 * req.usuario, 403 si el rol no está permitido, o continúa con next().
 */
export function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (authDeshabilitado()) {
      return next();
    }
    if (!req.usuario) {
      return res.status(401).json({ error: 'Token de autenticación no proporcionado' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tiene permisos para acceder a este recurso' });
    }
    next();
  };
}
