/**
 * @file ReporteCursoPDFService.js
 * @brief HU-020: genera el PDF del reporte de estudiantes del curso (CA-20.1 y CA-20.2).
 *
 * Endpoint relacionado: GET /api/v1/reports/students/export-pdf?curso_id=.
 * Reutiliza el maquetado de ExportarPDFService (mismos márgenes, colores, encabezado y pie) y los
 * helpers de tabla de utils/tablasPdf.js. Los datos y la regla de acceso (CA-20.3) vienen de
 * ReporteCursoService.
 *
 * Secciones: encabezado con el nombre del curso y la fecha de generación; tabla de estudiantes
 * con sus aportes y una fila de totales del grupo (CA-20.1); y notas de los quices por
 * estudiante con su promedio, marcando "No presentó" donde corresponda (CA-20.2). Un curso sin
 * estudiantes o sin quices muestra un aviso en vez de fallar.
 *
 * @note Las notas se dibujan como una matriz (una fila por estudiante y una columna por quiz). Como
 * en una página A4 caben pocas columnas, los quices se reparten en tablas de hasta 4 columnas; cada
 * tabla repite al estudiante y su promedio general. Las columnas se llaman Q1, Q2... y una leyenda
 * da el título completo de cada quiz.
 *
 * @note Limitación conocida: se usan las fuentes estándar de pdf-lib (WinAnsi); los caracteres
 * fuera de Latin-1 se sustituyen por "?" (ver utils/formatoPdf.js).
 */

import { PDFDocument } from 'pdf-lib';
import {
  MARGEN,
  ANCHO_UTIL,
  COLORES,
  cargarFuentes,
  crearMaquetador,
  dibujarEncabezado,
  dibujarPies,
} from './ExportarPDFService.js';
import { ReporteCursoService } from './ReporteCursoService.js';
import { limpiar, recortar, formatearFecha } from '../utils/formatoPdf.js';
import { dibujarSeccion, dibujarAviso, dibujarTabla, dibujarFilaTotales } from '../utils/tablasPdf.js';

/** @brief Cantidad máxima de quices por tabla de notas (caben en el ancho de la página). */
const QUICES_POR_TABLA = 4;
/** @brief Texto de la celda de un quiz que el estudiante no presentó (CA-20.2). */
const NO_PRESENTO = 'No presentó';
const SIN_PROMEDIO = 'N/A';

/** @brief Columnas de la tabla de estudiantes y aportes: posición X y ancho máximo del texto. */
const COLUMNAS_ESTUDIANTES = [
  { titulo: 'Nombre', x: MARGEN + 8, ancho: 150 },
  { titulo: 'Código', x: MARGEN + 165, ancho: 75 },
  { titulo: 'Nivel MCER', x: MARGEN + 245, ancho: 48 },
  { titulo: 'Añadidas', x: MARGEN + 300, ancho: 50 },
  { titulo: 'Aprobadas', x: MARGEN + 357, ancho: 55 },
  { titulo: 'Repetidas', x: MARGEN + 419, ancho: 60 },
];

/** @brief Posición de las columnas de la tabla de notas: estudiante, quices (Q1...) y promedio. */
const X_ESTUDIANTE = MARGEN + 8;
const ANCHO_ESTUDIANTE = 170;
const X_PRIMER_QUIZ = MARGEN + 190;
const SEPARACION_QUIZ = 62;
const ANCHO_QUIZ = 56;
const X_PROMEDIO = MARGEN + 438;
const ANCHO_PROMEDIO = 42;

/** @brief Texto pequeño en cursiva y gris, para notas aclaratorias bajo un título o una tabla. */
function dibujarNota(m, fuentes, texto) {
  m.asegurarEspacio(16);
  m.bajar(14);
  m.pagina.drawText(recortar(texto, fuentes.cursiva, 8, ANCHO_UTIL), {
    x: MARGEN, y: m.y, size: 8, font: fuentes.cursiva, color: COLORES.gris,
  });
}

/** @brief CA-20.1: tabla de estudiantes con sus aportes y fila de totales del grupo. */
function dibujarEstudiantes(m, fuentes, estudiantes, totales) {
  dibujarSeccion(m, fuentes, 'Estudiantes y aportes');
  if (estudiantes.length === 0) {
    dibujarAviso(m, fuentes, 'No hay estudiantes inscritos en este curso.');
    return;
  }
  dibujarNota(
    m, fuentes,
    'Añadidas: palabras nuevas del estudiante. Aprobadas: las que la docente aprobó. Repetidas: palabras que ya estaban en el mazo.'
  );
  m.bajar(6);
  dibujarTabla(m, fuentes, COLUMNAS_ESTUDIANTES, estudiantes.map((e) => [
    e.nombre_completo,
    e.codigo_estudiantil || 'Sin registro',
    e.nivel_ingles || 'Sin registro',
    String(e.palabras_anadidas),
    String(e.palabras_aprobadas),
    String(e.coautorias),
  ]));
  dibujarFilaTotales(m, fuentes, COLUMNAS_ESTUDIANTES, [
    'Totales del grupo',
    '',
    '',
    String(totales.palabras_anadidas),
    String(totales.palabras_aprobadas),
    String(totales.coautorias),
  ]);
}

/** @brief Columnas de una tabla de notas para un grupo de quices (Q-n de cada uno). */
function columnasNotas(grupo) {
  return [
    { titulo: 'Estudiante', x: X_ESTUDIANTE, ancho: ANCHO_ESTUDIANTE },
    ...grupo.map(({ numero }, i) => ({
      titulo: `Q${numero}`,
      x: X_PRIMER_QUIZ + i * SEPARACION_QUIZ,
      ancho: ANCHO_QUIZ,
    })),
    { titulo: 'Promedio', x: X_PROMEDIO, ancho: ANCHO_PROMEDIO },
  ];
}

/** @brief CA-20.2: notas de cada estudiante en cada quiz y su promedio, con "No presentó". */
function dibujarNotasQuices(m, fuentes, estudiantes, quices) {
  dibujarSeccion(m, fuentes, 'Notas de los quices');
  if (quices.length === 0) {
    dibujarAviso(m, fuentes, 'Sin quices registrados en este curso.');
    return;
  }
  if (estudiantes.length === 0) {
    dibujarAviso(m, fuentes, 'No hay estudiantes inscritos en este curso.');
    return;
  }
  dibujarNota(
    m, fuentes,
    'Calificación de 0 a 5. El promedio solo cuenta los quices presentados: "No presentó" no se toma como 0.'
  );

  // Leyenda: Q1, Q2... con el título completo de cada quiz.
  quices.forEach((quiz, i) => {
    m.asegurarEspacio(14);
    m.bajar(12);
    m.pagina.drawText(recortar(`Q${i + 1}: ${quiz.titulo}`, fuentes.texto, 8.5, ANCHO_UTIL), {
      x: MARGEN, y: m.y, size: 8.5, font: fuentes.texto, color: COLORES.texto,
    });
  });
  m.bajar(6);

  // Los quices se reparten en tablas de hasta QUICES_POR_TABLA columnas.
  for (let inicio = 0; inicio < quices.length; inicio += QUICES_POR_TABLA) {
    const indices = quices.slice(inicio, inicio + QUICES_POR_TABLA).map((_, i) => inicio + i);
    const grupo = indices.map((indice) => ({ numero: indice + 1, indice }));
    m.bajar(6);
    dibujarTabla(m, fuentes, columnasNotas(grupo), estudiantes.map((e) => [
      e.nombre_completo,
      ...grupo.map(({ indice }) => (e.notas[indice] === null ? NO_PRESENTO : e.notas[indice].toFixed(2))),
      e.promedio === null ? SIN_PROMEDIO : e.promedio.toFixed(2),
    ]));
  }
}

export const ReporteCursoPDFService = {
  /**
   * @brief CA-20.1, CA-20.2 y CA-20.3: genera el PDF del reporte de estudiantes del curso.
   * @param {{ id_usuario: number, rol: string }} usuario - Payload del JWT (req.usuario).
   * @param {string|number|undefined} cursoId - Valor de ?curso_id.
   * @return {Promise<Uint8Array>} Bytes del PDF generado.
   * @throws {Error} 400, 403 o 404 de ReporteCursoService.obtenerDatos; no se genera documento.
   */
  async generarPdf(usuario, cursoId) {
    const { generado_en: generadoEn, curso, estudiantes, totales, quices } =
      await ReporteCursoService.obtenerDatos(usuario, cursoId);

    const doc = await PDFDocument.create();
    const fuentes = await cargarFuentes(doc);
    const m = crearMaquetador(doc, fuentes, 'Reporte de estudiantes del curso');

    dibujarEncabezado(m, fuentes, {
      etiqueta: 'REPORTE · ESTUDIANTES DEL CURSO',
      titulo: limpiar(curso.nombre),
      subtitulo: `Reporte de estudiantes del curso · Generado el ${formatearFecha(generadoEn)} (UTC)`,
      insignias: [
        {
          texto: `${totales.estudiantes} ${totales.estudiantes === 1 ? 'estudiante' : 'estudiantes'}`,
          fondo: COLORES.rojoSuave,
          color: COLORES.rojo,
        },
        {
          texto: `${quices.length} ${quices.length === 1 ? 'quiz' : 'quices'}`,
          fondo: COLORES.azulSuave,
          color: COLORES.azul,
        },
      ],
    });

    dibujarEstudiantes(m, fuentes, estudiantes, totales);
    dibujarNotasQuices(m, fuentes, estudiantes, quices);

    dibujarPies(doc, fuentes);
    return doc.save();
  },
};
