/**
 * @file Helpers de texto compartidos por los reportes en PDF de HE-07 (HU-018, HU-019...).
 *
 * @note Limitación conocida (igual que ExportarPDFService): se usan las fuentes estándar de
 * pdf-lib (WinAnsi). Para que un texto con caracteres fuera de Latin-1 (emoji, alfabetos no
 * latinos) no haga fallar todo el reporte, esos caracteres se sustituyen por "?".
 */

/**
 * Deja solo caracteres que las fuentes estándar de pdf-lib pueden dibujar (Latin-1).
 * @param {unknown} texto - Texto a limpiar (null/undefined se trata como cadena vacía).
 * @return {string} Texto sin caracteres fuera de Latin-1.
 */
export function limpiar(texto) {
  return String(texto ?? '').replace(/[^ -~ -ÿ]/g, '?');
}

/**
 * Recorta un texto con "..." para que quepa en un ancho máximo.
 * @param {unknown} texto - Texto a dibujar.
 * @param {import('pdf-lib').PDFFont} fuente - Fuente con la que se medirá.
 * @param {number} tamano - Tamaño de fuente en puntos.
 * @param {number} ancho - Ancho máximo disponible, en puntos.
 * @return {string} El texto limpio, recortado si no cabía.
 */
export function recortar(texto, fuente, tamano, ancho) {
  let cadena = limpiar(texto);
  if (fuente.widthOfTextAtSize(cadena, tamano) <= ancho) return cadena;
  while (cadena.length > 1 && fuente.widthOfTextAtSize(`${cadena}...`, tamano) > ancho) {
    cadena = cadena.slice(0, -1);
  }
  return `${cadena}...`;
}

/**
 * Formatea una fecha como AAAA-MM-DD (UTC).
 * @param {Date|string|null|undefined} valor - Fecha a formatear.
 * @return {string} La fecha, o "Sin registro" si no hay valor o no es una fecha válida.
 */
export function formatearFecha(valor) {
  if (!valor) return 'Sin registro';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 'Sin registro' : fecha.toISOString().slice(0, 10);
}
