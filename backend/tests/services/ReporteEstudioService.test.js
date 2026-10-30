import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/repositories/ReporteEstudioRepository.js', () => ({
  ReporteEstudioRepository: {
    resumenPorInscripcion: vi.fn(),
    palabrasDificiles: vi.fn(),
  },
}));

import { ReporteEstudioRepository } from '../../src/repositories/ReporteEstudioRepository.js';
import { ReporteEstudioService } from '../../src/services/ReporteEstudioService.js';

const docente = { id_usuario: 7, rol: 'docente' };
const estudiante = { id_usuario: 3, rol: 'estudiante' };

function fila(extra = {}) {
  return {
    id_inscripcion: 10,
    estudiante_id: 3,
    nombre_completo: 'Juan Estudiante',
    email: 'juan@unicauca.edu.co',
    id_curso: 1,
    curso_nombre: 'Literatura Anglófona',
    tarjetas_repasadas: 4,
    fecha_ultimo_repaso: new Date('2026-10-20T10:00:00Z'),
    repetir: 1,
    dificil: 1,
    buena: 1,
    facil: 1,
    vencidas: 2,
    ...extra,
  };
}

describe('ReporteEstudioService.obtenerDatos — HU-019 (CA-19.1, CA-19.2, CA-19.3)', () => {
  beforeEach(() => {
    // Un DISABLE_AUTH=true del entorno local no debe alterar las pruebas.
    vi.stubEnv('DISABLE_AUTH', 'false');
    vi.mocked(ReporteEstudioRepository.resumenPorInscripcion).mockReset().mockResolvedValue([]);
    vi.mocked(ReporteEstudioRepository.palabrasDificiles).mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('CA-19.1: la docente sin student_id consulta los estudiantes de sus cursos', async () => {
    ReporteEstudioRepository.resumenPorInscripcion.mockResolvedValue([fila()]);

    const datos = await ReporteEstudioService.obtenerDatos(docente, undefined);

    expect(ReporteEstudioRepository.resumenPorInscripcion).toHaveBeenCalledWith({ docenteId: 7, estudianteId: null });
    expect(datos.generado_en).toBeInstanceOf(Date);
    expect(datos.estudiantes).toHaveLength(1);
    expect(datos.estudiantes[0]).toMatchObject({
      id_inscripcion: 10,
      estudiante_id: 3,
      nombre_completo: 'Juan Estudiante',
      curso_nombre: 'Literatura Anglófona',
      tarjetas_repasadas: 4,
      vencidas: 2,
      sin_actividad: false,
      valoraciones: { repetir: 1, dificil: 1, buena: 1, facil: 1 },
    });
  });

  it('CA-19.1: un estudiante sin repasos queda marcado como sin_actividad', async () => {
    ReporteEstudioRepository.resumenPorInscripcion.mockResolvedValue([
      fila({
        tarjetas_repasadas: 0,
        fecha_ultimo_repaso: null,
        repetir: 0,
        dificil: 0,
        buena: 0,
        facil: 0,
        vencidas: 0,
      }),
    ]);

    const { estudiantes } = await ReporteEstudioService.obtenerDatos(docente, undefined);

    expect(estudiantes[0].sin_actividad).toBe(true);
    expect(estudiantes[0].fecha_ultimo_repaso).toBeNull();
    expect(estudiantes[0].palabras_dificiles).toEqual([]);
  });

  it('CA-19.1: una docente sin estudiantes recibe una lista vacía, sin error', async () => {
    const datos = await ReporteEstudioService.obtenerDatos(docente, undefined);
    expect(datos.estudiantes).toEqual([]);
  });

  it('CA-19.2: agrupa las palabras difíciles por inscripción, con el factor como número y límite 10', async () => {
    const proximo = new Date('2026-11-01T00:00:00Z');
    ReporteEstudioRepository.resumenPorInscripcion.mockResolvedValue([
      fila(),
      fila({ id_inscripcion: 11, estudiante_id: 4, nombre_completo: 'Maria Estudiante' }),
    ]);
    ReporteEstudioRepository.palabrasDificiles.mockResolvedValue([
      { inscripcion_id: 10, palabra: 'ephemeral', factor_facilidad: '1.30', ultima_valoracion: 'Repetir', fecha_proximo_repaso: proximo },
      { inscripcion_id: 10, palabra: 'wistful', factor_facilidad: '1.50', ultima_valoracion: 'Difícil', fecha_proximo_repaso: proximo },
      { inscripcion_id: 11, palabra: 'ominous', factor_facilidad: '2.10', ultima_valoracion: 'Buena', fecha_proximo_repaso: proximo },
    ]);

    const { estudiantes } = await ReporteEstudioService.obtenerDatos(docente, undefined);

    expect(ReporteEstudioRepository.palabrasDificiles).toHaveBeenCalledWith({
      docenteId: 7,
      estudianteId: null,
      limite: 10,
    });
    expect(estudiantes[0].palabras_dificiles).toEqual([
      { palabra: 'ephemeral', factor_facilidad: 1.3, ultima_valoracion: 'Repetir', fecha_proximo_repaso: proximo },
      { palabra: 'wistful', factor_facilidad: 1.5, ultima_valoracion: 'Difícil', fecha_proximo_repaso: proximo },
    ]);
    expect(estudiantes[1].palabras_dificiles).toHaveLength(1);
    expect(estudiantes[1].palabras_dificiles[0].palabra).toBe('ominous');
  });

  it('CA-19.1: la docente con student_id consulta solo a ese estudiante dentro de sus cursos', async () => {
    ReporteEstudioRepository.resumenPorInscripcion.mockResolvedValue([fila()]);

    await ReporteEstudioService.obtenerDatos(docente, '3');

    expect(ReporteEstudioRepository.resumenPorInscripcion).toHaveBeenCalledWith({ docenteId: 7, estudianteId: 3 });
  });

  it('[SUPUESTO PENDIENTE] la docente que pide un estudiante fuera de sus cursos recibe 404 (REPORT_STUDENT_NOT_FOUND)', async () => {
    await expect(ReporteEstudioService.obtenerDatos(docente, '999')).rejects.toMatchObject({
      status: 404,
      code: 'REPORT_STUDENT_NOT_FOUND',
    });
  });

  it('CA-19.1: el estudiante sin student_id recibe solo su propio repaso', async () => {
    ReporteEstudioRepository.resumenPorInscripcion.mockResolvedValue([fila()]);

    await ReporteEstudioService.obtenerDatos(estudiante, undefined);

    expect(ReporteEstudioRepository.resumenPorInscripcion).toHaveBeenCalledWith({ docenteId: null, estudianteId: 3 });
    expect(ReporteEstudioRepository.palabrasDificiles).toHaveBeenCalledWith({
      docenteId: null,
      estudianteId: 3,
      limite: 10,
    });
  });

  it('CA-19.1: el estudiante puede pedir su propio student_id (texto o número)', async () => {
    ReporteEstudioRepository.resumenPorInscripcion.mockResolvedValue([fila()]);

    await expect(ReporteEstudioService.obtenerDatos(estudiante, '3')).resolves.toBeDefined();
    await expect(ReporteEstudioService.obtenerDatos(estudiante, 3)).resolves.toBeDefined();
  });

  it('CA-19.3: el estudiante que pide el reporte de otro estudiante recibe 403 y no se consulta la BD', async () => {
    await expect(ReporteEstudioService.obtenerDatos(estudiante, '5')).rejects.toMatchObject({
      status: 403,
      code: 'REPORT_FORBIDDEN',
    });
    expect(ReporteEstudioRepository.resumenPorInscripcion).not.toHaveBeenCalled();
    expect(ReporteEstudioRepository.palabrasDificiles).not.toHaveBeenCalled();
  });

  it('CA-19.3: un rol distinto de docente y estudiante recibe 403', async () => {
    await expect(
      ReporteEstudioService.obtenerDatos({ id_usuario: 9, rol: 'invitado' }, undefined)
    ).rejects.toMatchObject({ status: 403, code: 'REPORT_FORBIDDEN' });
    expect(ReporteEstudioRepository.resumenPorInscripcion).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '1.5'])('un student_id inválido (%s) responde 400 INVALID_ID', async (valor) => {
    await expect(ReporteEstudioService.obtenerDatos(docente, valor)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_ID',
    });
    expect(ReporteEstudioRepository.resumenPorInscripcion).not.toHaveBeenCalled();
  });

  it('con DISABLE_AUTH (solo desarrollo) la docente no se limita a sus cursos', async () => {
    vi.stubEnv('DISABLE_AUTH', 'true');

    await ReporteEstudioService.obtenerDatos({ id_usuario: 0, rol: 'docente' }, undefined);

    expect(ReporteEstudioRepository.resumenPorInscripcion).toHaveBeenCalledWith({ docenteId: null, estudianteId: null });
  });
});