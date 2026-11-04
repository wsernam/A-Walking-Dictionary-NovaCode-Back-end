import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/repositories/ReporteResultadosQuizRepository.js', () => ({
  ReporteResultadosQuizRepository: {
    obtenerQuiz: vi.fn(),
    resultadosPorEstudiante: vi.fn(),
    preguntasConMasError: vi.fn(),
  },
}));

import { ReporteResultadosQuizRepository } from '../../src/repositories/ReporteResultadosQuizRepository.js';
import { ReporteResultadosQuizService } from '../../src/services/ReporteResultadosQuizService.js';

const docente = { id_usuario: 7, rol: 'docente' };
const estudiante = { id_usuario: 3, rol: 'estudiante' };

function quiz(extra = {}) {
  return {
    id_quiz: 5,
    titulo: 'Quiz semanas 1-4',
    semana_corte: 4,
    fecha_apertura: new Date('2026-10-01T10:00:00Z'),
    fecha_cierre: new Date('2026-10-02T10:00:00Z'),
    curso_id: 1,
    curso_nombre: 'Literatura Anglófona',
    docente_id: 7,
    ...extra,
  };
}

// pg entrega los DECIMAL como string; las filas de prueba lo imitan.
function presento(nombre, calificacion, extra = {}) {
  return {
    estudiante_id: 1,
    nombre_completo: nombre,
    id_resultado: 10,
    calificacion,
    puntaje_obtenido: '9',
    puntaje_maximo: '10',
    tiempo_empleado_seg: 760,
    fecha_envio: new Date('2026-10-02T10:15:00Z'),
    ...extra,
  };
}

function noPresento(nombre) {
  return {
    estudiante_id: 2,
    nombre_completo: nombre,
    id_resultado: null,
    calificacion: null,
    puntaje_obtenido: null,
    puntaje_maximo: null,
    tiempo_empleado_seg: null,
    fecha_envio: null,
  };
}

describe('ReporteResultadosQuizService.obtenerDatos — HU-021 (CA-21.1, CA-21.2, CA-21.3)', () => {
  beforeEach(() => {
    // Un DISABLE_AUTH=true del entorno local no debe alterar las pruebas.
    vi.stubEnv('DISABLE_AUTH', 'false');
    ReporteResultadosQuizRepository.obtenerQuiz.mockResolvedValue(quiz());
    ReporteResultadosQuizRepository.resultadosPorEstudiante.mockResolvedValue([]);
    ReporteResultadosQuizRepository.preguntasConMasError.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('CA-21.1: resultados individuales', () => {
    it('lista a cada estudiante con nota, puntaje, tiempo y fecha de envío', async () => {
      ReporteResultadosQuizRepository.resultadosPorEstudiante.mockResolvedValue([presento('Lucía Gómez', '4.5')]);

      const datos = await ReporteResultadosQuizService.obtenerDatos(docente, '5');

      expect(ReporteResultadosQuizRepository.obtenerQuiz).toHaveBeenCalledWith(5);
      expect(ReporteResultadosQuizRepository.resultadosPorEstudiante).toHaveBeenCalledWith(5, 1);
      expect(datos.generado_en).toBeInstanceOf(Date);
      expect(datos.quiz).toMatchObject({ titulo: 'Quiz semanas 1-4', curso_nombre: 'Literatura Anglófona', semana_corte: 4 });
      expect(datos.estudiantes).toEqual([
        {
          estudiante_id: 1,
          nombre_completo: 'Lucía Gómez',
          presento: true,
          calificacion: 4.5,
          puntaje_obtenido: 9,
          puntaje_maximo: 10,
          tiempo_empleado_seg: 760,
          fecha_envio: new Date('2026-10-02T10:15:00Z'),
        },
      ]);
    });

    it('[S3] convierte con Number() la calificación y los puntajes que pg entrega como string', async () => {
      ReporteResultadosQuizRepository.resultadosPorEstudiante.mockResolvedValue([presento('Lucía Gómez', '3.75')]);

      const { estudiantes } = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(typeof estudiantes[0].calificacion).toBe('number');
      expect(estudiantes[0].calificacion).toBe(3.75);
      expect(estudiantes[0].puntaje_obtenido).toBe(9);
    });

    it('marca "No presentó" (presento = false, sin nota) a quien no tiene resultado, sin ponerle 0', async () => {
      ReporteResultadosQuizRepository.resultadosPorEstudiante.mockResolvedValue([noPresento('Javier Delgado')]);

      const { estudiantes } = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(estudiantes[0]).toMatchObject({
        presento: false,
        calificacion: null,
        puntaje_obtenido: null,
        tiempo_empleado_seg: null,
        fecha_envio: null,
      });
    });

    it('[S2] conserva a quien tiene resultado aunque ya no esté inscrito (la consulta lo trae)', async () => {
      ReporteResultadosQuizRepository.resultadosPorEstudiante.mockResolvedValue([presento('ksandoval', '2.0')]);

      const { estudiantes } = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(estudiantes).toHaveLength(1);
      expect(estudiantes[0].presento).toBe(true);
    });

    it('un curso sin estudiantes devuelve la lista vacía y no falla', async () => {
      const datos = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(datos.estudiantes).toEqual([]);
      expect(datos.estadisticas).toBeNull();
    });
  });

  describe('CA-21.2: estadísticas del grupo', () => {
    it('calcula promedio, máxima, mínima y porcentaje que presentó (2 de 3 = 66,67 %)', async () => {
      ReporteResultadosQuizRepository.resultadosPorEstudiante.mockResolvedValue([
        presento('Lucía Gómez', '4.5'),
        presento('Mateo Rodríguez', '3.5'),
        noPresento('Javier Delgado'),
      ]);

      const { estadisticas } = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(estadisticas.promedio).toBe(4);
      expect(estadisticas.maxima).toBe(4.5);
      expect(estadisticas.minima).toBe(3.5);
      expect(estadisticas.presentaron).toBe(2);
      expect(estadisticas.total).toBe(3);
      expect(estadisticas.porcentaje_presentaron).toBeCloseTo(66.67, 2);
    });

    it('el promedio solo usa a quienes presentaron (los "No presentó" no cuentan como 0)', async () => {
      ReporteResultadosQuizRepository.resultadosPorEstudiante.mockResolvedValue([
        presento('Lucía Gómez', '5'),
        noPresento('Javier Delgado'),
      ]);

      const { estadisticas } = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(estadisticas.promedio).toBe(5);
      expect(estadisticas.minima).toBe(5);
    });

    it('[S6] el porcentaje se calcula sobre todas las filas listadas, y nunca pasa de 100 %', async () => {
      ReporteResultadosQuizRepository.resultadosPorEstudiante.mockResolvedValue([
        presento('Lucía Gómez', '4'),
        presento('ksandoval', '2'),
      ]);

      const { estadisticas } = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(estadisticas.porcentaje_presentaron).toBe(100);
    });

    it('si nadie presentó, estadisticas es null y responde sin error', async () => {
      ReporteResultadosQuizRepository.resultadosPorEstudiante.mockResolvedValue([
        noPresento('Javier Delgado'),
        noPresento('Ana Pérez'),
      ]);

      const datos = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(datos.estadisticas).toBeNull();
      expect(datos.estudiantes).toHaveLength(2);
    });

    it('[S4] pide solo las 5 preguntas con más error y calcula su porcentaje', async () => {
      ReporteResultadosQuizRepository.preguntasConMasError.mockResolvedValue([
        { id_pregunta: 2, enunciado: 'Que significa "thimble"?', orden: 2, total_respuestas: 2, incorrectas: 2 },
        { id_pregunta: 1, enunciado: 'Que significa "mend"?', orden: 1, total_respuestas: 3, incorrectas: 2 },
      ]);

      const { preguntas_con_error: preguntas } = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(ReporteResultadosQuizRepository.preguntasConMasError).toHaveBeenCalledWith(5, 5);
      expect(preguntas).toEqual([
        { enunciado: 'Que significa "thimble"?', incorrectas: 2, total_respuestas: 2, porcentaje_error: 100 },
        { enunciado: 'Que significa "mend"?', incorrectas: 2, total_respuestas: 3, porcentaje_error: expect.closeTo(66.67, 2) },
      ]);
    });

    it('sin respuestas registradas devuelve la lista de preguntas vacía', async () => {
      const { preguntas_con_error: preguntas } = await ReporteResultadosQuizService.obtenerDatos(docente, 5);

      expect(preguntas).toEqual([]);
    });
  });

  describe('CA-21.3: restricción de acceso', () => {
    it('un estudiante recibe 403 AUTH_FORBIDDEN y no se consulta nada', async () => {
      await expect(ReporteResultadosQuizService.obtenerDatos(estudiante, 5)).rejects.toMatchObject({
        status: 403,
        code: 'AUTH_FORBIDDEN',
      });
      expect(ReporteResultadosQuizRepository.obtenerQuiz).not.toHaveBeenCalled();
    });

    it('un Invitado (o cualquier otro rol) recibe 403', async () => {
      await expect(
        ReporteResultadosQuizService.obtenerDatos({ id_usuario: 9, rol: 'invitado' }, 5)
      ).rejects.toMatchObject({ status: 403, code: 'AUTH_FORBIDDEN' });
    });

    it('[S1] la docente de otro curso recibe 403 y no se consultan resultados', async () => {
      ReporteResultadosQuizRepository.obtenerQuiz.mockResolvedValue(quiz({ docente_id: 99 }));

      await expect(ReporteResultadosQuizService.obtenerDatos(docente, 5)).rejects.toMatchObject({
        status: 403,
        code: 'AUTH_FORBIDDEN',
      });
      expect(ReporteResultadosQuizRepository.resultadosPorEstudiante).not.toHaveBeenCalled();
    });

    it('[S1] compara el docente_id aunque llegue como string', async () => {
      ReporteResultadosQuizRepository.obtenerQuiz.mockResolvedValue(quiz({ docente_id: '7' }));

      await expect(ReporteResultadosQuizService.obtenerDatos(docente, 5)).resolves.toBeDefined();
    });

    it('con DISABLE_AUTH (solo desarrollo) no se exige que el quiz sea de la docente', async () => {
      vi.stubEnv('DISABLE_AUTH', 'true');
      ReporteResultadosQuizRepository.obtenerQuiz.mockResolvedValue(quiz({ docente_id: 99 }));

      await expect(ReporteResultadosQuizService.obtenerDatos(docente, 5)).resolves.toBeDefined();
    });
  });

  describe('validación del id y quiz inexistente', () => {
    it.each(['abc', '0', '-3', '1.5', '', undefined])('el id %j responde 400 INVALID_ID', async (id) => {
      await expect(ReporteResultadosQuizService.obtenerDatos(docente, id)).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_ID',
      });
      expect(ReporteResultadosQuizRepository.obtenerQuiz).not.toHaveBeenCalled();
    });

    it('un quiz que no existe responde 404 QUIZ_NOT_FOUND', async () => {
      ReporteResultadosQuizRepository.obtenerQuiz.mockResolvedValue(null);

      await expect(ReporteResultadosQuizService.obtenerDatos(docente, 99999)).rejects.toMatchObject({
        status: 404,
        code: 'QUIZ_NOT_FOUND',
      });
    });
  });
});