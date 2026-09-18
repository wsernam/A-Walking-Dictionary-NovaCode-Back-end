// authMiddleware.js
// Historia de Usuario: HU-5.4 — Iniciar sesión y control de roles.
// Depende de: AuthService.js (emite el token), variable de entorno JWT_SECRET.

import jwt from 'jsonwebtoken';

// Interruptor SOLO para desarrollo/pruebas locales: con DISABLE_AUTH=true en .env, authenticate
// y requireRole dejan pasar todo sin pedir token, simulando un usuario con el rol indicado en
// DISABLE_AUTH_ROL (por defecto "docente", para poder probar también las rutas docente-only).
// No es parte de ningún CA del backlog — es una salida de escape de conveniencia, apagada por
// defecto. NUNCA debe quedar en true en un entorno real.
const authDeshabilitado = () => process.env.DISABLE_AUTH === 'true';

// CA-5.4.1: verifica el token JWT del header Authorization. Adjunta el payload decodificado
// (id_usuario, email, rol) en req.usuario para que las rutas/controladores lo usen.
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

// CA-5.4.2: deniega con 403 si el rol del usuario autenticado no está entre los permitidos.
// Debe usarse después de authenticate (necesita req.usuario ya poblado).
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
