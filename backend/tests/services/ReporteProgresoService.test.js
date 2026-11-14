import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/repositories/ReporteProgresoRepository.js', () => ({
  ReporteProgresoRepository: {
    obtenerEstudiante: vi.fn(),
    listarAportes: vi.fn(),
    listarResultadosQuiz: vi.fn(),
    resumenRepaso: vi.fn(),
  },
}));

import { ReporteProgresoRepository } from '../../src/repositories/ReporteProgresoRepository.js';
import { ReporteProgresoService } from '../../src/services/ReporteProgresoService.js';

const docente = { id_usuario: 7, rol: 'docente' };
const estudiante = { id_usuario: 3, rol: 'estudiante' };

function filaEstudiante(extra = {}) {
  return {
    estudiante_id: 3,
    nombre_completo: 'Juan Estudiante',
    email: 'juan@unicauca.edu.co',
    codigo_estudiantil: '104618021234',
    nivel_ingles: 'B2',
    cursos: 'Literatura Anglófona',
    ...extra,
  };
}

function aporte(extra = {}) {
  return {
    id_aporte: 1,
    tipo_aporte: 'creada',
    traduccion_aportada: 'efímero',
    fecha_aporte: new Date('2026-10-01T10:00:00Z'),
    palabra: 'ephemeral',
    estado_tarjeta: 'revisado_docente',
    semana: 3,
    ...extra,
  };
}

describe('ReporteProgresoService.obtenerDatos — HU-018 (CA-18.1, CA-18.2, CA-18.3)', () => {
  beforeEach(() => {
    // Un DISABLE_AUTH=true del entorno local no debe alterar las pruebas.
    vi.stubEnv('DISABLE_AUTH', 'false');
    vi.mocked(ReporteProgresoRepository.obtenerEstudiante).mockReset().mockResolvedValue(filaEstudiante());
    vi.mocked(ReporteProgresoRepository.listarAportes).mockReset().mockResolvedValue([]);
    vi.mocked(ReporteProgresoRepository.listarResultadosQuiz).mockReset().mockResolvedValue([]);
    vi.mocked(ReporteProgresoRepository.resumenRepaso)
      .mockReset()
      .mockResolvedValue({ tarjetas_repasadas: 0, fecha_ultimo_repaso: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('CA-18.1: devuelve nombre, código, nivel MCER y cursos del estudiante', async () => {
    const datos = await ReporteProgresoService.obtenerDatos(docente, '3');

    expect(datos.generado_en).toBeInstanceOf(Date);
    expect(datos.estudiante).toEqual({
      estudiante_id: 3,
      nombre_completo: 'Juan Estudiante',
      email: 'juan@unicauca.edu.co',
      codigo_estudiantil: '104618021234',
      nivel_ingles: 'B2',
      cursos: 'Literatura Anglófona',
    });
  });

  it('CA-18.1: cuenta las palabras creadas por estado de la tarjeta (incluida "rechazada" en 0)', async () => {
    ReporteProgresoRepository.listarAportes.mockResolvedValue([
      aporte({ estado_tarjeta: 'pendiente_revision', palabra: 'a' }),
      aporte({ estado_tarjeta: 'pendiente_revision', palabra: 'b' }),
      aporte({ estado_tarjeta: 'revisado_docente', palabra: 'c' }),
    ]);

    const { palabras } = await ReporteProgresoService.obtenerDatos(docente, '3');

    expect(palabras.total).toBe(3);
    expect(palabras.por_estado).toEqual({ pendiente_revision: 2, revisado_docente: 1, rechazada: 0 });
  });

  it('CA-18.1: separa las coautorías (coautoria y acepcion_nueva) de las palabras creadas', async () => {
    ReporteProgresoRepository.listarAportes.mockResolvedValue([
      aporte({ palabra: 'a' }),
      aporte({ tipo_aporte: 'coautoria', palabra: 'b' }),
      aporte({ tipo_aporte: 'acepcion_nueva', palabra: 'c' }),
    ]);

    const { palabras } = await ReporteProgresoService.obtenerDatos(docente, '3');

    expect(palabras.total).toBe(1);
    expect(palabras.coautorias).toBe(2);
    expect(palabras.listado).toHaveLength(1);
  });

  it('CA-18.1: el listado trae palabra, traducción aportada, estado, semana y fecha', async () => {
    ReporteProgresoRepository.listarAportes.mockResolvedValue([aporte()]);

    const { palabras } = await ReporteProgresoService.obtenerDatos(docente, '3');

    expect(palabras.listado[0]).toEqual({
      palabra: 'ephemeral',
      traduccion: 'efímero',
      estado: 'revisado_docente',
      semana: 3,
      fecha_aporte: new Date('2026-10-01T10:00:00Z'),
    });
  });

  it('CA-18.2: convierte a número las calificaciones y calcula la nota promedio', async () => {
    ReporteProgresoRepository.listarResultadosQuiz.mockResolvedValue([
      { id_quiz: 1, titulo: 'Quiz 1', fecha_envio: new Date('2026-10-05T10:00:00Z'), calificacion: '4.00', puntaje_obtenido: '8', puntaje_maximo: '10' },
      { id_quiz: 2, titulo: 'Quiz 2', fecha_envio: new Date('2026-10-19T10:00:00Z'), calificacion: '3.50', puntaje_obtenido: '7', puntaje_maximo: '10' },
      { id_quiz: 3, titulo: 'Quiz 3', fecha_envio: new Date('2026-11-02T10:00:00Z'), calificacion: '2.25', puntaje_obtenido: '4.5', puntaje_maximo: '10' },
    ]);

    const { quices } = await ReporteProgresoService.obtenerDatos(docente, '3');

    expect(quices.presentados).toBe(3);
    expect(quices.promedio).toBe(3.25);
    expect(quices.listado[0]).toMatchObject({ titulo: 'Quiz 1', calificacion: 4, puntaje_obtenido: 8, puntaje_maximo: 10 });
  });

  it('CA-18.2: sin quices el promedio es null y no hay error', async () => {
    const { quices } = await ReporteProgresoService.obtenerDatos(docente, '3');

    expect(quices).toEqual({ presentados: 0, promedio: null, listado: [] });
  });

  it('CA-18.2: devuelve el número de tarjetas repasadas y la fecha del último repaso', async () => {
    const fecha = new Date('2026-10-20T15:00:00Z');
    ReporteProgresoRepository.resumenRepaso.mockResolvedValue({ tarjetas_repasadas: '12', fecha_ultimo_repaso: fecha });

    const { repaso } = await ReporteProgresoService.obtenerDatos(docente, '3');

    expect(repaso).toEqual({ tarjetas_repasadas: 12, fecha_ultimo_repaso: fecha });
  });

  it('CA-18.2: un estudiante sin ninguna actividad devuelve todo vacío, sin error', async () => {
    const datos = await ReporteProgresoService.obtenerDatos(docente, '3');

    expect(datos.palabras).toEqual({
      total: 0,
      por_estado: { pendiente_revision: 0, revisado_docente: 0, rechazada: 0 },
      coautorias: 0,
      listado: [],
    });
    expect(datos.repaso.tarjetas_repasadas).toBe(0);
  });

  it('cualquier docente consulta el progreso sin filtrar por propietario del curso', async () => {
    await ReporteProgresoService.obtenerDatos(docente, '3');

    const esperado = { estudianteId: 3, docenteId: null };

    expect(ReporteProgresoRepository.obtenerEstudiante).toHaveBeenCalledWith(esperado);
    expect(ReporteProgresoRepository.listarAportes).toHaveBeenCalledWith(esperado);
    expect(ReporteProgresoRepository.listarResultadosQuiz).toHaveBeenCalledWith(esperado);
    expect(ReporteProgresoRepository.resumenRepaso).toHaveBeenCalledWith(esperado);
  });

  it('[SUPUESTO PENDIENTE] la docente que pide un estudiante fuera de sus cursos recibe 404 (REPORT_STUDENT_NOT_FOUND)', async () => {
    ReporteProgresoRepository.obtenerEstudiante.mockResolvedValue(null);

    await expect(ReporteProgresoService.obtenerDatos(docente, '999')).rejects.toMatchObject({
      status: 404,
      code: 'REPORT_STUDENT_NOT_FOUND',
    });
    expect(ReporteProgresoRepository.listarAportes).not.toHaveBeenCalled();
  });

  it('CA-18.1: el estudiante puede pedir su propio reporte (id como texto o número)', async () => {
    await expect(ReporteProgresoService.obtenerDatos(estudiante, '3')).resolves.toBeDefined();
    await expect(ReporteProgresoService.obtenerDatos(estudiante, 3)).resolves.toBeDefined();

    expect(ReporteProgresoRepository.obtenerEstudiante).toHaveBeenCalledWith({ estudianteId: 3, docenteId: null });
  });

  it('CA-18.3: el estudiante que pide el reporte de otro recibe 403 y no se consulta la BD', async () => {
    await expect(ReporteProgresoService.obtenerDatos(estudiante, '5')).rejects.toMatchObject({
      status: 403,
      code: 'REPORT_FORBIDDEN',
    });
    expect(ReporteProgresoRepository.obtenerEstudiante).not.toHaveBeenCalled();
    expect(ReporteProgresoRepository.listarAportes).not.toHaveBeenCalled();
  });

  it('CA-18.3: un rol distinto de docente y estudiante recibe 403', async () => {
    await expect(
      ReporteProgresoService.obtenerDatos({ id_usuario: 9, rol: 'invitado' }, '3')
    ).rejects.toMatchObject({ status: 403, code: 'REPORT_FORBIDDEN' });
    expect(ReporteProgresoRepository.obtenerEstudiante).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '1.5', '', undefined])('un id inválido (%s) responde 400 INVALID_ID', async (valor) => {
    await expect(ReporteProgresoService.obtenerDatos(docente, valor)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_ID',
    });
    expect(ReporteProgresoRepository.obtenerEstudiante).not.toHaveBeenCalled();
  });

  it('con DISABLE_AUTH (solo desarrollo) la docente no se limita a sus cursos', async () => {
    vi.stubEnv('DISABLE_AUTH', 'true');

    await ReporteProgresoService.obtenerDatos({ id_usuario: 0, rol: 'docente' }, '3');

    expect(ReporteProgresoRepository.obtenerEstudiante).toHaveBeenCalledWith({ estudianteId: 3, docenteId: null });
  });
});
