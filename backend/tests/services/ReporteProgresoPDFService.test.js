import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';

vi.mock('../../src/services/ReporteProgresoService.js', () => ({
  ReporteProgresoService: { obtenerDatos: vi.fn() },
}));
// ExportarPDFService (de donde se reutiliza el maquetado) importa estos repositorios.
vi.mock('../../src/repositories/MazoRepository.js', () => ({ MazoRepository: {} }));
vi.mock('../../src/repositories/TarjetaRepository.js', () => ({ TarjetaRepository: {} }));
vi.mock('../../src/repositories/EtiquetaContextoRepository.js', () => ({ EtiquetaContextoRepository: {} }));
vi.mock('../../src/repositories/QuizRepository.js', () => ({ QuizRepository: {} }));
vi.mock('../../src/repositories/PreguntaQuizRepository.js', () => ({ PreguntaQuizRepository: {} }));

import { ReporteProgresoService } from '../../src/services/ReporteProgresoService.js';
import { ReporteProgresoPDFService } from '../../src/services/ReporteProgresoPDFService.js';

const docente = { id_usuario: 7, rol: 'docente' };

function palabra(extra = {}) {
  return {
    palabra: 'ephemeral',
    traduccion: 'efímero',
    estado: 'revisado_docente',
    semana: 3,
    fecha_aporte: new Date('2026-10-01T10:00:00Z'),
    ...extra,
  };
}

function datos(extra = {}) {
  return {
    generado_en: new Date('2026-11-03T12:00:00Z'),
    estudiante: {
      estudiante_id: 3,
      nombre_completo: 'Juan Estudiante',
      email: 'juan@unicauca.edu.co',
      codigo_estudiantil: '104618021234',
      nivel_ingles: 'B2',
      cursos: 'Literatura Anglófona',
    },
    palabras: {
      total: 3,
      por_estado: { pendiente_revision: 1, revisado_docente: 2, rechazada: 0 },
      coautorias: 4,
      listado: [palabra(), palabra({ palabra: 'wistful', traduccion: 'melancólico', estado: 'pendiente_revision' })],
    },
    quices: {
      presentados: 2,
      promedio: 3.75,
      listado: [
        { id_quiz: 1, titulo: 'Quiz 1', fecha_envio: new Date('2026-10-05T10:00:00Z'), calificacion: 4, puntaje_obtenido: 8, puntaje_maximo: 10 },
        { id_quiz: 2, titulo: 'Quiz 2', fecha_envio: new Date('2026-10-19T10:00:00Z'), calificacion: 3.5, puntaje_obtenido: 7, puntaje_maximo: 10 },
      ],
    },
    repaso: { tarjetas_repasadas: 12, fecha_ultimo_repaso: new Date('2026-10-20T15:00:00Z') },
    ...extra,
  };
}

function sinActividad() {
  return datos({
    palabras: {
      total: 0,
      por_estado: { pendiente_revision: 0, revisado_docente: 0, rechazada: 0 },
      coautorias: 0,
      listado: [],
    },
    quices: { presentados: 0, promedio: null, listado: [] },
    repaso: { tarjetas_repasadas: 0, fecha_ultimo_repaso: null },
  });
}

describe('ReporteProgresoPDFService.generarPdf — HU-018 (CA-18.1, CA-18.2)', () => {
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
    vi.mocked(ReporteProgresoService.obtenerDatos).mockReset();
  });

  afterEach(() => {
    espia.mockRestore();
  });

  it('genera un PDF válido que se puede volver a abrir', async () => {
    ReporteProgresoService.obtenerDatos.mockResolvedValue(datos());

    const bytes = await ReporteProgresoPDFService.generarPdf(docente, '3');
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBe(1);
    expect(textos).toContain('Juan Estudiante');
  });

  it('pasa el usuario del JWT y el id de la ruta al servicio de datos', async () => {
    ReporteProgresoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(ReporteProgresoService.obtenerDatos).toHaveBeenCalledWith(docente, '3');
  });

  it('CA-18.1: muestra nombre, código estudiantil y nivel MCER', async () => {
    ReporteProgresoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(textos).toContain('juan@unicauca.edu.co');
    expect(textos).toContain('104618021234');
    expect(textos).toContain('B2');
    expect(textos).toContain('Nivel B2');
  });

  it('CA-18.1: muestra el total de palabras por estado y las palabras repetidas', async () => {
    ReporteProgresoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(textos).toContain('Total: 3');
    expect(textos).toContain('Pendientes: 1');
    expect(textos).toContain('Aprobadas: 2');
    expect(textos).toContain('Rechazadas: 0');
    expect(textos).toContain('Palabras repetidas: 4');
  });

  it('CA-18.1: lista las palabras con traducción, semana, estado y fecha', async () => {
    ReporteProgresoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(textos).toContain('ephemeral');
    expect(textos).toContain('efímero');
    expect(textos).toContain('Sem. 3');
    expect(textos).toContain('Aprobada');
    expect(textos).toContain('Pendiente');
    expect(textos).toContain('2026-10-01');
    expect(textos).toContain('wistful');
  });

  it('CA-18.2: muestra por cada quiz la fecha y la calificación, y la nota promedio', async () => {
    ReporteProgresoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(textos).toContain('Quiz 1');
    expect(textos).toContain('2026-10-05');
    expect(textos).toContain('8 / 10');
    expect(textos).toContain('4.00');
    expect(textos).toContain('3.50');
    expect(textos).toContain('Quices presentados: 2   |   Nota promedio: 3.75');
  });

  it('CA-18.2: muestra las tarjetas repasadas y la fecha del último repaso', async () => {
    ReporteProgresoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(textos).toContain('Tarjetas repasadas: 12   |   Último repaso: 2026-10-20');
    expect(textos).not.toContain('Sin actividad registrada');
  });

  it('CA-18.2: sin quices ni repasos indica "Sin actividad registrada" en ambas secciones, sin error', async () => {
    ReporteProgresoService.obtenerDatos.mockResolvedValue(sinActividad());

    const bytes = await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(textos.filter((t) => t === 'Sin actividad registrada')).toHaveLength(2);
    expect(textos.some((t) => t.startsWith('Quices presentados'))).toBe(false);
    expect(textos.some((t) => t.startsWith('Tarjetas repasadas'))).toBe(false);
  });

  it('sin palabras aportadas muestra un aviso y la tabla no se dibuja', async () => {
    ReporteProgresoService.obtenerDatos.mockResolvedValue(sinActividad());

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(textos).toContain('Sin palabras aportadas');
    expect(textos).not.toContain('Traducción');
  });

  it('muestra "Sin registro" si faltan código estudiantil y nivel MCER', async () => {
    const base = datos();
    base.estudiante.codigo_estudiantil = null;
    base.estudiante.nivel_ingles = null;
    ReporteProgresoService.obtenerDatos.mockResolvedValue(base);

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(textos.filter((t) => t === 'Sin registro').length).toBeGreaterThanOrEqual(2);
    expect(textos).toContain('Nivel sin registro');
  });

  it('reparte muchas palabras en varias páginas y repite la cabecera de la tabla', async () => {
    const base = datos();
    base.palabras.total = 80;
    base.palabras.listado = Array.from({ length: 80 }, (_, i) => palabra({ palabra: `palabra${i + 1}` }));
    ReporteProgresoService.obtenerDatos.mockResolvedValue(base);

    const bytes = await ReporteProgresoPDFService.generarPdf(docente, '3');
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(textos.filter((t) => t === 'Traducción').length).toBeGreaterThan(1);
    expect(textos).toContain('palabra1');
    expect(textos).toContain('palabra80');
  });

  it('recorta con "..." una palabra demasiado larga para su columna', async () => {
    const base = datos();
    base.palabras.listado = [palabra({ palabra: 'a'.repeat(200) })];
    ReporteProgresoService.obtenerDatos.mockResolvedValue(base);

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(textos.some((t) => t.startsWith('aaa') && t.endsWith('...'))).toBe(true);
  });

  it('un nombre con caracteres fuera de Latin-1 (emoji) no hace fallar el reporte', async () => {
    const base = datos();
    base.estudiante.nombre_completo = 'Zoe 😀';
    ReporteProgresoService.obtenerDatos.mockResolvedValue(base);

    await expect(ReporteProgresoPDFService.generarPdf(docente, '3')).resolves.toBeInstanceOf(Uint8Array);
    expect(textos.some((t) => t.startsWith('Zoe ?'))).toBe(true);
  });

  it('un estado de tarjeta desconocido se muestra tal cual, sin fallar', async () => {
    const base = datos();
    base.palabras.listado = [palabra({ estado: 'otro_estado' })];
    ReporteProgresoService.obtenerDatos.mockResolvedValue(base);

    await ReporteProgresoPDFService.generarPdf(docente, '3');

    expect(textos).toContain('otro_estado');
  });

  it('CA-18.3: si el servicio de datos deniega el acceso (403), no se genera ningún documento', async () => {
    ReporteProgresoService.obtenerDatos.mockRejectedValue(
      Object.assign(new Error('No tiene permisos'), { status: 403, code: 'REPORT_FORBIDDEN' })
    );

    await expect(
      ReporteProgresoPDFService.generarPdf({ id_usuario: 3, rol: 'estudiante' }, '5')
    ).rejects.toMatchObject({ status: 403, code: 'REPORT_FORBIDDEN' });
    expect(textos).toHaveLength(0);
  });
});
