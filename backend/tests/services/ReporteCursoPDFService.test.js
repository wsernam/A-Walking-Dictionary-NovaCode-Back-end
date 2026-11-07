import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';

vi.mock('../../src/services/ReporteCursoService.js', () => ({
  ReporteCursoService: { obtenerDatos: vi.fn() },
}));
// ExportarPDFService (de donde se reutiliza el maquetado) importa estos repositorios.
vi.mock('../../src/repositories/MazoRepository.js', () => ({ MazoRepository: {} }));
vi.mock('../../src/repositories/TarjetaRepository.js', () => ({ TarjetaRepository: {} }));
vi.mock('../../src/repositories/EtiquetaContextoRepository.js', () => ({ EtiquetaContextoRepository: {} }));
vi.mock('../../src/repositories/QuizRepository.js', () => ({ QuizRepository: {} }));
vi.mock('../../src/repositories/PreguntaQuizRepository.js', () => ({ PreguntaQuizRepository: {} }));

import { ReporteCursoService } from '../../src/services/ReporteCursoService.js';
import { ReporteCursoPDFService } from '../../src/services/ReporteCursoPDFService.js';

const docente = { id_usuario: 7, rol: 'docente' };

function estudiante(extra = {}) {
  return {
    estudiante_id: 3,
    nombre_completo: 'Juan Estudiante',
    codigo_estudiantil: '104618021234',
    nivel_ingles: 'B2',
    palabras_anadidas: 5,
    palabras_aprobadas: 3,
    coautorias: 2,
    notas: [4, null],
    promedio: 4,
    ...extra,
  };
}

function datos(extra = {}) {
  return {
    generado_en: new Date('2026-11-04T12:00:00Z'),
    curso: { id_curso: 1, nombre: 'Literatura Anglófona' },
    estudiantes: [
      estudiante(),
      estudiante({
        estudiante_id: 4,
        nombre_completo: 'Ana Lectora',
        codigo_estudiantil: '104618025678',
        nivel_ingles: 'C1',
        palabras_anadidas: 7,
        palabras_aprobadas: 6,
        coautorias: 1,
        notas: [3.5, 5],
        promedio: 4.25,
      }),
    ],
    totales: { estudiantes: 2, palabras_anadidas: 12, palabras_aprobadas: 9, coautorias: 3 },
    quices: [
      { id_quiz: 10, titulo: 'Quiz 1 - Semanas 1 a 2' },
      { id_quiz: 11, titulo: 'Quiz 2 - Semanas 3 a 4' },
    ],
    ...extra,
  };
}

function sinEstudiantes() {
  return datos({
    estudiantes: [],
    totales: { estudiantes: 0, palabras_anadidas: 0, palabras_aprobadas: 0, coautorias: 0 },
  });
}

function sinQuices() {
  return datos({
    estudiantes: [estudiante({ notas: [], promedio: null })],
    totales: { estudiantes: 1, palabras_anadidas: 5, palabras_aprobadas: 3, coautorias: 2 },
    quices: [],
  });
}

describe('ReporteCursoPDFService.generarPdf — HU-020 (CA-20.1, CA-20.2)', () => {
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
    vi.mocked(ReporteCursoService.obtenerDatos).mockReset();
  });

  afterEach(() => {
    espia.mockRestore();
  });

  it('genera un PDF válido que se puede volver a abrir', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    const bytes = await ReporteCursoPDFService.generarPdf(docente, '1');
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBe(1);
  });

  it('pasa el usuario del JWT y el curso_id al servicio de datos', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(ReporteCursoService.obtenerDatos).toHaveBeenCalledWith(docente, '1');
  });

  it('CA-20.1: incluye el nombre del curso y la fecha de generación', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos).toContain('Literatura Anglófona');
    expect(textos).toContain('Reporte de estudiantes del curso · Generado el 2026-11-04 (UTC)');
  });

  it('CA-20.1: la tabla tiene las columnas de nombre, código, nivel MCER, añadidas, aprobadas y coautorías', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    for (const titulo of ['Nombre', 'Código', 'Nivel MCER', 'Añadidas', 'Aprobadas', 'Coautorías']) {
      expect(textos).toContain(titulo);
    }
  });

  it('CA-20.1: lista cada estudiante con su código, nivel y conteos', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos).toContain('Juan Estudiante');
    expect(textos).toContain('104618021234');
    expect(textos).toContain('B2');
    expect(textos).toContain('Ana Lectora');
    expect(textos).toContain('104618025678');
    expect(textos).toContain('C1');
    expect(textos).toContain('5');
    expect(textos).toContain('7');
    expect(textos).toContain('6');
  });

  it('CA-20.1: termina la tabla con la fila "Totales del grupo"', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    const fila = textos.indexOf('Totales del grupo');
    expect(fila).toBeGreaterThan(-1);
    // Los tres totales se dibujan justo después de la etiqueta, en el orden de las columnas.
    expect(textos.slice(fila, fila + 6)).toEqual(['Totales del grupo', '', '', '12', '9', '3']);
  });

  it('CA-20.1: las insignias del encabezado cuentan estudiantes y quices', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos).toContain('2 estudiantes');
    expect(textos).toContain('2 quices');
  });

  it('usa el singular en las insignias con un solo estudiante y un solo quiz', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(
      datos({
        estudiantes: [estudiante({ notas: [4], promedio: 4 })],
        totales: { estudiantes: 1, palabras_anadidas: 5, palabras_aprobadas: 3, coautorias: 2 },
        quices: [{ id_quiz: 10, titulo: 'Quiz 1' }],
      })
    );

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos).toContain('1 estudiante');
    expect(textos).toContain('1 quiz');
  });

  it('CA-20.1: muestra "Sin registro" si faltan el código estudiantil y el nivel MCER', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(
      datos({ estudiantes: [estudiante({ codigo_estudiantil: null, nivel_ingles: null })] })
    );

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos.filter((t) => t === 'Sin registro')).toHaveLength(2);
  });

  it('CA-20.2: muestra la calificación de cada estudiante en cada quiz y su promedio', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos).toContain('Q1');
    expect(textos).toContain('Q2');
    expect(textos).toContain('Promedio');
    expect(textos).toContain('4.00');
    expect(textos).toContain('3.50');
    expect(textos).toContain('5.00');
    expect(textos).toContain('4.25');
  });

  it('CA-20.2: la leyenda da el título completo de cada quiz', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos).toContain('Q1: Quiz 1 - Semanas 1 a 2');
    expect(textos).toContain('Q2: Quiz 2 - Semanas 3 a 4');
  });

  it('CA-20.2: marca "No presentó" donde el estudiante no presentó el quiz', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos.filter((t) => t === 'No presentó')).toHaveLength(1);
  });

  it('CA-20.2: un estudiante que no presentó ningún quiz tiene "No presentó" en todos y promedio "N/A"', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(
      datos({ estudiantes: [estudiante({ notas: [null, null], promedio: null })] })
    );

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos.filter((t) => t === 'No presentó')).toHaveLength(2);
    expect(textos).toContain('N/A');
  });

  it('CA-20.2: una nota de 0 se muestra como 0.00, no como "No presentó"', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(
      datos({
        estudiantes: [estudiante({ notas: [0, 3], promedio: 1.5 })],
        totales: { estudiantes: 1, palabras_anadidas: 5, palabras_aprobadas: 3, coautorias: 2 },
      })
    );

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos).toContain('0.00');
    expect(textos).not.toContain('No presentó');
  });

  it('CA-20.2: aclara en el propio reporte que "No presentó" no cuenta como 0 en el promedio', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos());

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos.some((t) => t.includes('"No presentó" no se toma como 0'))).toBe(true);
  });

  it('CA-20.2: sin quices la sección lo indica, el PDF se genera sin error y no hay tabla de notas', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(sinQuices());

    const bytes = await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(textos).toContain('Notas de los quices');
    expect(textos).toContain('Sin quices registrados en este curso.');
    expect(textos).not.toContain('Q1');
    expect(textos).not.toContain('Promedio');
    // La tabla de estudiantes sí se dibuja.
    expect(textos).toContain('Juan Estudiante');
  });

  it('un curso sin estudiantes genera el PDF con un aviso en ambas secciones y sin tablas', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(sinEstudiantes());

    const bytes = await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(textos.filter((t) => t === 'No hay estudiantes inscritos en este curso.')).toHaveLength(2);
    expect(textos).toContain('0 estudiantes');
    expect(textos).not.toContain('Totales del grupo');
    expect(textos).not.toContain('Añadidas');
  });

  it('un curso sin estudiantes ni quices muestra el aviso de quices y no falla', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(datos({ ...sinEstudiantes(), quices: [] }));

    await expect(ReporteCursoPDFService.generarPdf(docente, '1')).resolves.toBeInstanceOf(Uint8Array);
    expect(textos).toContain('Sin quices registrados en este curso.');
  });

  it('reparte los quices en varias tablas de hasta 4 columnas, repitiendo al estudiante y el promedio', async () => {
    const quices = Array.from({ length: 6 }, (_, i) => ({ id_quiz: i + 1, titulo: `Quiz ${i + 1}` }));
    ReporteCursoService.obtenerDatos.mockResolvedValue(
      datos({
        estudiantes: [estudiante({ notas: [1, 2, 3, 4, 5, null], promedio: 3 })],
        totales: { estudiantes: 1, palabras_anadidas: 5, palabras_aprobadas: 3, coautorias: 2 },
        quices,
      })
    );

    await ReporteCursoPDFService.generarPdf(docente, '1');

    // Dos tablas: Q1-Q4 y Q5-Q6. Cada una lleva su cabecera "Estudiante" y "Promedio".
    expect(textos.filter((t) => t === 'Estudiante')).toHaveLength(2);
    expect(textos.filter((t) => t === 'Promedio')).toHaveLength(2);
    for (let n = 1; n <= 6; n += 1) {
      expect(textos).toContain(`Q${n}`);
    }
    // El estudiante aparece en la tabla de estudiantes y en cada tabla de notas (1 + 2).
    expect(textos.filter((t) => t === 'Juan Estudiante')).toHaveLength(3);
    expect(textos.filter((t) => t === '3.00')).toHaveLength(3);
  });

  it('reparte muchos estudiantes en varias páginas y repite la cabecera de la tabla', async () => {
    const muchos = Array.from({ length: 80 }, (_, i) =>
      estudiante({ estudiante_id: i + 1, nombre_completo: `Estudiante ${i + 1}` })
    );
    ReporteCursoService.obtenerDatos.mockResolvedValue(
      datos({
        estudiantes: muchos,
        totales: { estudiantes: 80, palabras_anadidas: 400, palabras_aprobadas: 240, coautorias: 160 },
      })
    );

    const bytes = await ReporteCursoPDFService.generarPdf(docente, '1');
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(textos.filter((t) => t === 'Nombre').length).toBeGreaterThan(1);
    expect(textos).toContain('Estudiante 1');
    expect(textos).toContain('Estudiante 80');
    expect(textos).toContain('Totales del grupo');
  });

  it('recorta con "..." un nombre demasiado largo para su columna', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(
      datos({ estudiantes: [estudiante({ nombre_completo: 'a'.repeat(200) })] })
    );

    await ReporteCursoPDFService.generarPdf(docente, '1');

    expect(textos.some((t) => t.startsWith('aaa') && t.endsWith('...'))).toBe(true);
  });

  it('un nombre de curso o de estudiante con caracteres fuera de Latin-1 (emoji) no hace fallar el reporte', async () => {
    ReporteCursoService.obtenerDatos.mockResolvedValue(
      datos({
        curso: { id_curso: 1, nombre: 'Curso 😀' },
        estudiantes: [estudiante({ nombre_completo: 'Zoe 😀' })],
        quices: [{ id_quiz: 10, titulo: 'Quiz 😀' }, { id_quiz: 11, titulo: 'Quiz 2' }],
      })
    );

    await expect(ReporteCursoPDFService.generarPdf(docente, '1')).resolves.toBeInstanceOf(Uint8Array);
    expect(textos.some((t) => t.startsWith('Curso ?'))).toBe(true);
    expect(textos.some((t) => t.startsWith('Zoe ?'))).toBe(true);
    expect(textos.some((t) => t.startsWith('Q1: Quiz ?'))).toBe(true);
  });

  it('CA-20.3: si el servicio de datos deniega el acceso (403), no se genera ningún documento', async () => {
    ReporteCursoService.obtenerDatos.mockRejectedValue(
      Object.assign(new Error('No tiene permisos para acceder a este recurso'), {
        status: 403,
        code: 'REPORT_FORBIDDEN',
      })
    );

    await expect(
      ReporteCursoPDFService.generarPdf({ id_usuario: 3, rol: 'estudiante' }, '1')
    ).rejects.toMatchObject({ status: 403, code: 'REPORT_FORBIDDEN' });
    expect(textos).toHaveLength(0);
  });
});
