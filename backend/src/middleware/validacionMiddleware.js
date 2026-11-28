/**
 * @file validacionMiddleware.js
 * @brief Validación de entrada común a todas las rutas.
 *
 * Implementado: `rechazarByteNulo`, montado una sola vez en app.js, antes de las rutas. Rechaza con
 * 400 BAD_REQUEST cualquier petición cuyo body, query o ruta traiga el byte nulo (U+0000).
 * PostgreSQL no lo acepta en un texto ("invalid byte sequence for encoding UTF8: 0x00") y, sin este
 * control, cada endpoint que guarda o busca texto respondía 500. Origen: escaneo activo de OWASP ZAP
 * por rol (run #42): POST /cards/check-duplicate, /courses, /courses/:id/assign, /decks y /quizzes.
 *
 * Solo se rechaza el byte nulo: un salto de línea o una tabulación pueden ser legítimos en una
 * definición o un ejemplo. Un byte nulo nunca es un dato válido, por eso el control es global y corre
 * antes de authenticate (un anónimo con byte nulo recibe 400 y no 401). Para no perder visibilidad
 * (OWASP H-09) se deja una línea [SEGURIDAD] con método, ruta e IP, sin el contenido de la petición.
 *
 * Pendiente (sin cambios): validar los campos obligatorios de cada Historia de Usuario en este
 * middleware. Hoy esas validaciones viven en los controladores y servicios; las rutas marcadas con
 * el comentario «agregar validacionMiddleware aquí» esperan esa parte.
 */

import { limpiarParaLog } from '../utils/validacion.js';

/** @brief Profundidad máxima que se recorre en el body (express.json ya limita el tamaño a 100 kB). */
const PROFUNDIDAD_MAXIMA = 20;

/**
 * @brief Indica si un valor (texto, arreglo u objeto, también en sus claves) contiene el byte nulo.
 * @param {unknown} valor - body o query ya parseados.
 * @param {number} [profundidad=0] - Nivel actual; pasado PROFUNDIDAD_MAXIMA se trata como inválido.
 * @return {boolean}
 */
export function contieneByteNulo(valor, profundidad = 0) {
  if (typeof valor === 'string') return valor.includes('\u0000');
  if (valor === null || typeof valor !== 'object') return false;
  if (profundidad > PROFUNDIDAD_MAXIMA) return true;
  if (Array.isArray(valor)) return valor.some((item) => contieneByteNulo(item, profundidad + 1));
  return Object.entries(valor).some(
    ([clave, item]) => clave.includes('\u0000') || contieneByteNulo(item, profundidad + 1)
  );
}

/**
 * @brief Indica si la ruta de la petición trae un byte nulo codificado (%00).
 * @param {string} ruta - req.path, sin decodificar.
 * @return {boolean} true si trae %00 o si la ruta no se puede decodificar.
 */
function rutaConByteNulo(ruta) {
  try {
    return decodeURIComponent(ruta).includes('\u0000');
  } catch {
    return true;
  }
}

/**
 * @brief Middleware que responde 400 BAD_REQUEST si el body, la query o la ruta traen el byte nulo.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @return {void}
 */
export function rechazarByteNulo(req, res, next) {
  if (contieneByteNulo(req.body) || contieneByteNulo(req.query) || rutaConByteNulo(req.path)) {
    // Sin req.originalUrl: la query podría traer datos del usuario.
    console.warn(limpiarParaLog(`[SEGURIDAD] 400 byte nulo en la entrada ${req.method} ${req.path} ip=${req.ip}`));
    return res.status(400).json({
      error: 'La petición contiene caracteres no permitidos (byte nulo)',
      code: 'BAD_REQUEST',
    });
  }
  return next();
}
