/**
 * @file ExportarPDFService.js
 * @brief HU-3.3: generación de PDF maquetado del mazo (lista de términos) y del quiz (hoja de
 * preguntas + hoja de respuestas separada), para poder fotocopiar el material sin conectividad.
 *
 * Endpoints relacionados: GET /api/v1/decks/:id/export-pdf, GET /api/v1/quizzes/:id/export-pdf
 * Almacenamiento: lee de tarjeta/etiqueta_contexto (mazo) y de pregunta_quiz (quiz); no
 * requiere tabla propia. El PDF se arma en memoria y se devuelve como bytes: no se guarda en
 * disco.
 *
 * @note DISEÑO (CA-3.3.3): usa los colores de la app (azul marino del rol docente y rojo
 * Unicauca) solo como acentos —títulos, números, líneas y etiquetas— y no como rellenos grandes,
 * para que el documento siga siendo legible y económico al fotocopiarlo en blanco y negro.
 *
 * @note ALCANCE (supuestos pendientes de validar, no documentados literalmente en el backlog):
 * - El backlog no aclara si el PDF de mazo debe incluir TODAS las tarjetas o solo las
 *   aprobadas. Se exportan únicamente las "revisado_docente" (las mismas que se usan para
 *   generar el quiz), porque son las que la docente ya validó como correctas para repartir en
 *   clase.
 * - CA-3.3.2 pide exportar el QUIZ con hoja de respuestas, pero el backlog solo documenta
 *   GET /api/v1/decks/:id/export-pdf (mazos). Se agregó GET /api/v1/quizzes/:id/export-pdf,
 *   análogo, como endpoint adicional aprobado por el equipo (D-06).
 * - Limitación conocida: se usan las fuentes estándar de pdf-lib (Helvetica / Times), con
 *   codificación WinAnsi (Windows-1252). Cubre español/inglés normal (incluye ñ, tildes, ¿, ¡),
 *   pero un carácter fuera de ese rango (emoji, IPA, alfabetos no latinos) haría fallar la
 *   exportación con un error; corregirlo implicaría incrustar una fuente TrueType propia
 *   (dependencia `fontkit` no pedida), así que se deja como mejora futura.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MazoRepository } from '../repositories/MazoRepository.js';
import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';
import { QuizRepository } from '../repositories/QuizRepository.js';
import { PreguntaQuizRepository } from '../repositories/PreguntaQuizRepository.js';

/** @brief Tamaño de página A4 en puntos PDF (72 puntos = 1 pulgada). */
const PAGE_SIZE = [595.28, 841.89];
const [ANCHO_PAGINA, ALTO_PAGINA] = PAGE_SIZE;
/** @brief Margen lateral en puntos (~2cm), para cumplir "márgenes académicos" (CA-3.3.3). */
const MARGEN = 56;
/** @brief Límite inferior del contenido; deja sitio al pie de página. */
const LIMITE_INFERIOR = 70;
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;
/** @brief Columna donde empieza el texto de cada tarjeta/pregunta, a la derecha del número. */
const X_CONTENIDO = MARGEN + 30;
const ANCHO_CONTENIDO = ANCHO_PAGINA - MARGEN - X_CONTENIDO;
const LETRAS = ['A', 'B', 'C', 'D'];

/**
 * @brief Convierte un color hexadecimal (#RRGGBB) al formato de pdf-lib.
 * @param {string} color - Color en formato "#RRGGBB".
 * @return {import('pdf-lib').RGB} Color para pdf-lib.
 */
function hex(color) {
  const n = parseInt(color.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** @brief Paleta de la app (sidebar del docente y del estudiante). */
const COLORES = {
  azul: hex('#14237A'),
  rojo: hex('#A51C30'),
  texto: hex('#1F2430'),
  gris: hex('#5F6573'),
  linea: hex('#DDE0E8'),
  fondo: hex('#F3F4F9'),
  azulSuave: hex('#E4E8F7'),
  rojoSuave: hex('#F8E5E8'),
  blanco: rgb(1, 1, 1),
};

/**
 * @brief Crea un Error con un código HTTP adjunto, para que el controlador que atrapa la
 * excepción sepa con qué status responder (mismo patrón que QuizService.js).
 * @param {number} status - Código HTTP a usar en la respuesta (404, ...).
 * @param {string} message - Mensaje de error legible para el cliente.
 * @return {Error} Error con la propiedad adicional `status`.
 */
function error(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * @brief Incrusta en el documento las fuentes estándar que usa el diseño.
 * @param {import('pdf-lib').PDFDocument} doc - Documento PDF.
 * @return {Promise<{texto, negrita, cursiva, titulo}>} Fuentes listas para dibujar.
 */
async function cargarFuentes(doc) {
  return {
    texto: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    cursiva: await doc.embedFont(StandardFonts.HelveticaOblique),
    titulo: await doc.embedFont(StandardFonts.TimesRomanBold),
  };
}

/**
 * @brief Parte un texto en líneas que caben dentro de un ancho máximo, midiendo cada palabra
 * con la fuente/tamaño dados (pdf-lib no hace ajuste de línea automático).
 * @param {string} texto - Texto a partir en líneas (null/undefined se trata como cadena vacía).
 * @param {import('pdf-lib').PDFFont} fuente - Fuente embebida con la que se medirá el texto.
 * @param {number} tamano - Tamaño de fuente en puntos.
 * @param {number} anchoMax - Ancho máximo disponible, en puntos.
 * @return {string[]} Líneas resultantes; siempre al menos una (posiblemente vacía).
 */
function partirEnLineas(texto, fuente, tamano, anchoMax) {
  const palabras = String(texto ?? '').split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(candidata, tamano) > anchoMax && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = candidata;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length > 0 ? lineas : [''];
}

/**
 * @brief Dibuja una etiqueta redondeada (como las de variante regional en la app).
 * @param {import('pdf-lib').PDFPage} pagina - Página donde dibujar.
 * @param {string} texto - Texto de la etiqueta.
 * @param {Object} opciones - { x, y (borde inferior), fuente, tamano, fondo, color }.
 * @return {number} Ancho ocupado, para colocar la siguiente etiqueta a la derecha.
 */
function dibujarEtiqueta(pagina, texto, { x, y, fuente, tamano = 8, fondo, color }) {
  const alto = tamano + 8;
  const ancho = fuente.widthOfTextAtSize(texto, tamano) + 16;
  const r = alto / 2;
  pagina.drawSvgPath(
    `M ${r} 0 H ${ancho - r} A ${r} ${r} 0 0 1 ${ancho - r} ${alto} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`,
    { x, y: y + alto, color: fondo }
  );
  pagina.drawText(texto, { x: x + 8, y: y + (alto - tamano * 0.7) / 2, size: tamano, font: fuente, color });
  return ancho;
}

/**
 * @brief Dibuja un número dentro de un círculo de color (numeración de tarjetas y preguntas).
 * @param {import('pdf-lib').PDFPage} pagina - Página donde dibujar.
 * @param {number} numero - Número a mostrar.
 * @param {Object} opciones - { x, y (centro), fuente, radio }.
 */
function dibujarNumero(pagina, numero, { x, y, fuente, radio = 9 }) {
  const texto = String(numero);
  const tamano = texto.length > 2 ? 7 : 8.5;
  pagina.drawCircle({ x, y, size: radio, color: COLORES.azul });
  pagina.drawText(texto, {
    x: x - fuente.widthOfTextAtSize(texto, tamano) / 2,
    y: y - tamano * 0.35,
    size: tamano,
    font: fuente,
    color: COLORES.blanco,
  });
}

/**
 * @brief Helper de maquetado: mantiene la página y la posición Y actuales y crea páginas nuevas
 * al llegar al límite inferior (CA-3.3.3, estructura limpia sin contenido cortado entre
 * páginas). Las páginas de continuación llevan un encabezado corrido con el título.
 * @param {import('pdf-lib').PDFDocument} doc - Documento PDF.
 * @param {Object} fuentes - Fuentes de cargarFuentes().
 * @param {string} tituloCorrido - Texto del encabezado de las páginas de continuación.
 * @return {Object} { pagina, y, bajar(d), asegurarEspacio(alto), nuevaPagina(), paginaLimpia() }.
 */
function crearMaquetador(doc, fuentes, tituloCorrido) {
  let pagina = doc.addPage(PAGE_SIZE);
  let y = ALTO_PAGINA - MARGEN;

  function paginaLimpia() {
    pagina = doc.addPage(PAGE_SIZE);
    y = ALTO_PAGINA - MARGEN;
  }

  function nuevaPagina() {
    paginaLimpia();
    pagina.drawRectangle({ x: 0, y: ALTO_PAGINA - 4, width: ANCHO_PAGINA, height: 4, color: COLORES.azul });
    pagina.drawText(tituloCorrido, { x: MARGEN, y: ALTO_PAGINA - 32, size: 8, font: fuentes.texto, color: COLORES.gris });
    pagina.drawLine({
      start: { x: MARGEN, y: ALTO_PAGINA - 40 },
      end: { x: ANCHO_PAGINA - MARGEN, y: ALTO_PAGINA - 40 },
      thickness: 0.5,
      color: COLORES.linea,
    });
    y = ALTO_PAGINA - 64;
  }

  return {
    get pagina() { return pagina; },
    get y() { return y; },
    bajar(d) { y -= d; },
    asegurarEspacio(alto) { if (y - alto < LIMITE_INFERIOR) nuevaPagina(); },
    nuevaPagina,
    paginaLimpia,
  };
}

/**
 * @brief Dibuja el encabezado de portada: franja azul superior, fondo suave, etiqueta en rojo,
 * título con serif (como en la app), subtítulo y etiquetas.
 * @param {Object} m - Maquetador (debe estar al inicio de una página).
 * @param {Object} fuentes - Fuentes de cargarFuentes().
 * @param {Object} datos - { etiqueta, titulo, subtitulo, insignias: [{texto, fondo, color}] }.
 */
function dibujarEncabezado(m, fuentes, { etiqueta, titulo, subtitulo, insignias = [] }) {
  const p = m.pagina;
  const lineasTitulo = partirEnLineas(titulo, fuentes.titulo, 22, ANCHO_UTIL);
  const alto = 46 + lineasTitulo.length * 25 + (subtitulo ? 16 : 0) + (insignias.length ? 26 : 0) + 4;
  const base = ALTO_PAGINA - alto;

  p.drawRectangle({ x: 0, y: base, width: ANCHO_PAGINA, height: alto, color: COLORES.fondo });
  p.drawRectangle({ x: 0, y: ALTO_PAGINA - 5, width: ANCHO_PAGINA, height: 5, color: COLORES.azul });
  p.drawLine({ start: { x: 0, y: base }, end: { x: ANCHO_PAGINA, y: base }, thickness: 1, color: COLORES.rojo });

  let y = ALTO_PAGINA - 30;
  p.drawText(etiqueta, { x: MARGEN, y, size: 7.5, font: fuentes.negrita, color: COLORES.rojo });
  y -= 26;
  for (const linea of lineasTitulo) {
    p.drawText(linea, { x: MARGEN, y, size: 22, font: fuentes.titulo, color: COLORES.azul });
    y -= 25;
  }
  if (subtitulo) {
    y += 6;
    p.drawText(subtitulo, { x: MARGEN, y, size: 10.5, font: fuentes.texto, color: COLORES.gris });
    y -= 10;
  }
  let x = MARGEN;
  for (const { texto, fondo, color } of insignias) {
    x += dibujarEtiqueta(p, texto, { x, y: y - 16, fuente: fuentes.negrita, tamano: 8, fondo, color }) + 6;
  }

  m.bajar(alto - (ALTO_PAGINA - m.y) + 24);
}

/**
 * @brief Dibuja el pie de todas las páginas (nombre de la plataforma y "Página X de Y"). Se
 * llama al final, cuando ya se conoce el total de páginas.
 * @param {import('pdf-lib').PDFDocument} doc - Documento PDF.
 * @param {Object} fuentes - Fuentes de cargarFuentes().
 */
function dibujarPies(doc, fuentes) {
  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: MARGEN, y: 44 }, end: { x: ANCHO_PAGINA - MARGEN, y: 44 }, thickness: 0.5, color: COLORES.linea });
    p.drawText('A Walking Dictionary · Literatura Anglófona · Universidad del Cauca', {
      x: MARGEN, y: 30, size: 7.5, font: fuentes.texto, color: COLORES.gris,
    });
    const numero = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(numero, {
      x: ANCHO_PAGINA - MARGEN - fuentes.texto.widthOfTextAtSize(numero, 7.5),
      y: 30, size: 7.5, font: fuentes.texto, color: COLORES.gris,
    });
  });
}

/**
 * @brief Dibuja (o solo mide) el bloque de una tarjeta del mazo: número, palabra, traducción,
 * definición, ejemplo y etiquetas de contexto. Medir primero permite no partir una tarjeta
 * entre dos páginas.
 * @param {import('pdf-lib').PDFPage|null} p - Página donde dibujar; null para solo medir.
 * @param {number} yTop - Borde superior del bloque.
 * @param {Object} datos - { numero, tarjeta, registro, variante, fuentes }.
 * @return {number} Alto ocupado por el bloque.
 */
function bloqueTarjeta(p, yTop, { numero, tarjeta, registro, variante, fuentes }) {
  const anchoPalabra = fuentes.titulo.widthOfTextAtSize(tarjeta.palabra, 14);
  const enLinea = anchoPalabra + 12 + fuentes.cursiva.widthOfTextAtSize(tarjeta.traduccion, 11) <= ANCHO_CONTENIDO;
  const lineasDef = partirEnLineas(tarjeta.definicion, fuentes.texto, 10, ANCHO_CONTENIDO);
  const lineasEj = tarjeta.ejemplo
    ? partirEnLineas(`“${tarjeta.ejemplo}”`, fuentes.cursiva, 9.5, ANCHO_CONTENIDO)
    : [];

  let b = yTop - 13;
  if (p) {
    dibujarNumero(p, numero, { x: MARGEN + 10, y: b + 4, fuente: fuentes.negrita });
    p.drawText(tarjeta.palabra, { x: X_CONTENIDO, y: b, size: 14, font: fuentes.titulo, color: COLORES.azul });
  }
  if (enLinea) {
    if (p) p.drawText(tarjeta.traduccion, { x: X_CONTENIDO + anchoPalabra + 12, y: b, size: 11, font: fuentes.cursiva, color: COLORES.rojo });
  } else {
    b -= 15;
    if (p) p.drawText(tarjeta.traduccion, { x: X_CONTENIDO, y: b, size: 11, font: fuentes.cursiva, color: COLORES.rojo });
  }
  b -= 16;
  for (const linea of lineasDef) {
    if (p) p.drawText(linea, { x: X_CONTENIDO, y: b, size: 10, font: fuentes.texto, color: COLORES.texto });
    b -= 13;
  }
  if (lineasEj.length) {
    b -= 1;
    for (const linea of lineasEj) {
      if (p) p.drawText(linea, { x: X_CONTENIDO, y: b, size: 9.5, font: fuentes.cursiva, color: COLORES.gris });
      b -= 12.5;
    }
  }
  if (registro || variante) {
    b -= 4;
    let x = X_CONTENIDO;
    if (p && registro) x += dibujarEtiqueta(p, registro, { x, y: b - 4, fuente: fuentes.negrita, tamano: 7.5, fondo: COLORES.rojoSuave, color: COLORES.rojo }) + 6;
    if (p && variante) dibujarEtiqueta(p, variante, { x, y: b - 4, fuente: fuentes.negrita, tamano: 7.5, fondo: COLORES.azulSuave, color: COLORES.azul });
    b -= 14;
  }
  b -= 2;
  if (p) p.drawLine({ start: { x: X_CONTENIDO, y: b }, end: { x: ANCHO_PAGINA - MARGEN, y: b }, thickness: 0.5, color: COLORES.linea });
  return yTop - b + 12;
}

/**
 * @brief Dibuja (o solo mide) una pregunta del quiz: número, enunciado y opciones con un
 * círculo para marcar la letra.
 * @param {import('pdf-lib').PDFPage|null} p - Página donde dibujar; null para solo medir.
 * @param {number} yTop - Borde superior del bloque.
 * @param {Object} datos - { numero, pregunta, fuentes }.
 * @return {number} Alto ocupado por el bloque.
 */
function bloquePregunta(p, yTop, { numero, pregunta, fuentes }) {
  let b = yTop - 13;
  if (p) dibujarNumero(p, numero, { x: MARGEN + 10, y: b + 4, fuente: fuentes.negrita });
  for (const linea of partirEnLineas(pregunta.enunciado, fuentes.negrita, 11, ANCHO_CONTENIDO)) {
    if (p) p.drawText(linea, { x: X_CONTENIDO, y: b, size: 11, font: fuentes.negrita, color: COLORES.texto });
    b -= 14;
  }
  b -= 6;
  const opciones = [pregunta.opcion_a, pregunta.opcion_b, pregunta.opcion_c, pregunta.opcion_d];
  opciones.forEach((opcion, i) => {
    if (!opcion) return;
    const lineas = partirEnLineas(opcion, fuentes.texto, 10.5, ANCHO_CONTENIDO - 24);
    if (p) {
      p.drawCircle({ x: X_CONTENIDO + 7, y: b + 3.5, size: 7, borderColor: COLORES.azul, borderWidth: 0.9 });
      const ancho = fuentes.negrita.widthOfTextAtSize(LETRAS[i], 7.5);
      p.drawText(LETRAS[i], { x: X_CONTENIDO + 7 - ancho / 2, y: b + 1, size: 7.5, font: fuentes.negrita, color: COLORES.azul });
    }
    lineas.forEach((linea, j) => {
      if (p) p.drawText(linea, { x: X_CONTENIDO + 24, y: b, size: 10.5, font: fuentes.texto, color: COLORES.texto });
      b -= j === lineas.length - 1 ? 19 : 13;
    });
  });
  return yTop - b + 6;
}

export const ExportarPDFService = {
  /**
   * @brief CA-3.3.1: genera el PDF de un mazo con término, traducción, definición, ejemplo y
   * contexto (registro / variante regional) de cada tarjeta aprobada, listo para fotocopiar
   * (CA-3.3.3: márgenes académicos, tipografía legible, estructura limpia).
   * @param {number} id_mazo - Id del mazo a exportar.
   * @return {Promise<Uint8Array>} Bytes del PDF generado.
   * @throws {Error} status 404 si el mazo no existe.
   */
  async generarPdfMazo(id_mazo) {
    const mazo = await MazoRepository.obtenerPorId(id_mazo);
    if (!mazo) {
      throw error(404, 'Mazo no encontrado');
    }

    const tarjetas = await TarjetaRepository.listarAprobadasPorMazos([id_mazo]);

    const doc = await PDFDocument.create();
    const fuentes = await cargarFuentes(doc);
    const m = crearMaquetador(doc, fuentes, `${mazo.nombre_lectura} · Semana ${mazo.semana}`);

    const insignias = [];
    if (mazo.variante_regional_predeterminada) {
      insignias.push({ texto: mazo.variante_regional_predeterminada, fondo: COLORES.azulSuave, color: COLORES.azul });
    }
    insignias.push({
      texto: `${tarjetas.length} ${tarjetas.length === 1 ? 'término' : 'términos'}`,
      fondo: COLORES.rojoSuave,
      color: COLORES.rojo,
    });
    dibujarEncabezado(m, fuentes, {
      etiqueta: `SEMANA ${mazo.semana} · MAZO DE VOCABULARIO`,
      titulo: mazo.nombre_lectura,
      subtitulo: mazo.autor,
      insignias,
    });

    if (tarjetas.length === 0) {
      m.pagina.drawRectangle({ x: MARGEN, y: m.y - 40, width: ANCHO_UTIL, height: 40, color: COLORES.fondo });
      m.pagina.drawText('Este mazo todavía no tiene tarjetas revisado_docente para exportar.', {
        x: MARGEN + 14, y: m.y - 24, size: 10, font: fuentes.cursiva, color: COLORES.gris,
      });
    }

    for (const [indice, tarjeta] of tarjetas.entries()) {
      const etiquetas = await EtiquetaContextoRepository.listarPorTarjeta(tarjeta.id_tarjeta);
      const datos = {
        numero: indice + 1,
        tarjeta,
        registro: etiquetas.find((e) => e.tipo === 'registro')?.valor,
        variante: etiquetas.find((e) => e.tipo === 'variante_regional')?.valor,
        fuentes,
      };
      m.asegurarEspacio(bloqueTarjeta(null, m.y, datos));
      m.bajar(bloqueTarjeta(m.pagina, m.y, datos));
    }

    dibujarPies(doc, fuentes);
    return doc.save();
  },

  /**
   * @brief CA-3.3.2: genera el PDF del quiz con una hoja de preguntas de opción múltiple y, en
   * página(s) separadas, la hoja de respuestas correctas — listo para fotocopiar (CA-3.3.3).
   * @param {number} id_quiz - Id del quiz a exportar.
   * @return {Promise<Uint8Array>} Bytes del PDF generado.
   * @throws {Error} status 404 si el quiz no existe o si todavía no tiene preguntas generadas
   * (ver QuizService.generar).
   */
  async generarPdfQuiz(id_quiz) {
    const quiz = await QuizRepository.obtenerPorId(id_quiz);
    if (!quiz) {
      throw error(404, 'Quiz no encontrado');
    }

    const preguntas = await PreguntaQuizRepository.listarPorQuiz(id_quiz);
    if (preguntas.length === 0) {
      throw error(404, 'El quiz no tiene preguntas generadas todavía');
    }

    const doc = await PDFDocument.create();
    const fuentes = await cargarFuentes(doc);
    const m = crearMaquetador(doc, fuentes, quiz.titulo);

    const insignias = [{ texto: `${preguntas.length} preguntas`, fondo: COLORES.azulSuave, color: COLORES.azul }];
    if (quiz.semana_corte) {
      insignias.push({ texto: `Hasta la semana ${quiz.semana_corte}`, fondo: COLORES.rojoSuave, color: COLORES.rojo });
    }
    dibujarEncabezado(m, fuentes, {
      etiqueta: 'QUIZ ACUMULATIVO',
      titulo: quiz.titulo,
      subtitulo: `Tiempo límite: ${quiz.tiempo_limite_min} minutos`,
      insignias,
    });

    // Recuadro de datos del estudiante.
    const p = m.pagina;
    const altoDatos = 56;
    p.drawRectangle({
      x: MARGEN, y: m.y - altoDatos, width: ANCHO_UTIL, height: altoDatos,
      borderColor: COLORES.linea, borderWidth: 0.8,
    });
    const campo = (etiqueta, x, y, ancho) => {
      p.drawText(etiqueta, { x, y, size: 9, font: fuentes.negrita, color: COLORES.gris });
      const inicio = x + fuentes.negrita.widthOfTextAtSize(etiqueta, 9) + 6;
      p.drawLine({ start: { x: inicio, y: y - 2 }, end: { x: x + ancho, y: y - 2 }, thickness: 0.6, color: COLORES.gris });
    };
    campo('Nombre:', MARGEN + 12, m.y - 21, ANCHO_UTIL - 24);
    const tercio = (ANCHO_UTIL - 24) / 3;
    campo('Código:', MARGEN + 12, m.y - 43, tercio - 12);
    campo('Fecha:', MARGEN + 12 + tercio, m.y - 43, tercio - 12);
    campo('Nota:', MARGEN + 12 + tercio * 2, m.y - 43, tercio);
    m.bajar(altoDatos + 14);
    p.drawText('Marca con una X la letra de la opción correcta.', {
      x: MARGEN, y: m.y, size: 9, font: fuentes.cursiva, color: COLORES.gris,
    });
    m.bajar(22);

    preguntas.forEach((pregunta, indice) => {
      const datos = { numero: indice + 1, pregunta, fuentes };
      m.asegurarEspacio(bloquePregunta(null, m.y, datos));
      m.bajar(bloquePregunta(m.pagina, m.y, datos));
    });

    // CA-3.3.2: hoja de respuestas en página(s) separadas de la hoja de preguntas.
    m.paginaLimpia();
    dibujarEncabezado(m, fuentes, {
      etiqueta: 'HOJA DE RESPUESTAS · SOLO DOCENTE',
      titulo: quiz.titulo,
      subtitulo: 'Clave de corrección',
      insignias: [{ texto: `${preguntas.length} preguntas`, fondo: COLORES.azulSuave, color: COLORES.azul }],
    });

    const columnas = { numero: MARGEN + 12, letra: MARGEN + 64, texto: MARGEN + 132 };
    const encabezadoTabla = () => {
      m.pagina.drawRectangle({ x: MARGEN, y: m.y - 22, width: ANCHO_UTIL, height: 22, color: COLORES.azul });
      [['#', columnas.numero], ['Opción', columnas.letra], ['Respuesta correcta', columnas.texto]].forEach(([t, x]) => {
        m.pagina.drawText(t, { x, y: m.y - 15, size: 9, font: fuentes.negrita, color: COLORES.blanco });
      });
      m.bajar(22);
    };
    encabezadoTabla();

    preguntas.forEach((pregunta, indice) => {
      if (m.y - 20 < LIMITE_INFERIOR) {
        m.nuevaPagina();
        encabezadoTabla();
      }
      const opciones = [pregunta.opcion_a, pregunta.opcion_b, pregunta.opcion_c, pregunta.opcion_d];
      const letra = LETRAS[opciones.findIndex((o) => o === pregunta.respuesta_correcta)] || '—';
      const fila = m.pagina;
      if (indice % 2 === 1) {
        fila.drawRectangle({ x: MARGEN, y: m.y - 20, width: ANCHO_UTIL, height: 20, color: COLORES.fondo });
      }
      fila.drawText(String(indice + 1), { x: columnas.numero, y: m.y - 14, size: 9.5, font: fuentes.texto, color: COLORES.gris });
      fila.drawText(letra, { x: columnas.letra + 10, y: m.y - 14, size: 11, font: fuentes.negrita, color: COLORES.rojo });
      const [textoCorrecto] = partirEnLineas(pregunta.respuesta_correcta, fuentes.texto, 10, ANCHO_PAGINA - MARGEN - columnas.texto - 8);
      fila.drawText(textoCorrecto, { x: columnas.texto, y: m.y - 14, size: 10, font: fuentes.texto, color: COLORES.texto });
      m.bajar(20);
    });
    m.pagina.drawLine({ start: { x: MARGEN, y: m.y }, end: { x: ANCHO_PAGINA - MARGEN, y: m.y }, thickness: 0.8, color: COLORES.azul });

    dibujarPies(doc, fuentes);
    return doc.save();
  },
};
