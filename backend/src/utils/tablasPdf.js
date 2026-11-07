/**
 * @file tablasPdf.js
 * @brief Helpers de maquetado de secciones, avisos y tablas compartidos por los reportes en PDF
 * de HE-07 (HU-018, HU-020...). Antes vivían dentro de ReporteProgresoPDFService.js.
 *
 * Todos trabajan sobre el maquetador de ExportarPDFService (crearMaquetador): dibujan en la
 * página actual y crean páginas nuevas cuando no cabe la siguiente fila.
 */

import { MARGEN, ANCHO_UTIL, COLORES } from '../services/ExportarPDFService.js';
import { recortar } from './formatoPdf.js';

/** @brief Alto de cada fila de las tablas, en puntos. */
export const ALTO_FILA = 16;

/**
 * @brief Título de sección con una línea inferior; reserva espacio para el título y una fila.
 * @param {Object} m - Maquetador.
 * @param {Object} fuentes - Fuentes de cargarFuentes().
 * @param {string} titulo - Texto del título.
 */
export function dibujarSeccion(m, fuentes, titulo) {
  m.asegurarEspacio(72);
  m.bajar(28);
  m.pagina.drawText(titulo, { x: MARGEN, y: m.y, size: 12, font: fuentes.titulo, color: COLORES.azul });
  m.bajar(6);
  m.pagina.drawLine({
    start: { x: MARGEN, y: m.y }, end: { x: MARGEN + ANCHO_UTIL, y: m.y }, thickness: 0.5, color: COLORES.linea,
  });
  m.bajar(8);
}

/**
 * @brief Recuadro gris con un aviso en cursiva (listas vacías y "Sin actividad registrada").
 * @param {Object} m - Maquetador.
 * @param {Object} fuentes - Fuentes de cargarFuentes().
 * @param {string} texto - Texto del aviso.
 */
export function dibujarAviso(m, fuentes, texto) {
  m.asegurarEspacio(30);
  m.bajar(24);
  m.pagina.drawRectangle({ x: MARGEN, y: m.y, width: ANCHO_UTIL, height: 24, color: COLORES.fondo });
  m.pagina.drawText(texto, { x: MARGEN + 12, y: m.y + 8, size: 10, font: fuentes.cursiva, color: COLORES.gris });
  m.bajar(8);
}

/**
 * @brief Fila azul con los títulos de las columnas.
 * @param {Object} m - Maquetador.
 * @param {Object} fuentes - Fuentes de cargarFuentes().
 * @param {Object[]} columnas - Columnas { titulo, x, ancho }.
 */
export function dibujarCabeceraTabla(m, fuentes, columnas) {
  m.bajar(ALTO_FILA);
  m.pagina.drawRectangle({ x: MARGEN, y: m.y, width: ANCHO_UTIL, height: ALTO_FILA, color: COLORES.azul });
  for (const { titulo, x } of columnas) {
    m.pagina.drawText(titulo, { x, y: m.y + 5, size: 8, font: fuentes.negrita, color: COLORES.blanco });
  }
}

/**
 * @brief Dibuja una tabla fila por fila. Si una fila no cabe, pasa a la página siguiente y repite
 * la cabecera, para que ninguna página quede con filas sin títulos.
 * @param {Object} m - Maquetador.
 * @param {Object} fuentes - Fuentes de cargarFuentes().
 * @param {Object[]} columnas - Columnas { titulo, x, ancho }.
 * @param {string[][]} filas - Texto de cada celda, en el orden de las columnas.
 */
export function dibujarTabla(m, fuentes, columnas, filas) {
  m.asegurarEspacio(ALTO_FILA * 2);
  dibujarCabeceraTabla(m, fuentes, columnas);
  filas.forEach((celdas, indice) => {
    const paginaAnterior = m.pagina;
    m.asegurarEspacio(ALTO_FILA);
    if (m.pagina !== paginaAnterior) dibujarCabeceraTabla(m, fuentes, columnas);
    m.bajar(ALTO_FILA);
    if (indice % 2 === 1) {
      m.pagina.drawRectangle({ x: MARGEN, y: m.y, width: ANCHO_UTIL, height: ALTO_FILA, color: COLORES.fondo });
    }
    columnas.forEach(({ x, ancho }, i) => {
      m.pagina.drawText(recortar(celdas[i], fuentes.texto, 9, ancho), {
        x, y: m.y + 5, size: 9, font: fuentes.texto, color: COLORES.texto,
      });
    });
  });
}

/**
 * @brief Fila de totales al final de una tabla: fondo azul suave y texto en negrita. Debe llamarse
 * justo después de dibujarTabla, con las mismas columnas.
 * @param {Object} m - Maquetador.
 * @param {Object} fuentes - Fuentes de cargarFuentes().
 * @param {Object[]} columnas - Columnas { titulo, x, ancho }.
 * @param {string[]} celdas - Texto de cada celda, en el orden de las columnas.
 */
export function dibujarFilaTotales(m, fuentes, columnas, celdas) {
  m.asegurarEspacio(ALTO_FILA * 2);
  m.bajar(ALTO_FILA);
  m.pagina.drawRectangle({ x: MARGEN, y: m.y, width: ANCHO_UTIL, height: ALTO_FILA, color: COLORES.azulSuave });
  columnas.forEach(({ x, ancho }, i) => {
    m.pagina.drawText(recortar(celdas[i], fuentes.negrita, 9, ancho), {
      x, y: m.y + 5, size: 9, font: fuentes.negrita, color: COLORES.azul,
    });
  });
}
