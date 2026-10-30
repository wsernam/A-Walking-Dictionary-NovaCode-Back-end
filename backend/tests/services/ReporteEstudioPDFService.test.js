import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';

vi.mock('../../src/services/ReporteEstudioService.js', () => ({
  ReporteEstudioService: { obtenerDatos: vi.fn() },
}));
// ExportarPDFService (de donde se reutiliza el maquetado) importa estos repositorios.
vi.mock('../../src/repositories/MazoRepository.js', () => ({ MazoRepository: {} }));
vi.mock('../../src/repositories/TarjetaRepository.js', () => ({ TarjetaRepository: {} }));
vi.mock('../../src/repositories/EtiquetaContextoRepository.js', () => ({ EtiquetaContextoRepository: {} }));
vi.mock('../../src/repositories/QuizRepository.js', () => ({ QuizRepository: {} }));
vi.mock('../../src/repositories/PreguntaQuizRepository.js', () => ({ PreguntaQuizRepository: {} }));

import { ReporteEstudioService } from '../../src/services/ReporteEstudioService.js';
import { ReporteEstudioPDFService } from '../../src/services/ReporteEstudioPDFService.js';

const docente = { id_usuario: 7, rol: 'docente' };

function estudiante(extra = {}) {
  return {
    id_inscripcion: 10,
    estudiante_id: 3,
    nombre_completo: 'Juan Estudiante',
    email: 'juan@unicauca.edu.co',
    curso_id: 1,
    curso_nombre: 'Literatura Anglófona',
    tarjetas_repasadas: 12,
    fecha_ultimo_repaso: new Date('2026-10-20T15:00:00Z'),
    valoraciones: { repetir: 1, dificil: 2, buena: 4, facil: 5 },
    vencidas: 3,
    sin_actividad: false,
    palabras_dificiles: [
      {
        palabra: 'ephemeral',
        factor_facilidad: 1.3,
        ultima_valoracion: 'Repetir',
        fecha_proximo_repaso: new Date('2026-11-01T00:00:00Z'),
      },
    ],
    ...extra,
  };
}

function sinActividad(extra = {}) {
  return estudiante({
    nombre_completo: 'Maria Estudiante',
    tarjetas_repasadas: 0,
    fecha_ultimo_repaso: null,
    valoraciones: { repetir: 0, dificil: 0, buena: 0, facil: 0 },
    vencidas: 0,
    sin_actividad: true,
    palabras_dificiles: [],
    ...extra,
  });
}

function datos(estudiantes) {
  return { generado_en: new Date('2026-10-30T12:00:00Z'), estudiantes };
}

describe('ReporteEstudioPDFService.generarPdf — HU-019 (CA-19.1, CA-19.2)', () => {
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
    vi.mocked(ReporteEstudioService.obtenerDatos).mockReset();
  });

  afterEach(() => {
    espia.mockRestore();
  });

  it('genera un PDF válido que se puede volver a abrir', async () => {
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([estudiante()]));

    const bytes = await ReporteEstudioPDFService.generarPdf(docente, undefined);
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBe(1);
    expect(textos).toContain('Reporte del modo de estudio');
  });

  it('pasa el usuario del JWT y el student_id al servicio de datos', async () => {
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([estudiante()]));

    await ReporteEstudioPDFService.generarPdf(docente, '5');

    expect(ReporteEstudioService.obtenerDatos).toHaveBeenCalledWith(docente, '5');
  });

  it('CA-19.1: muestra tarjetas repasadas, último repaso, vencidas y la distribución de valoraciones', async () => {
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([estudiante()]));

    await ReporteEstudioPDFService.generarPdf(docente, undefined);

    expect(textos).toContain('Juan Estudiante');
    expect(textos).toContain(
      'Tarjetas repasadas: 12   |   Último repaso: 2026-10-20   |   Repaso vencido: 3'
    );
    expect(textos).toContain('Repetir: 1');
    expect(textos).toContain('Difícil: 2');
    expect(textos).toContain('Buena: 4');
    expect(textos).toContain('Fácil: 5');
  });

  it('CA-19.1: los estudiantes sin repasos aparecen como "Sin actividad de estudio"', async () => {
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([sinActividad()]));

    await ReporteEstudioPDFService.generarPdf(docente, undefined);

    expect(textos).toContain('Maria Estudiante');
    expect(textos).toContain('Sin actividad de estudio');
    expect(textos).not.toContain('Palabras de mayor dificultad');
    expect(textos.some((t) => t.startsWith('Tarjetas repasadas'))).toBe(false);
  });

  it('CA-19.1: la portada cuenta los estudiantes y los que tienen actividad', async () => {
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([estudiante(), sinActividad()]));

    await ReporteEstudioPDFService.generarPdf(docente, undefined);

    expect(textos).toContain('2 estudiantes');
    expect(textos).toContain('1 con actividad');
  });

  it('CA-19.2: lista las palabras difíciles con factor, última valoración y próximo repaso', async () => {
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([estudiante()]));

    await ReporteEstudioPDFService.generarPdf(docente, undefined);

    expect(textos).toContain('Palabras de mayor dificultad');
    expect(textos).toContain('Palabra');
    expect(textos).toContain('Factor');
    expect(textos).toContain('Última valoración');
    expect(textos).toContain('Próximo repaso');
    expect(textos).toContain('ephemeral');
    expect(textos).toContain('1.30');
    expect(textos).toContain('Repetir');
    expect(textos).toContain('2026-11-01');
  });

  it('muestra "Sin registro" si la fecha de próximo repaso no existe', async () => {
    const e = estudiante();
    e.palabras_dificiles[0].fecha_proximo_repaso = null;
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([e]));

    await ReporteEstudioPDFService.generarPdf(docente, undefined);

    expect(textos).toContain('Sin registro');
  });

  it('reparte muchos estudiantes en varias páginas sin partir un bloque', async () => {
    const lista = Array.from({ length: 8 }, (_, i) => estudiante({
      id_inscripcion: 100 + i,
      nombre_completo: `Estudiante ${i + 1}`,
      palabras_dificiles: Array.from({ length: 10 }, (__, j) => ({
        palabra: `palabra${j}`,
        factor_facilidad: 1.3 + j / 100,
        ultima_valoracion: 'Difícil',
        fecha_proximo_repaso: new Date('2026-11-01T00:00:00Z'),
      })),
    }));
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos(lista));

    const bytes = await ReporteEstudioPDFService.generarPdf(docente, undefined);
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBeGreaterThan(1);
    for (let i = 1; i <= 8; i += 1) {
      expect(textos).toContain(`Estudiante ${i}`);
    }
  });

  it('recorta con "..." una palabra demasiado larga para su columna', async () => {
    const e = estudiante();
    e.palabras_dificiles[0].palabra = 'a'.repeat(200);
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([e]));

    await ReporteEstudioPDFService.generarPdf(docente, undefined);

    expect(textos.some((t) => t.startsWith('aaa') && t.endsWith('...'))).toBe(true);
  });

  it('un nombre con caracteres fuera de Latin-1 (emoji) no hace fallar el reporte', async () => {
    ReporteEstudioService.obtenerDatos.mockResolvedValue(
      datos([estudiante({ nombre_completo: 'Zoe 😀' })])
    );

    await expect(ReporteEstudioPDFService.generarPdf(docente, undefined)).resolves.toBeInstanceOf(Uint8Array);
    expect(textos.some((t) => t.startsWith('Zoe ?'))).toBe(true);
  });

  it('una lista vacía genera el PDF con un aviso', async () => {
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([]));

    await ReporteEstudioPDFService.generarPdf(docente, undefined);

    expect(textos).toContain('0 estudiantes');
    expect(textos).toContain('No hay estudiantes inscritos para este reporte.');
  });

  it('incluye la nota sobre la distribución (limitación S1)', async () => {
    ReporteEstudioService.obtenerDatos.mockResolvedValue(datos([estudiante()]));

    await ReporteEstudioPDFService.generarPdf(docente, undefined);

    expect(textos.some((t) => t.startsWith('La distribución de valoraciones cuenta la última'))).toBe(true);
  });

  it('CA-19.3: si el servicio de datos deniega el acceso (403), no se genera ningún documento', async () => {
    ReporteEstudioService.obtenerDatos.mockRejectedValue(
      Object.assign(new Error('No tiene permisos'), { status: 403, code: 'REPORT_FORBIDDEN' })
    );

    await expect(
      ReporteEstudioPDFService.generarPdf({ id_usuario: 3, rol: 'estudiante' }, '5')
    ).rejects.toMatchObject({ status: 403, code: 'REPORT_FORBIDDEN' });
    expect(textos).toHaveLength(0);
  });
});