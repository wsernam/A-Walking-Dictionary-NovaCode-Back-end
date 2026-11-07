/**
 * @file ReporteProgresoPDFService.js
 * @brief HU-018: genera el PDF del reporte de progreso individual (CA-18.1 y CA-18.2).
 *
 * Endpoint relacionado: GET /api/v1/reports/students/:id/progress/export-pdf.
 * Reutiliza el maquetado de ExportarPDFService (mismos márgenes, colores, encabezado y pie).
 * Los datos y la regla de acceso (CA-18.3) vienen de ReporteProgresoService.
 *
 * Secciones: datos del estudiante, palabras aportadas (por estado, coautorías y listado),
 * quices (fecha, calificación y nota promedio) y avance de repaso. Una sección sin información
 * muestra "Sin actividad registrada" en vez de fallar (CA-18.2).
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
  dibujarEtiqueta,
  dibujarPies,
} from './ExportarPDFService.js';
import { ReporteProgresoService } from './ReporteProgresoService.js';
import { limpiar, recortar, formatearFecha } from '../utils/formatoPdf.js';
import { dibujarSeccion, dibujarAviso, dibujarTabla } from '../utils/tablasPdf.js';

const SIN_ACTIVIDAD = 'Sin actividad registrada';

/** @brief Texto del estado de la tarjeta tal como se muestra en el reporte. */
const ETIQUETA_ESTADO = {
  pendiente_revision: 'Pendiente',
  revisado_docente: 'Aprobada',
  rechazada: 'Rechazada',
};

/** @brief Columnas de la tabla de palabras: posición X y ancho máximo del texto. */
const COLUMNAS_PALABRAS = [
  { titulo: 'Palabra', x: MARGEN + 8, ancho: 120 },
  { titulo: 'Traducción', x: MARGEN + 135, ancho: 140 },
  { titulo: 'Semana', x: MARGEN + 285, ancho: 45 },
  { titulo: 'Estado', x: MARGEN + 340, ancho: 75 },
  { titulo: 'Fecha', x: MARGEN + 425, ancho: 55 },
];

/** @brief Columnas de la tabla de quices. */
const COLUMNAS_QUICES = [
  { titulo: 'Quiz', x: MARGEN + 8, ancho: 215 },
  { titulo: 'Fecha', x: MARGEN + 235, ancho: 70 },
  { titulo: 'Puntaje', x: MARGEN + 320, ancho: 70 },
  { titulo: 'Calificación', x: MARGEN + 405, ancho: 70 },
];

/** @brief Datos del estudiante en dos columnas (etiqueta y valor). */
function dibujarDatosEstudiante(m, fuentes, estudiante) {
  const filas = [
    ['Nombre', estudiante.nombre_completo],
    ['Correo', estudiante.email],
    ['Código estudiantil', estudiante.codigo_estudiantil || 'Sin registro'],
    ['Nivel MCER', estudiante.nivel_ingles || 'Sin registro'],
    ['Curso', estudiante.cursos || 'Sin registro'],
  ];
  m.asegurarEspacio(filas.length * 15 + 8);
  for (const [etiqueta, valor] of filas) {
    m.bajar(15);
    m.pagina.drawText(etiqueta, { x: MARGEN, y: m.y, size: 9.5, font: fuentes.negrita, color: COLORES.gris });
    m.pagina.drawText(recortar(valor, fuentes.texto, 10, ANCHO_UTIL - 120), {
      x: MARGEN + 120, y: m.y, size: 10, font: fuentes.texto, color: COLORES.texto,
    });
  }
}

/** @brief CA-18.1: totales por estado y coautorías como etiquetas, y el listado de palabras. */
function dibujarPalabras(m, fuentes, palabras) {
  dibujarSeccion(m, fuentes, 'Palabras aportadas');
  m.asegurarEspacio(40);
  m.bajar(22);
  const etiquetas = [
    [`Total: ${palabras.total}`, COLORES.fondo, COLORES.texto],
    [`Pendientes: ${palabras.por_estado.pendiente_revision}`, COLORES.azulSuave, COLORES.azul],
    [`Aprobadas: ${palabras.por_estado.revisado_docente}`, COLORES.azulSuave, COLORES.azul],
    [`Rechazadas: ${palabras.por_estado.rechazada}`, COLORES.rojoSuave, COLORES.rojo],
    [`Coautorías: ${palabras.coautorias}`, COLORES.fondo, COLORES.texto],
  ];
  let x = MARGEN;
  for (const [texto, fondo, color] of etiquetas) {
    x += dibujarEtiqueta(m.pagina, texto, { x, y: m.y, fuente: fuentes.negrita, tamano: 8, fondo, color }) + 6;
  }
  m.bajar(6);

  if (palabras.listado.length === 0) {
    dibujarAviso(m, fuentes, 'Sin palabras aportadas');
    return;
  }
  dibujarTabla(m, fuentes, COLUMNAS_PALABRAS, palabras.listado.map((fila) => [
    fila.palabra,
    fila.traduccion,
    fila.semana === null || fila.semana === undefined ? 'Sin registro' : `Sem. ${fila.semana}`,
    ETIQUETA_ESTADO[fila.estado] ?? fila.estado,
    formatearFecha(fila.fecha_aporte),
  ]));
}

/** @brief CA-18.2: quices con fecha y calificación, y la nota promedio. */
function dibujarQuices(m, fuentes, quices) {
  dibujarSeccion(m, fuentes, 'Quices');
  if (quices.presentados === 0) {
    dibujarAviso(m, fuentes, SIN_ACTIVIDAD);
    return;
  }
  dibujarTabla(m, fuentes, COLUMNAS_QUICES, quices.listado.map((fila) => [
    fila.titulo,
    formatearFecha(fila.fecha_envio),
    `${fila.puntaje_obtenido} / ${fila.puntaje_maximo}`,
    fila.calificacion.toFixed(2),
  ]));
  m.asegurarEspacio(26);
  m.bajar(20);
  m.pagina.drawText(
    `Quices presentados: ${quices.presentados}   |   Nota promedio: ${quices.promedio.toFixed(2)}`,
    { x: MARGEN, y: m.y, size: 10, font: fuentes.negrita, color: COLORES.texto }
  );
}

/** @brief CA-18.2: número de tarjetas repasadas (modo de estudio) y último repaso. */
function dibujarRepaso(m, fuentes, repaso) {
  dibujarSeccion(m, fuentes, 'Avance de repaso');
  if (repaso.tarjetas_repasadas === 0) {
    dibujarAviso(m, fuentes, SIN_ACTIVIDAD);
    return;
  }
  m.asegurarEspacio(26);
  m.bajar(18);
  m.pagina.drawText(
    `Tarjetas repasadas: ${repaso.tarjetas_repasadas}   |   Último repaso: ${formatearFecha(repaso.fecha_ultimo_repaso)}`,
    { x: MARGEN, y: m.y, size: 10, font: fuentes.texto, color: COLORES.texto }
  );
}

export const ReporteProgresoPDFService = {
  /**
   * @brief CA-18.1, CA-18.2 y CA-18.3: genera el PDF del reporte de progreso individual.
   * @param {{ id_usuario: number, rol: string }} usuario - Payload del JWT (req.usuario).
   * @param {string|number} idEstudiante - Valor de :id en la ruta.
   * @return {Promise<Uint8Array>} Bytes del PDF generado.
   * @throws {Error} 400, 403 o 404 de ReporteProgresoService.obtenerDatos; no se genera documento.
   */
  async generarPdf(usuario, idEstudiante) {
    const { generado_en: generadoEn, estudiante, palabras, quices, repaso } =
      await ReporteProgresoService.obtenerDatos(usuario, idEstudiante);

    const doc = await PDFDocument.create();
    const fuentes = await cargarFuentes(doc);
    const m = crearMaquetador(doc, fuentes, 'Reporte de progreso individual');

    const insignias = [
      { texto: `Nivel ${limpiar(estudiante.nivel_ingles || 'sin registro')}`, fondo: COLORES.rojoSuave, color: COLORES.rojo },
      { texto: `${palabras.total} ${palabras.total === 1 ? 'palabra' : 'palabras'}`, fondo: COLORES.azulSuave, color: COLORES.azul },
    ];
    dibujarEncabezado(m, fuentes, {
      etiqueta: 'REPORTE · PROGRESO INDIVIDUAL',
      titulo: limpiar(estudiante.nombre_completo),
      subtitulo: `Reporte de progreso individual · Generado el ${formatearFecha(generadoEn)} (UTC)`,
      insignias,
    });

    dibujarDatosEstudiante(m, fuentes, estudiante);
    dibujarPalabras(m, fuentes, palabras);
    dibujarQuices(m, fuentes, quices);
    dibujarRepaso(m, fuentes, repaso);

    dibujarPies(doc, fuentes);
    return doc.save();
  },
};
