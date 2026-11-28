/**
 * @file validacion.js
 * @brief Validaciones de entrada compartidas por los controladores, para que los datos que
 * PostgreSQL rechazaría (ids fuera del rango de INT, fechas imposibles, bytes nulos) se respondan
 * con 400 en vez de llegar a la base de datos y salir como 500.
 *
 * Origen: fallos ST101 del fuzzing con Schemathesis por rol (docente, estudiante, administrador).
 */

/** @brief Mayor valor de una columna INT/SERIAL de PostgreSQL. */
export const ID_MAXIMO = 2147483647;

/**
 * @brief Indica si un valor es un id válido para una columna INT/SERIAL: entero entre 1 y
 * 2147483647. No convierte textos; si el valor puede llegar como texto, convertirlo antes con
 * Number().
 * @param {unknown} valor - Valor a validar.
 * @return {boolean}
 */
export function esIdValido(valor) {
  return Number.isSafeInteger(valor) && valor >= 1 && valor <= ID_MAXIMO;
}

/**
 * @brief Convierte un id que llega como texto (parámetro de la URL o de la query) en número, solo
 * si el texto son únicamente dígitos.
 *
 * Reemplaza a Number(texto), que también acepta " 4", "\n4", "0x4", "4e0" y "4.0" y los
 * convierte en 4 (fuzzing Schemathesis run #30, ST201 en GET /decks/%0A4). Se usa dentro del
 * controlador, después de authenticate y requireRole, para no cambiar el orden 401 → 403 → 400.
 * El rango (1 a ID_MAXIMO) lo sigue validando quien lo llama.
 * @param {unknown} valor - Texto recibido. Un número entero se devuelve tal cual (llamadas
 * internas y pruebas).
 * @return {number} El número, o NaN si el valor no es un id escrito solo con dígitos.
 */
export function leerIdRuta(valor) {
  if (typeof valor === 'number') return Number.isSafeInteger(valor) ? valor : NaN;
  return typeof valor === 'string' && /^[0-9]+$/.test(valor) ? Number(valor) : NaN;
}

/**
 * @brief Indica si un valor es un entero dentro del rango de INT de PostgreSQL y mayor o igual a
 * `minimo`. Sirve para campos numéricos que no son ids (semana, tiempo_limite_min...).
 * @param {unknown} valor - Valor a validar.
 * @param {number} [minimo=1] - Menor valor permitido.
 * @return {boolean}
 */
export function esEnteroEnRango(valor, minimo = 1) {
  return Number.isSafeInteger(valor) && valor >= minimo && valor <= ID_MAXIMO;
}

/**
 * Fecha ISO 8601: AAAA-MM-DD, con hora opcional (HH:MM, HH:MM:SS o con fracción) y zona
 * opcional (Z, ±HH:MM o ±HHMM).
 */
const FORMATO_FECHA =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(Z|[+-](\d{2}):?(\d{2}))?)?$/;

/** @brief Mayor desplazamiento horario real (UTC+14, Kiribati). */
const DESPLAZAMIENTO_MAXIMO_HORAS = 14;

/**
 * @brief Indica si un valor es una fecha ISO 8601 que PostgreSQL acepta en DATE o TIMESTAMP.
 *
 * Rechaza textos con otro formato, fechas imposibles (2026-02-30), horas fuera de rango y zonas
 * horarias mayores a ±14:00 (ej. "+22:38", que PostgreSQL rechaza con "time zone displacement
 * out of range").
 * @param {unknown} valor - Valor a validar.
 * @return {boolean}
 */
export function esFechaValida(valor) {
  if (typeof valor !== 'string') return false;
  const partes = FORMATO_FECHA.exec(valor);
  if (!partes) return false;

  const [, anio, mes, dia, hora = '0', minuto = '0', segundo = '0', , zonaHoras = '0', zonaMinutos = '0'] = partes;
  const a = Number(anio);
  const m = Number(mes);
  const d = Number(dia);
  if (a < 1 || m < 1 || m > 12 || d < 1) return false;
  // Día 0 del mes siguiente = último día de este mes (tiene en cuenta los años bisiestos).
  const diasDelMes = new Date(Date.UTC(2000, m, 0)).getUTCDate();
  const esBisiesto = (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
  if (d > (m === 2 && !esBisiesto ? 28 : diasDelMes)) return false;

  if (Number(hora) > 23 || Number(minuto) > 59 || Number(segundo) > 59) return false;
  if (Number(zonaHoras) > DESPLAZAMIENTO_MAXIMO_HORAS || Number(zonaMinutos) > 59) return false;
  return true;
}

/**
 * @brief Convierte un valor en una sola línea segura para el log: los objetos se pasan a JSON y se
 * quitan saltos de línea y tabulaciones, para que un dato del usuario (ruta, query, mensaje) no
 * pueda falsificar líneas del log (CWE-117, Log Injection; mismo criterio que AdminUsuarioService).
 *
 * Se usa pasando a console.* un único argumento ya limpio: así tampoco hay format string con datos
 * del usuario (CodeQL js/tainted-format-string).
 * @param {unknown} valor - Texto u objeto a registrar.
 * @return {string}
 */
export function limpiarParaLog(valor) {
  let texto;
  if (valor !== null && typeof valor === 'object') {
    try {
      texto = JSON.stringify(valor);
    } catch {
      texto = String(valor);
    }
  } else {
    texto = String(valor);
  }
  return texto.replace(/[\r\n\t]/g, ' ');
}

/**
 * @brief Indica si un texto trae caracteres de control (U+0000 a U+001F y U+007F). PostgreSQL no
 * guarda el byte nulo en columnas de texto ("invalid byte sequence for encoding UTF8: 0x00").
 * @param {string} texto - Texto a revisar.
 * @return {boolean}
 */
export function tieneCaracteresDeControl(texto) {
  return /[\u0000-\u001F\u007F]/.test(texto);
}
