/**
 * @file ExportPDFService.js
 * @brief HU-3.3: generación de PDF maquetado del mazo (lista de términos) y del quiz (hoja de
 * preguntas + hoja de respuestas separada), para poder fotocopiar el material sin conectividad.
 *
 * Endpoints relacionados: GET /api/v1/decks/:id/export-pdf, GET /api/v1/quizzes/:id/export-pdf
 * Almacenamiento: lee de tarjeta/etiqueta_contexto (mazo) y de pregunta_quiz (quiz); no
 * requiere tabla propia.
 *
 * @note ALCANCE (supuestos pendientes de validar, no documentados literalmente en el backlog):
 * - El backlog no aclara si el PDF de mazo debe incluir TODAS las tarjetas o solo las
 *   aprobadas. Se exportan únicamente las "revisado_docente" (las mismas que se usan para
 *   generar el quiz), porque son las que la docente ya validó como correctas para repartir en
 *   clase.
 * - CA-3.3.2 pide exportar el QUIZ con hoja de respuestas, pero el backlog solo documenta
 *   GET /api/v1/decks/:id/export-pdf (mazos). Se agregó GET /api/v1/quizzes/:id/export-pdf,
 *   análogo, como endpoint adicional para cubrir esa CA (ver dock/CHANGELOG_BACKEND.md).
 * - Limitación conocida: se usa `StandardFonts.Helvetica` de pdf-lib, con codificación WinAnsi
 *   (Windows-1252). Cubre español/inglés normal (incluye ñ, tildes, ¿, ¡), pero un carácter
 *   fuera de ese rango (emoji, alfabetos no latinos) haría fallar la exportación con un error;
 *   corregirlo implicaría incrustar una fuente TrueType propia (dependencia `fontkit` no
 *   pedida), así que se deja como mejora futura.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MazoRepository } from '../repositories/MazoRepository.js';
import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';
import { QuizRepository } from '../repositories/QuizRepository.js';
import { PreguntaQuizRepository } from '../repositories/PreguntaQuizRepository.js';

/** @brief Tamaño de página A4 en puntos PDF (72 puntos = 1 pulgada). */
const PAGE_SIZE = [595.28, 841.89];
/** @brief Margen de página en puntos (~2cm), para cumplir "márgenes académicos" (CA-3.3.3). */
const MARGEN = 56;
const TAMANO_TITULO = 16;
const TAMANO_SUBTITULO = 11;
const TAMANO_TEXTO = 10.5;
const INTERLINEA = 14;

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
 * @brief Helper de maquetado: mantiene la posición Y actual sobre la página del PDF y crea
 * páginas nuevas automáticamente al llegar al margen inferior (CA-3.3.3, estructura limpia sin
 * contenido cortado entre páginas).
 * @param {import('pdf-lib').PDFDocument} doc - Documento PDF sobre el que se van agregando
 * páginas.
 * @return {{
 *   escribirLinea: function(string, import('pdf-lib').PDFFont, number, Object=): void,
 *   escribirParrafo: function(string, import('pdf-lib').PDFFont, number, Object=): void,
 *   espacio: function(number=): void,
 *   nuevaPagina: function(): void,
 *   y: number
 * }} Funciones de maquetado ligadas al estado interno (página actual, posición Y):
 * - `escribirLinea(texto, fuente, tamano, opciones)`: dibuja una sola línea; `opciones.sangria`
 *   desplaza el X inicial, `opciones.color` cambia el color, `opciones.interlinea` sobreescribe
 *   el salto de línea por defecto.
 * - `escribirParrafo(texto, fuente, tamano, opciones)`: parte `texto` en líneas (ver
 *   `partirEnLineas`) y las dibuja una tras otra.
 * - `espacio(alto)`: deja un espacio vertical en blanco.
 * - `nuevaPagina()`: fuerza un salto de página manual (usado para separar la hoja de
 *   respuestas del quiz).
 * - `y`: posición Y actual (de solo lectura), por si el llamador necesita consultarla.
 */
function crearMaquetador(doc) {
  let pagina = doc.addPage(PAGE_SIZE);
  let y = PAGE_SIZE[1] - MARGEN;
  const anchoUtil = PAGE_SIZE[0] - MARGEN * 2;

  function nuevaPagina() {
    pagina = doc.addPage(PAGE_SIZE);
    y = PAGE_SIZE[1] - MARGEN;
  }

  function asegurarEspacio(alturaNecesaria) {
    if (y - alturaNecesaria < MARGEN) {
      nuevaPagina();
    }
  }

  function escribirLinea(texto, fuente, tamano, opciones = {}) {
    asegurarEspacio(INTERLINEA);
    pagina.drawText(texto, {
      x: MARGEN + (opciones.sangria || 0),
      y,
      size: tamano,
      font: fuente,
      color: opciones.color || rgb(0, 0, 0),
    });
    y -= opciones.interlinea || INTERLINEA;
  }

  function escribirParrafo(texto, fuente, tamano, opciones = {}) {
    const sangria = opciones.sangria || 0;
    const lineas = partirEnLineas(texto, fuente, tamano, anchoUtil - sangria);
    lineas.forEach((linea) => escribirLinea(linea, fuente, tamano, opciones));
  }

  function espacio(alto = INTERLINEA / 2) {
    y -= alto;
  }

  return { escribirLinea, escribirParrafo, espacio, nuevaPagina, get y() { return y; } };
}

export const ExportPDFService = {
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
    const fuente = await doc.embedFont(StandardFonts.Helvetica);
    const fuenteNegrita = await doc.embedFont(StandardFonts.HelveticaBold);
    const m = crearMaquetador(doc);

    m.escribirLinea(mazo.nombre_lectura, fuenteNegrita, TAMANO_TITULO);
    m.escribirLinea(
      `Autor: ${mazo.autor}  |  Semana: ${mazo.semana}${mazo.variante_regional_predeterminada ? `  |  Variante: ${mazo.variante_regional_predeterminada}` : ''}`,
      fuente,
      TAMANO_SUBTITULO
    );
    m.espacio(INTERLINEA);

    if (tarjetas.length === 0) {
      m.escribirParrafo('Este mazo todavía no tiene tarjetas revisado_docente para exportar.', fuente, TAMANO_TEXTO);
    }

    for (const [indice, tarjeta] of tarjetas.entries()) {
      const etiquetas = await EtiquetaContextoRepository.listarPorTarjeta(tarjeta.id_tarjeta);
      const registro = etiquetas.find((e) => e.tipo === 'registro')?.valor;
      const variante = etiquetas.find((e) => e.tipo === 'variante_regional')?.valor;

      m.escribirLinea(`${indice + 1}. ${tarjeta.palabra} — ${tarjeta.traduccion}`, fuenteNegrita, TAMANO_TEXTO);
      m.escribirParrafo(tarjeta.definicion, fuente, TAMANO_TEXTO, { sangria: 14 });
      if (tarjeta.ejemplo) {
        m.escribirParrafo(`Ejemplo: ${tarjeta.ejemplo}`, fuente, TAMANO_TEXTO, { sangria: 14 });
      }
      if (registro || variante) {
        m.escribirParrafo(
          `Contexto: ${[registro, variante].filter(Boolean).join(' · ')}`,
          fuente,
          TAMANO_TEXTO,
          { sangria: 14 }
        );
      }
      m.espacio(INTERLINEA / 2);
    }

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
    const fuente = await doc.embedFont(StandardFonts.Helvetica);
    const fuenteNegrita = await doc.embedFont(StandardFonts.HelveticaBold);
    const m = crearMaquetador(doc);

    const LETRAS = ['A', 'B', 'C', 'D'];

    m.escribirLinea(quiz.titulo, fuenteNegrita, TAMANO_TITULO);
    m.escribirLinea(
      `Tiempo límite: ${quiz.tiempo_limite_min} min  |  ${preguntas.length} preguntas`,
      fuente,
      TAMANO_SUBTITULO
    );
    m.escribirLinea('Nombre del estudiante: _______________________________________________', fuente, TAMANO_SUBTITULO);
    m.espacio(INTERLINEA);

    preguntas.forEach((pregunta, indice) => {
      m.escribirParrafo(`${indice + 1}. ${pregunta.enunciado}`, fuenteNegrita, TAMANO_TEXTO);
      const opciones = [pregunta.opcion_a, pregunta.opcion_b, pregunta.opcion_c, pregunta.opcion_d];
      opciones.forEach((opcion, i) => {
        if (opcion) {
          m.escribirParrafo(`${LETRAS[i]}) ${opcion}`, fuente, TAMANO_TEXTO, { sangria: 14 });
        }
      });
      m.espacio(INTERLINEA / 2);
    });

    // CA-3.3.2: hoja de respuestas en página(s) separadas de la hoja de preguntas.
    m.nuevaPagina();
    m.escribirLinea('Hoja de respuestas', fuenteNegrita, TAMANO_TITULO);
    m.escribirLinea(quiz.titulo, fuente, TAMANO_SUBTITULO);
    m.espacio(INTERLINEA);

    preguntas.forEach((pregunta, indice) => {
      const opciones = [pregunta.opcion_a, pregunta.opcion_b, pregunta.opcion_c, pregunta.opcion_d];
      const letraCorrecta = LETRAS[opciones.findIndex((o) => o === pregunta.respuesta_correcta)] || '—';
      m.escribirLinea(`${indice + 1}. ${letraCorrecta}) ${pregunta.respuesta_correcta}`, fuente, TAMANO_TEXTO);
    });

    return doc.save();
  },
};
