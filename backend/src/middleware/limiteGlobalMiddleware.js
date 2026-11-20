/**
 * @file limiteGlobalMiddleware.js
 * @brief Límite global de peticiones por IP para toda la API (auditoría OWASP H-07, ampliación).
 *
 * Antes solo /auth, los reportes, /admin y algunas rutas académicas tenían tope: el resto de la
 * API (mazos, tarjetas, quices, diccionario, rutas inexistentes) se podía inundar. Este límite es
 * el techo de todo lo demás; los límites propios de cada ruta siguen aplicando por encima.
 *
 * El contador está en memoria (una instancia, como los demás límites) y se reinicia si Render
 * reinicia el servicio. Está pensado para ir en app.js DESPUÉS de cors (así la respuesta 429
 * también lleva las cabeceras CORS y el navegador la lee en vez de mostrar un error de red) y
 * ANTES de express.json (así una inundación no gasta CPU leyendo cuerpos). /health se declara
 * antes en app.js y por eso nunca se cuenta.
 */

import rateLimit from 'express-rate-limit';

/** @brief Ventana de conteo: 15 minutos, igual que los demás límites del proyecto. */
export const VENTANA_MS = 15 * 60 * 1000;

/**
 * @brief Peticiones permitidas por IP en la ventana si no se define RATE_LIMIT_GLOBAL_MAX.
 *
 * Es un techo amplio a propósito: varios estudiantes de la universidad pueden salir por la misma
 * IP pública (NAT) y una clase entera usa la plataforma a la vez. Ajustable sin cambiar el código.
 */
export const LIMITE_POR_DEFECTO = 1000;

/**
 * @brief Crea el limitador global.
 *
 * @param {Object} [opciones]
 * @param {number} [opciones.limite] - Peticiones por IP en la ventana. Por defecto, la variable de
 * entorno RATE_LIMIT_GLOBAL_MAX o, si no es un número válido, LIMITE_POR_DEFECTO.
 * @param {number} [opciones.ventanaMs] - Duración de la ventana en milisegundos.
 * @return {import('express').RequestHandler} Middleware que responde 429 con
 * { error, code: 'RATE_LIMITED' } al superar el límite, con las cabeceras estándar RateLimit y
 * Retry-After.
 * @note Registra una sola línea [SEGURIDAD] por IP y ventana (con la primera petición rechazada)
 * para que una inundación no llene los logs.
 */
export function crearLimiteGlobal({
  limite = Number(process.env.RATE_LIMIT_GLOBAL_MAX) || LIMITE_POR_DEFECTO,
  ventanaMs = VENTANA_MS,
} = {}) {
  return rateLimit({
    windowMs: ventanaMs,
    limit: limite,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.', code: 'RATE_LIMITED' },
    handler: (req, res, _next, opciones) => {
      if (req.rateLimit.used === req.rateLimit.limit + 1) {
        console.warn(`[SEGURIDAD] 429 ${req.method} ${req.originalUrl} ip=${req.ip} límite global superado`);
      }
      res.status(opciones.statusCode).json(opciones.message);
    },
  });
}