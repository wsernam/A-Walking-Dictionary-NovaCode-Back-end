// Pruebas unitarias de src/controllers/ResultadoQuizController.js (HU-3.2, CA-3.2.2 y CA-3.2.3).
// QuizService y ResultadoQuizRepository se simulan: no hay base de datos.

import { describe, it, expect, vi } from 'vitest';
import { ResultadoQuizController } from '../../src/controllers/ResultadoQuizController.js';
import { ResultadoQuizRepository } from '../../src/repositories/ResultadoQuizRepository.js';
import { QuizService } from '../../src/services/QuizService.js';
import { llamar, errorConStatus, estudiante } from '../helpers/http.js';

vi.mock('../../src/repositories/ResultadoQuizRepository.js', () => ({
  ResultadoQuizRepository: { crear: vi.fn(), obtenerPorId: vi.fn(), listar: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn() },
}));
vi.mock('../../src/services/QuizService.js', () => ({ QuizService: { enviarRespuestas: vi.fn() } }));

const resultado = { id_resultado: 50, quiz_id: 1, estudiante_id: 2, calificacion: 3.75 };

describe('ResultadoQuizController.submit — HU-3.2', () => {
  it('CA-3.2.2: responde 201 con la calificación; el estudiante sale del token, no del body', async () => {
    QuizService.enviarRespuestas.mockResolvedValue({ resultado, respuestas: [] });

    const { status } = await llamar(ResultadoQuizController, 'submit', {
      params: { id: '1' },
      body: { respuestas: [], estudiante_id: 99 },
      usuario: estudiante,
    });

    expect(status).toBe(201);
    expect(QuizService.enviarRespuestas).toHaveBeenCalledWith(1, 2, { respuestas: [], estudiante_id: 99 });
  });

  it('CA-3.2.3: un reintento responde 409 con el resumen del resultado previo', async () => {
    QuizService.enviarRespuestas.mockRejectedValue(
      Object.assign(errorConStatus(409, 'Ya enviaste este quiz'), { resultado, respuestas: [{ id_respuesta: 1 }] })
    );

    const { status, body } = await llamar(ResultadoQuizController, 'submit', { params: { id: '1' }, usuario: estudiante });

    expect(status).toBe(409);
    expect(body).toEqual({ error: 'Ya enviaste este quiz', resultado, respuestas: [{ id_respuesta: 1 }] });
  });

  it.each([400, 403, 404, 500])('traduce el %i del servicio', async (codigo) => {
    QuizService.enviarRespuestas.mockRejectedValue(codigo === 500 ? new Error('x') : errorConStatus(codigo));
    expect((await llamar(ResultadoQuizController, 'submit', { params: { id: '1' }, usuario: estudiante })).status).toBe(codigo);
  });

  it('responde 400 si el id del quiz no es un número', async () => {
    expect((await llamar(ResultadoQuizController, 'submit', { params: { id: 'abc' }, usuario: estudiante })).status).toBe(400);
  });
});

describe('ResultadoQuizController — CRUD genérico [SIN RUTA MONTADA]', () => {
  it('crear responde 201, o 500 si falla', async () => {
    ResultadoQuizRepository.crear.mockResolvedValueOnce(resultado).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(ResultadoQuizController, 'crear', { body: resultado })).status).toBe(201);
    expect((await llamar(ResultadoQuizController, 'crear', { body: resultado })).status).toBe(500);
  });

  it('listar responde 200, o 500 si falla', async () => {
    ResultadoQuizRepository.listar.mockResolvedValueOnce([resultado]).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(ResultadoQuizController, 'listar')).status).toBe(200);
    expect((await llamar(ResultadoQuizController, 'listar')).status).toBe(500);
  });

  it.each([
    ['obtenerPorId', resultado, null],
    ['actualizar', resultado, null],
    ['eliminar', true, false],
  ])('%s: 200 si existe, 404 si no, 400 con id inválido, 500 si falla', async (metodo, valor, vacio) => {
    ResultadoQuizRepository[metodo].mockResolvedValueOnce(valor).mockResolvedValueOnce(vacio).mockRejectedValueOnce(new Error('x'));

    expect((await llamar(ResultadoQuizController, metodo, { params: { id: '50' } })).status).toBe(200);
    expect((await llamar(ResultadoQuizController, metodo, { params: { id: '50' } })).status).toBe(404);
    expect((await llamar(ResultadoQuizController, metodo, { params: { id: '50' } })).status).toBe(500);
    expect((await llamar(ResultadoQuizController, metodo, { params: { id: 'abc' } })).status).toBe(400);
  });
});
