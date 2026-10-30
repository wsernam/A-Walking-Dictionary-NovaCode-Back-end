/**
 * @file ReporteEstudioPDFService.js
 * @brief HU-019: genera el PDF del reporte del modo de estudio (CA-19.1 y CA-19.2).
 *
 * Endpoint relacionado: GET /api/v1/reports/study-mode/export-pdf (parámetro opcional student_id).
 * Reutiliza el maquetado de ExportarPDFService (mismos márgenes, colores, encabezado y pie).
 * Los datos y la regla de acceso (CA-19.3) vienen de ReporteEstudioService.
 *
 * @note Limitación conocida (igual que ExportarPDFService): se usan las fuentes estándar de
 * pdf-lib (WinAnsi). Para que un nombre con caracteres fuera de Latin-1 (emoji, alfabetos no
 * latinos) no haga fallar todo el reporte, esos caracteres se sustituyen por "?".
 */

import { PDFDocument } from 'pdf-lib';
import {
  MARGEN,
  ANCHO_UTIL,
  COLORES,
  cargarFuentes,
  crearMaquetador,
  dibujarEncabezado,
  dibujarEtiqueta,
  dibujarPies,
} from './ExportarPDFService.js';
import { ReporteEstudioService } from './ReporteEstudioService.js';

const ALTO_FILA = 16;
/** @brief Posición horizontal de cada columna de la tabla de palabras difíciles. */
const COLUMNAS = {
  palabra: MARGEN + 8,
  factor: MARGEN + 200,
  valoracion: MARGEN + 270,
  proximo: MARGEN + 380,
};
const ANCHO_PALABRA = 180;

/** @brief Deja solo caracteres que las fuentes estándar de pdf-lib pueden dibujar (Latin-1). */
function limpiar(texto) {
  return String(texto ?? '').replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, '?');
}

/** @brief Recorta un texto con "..." para que quepa en un ancho máximo. */
function recortar(texto, fuente, tamano, ancho) {
  let cadena = limpiar(texto);
  if (fuente.widthOfTextAtSize(cadena, tamano) <= ancho) return cadena;
  while (cadena.length > 1 && fuente.widthOfTextAtSize(`${cadena}...`, tamano) > ancho) {
    cadena = cadena.slice(0, -1);
  }
  return `${cadena}...`;
}

/** @brief Formatea una fecha como AAAA-MM-DD (UTC) o "Sin registro" si no hay valor. */
function formatearFecha(valor) {
  if (!valor) return 'Sin registro';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 'Sin registro' : fecha.toISOString().slice(0, 10);
}

/**
 * @brief Dibuja (o solo mide) el bloque de un estudiante: datos, resumen de repaso,
 * distribución de valoraciones y tabla de palabras de mayor dificultad. Medir primero permite
 * no partir un bloque entre dos páginas.
 * @param {import('pdf-lib').PDFPage|null} p - Página donde dibujar; null para solo medir.
 * @param {number} yTop - Borde superior del bloque.
 * @param {Object} e - Un elemento de estudiantes de ReporteEstudioService.obtenerDatos.
 * @param {Object} fuentes - Fuentes de cargarFuentes().
 * @return {number} Alto ocupado por el bloque.
 */
function bloqueEstudiante(p, yTop, e, fuentes) {
  let b = yTop - 14;
  if (p) {
    p.drawText(limpiar(e.nombre_completo), { x: MARGEN, y: b, size: 13, font: fuentes.titulo, color: COLORES.azul });
  }
  b -= 13;
  if (p) {
    p.drawText(recortar(`${e.email} · ${e.curso_nombre}`, fuentes.texto, 9, ANCHO_UTIL), {
      x: MARGEN, y: b, size: 9, font: fuentes.texto, color: COLORES.gris,
    });
  }
  b -= 10;

  if (e.sin_actividad) {
    // CA-19.1: los estudiantes sin repasos aparecen como "Sin actividad de estudio".
    b -= 24;
    if (p) {
      p.drawRectangle({ x: MARGEN, y: b, width: ANCHO_UTIL, height: 24, color: COLORES.fondo });
      p.drawText('Sin actividad de estudio', {
        x: MARGEN + 12, y: b + 8, size: 10, font: fuentes.cursiva, color: COLORES.gris,
      });
    }
  } else {
    b -= 12;
    if (p) {
      const resumen = `Tarjetas repasadas: ${e.tarjetas_repasadas}   |   Último repaso: ${formatearFecha(e.fecha_ultimo_repaso)}   |   Repaso vencido: ${e.vencidas}`;
      p.drawText(resumen, { x: MARGEN, y: b, size: 10, font: fuentes.texto, color: COLORES.texto });
    }
    b -= 24;
    if (p) {
      const valoraciones = [
        ['Repetir', e.valoraciones.repetir, COLORES.rojoSuave, COLORES.rojo],
        ['Difícil', e.valoraciones.dificil, COLORES.rojoSuave, COLORES.rojo],
        ['Buena', e.valoraciones.buena, COLORES.azulSuave, COLORES.azul],
        ['Fácil', e.valoraciones.facil, COLORES.azulSuave, COLORES.azul],
      ];
      let x = MARGEN;
      for (const [nombre, cantidad, fondo, color] of valoraciones) {
        x += dibujarEtiqueta(p, `${nombre}: ${cantidad}`, {
          x, y: b, fuente: fuentes.negrita, tamano: 8, fondo, color,
        }) + 6;
      }
    }

    // CA-19.2: palabras con menor factor de facilidad SM-2.
    if (e.palabras_dificiles.length > 0) {
      b -= 18;
      if (p) {
        p.drawText('Palabras de mayor dificultad', {
          x: MARGEN, y: b, size: 9.5, font: fuentes.negrita, color: COLORES.rojo,
        });
      }
      b -= 6 + ALTO_FILA;
      if (p) {
        p.drawRectangle({ x: MARGEN, y: b, width: ANCHO_UTIL, height: ALTO_FILA, color: COLORES.azul });
        [
          ['Palabra', COLUMNAS.palabra],
          ['Factor', COLUMNAS.factor],
          ['Última valoración', COLUMNAS.valoracion],
          ['Próximo repaso', COLUMNAS.proximo],
        ].forEach(([titulo, x]) => {
          p.drawText(titulo, { x, y: b + 5, size: 8, font: fuentes.negrita, color: COLORES.blanco });
        });
      }
      e.palabras_dificiles.forEach((fila, indice) => {
        b -= ALTO_FILA;
        if (!p) return;
        if (indice % 2 === 1) {
          p.drawRectangle({ x: MARGEN, y: b, width: ANCHO_UTIL, height: ALTO_FILA, color: COLORES.fondo });
        }
        const dibujar = (texto, x) => p.drawText(texto, {
          x, y: b + 5, size: 9.5, font: fuentes.texto, color: COLORES.texto,
        });
        dibujar(recortar(fila.palabra, fuentes.texto, 9.5, ANCHO_PALABRA), COLUMNAS.palabra);
        dibujar(Number(fila.factor_facilidad).toFixed(2), COLUMNAS.factor);
        dibujar(limpiar(fila.ultima_valoracion ?? 'Sin registro'), COLUMNAS.valoracion);
        dibujar(formatearFecha(fila.fecha_proximo_repaso), COLUMNAS.proximo);
      });
    }
  }

  b -= 8;
  if (p) {
    p.drawLine({
      start: { x: MARGEN, y: b }, end: { x: MARGEN + ANCHO_UTIL, y: b }, thickness: 0.5, color: COLORES.linea,
    });
  }
  b -= 14;
  return yTop - b;
}

export const ReporteEstudioPDFService = {
  /**
   * @brief CA-19.1, CA-19.2 y CA-19.3: genera el PDF del reporte del modo de estudio.
   * @param {{ id_usuario: number, rol: string }} usuario - Payload del JWT (req.usuario).
   * @param {string|number|undefined} studentId - Valor opcional de ?student_id.
   * @return {Promise<Uint8Array>} Bytes del PDF generado.
   * @throws {Error} 400, 403 o 404 de ReporteEstudioService.obtenerDatos; no se genera documento.
   */
  async generarPdf(usuario, studentId) {
    const { generado_en: generadoEn, estudiantes } =
      await ReporteEstudioService.obtenerDatos(usuario, studentId);

    const doc = await PDFDocument.create();
    const fuentes = await cargarFuentes(doc);
    const m = crearMaquetador(doc, fuentes, 'Reporte del modo de estudio');

    const conActividad = estudiantes.filter((e) => !e.sin_actividad).length;
    dibujarEncabezado(m, fuentes, {
      etiqueta: 'REPORTE · MODO DE ESTUDIO',
      titulo: 'Reporte del modo de estudio',
      subtitulo: `Generado el ${formatearFecha(generadoEn)} (UTC)`,
      insignias: [
        {
          texto: `${estudiantes.length} ${estudiantes.length === 1 ? 'estudiante' : 'estudiantes'}`,
          fondo: COLORES.rojoSuave,
          color: COLORES.rojo,
        },
        { texto: `${conActividad} con actividad`, fondo: COLORES.azulSuave, color: COLORES.azul },
      ],
    });

    if (estudiantes.length === 0) {
      m.pagina.drawRectangle({ x: MARGEN, y: m.y - 40, width: ANCHO_UTIL, height: 40, color: COLORES.fondo });
      m.pagina.drawText('No hay estudiantes inscritos para este reporte.', {
        x: MARGEN + 14, y: m.y - 24, size: 10, font: fuentes.cursiva, color: COLORES.gris,
      });
    }

    for (const estudiante of estudiantes) {
      m.asegurarEspacio(bloqueEstudiante(null, m.y, estudiante, fuentes));
      m.bajar(bloqueEstudiante(m.pagina, m.y, estudiante, fuentes));
    }

    // Limitación S1: se documenta en el propio reporte para no inducir a error.
    m.asegurarEspacio(30);
    m.pagina.drawText('La distribución de valoraciones cuenta la última valoración registrada de cada tarjeta.', {
      x: MARGEN, y: m.y - 8, size: 8, font: fuentes.cursiva, color: COLORES.gris,
    });

    dibujarPies(doc, fuentes);
    return doc.save();
  },
};