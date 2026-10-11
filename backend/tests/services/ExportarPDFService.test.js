// Pruebas unitarias de src/services/ExportarPDFService.js (HU-3.3, CA-3.3.1 a CA-3.3.3).
// Los repositorios se simulan, pero los PDF se generan de verdad con pdf-lib y se vuelven a leer.
// Se espía PDFPage.drawText (sin cambiar lo que hace) para saber qué texto quedó en qué página.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { ExportarPDFService } from '../../src/services/ExportarPDFService.js';
import { MazoRepository } from '../../src/repositories/MazoRepository.js';
import { TarjetaRepository } from '../../src/repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../../src/repositories/EtiquetaContextoRepository.js';
import { QuizRepository } from '../../src/repositories/QuizRepository.js';
import { PreguntaQuizRepository } from '../../src/repositories/PreguntaQuizRepository.js';

vi.mock('../../src/repositories/MazoRepository.js', () => ({ MazoRepository: { obtenerPorId: vi.fn() } }));
vi.mock('../../src/repositories/TarjetaRepository.js', () => ({
  TarjetaRepository: { listarAprobadasPorMazos: vi.fn() },
}));
vi.mock('../../src/repositories/EtiquetaContextoRepository.js', () => ({
  EtiquetaContextoRepository: { listarPorTarjeta: vi.fn() },
}));
vi.mock('../../src/repositories/QuizRepository.js', () => ({ QuizRepository: { obtenerPorId: vi.fn() } }));
vi.mock('../../src/repositories/PreguntaQuizRepository.js', () => ({
  PreguntaQuizRepository: { listarPorQuiz: vi.fn() },
}));

const A4 = [595.28, 841.89];

const mazo = {
  id_mazo: 3,
  nombre_lectura: 'Things Fall Apart',
  autor: 'Chinua Achebe',
  semana: 4,
  variante_regional_predeterminada: 'Nigeriano',
};

function tarjeta(i, extra = {}) {
  return {
    id_tarjeta: i,
    palabra: `word${i}`,
    traduccion: `traducción ${i}`,
    definicion: `Definición número ${i} con tildes: año, ¿cómo?, ¡bien!`,
    ejemplo: `Example sentence ${i}`,
    ...extra,
  };
}

const quiz = { id_quiz: 1, titulo: 'Quiz semanas 1-4', semana_corte: 4, tiempo_limite_min: 20 };
const pregunta = {
  id_pregunta: 1,
  enunciado: '¿Cuál es la traducción correcta de "cook"?',
  opcion_a: 'asar',
  opcion_b: 'cocinar',
  opcion_c: 'hervir',
  opcion_d: 'freír',
  respuesta_correcta: 'cocinar',
};

/** @brief Ejecuta `generar` registrando cada texto dibujado y la página (objeto PDFPage) donde quedó. */
async function generarRegistrandoTextos(generar) {
  const espia = vi.spyOn(PDFPage.prototype, 'drawText');
  const bytes = await generar();
  const textos = espia.mock.calls.map(([texto], i) => ({ texto, pagina: espia.mock.contexts[i] }));
  return { bytes, textos };
}

const paginaDe = (textos, buscado) => textos.find((t) => t.texto.includes(buscado))?.pagina;

beforeEach(() => {
  MazoRepository.obtenerPorId.mockResolvedValue(mazo);
  TarjetaRepository.listarAprobadasPorMazos.mockResolvedValue([tarjeta(1), tarjeta(2)]);
  EtiquetaContextoRepository.listarPorTarjeta.mockResolvedValue([
    { tipo: 'registro', valor: 'Formal' },
    { tipo: 'variante_regional', valor: 'Nigeriano' },
  ]);
  QuizRepository.obtenerPorId.mockResolvedValue(quiz);
  PreguntaQuizRepository.listarPorQuiz.mockResolvedValue([pregunta]);
});

describe('ExportarPDFService.generarPdfMazo — CA-3.3.1, CA-3.3.3', () => {
  it('CA-3.3.1: genera un PDF válido que se puede volver a abrir', async () => {
    const bytes = await ExportarPDFService.generarPdfMazo(3);

    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('CA-3.3.1 [SUPUESTO PENDIENTE P12]: exporta solo las tarjetas "revisado_docente" del mazo', async () => {
    await ExportarPDFService.generarPdfMazo(3);
    expect(TarjetaRepository.listarAprobadasPorMazos).toHaveBeenCalledWith([3]);
  });

  it('CA-3.3.1: incluye término, traducción, definición, ejemplo y contexto de cada tarjeta', async () => {
    const { textos } = await generarRegistrandoTextos(() => ExportarPDFService.generarPdfMazo(3));
    const todo = textos.map((t) => t.texto).join('\n');

    for (const esperado of ['word1', 'traducción 1', 'Definición número 1', 'Example sentence 1', 'Formal', 'Nigeriano', 'word2']) {
      expect(todo).toContain(esperado);
    }
  });

  it('CA-3.3.3: usa páginas A4 y reparte un mazo largo en varias páginas', async () => {
    TarjetaRepository.listarAprobadasPorMazos.mockResolvedValue(Array.from({ length: 40 }, (_, i) => tarjeta(i + 1)));

    const doc = await PDFDocument.load(await ExportarPDFService.generarPdfMazo(3));

    expect(doc.getPageCount()).toBeGreaterThan(1);
    for (const pagina of doc.getPages()) {
      const { width, height } = pagina.getSize();
      expect([width, height]).toEqual(A4);
    }
  });

  it('CA-3.3.3: ningún texto queda fuera de los márgenes de la página', async () => {
    TarjetaRepository.listarAprobadasPorMazos.mockResolvedValue(Array.from({ length: 40 }, (_, i) => tarjeta(i + 1)));
    const espia = vi.spyOn(PDFPage.prototype, 'drawText');

    await ExportarPDFService.generarPdfMazo(3);

    for (const [, opciones] of espia.mock.calls) {
      expect(opciones.x).toBeGreaterThanOrEqual(0);
      expect(opciones.x).toBeLessThan(A4[0]);
      expect(opciones.y).toBeGreaterThan(0);
      expect(opciones.y).toBeLessThan(A4[1]);
    }
  });

  it('CA-3.3.1: un mazo sin tarjetas aprobadas genera el PDF con un aviso', async () => {
    TarjetaRepository.listarAprobadasPorMazos.mockResolvedValue([]);

    const { textos } = await generarRegistrandoTextos(() => ExportarPDFService.generarPdfMazo(3));

    expect(textos.some((t) => t.texto.includes('todavía no tiene tarjetas'))).toBe(true);
  });

  it('CA-3.3.1: responde 404 si el mazo no existe', async () => {
    MazoRepository.obtenerPorId.mockResolvedValue(null);
    await expect(ExportarPDFService.generarPdfMazo(99)).rejects.toMatchObject({ status: 404 });
  });

  it('CA-3.3.3: soporta español (tildes, ñ, ¿ y ¡) pero un emoji hace fallar la exportación (limitación documentada)', async () => {
    await expect(ExportarPDFService.generarPdfMazo(3)).resolves.toBeInstanceOf(Uint8Array);

    TarjetaRepository.listarAprobadasPorMazos.mockResolvedValue([tarjeta(1, { palabra: 'dog 🐶' })]);
    await expect(ExportarPDFService.generarPdfMazo(3)).rejects.toThrow();
  });
});

describe('ExportarPDFService.generarPdfQuiz — CA-3.3.2, CA-3.3.3', () => {
  it('CA-3.3.2: la hoja de respuestas va en una página aparte de las preguntas', async () => {
    const { bytes, textos } = await generarRegistrandoTextos(() => ExportarPDFService.generarPdfQuiz(1));

    const paginaPreguntas = paginaDe(textos, 'Marca con una X');
    const paginaRespuestas = paginaDe(textos, 'HOJA DE RESPUESTAS');
    expect(paginaPreguntas).toBeDefined();
    expect(paginaRespuestas).toBeDefined();
    expect(paginaRespuestas).not.toBe(paginaPreguntas);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  it('CA-3.3.2: la clave marca la letra de la opción correcta (B → "cocinar") solo en la hoja de respuestas', async () => {
    const { textos } = await generarRegistrandoTextos(() => ExportarPDFService.generarPdfQuiz(1));
    const paginaRespuestas = paginaDe(textos, 'HOJA DE RESPUESTAS');
    const enRespuestas = textos.filter((t) => t.pagina === paginaRespuestas).map((t) => t.texto);

    expect(enRespuestas).toContain('B');
    expect(enRespuestas).toContain('cocinar');
    expect(textos.filter((t) => t.pagina !== paginaRespuestas).map((t) => t.texto)).not.toContain('Respuesta correcta');
  });

  it('CA-3.3.3: un quiz largo reparte preguntas y respuestas en varias páginas A4', async () => {
    PreguntaQuizRepository.listarPorQuiz.mockResolvedValue(
      Array.from({ length: 60 }, (_, i) => ({ ...pregunta, id_pregunta: i + 1 }))
    );

    const doc = await PDFDocument.load(await ExportarPDFService.generarPdfQuiz(1));

    expect(doc.getPageCount()).toBeGreaterThan(2);
    expect(doc.getPages().every((p) => p.getSize().width === A4[0] && p.getSize().height === A4[1])).toBe(true);
  });

  it('CA-3.3.2: responde 404 si el quiz no existe', async () => {
    QuizRepository.obtenerPorId.mockResolvedValue(null);
    await expect(ExportarPDFService.generarPdfQuiz(99)).rejects.toMatchObject({ status: 404 });
  });

  it('CA-3.3.2: responde 404 si el quiz no tiene preguntas generadas', async () => {
    PreguntaQuizRepository.listarPorQuiz.mockResolvedValue([]);
    await expect(ExportarPDFService.generarPdfQuiz(1)).rejects.toMatchObject({ status: 404 });
  });
});
