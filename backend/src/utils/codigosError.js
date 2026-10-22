/**
 * @file codigosError.js
 * @brief Códigos de error fijos (en inglés) que acompañan al mensaje de cada respuesta de error.
 *
 * Toda respuesta de error tiene la forma { error: "mensaje en español", code: "CODIGO" }. El
 * mensaje se mantiene para no romper a los clientes actuales; el front traduce a partir de `code`
 * (src/i18n/locales/en.json del repo del front). El status HTTP no cambia.
 *
 * La lista completa de códigos está en docs/codigos-error.md.
 */

/** @brief Código genérico según el status, para los errores que no traen uno específico. */
const CODIGO_POR_STATUS = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};

/**
 * @brief Código genérico para un status HTTP de error.
 * @param {number} status - Status de la respuesta (400 o superior).
 * @return {string} Código del status, o INTERNAL_ERROR para 5xx y status sin código propio.
 */
export function codigoPorStatus(status) {
  return CODIGO_POR_STATUS[status] ?? 'INTERNAL_ERROR';
}

/**
 * @brief Indica si un valor tiene la forma de nuestros códigos (DECK_NOT_FOUND, INVALID_ID...).
 * Descarta los `code` que traen errores de otras librerías, como el SQLSTATE de PostgreSQL
 * ("42703") o los de Node ("ECONNREFUSED" llega con status 500, que siempre es INTERNAL_ERROR).
 * @param {unknown} codigo - Valor de la propiedad `code` de la respuesta.
 * @return {boolean} true si es un texto en MAYÚSCULAS (con guiones bajos) que empieza por letra.
 */
export function esCodigoPropio(codigo) {
  return typeof codigo === 'string' && /^[A-Z][A-Z0-9_]*$/.test(codigo);
}

/**
 * @brief Crea un Error con status HTTP y código, para lanzarlo desde un servicio. El controlador
 * que lo atrapa responde { error: err.message, code: err.code } con err.status.
 * @param {number} status - Status HTTP de la respuesta.
 * @param {string} code - Código fijo en inglés (ver docs/codigos-error.md).
 * @param {string} mensaje - Mensaje legible para el cliente.
 * @return {Error} Error con las propiedades `status` y `code`.
 */
export function errorApi(status, code, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  error.code = code;
  return error;
}
