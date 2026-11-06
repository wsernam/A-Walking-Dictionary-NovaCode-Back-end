/**
 * @file ReporteResultadosQuizPDFService.js
 * @brief HU-021: genera el PDF del reporte de resultados de un quiz (CA-21.1 y CA-21.2).
 *
 * Endpoint relacionado: GET /api/v1/reports/quizzes/:id/results/export-pdf
 * Reutiliza el maquetado de ExportarPDFService (mismos márgenes, colores, encabezado y pie).
 * Los datos y el control de acceso (CA-21.3) vienen de ReporteResultadosQuizService.
 *
 * @note Limitación conocida (igual que ExportarPDFService): se usan las fuentes estándar de
 * pdf-lib (WinAnsi). Para que un nombre o enunciado con caracteres fuera de Latin-1 (emoji,
 * alfabetos no latinos) no haga fallar todo el reporte, esos caracteres se sustituyen por "?".
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
  partirEnLineas,
} from './ExportarPDFService.js';
import { ReporteResultadosQuizService } from './ReporteResultadosQuizService.js';

const ALTO_FILA = 18;
/** @brief Posición horizontal de cada columna de la tabla de resultados. */
const COLUMNAS = {
  nombre: MARGEN + 8,
  calificacion: MARGEN + 165,
  puntaje: MARGEN + 240,
  tiempo: MARGEN + 300,
  enviado: MARGEN + 385,
};
const ANCHO_NOMBRE = 150;
/** @brief Ancho disponible para el enunciado de una pregunta con error. */
const ANCHO_ENUNCIADO = ANCHO_UTIL - 24;

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
  const fecha = valor ? new Date(valor) : null;
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha.toISOString().slice(0, 10) : 'Sin registro';
}

/** @brief Formatea una fecha como AAAA-MM-DD HH:MM (UTC) o "-" si no hay valor. */
function formatearFechaHora(valor) {
  const fecha = valor ? new Date(valor) : null;
  return fecha && !Number.isNaN(fecha.getTime())
    ? fecha.toISOString().slice(0, 16).replace('T', ' ')
    : '-';
}

/** @brief Tiempo empleado como "12 min 40 s", o "-" si no hay dato. */
function formatearTiempo(segundos) {
  if (segundos === null || segundos === undefined) return '-';
  return `${Math.floor(segundos / 60)} min ${segundos % 60} s`;
}

/** @brief Nota tal cual (S3), con hasta 2 decimales y sin ceros sobrantes (4.5, 3.75). */
function formatearNota(nota) {
  return nota === null || nota === undefined ? '-' : String(Number(nota.toFixed(2)));
}

/** @brief Porcentaje con 1 decimal y coma, como en el contrato: "66,7 %". */
function formatearPorcentaje(valor) {
  return `${valor.toFixed(1).replace('.', ',')} %`;
}

/** @brief Dibuja un recuadro gris con un aviso (sin estudiantes / sin resultados). */
function dibujarAviso(m, fuentes, texto) {
  m.asegurarEspacio(40);
  m.pagina.drawRectangle({ x: MARGEN, y: m.y - 30, width: ANCHO_UTIL, height: 30, color: COLORES.fondo });
  m.pagina.drawText(texto, {
    x: MARGEN + 12, y: m.y - 19, size: 10, font: fuentes.cursiva, color: COLORES.gris,
  });
  m.bajar(40);
}

/** @brief Título de sección; deja espacio para que no quede solo al final de una página. */
function dibujarSubtitulo(m, fuentes, texto) {
  m.asegurarEspacio(60);
  m.pagina.drawText(texto, { x: MARGEN, y: m.y - 12, size: 12, font: fuentes.titulo, color: COLORES.azul });
  m.bajar(26);
}

/** @brief Cabecera azul de la tabla de resultados individuales. */
function dibujarCabeceraTabla(m, fuentes) {
  const base = m.y - ALTO_FILA;
  m.pagina.drawRectangle({ x: MARGEN, y: base, width: ANCHO_UTIL, height: ALTO_FILA, color: COLORES.azul });
  [
    ['Nombre', COLUMNAS.nombre],
    ['Calificación', COLUMNAS.calificacion],
    ['Puntaje', COLUMNAS.puntaje],
    ['Tiempo', COLUMNAS.tiempo],
    ['Enviado', COLUMNAS.enviado],
  ].forEach(([titulo, x]) => {
    m.pagina.drawText(titulo, { x, y: base + 6, size: 8, font: fuentes.negrita, color: COLORES.blanco });
  });
  m.bajar(ALTO_FILA);
}

/** @brief Fila de un estudiante (CA-21.1). Repite la cabecera si la fila cae en una página nueva. */
function dibujarFila(m, fuentes, e, indice) {
  const paginaAntes = m.pagina;
  m.asegurarEspacio(ALTO_FILA);
  if (m.pagina !== paginaAntes) dibujarCabeceraTabla(m, fuentes);

  const p = m.pagina;
  const base = m.y - ALTO_FILA;
  if (indice % 2 === 1) {
    p.drawRectangle({ x: MARGEN, y: base, width: ANCHO_UTIL, height: ALTO_FILA, color: COLORES.fondo });
  }
  const dibujar = (texto, x, fuente = fuentes.texto, color = COLORES.texto) =>
    p.drawText(texto, { x, y: base + 6, size: 9, font: fuente, color });

  dibujar(recortar(e.nombre_completo, fuentes.texto, 9, ANCHO_NOMBRE), COLUMNAS.nombre);
  if (e.presento) {
    dibujar(formatearNota(e.calificacion), COLUMNAS.calificacion);
    dibujar(`${e.puntaje_obtenido ?? '-'}/${e.puntaje_maximo ?? '-'}`, COLUMNAS.puntaje);
    dibujar(formatearTiempo(e.tiempo_empleado_seg), COLUMNAS.tiempo);
    dibujar(formatearFechaHora(e.fecha_envio), COLUMNAS.enviado);
  } else {
    // CA-21.1: sin resultado => "No presentó" y guiones (no un 0).
    dibujar('No presentó', COLUMNAS.calificacion, fuentes.cursiva, COLORES.rojo);
    dibujar('-', COLUMNAS.puntaje);
    dibujar('-', COLUMNAS.tiempo);
    dibujar('-', COLUMNAS.enviado);
  }
  m.bajar(ALTO_FILA);
}

/** @brief Etiquetas con promedio, máxima, mínima y % que presentó (CA-21.2). */
function dibujarEstadisticas(m, fuentes, estadisticas) {
  m.asegurarEspacio(40);
  const etiquetas = [
    `Promedio: ${estadisticas.promedio === null ? '-' : estadisticas.promedio.toFixed(2)}`,
    `Máxima: ${formatearNota(estadisticas.maxima)}`,
    `Mínima: ${formatearNota(estadisticas.minima)}`,
    `Presentaron: ${estadisticas.presentaron} de ${estadisticas.total} (${formatearPorcentaje(estadisticas.porcentaje_presentaron)})`,
  ];
  let x = MARGEN;
  for (const texto of etiquetas) {
    x += dibujarEtiqueta(m.pagina, texto, {
      x, y: m.y - 16, fuente: fuentes.negrita, tamano: 8, fondo: COLORES.azulSuave, color: COLORES.azul,
    }) + 6;
  }
  m.bajar(34);
}

/** @brief Lista numerada de las preguntas con mayor porcentaje de error (CA-21.2, S4). */
function dibujarPreguntasConError(m, fuentes, preguntas) {
  m.asegurarEspacio(50);
  m.pagina.drawText('Preguntas con mayor porcentaje de error', {
    x: MARGEN, y: m.y - 10, size: 9.5, font: fuentes.negrita, color: COLORES.rojo,
  });
  m.bajar(20);

  preguntas.forEach((pregunta, indice) => {
    const lineas = partirEnLineas(limpiar(pregunta.enunciado), fuentes.texto, 9.5, ANCHO_ENUNCIADO);
    m.asegurarEspacio(lineas.length * 13 + 22);
    lineas.forEach((linea, j) => {
      m.pagina.drawText(j === 0 ? `${indice + 1}. ${linea}` : `    ${linea}`, {
        x: MARGEN, y: m.y - 10, size: 9.5, font: fuentes.texto, color: COLORES.texto,
      });
      m.bajar(13);
    });
    const detalle = `${formatearPorcentaje(pregunta.porcentaje_error)} (${pregunta.incorrectas} de ${pregunta.total_respuestas})`;
    m.pagina.drawText(detalle, {
      x: MARGEN + 24, y: m.y - 10, size: 8.5, font: fuentes.negrita, color: COLORES.rojo,
    });
    m.bajar(18);
  });
}

export const ReporteResultadosQuizPDFService = {
  /**
   * @brief CA-21.1, CA-21.2 y CA-21.3: genera el PDF de resultados de un quiz.
   * @param {{ id_usuario: number, rol: string }} usuario - Payload del JWT (req.usuario).
   * @param {string|number} idQuiz - Valor de :id.
   * @return {Promise<Uint8Array>} Bytes del PDF generado.
   * @throws {Error} 400, 403 o 404 de ReporteResultadosQuizService.obtenerDatos; en ese caso no
   * se genera ningún documento (CA-21.3).
   */
  async generarPdf(usuario, idQuiz) {
    const { generado_en: generadoEn, quiz, estudiantes, estadisticas, preguntas_con_error: preguntas } =
      await ReporteResultadosQuizService.obtenerDatos(usuario, idQuiz);

    const doc = await PDFDocument.create();
    const fuentes = await cargarFuentes(doc);
    const m = crearMaquetador(doc, fuentes, 'Resultados del quiz');

    dibujarEncabezado(m, fuentes, {
      etiqueta: 'REPORTE · RESULTADOS DEL QUIZ',
      titulo: limpiar(quiz.titulo),
      subtitulo: limpiar(`${quiz.curso_nombre} · Semana de corte ${quiz.semana_corte}`),
      insignias: [
        {
          texto: `${estudiantes.length} ${estudiantes.length === 1 ? 'estudiante' : 'estudiantes'}`,
          fondo: COLORES.rojoSuave,
          color: COLORES.rojo,
        },
        { texto: `Apertura ${formatearFecha(quiz.fecha_apertura)}`, fondo: COLORES.azulSuave, color: COLORES.azul },
        { texto: `Cierre ${formatearFecha(quiz.fecha_cierre)}`, fondo: COLORES.azulSuave, color: COLORES.azul },
      ],
    });
    m.pagina.drawText(`Generado el ${formatearFecha(generadoEn)} (UTC)`, {
      x: MARGEN, y: m.y, size: 8, font: fuentes.cursiva, color: COLORES.gris,
    });
    m.bajar(16);

    // CA-21.1: resultados individuales
    dibujarSubtitulo(m, fuentes, 'Resultados individuales');
    if (estudiantes.length === 0) {
      dibujarAviso(m, fuentes, 'No hay estudiantes inscritos en el curso de este quiz.');
    } else {
      m.asegurarEspacio(ALTO_FILA * 2);
      dibujarCabeceraTabla(m, fuentes);
      estudiantes.forEach((e, indice) => dibujarFila(m, fuentes, e, indice));
      m.bajar(14);
    }

    // CA-21.2: estadísticas del grupo (sin resultados no es un error: se indica en el documento)
    dibujarSubtitulo(m, fuentes, 'Estadísticas del grupo');
    if (!estadisticas) {
      dibujarAviso(m, fuentes, 'Aún no hay resultados para este quiz.');
    } else {
      dibujarEstadisticas(m, fuentes, estadisticas);
      if (preguntas.length > 0) dibujarPreguntasConError(m, fuentes, preguntas);
    }

    dibujarPies(doc, fuentes);
    return doc.save();
  },
};