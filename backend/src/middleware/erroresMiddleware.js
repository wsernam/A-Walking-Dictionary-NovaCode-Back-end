/**
 * @file erroresMiddleware.js
 * @brief Respuestas en JSON para lo que Express respondía con su página HTML por defecto.
 *
 * Se montan al final de app.js, después de todas las rutas:
 *   - `rutaNoEncontrada`: una ruta inexistente responde 404 { error, code: 'NOT_FOUND' } en vez de
 *     la página «Cannot GET …».
 *   - `manejarErrorPeticion`: un body que no es JSON válido (o que supera el límite de express.json)
 *     responde 400/413 { error, code: 'BAD_REQUEST' } en vez de la página de error HTML; cualquier
 *     otro error no atrapado responde 500 en JSON.
 * Origen: alerta «Unexpected Content-Type» (100001) de OWASP ZAP, ~450 instancias por rol en el
 * run #42. Mantiene el formato { error, code } de todas las respuestas de error (docs/codigos-error.md).
 */

/**
 * @brief Responde 404 en JSON para cualquier ruta que ningún router atendió.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @return {void}
 */
export function rutaNoEncontrada(_req, res) {
  // No se repite la ruta pedida en el mensaje, para no devolver texto del usuario.
  res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND' });
}

/**
 * @brief Manejador de errores de Express (4 argumentos). Atiende los errores de express.json
 * (body mal formado o demasiado grande) y cualquier otro error que llegue sin respuesta.
 * @param {Error & { status?: number, type?: string }} err - Error recibido.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @return {void}
 */
export function manejarErrorPeticion(err, req, res, next) {
  // Si ya se empezó a enviar la respuesta, Express exige delegar en su manejador por defecto.
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido', code: 'BAD_REQUEST' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande', code: 'BAD_REQUEST' });
  }
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) {
    // El detalle va solo al log; al cliente nunca se le devuelve (OWASP H-08).
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    return res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  }
  return res.status(status).json({ error: 'Petición inválida', code: 'BAD_REQUEST' });
}
