import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';

vi.mock('../../src/services/ReporteResultadosQuizService.js', () => ({
  ReporteResultadosQuizService: { obtenerDatos: vi.fn() },
}));
// ExportarPDFService (de donde se reutiliza el maquetado) importa estos repositorios.
vi.mock('../../src/repositories/MazoRepository.js', () => ({ MazoRepository: {} }));
vi.mock('../../src/repositories/TarjetaRepository.js', () => ({ TarjetaRepository: {} }));
vi.mock('../../src/repositories/EtiquetaContextoRepository.js', () => ({ EtiquetaContextoRepository: {} }));
vi.mock('../../src/repositories/QuizRepository.js', () => ({ QuizRepository: {} }));
vi.mock('../../src/repositories/PreguntaQuizRepository.js', () => ({ PreguntaQuizRepository: {} }));

import { ReporteResultadosQuizService } from '../../src/services/ReporteResultadosQuizService.js';
import { ReporteResultadosQuizPDFService } from '../../src/services/ReporteResultadosQuizPDFService.js';

const docente = { id_usuario: 7, rol: 'docente' };

function presento(nombre, extra = {}) {
  return {
    estudiante_id: 1,
    nombre_completo: nombre,
    presento: true,
    calificacion: 4.5,
    puntaje_obtenido: 9,
    puntaje_maximo: 10,
    tiempo_empleado_seg: 760,
    fecha_envio: new Date('2026-10-02T10:15:00Z'),
    ...extra,
  };
}

function noPresento(nombre) {
  return {
    estudiante_id: 2,
    nombre_completo: nombre,
    presento: false,
    calificacion: null,
    puntaje_obtenido: null,
    puntaje_maximo: null,
    tiempo_empleado_seg: null,
    fecha_envio: null,
  };
}

function datos(extra = {}) {
  return {
    generado_en: new Date('2026-11-04T12:00:00Z'),
    quiz: {
      id_quiz: 5,
      titulo: 'Quiz semanas 1-4',
      semana_corte: 4,
      fecha_apertura: new Date('2026-10-01T10:00:00Z'),
      fecha_cierre: new Date('2026-10-02T10:00:00Z'),
      curso_nombre: 'Literatura Anglófona',
    },
    estudiantes: [presento('Lucía Gómez'), presento('Mateo Rodríguez', { calificacion: 3.5, puntaje_obtenido: 7 }), noPresento('Javier Delgado')],
    estadisticas: {
      promedio: 4, maxima: 4.5, minima: 3.5, presentaron: 2, total: 3, porcentaje_presentaron: 200 / 3,
    },
    preguntas_con_error: [
      { enunciado: 'Que significa "thimble"?', incorrectas: 1, total_respuestas: 2, porcentaje_error: 50 },
      { enunciado: 'Que significa "mend"?', incorrectas: 1, total_respuestas: 2, porcentaje_error: 50 },
    ],
    ...extra,
  };
}

describe('ReporteResultadosQuizPDFService.generarPdf — HU-021 (CA-21.1, CA-21.2, CA-21.3)', () => {
  let textos;
  let espia;

  beforeEach(() => {
    // Se registran los textos dibujados para poder comprobar el contenido del PDF.
    textos = [];
    const original = PDFPage.prototype.drawText;
    espia = vi.spyOn(PDFPage.prototype, 'drawText').mockImplementation(function (texto, opciones) {
      textos.push(texto);
      return original.call(this, texto, opciones);
    });
    vi.mocked(ReporteResultadosQuizService.obtenerDatos).mockReset();
  });

  afterEach(() => {
    espia.mockRestore();
  });

  it('genera un PDF válido que se puede volver a abrir', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(datos());

    const bytes = await ReporteResultadosQuizPDFService.generarPdf(docente, '5');
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBe(1);
    expect(textos).toContain('Quiz semanas 1-4');
  });

  it('pasa el usuario del JWT y el id del quiz al servicio de datos', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(datos());

    await ReporteResultadosQuizPDFService.generarPdf(docente, '5');

    expect(ReporteResultadosQuizService.obtenerDatos).toHaveBeenCalledWith(docente, '5');
  });

  it('el encabezado muestra curso, semana de corte, fechas de apertura y cierre y fecha de generación', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(datos());

    await ReporteResultadosQuizPDFService.generarPdf(docente, 5);

    expect(textos).toContain('Literatura Anglófona · Semana de corte 4');
    expect(textos).toContain('Apertura 2026-10-01');
    expect(textos).toContain('Cierre 2026-10-02');
    expect(textos).toContain('Generado el 2026-11-04 (UTC)');
    expect(textos).toContain('3 estudiantes');
  });

  it('CA-21.1: lista nombre, calificación, puntaje, tiempo empleado y fecha de envío', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(datos());

    await ReporteResultadosQuizPDFService.generarPdf(docente, 5);

    ['Nombre', 'Calificación', 'Puntaje', 'Tiempo', 'Enviado'].forEach((titulo) => {
      expect(textos).toContain(titulo);
    });
    expect(textos).toContain('Lucía Gómez');
    expect(textos).toContain('4.5');
    expect(textos).toContain('9/10');
    expect(textos).toContain('12 min 40 s');
    expect(textos).toContain('2026-10-02 10:15');
    expect(textos).toContain('3.5');
    expect(textos).toContain('7/10');
  });

  it('CA-21.1: marca "No presentó" a los inscritos sin resultado y no les pone nota', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(datos());

    await ReporteResultadosQuizPDFService.generarPdf(docente, 5);

    expect(textos).toContain('Javier Delgado');
    expect(textos.filter((t) => t === 'No presentó')).toHaveLength(1);
    expect(textos).not.toContain('0');
  });

  it('[S3] muestra la nota tal cual, sin redondear a un decimal (3.75)', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(
      datos({ estudiantes: [presento('Lucía Gómez', { calificacion: 3.75 })] })
    );

    await ReporteResultadosQuizPDFService.generarPdf(docente, 5);

    expect(textos).toContain('3.75');
  });

  it('CA-21.2: muestra promedio, máxima, mínima y el porcentaje que presentó', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(datos());

    await ReporteResultadosQuizPDFService.generarPdf(docente, 5);

    expect(textos).toContain('Promedio: 4.00');
    expect(textos).toContain('Máxima: 4.5');
    expect(textos).toContain('Mínima: 3.5');
    expect(textos).toContain('Presentaron: 2 de 3 (66,7 %)');
  });

  it('CA-21.2: lista las preguntas con mayor porcentaje de error con su conteo', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(datos());

    await ReporteResultadosQuizPDFService.generarPdf(docente, 5);

    expect(textos).toContain('Preguntas con mayor porcentaje de error');
    expect(textos).toContain('1. Que significa "thimble"?');
    expect(textos).toContain('2. Que significa "mend"?');
    expect(textos.filter((t) => t === '50,0 % (1 de 2)')).toHaveLength(2);
  });

  it('CA-21.2: si aún no hay resultados lo indica y el PDF se genera sin error', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(
      datos({
        estudiantes: [noPresento('Javier Delgado'), noPresento('Ana Pérez')],
        estadisticas: null,
        preguntas_con_error: [],
      })
    );

    const bytes = await ReporteResultadosQuizPDFService.generarPdf(docente, 5);
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBe(1);
    expect(textos).toContain('Aún no hay resultados para este quiz.');
    expect(textos.filter((t) => t === 'No presentó')).toHaveLength(2);
    expect(textos).not.toContain('Preguntas con mayor porcentaje de error');
    expect(textos.some((t) => t.startsWith('Promedio'))).toBe(false);
  });

  it('un curso sin estudiantes genera el PDF con un aviso', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(
      datos({ estudiantes: [], estadisticas: null, preguntas_con_error: [] })
    );

    await expect(ReporteResultadosQuizPDFService.generarPdf(docente, 5)).resolves.toBeInstanceOf(Uint8Array);
    expect(textos).toContain('No hay estudiantes inscritos en el curso de este quiz.');
    expect(textos).toContain('0 estudiantes');
  });

  it('con 1 estudiante la insignia dice "1 estudiante" en singular', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(
      datos({ estudiantes: [presento('Lucía Gómez')] })
    );

    await ReporteResultadosQuizPDFService.generarPdf(docente, 5);

    expect(textos).toContain('1 estudiante');
  });

  it('reparte muchos estudiantes en varias páginas y repite la cabecera de la tabla', async () => {
    const lista = Array.from({ length: 60 }, (_, i) => presento(`Estudiante ${i + 1}`));
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(datos({ estudiantes: lista }));

    const bytes = await ReporteResultadosQuizPDFService.generarPdf(docente, 5);
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBeGreaterThan(1);
    for (let i = 1; i <= 60; i += 1) {
      expect(textos).toContain(`Estudiante ${i}`);
    }
    expect(textos.filter((t) => t === 'Calificación').length).toBeGreaterThan(1);
  });

  it('recorta con "..." un nombre demasiado largo para su columna', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(
      datos({ estudiantes: [presento('a'.repeat(200))] })
    );

    await ReporteResultadosQuizPDFService.generarPdf(docente, 5);

    expect(textos.some((t) => t.startsWith('aaa') && t.endsWith('...'))).toBe(true);
  });

  it('parte en varias líneas el enunciado largo de una pregunta con error', async () => {
    const enunciado = 'palabra '.repeat(40).trim();
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(
      datos({
        preguntas_con_error: [{ enunciado, incorrectas: 1, total_respuestas: 2, porcentaje_error: 50 }],
      })
    );

    await ReporteResultadosQuizPDFService.generarPdf(docente, 5);

    const lineas = textos.filter((t) => t.includes('palabra'));
    expect(lineas.length).toBeGreaterThan(1);
  });

  it('un nombre con caracteres fuera de Latin-1 (emoji) no hace fallar el reporte', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockResolvedValue(
      datos({ estudiantes: [presento('Zoe 😀')] })
    );

    await expect(ReporteResultadosQuizPDFService.generarPdf(docente, 5)).resolves.toBeInstanceOf(Uint8Array);
    expect(textos.some((t) => t.startsWith('Zoe ?'))).toBe(true);
  });

  it('CA-21.3: si el servicio de datos deniega el acceso (403) el error se propaga y no se genera PDF', async () => {
    const denegado = Object.assign(new Error('No tiene permisos para acceder a este recurso'), {
      status: 403,
      code: 'AUTH_FORBIDDEN',
    });
    ReporteResultadosQuizService.obtenerDatos.mockRejectedValue(denegado);

    await expect(
      ReporteResultadosQuizPDFService.generarPdf({ id_usuario: 3, rol: 'estudiante' }, 5)
    ).rejects.toMatchObject({ status: 403, code: 'AUTH_FORBIDDEN' });
    expect(textos).toEqual([]);
  });

  it('propaga el 404 de un quiz inexistente', async () => {
    ReporteResultadosQuizService.obtenerDatos.mockRejectedValue(
      Object.assign(new Error('Quiz no encontrado'), { status: 404, code: 'QUIZ_NOT_FOUND' })
    );

    await expect(ReporteResultadosQuizPDFService.generarPdf(docente, 99)).rejects.toMatchObject({
      status: 404,
      code: 'QUIZ_NOT_FOUND',
    });
  });
});