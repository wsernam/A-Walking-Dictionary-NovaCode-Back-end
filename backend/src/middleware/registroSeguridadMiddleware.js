/**
 * @file registroSeguridadMiddleware.js
 * @brief Registro de eventos de seguridad (auditoría OWASP H-09, A09 Security Logging and
 * Alerting Failures).
 *
 * Se monta una sola vez en app.js, antes de las rutas. Al terminar cada respuesta revisa el código
 * de estado y deja una línea en los logs (Render los conserva) para:
 *   - 401 y 403, vengan de authenticate/requireRole, del login con Google o de un controlador.
 *   - 5xx, solo como registro: no cambia lo que recibe el cliente (eso es H-08).
 * Las respuestas exitosas no se registran.
 *
 * @note Nunca registra tokens, cabeceras ni el body de la petición, para no filtrar datos
 * sensibles en los logs.
 * @note Mientras no se configure "trust proxy" (H-07), en Render req.ip es la IP del proxy, no la
 * del usuario (decisión del equipo 2026-10-08).
 */

/**
 * @brief Arma la línea de log con método, ruta, IP y, si hay sesión, usuario y rol.
 * @param {import('express').Request} req - req.usuario lo pobla authenticate si hubo JWT válido.
 * @param {import('express').Response} res - Respuesta ya enviada.
 * @return {string} Línea de log.
 */
function describir(req, res) {
  const usuario = req.usuario
    ? `usuario=${req.usuario.id_usuario} rol=${req.usuario.rol}`
    : 'usuario=anonimo';
  return `[SEGURIDAD] ${res.statusCode} ${req.method} ${req.originalUrl} ip=${req.ip} ${usuario}`;
}

/**
 * @brief Middleware que registra 401, 403 y 5xx cuando la respuesta termina.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @return {void}
 */
export function registroSeguridad(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(describir(req, res));
    } else if (res.statusCode >= 500) {
      console.error(describir(req, res));
    }
  });
  next();
}
