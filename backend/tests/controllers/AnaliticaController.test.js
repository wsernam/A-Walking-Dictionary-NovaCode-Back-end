// Pruebas unitarias de src/controllers/AnaliticaController.js (HU-2.3, CA-2.3.1 y CA-2.3.2).
// Los repositorios se simulan: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnaliticaController } from '../../src/controllers/AnaliticaController.js';
import { MazoRepository } from '../../src/repositories/MazoRepository.js';
import { AnaliticaRepository } from '../../src/repositories/AnaliticaRepository.js';
import { llamar } from '../helpers/http.js';

vi.mock('../../src/repositories/MazoRepository.js', () => ({ MazoRepository: { obtenerPorId: vi.fn() } }));
vi.mock('../../src/repositories/AnaliticaRepository.js', () => ({
  AnaliticaRepository: { resumenParticipacionPorMazo: vi.fn() },
}));

const filas = [
  { estudiante: 'Juan', palabras_aportadas: 3, coautorias: 1 },
  { estudiante: 'Ana', palabras_aportadas: 0, coautorias: 0 },
  { estudiante: 'Luis', palabras_aportadas: 0, coautorias: 2 },
];

beforeEach(() => {
  MazoRepository.obtenerPorId.mockResolvedValue({ id_mazo: 3, curso_id: 10 });
  AnaliticaRepository.resumenParticipacionPorMazo.mockResolvedValue(filas);
});

describe('AnaliticaController.resumenPorMazo — HU-2.3', () => {
  it('CA-2.3.1: devuelve la participación de todos los estudiantes del curso del mazo', async () => {
    const { status, body } = await llamar(AnaliticaController, 'resumenPorMazo', { params: { id: '3' } });

    expect(status).toBe(200);
    expect(body).toHaveLength(3);
    expect(AnaliticaRepository.resumenParticipacionPorMazo).toHaveBeenCalledWith(3, 10);
  });

  it('CA-2.3.2 [SUPUESTO PENDIENTE C7]: con ?sinAportes=true deja solo a quienes no aportaron nada', async () => {
    const { body } = await llamar(AnaliticaController, 'resumenPorMazo', {
      params: { id: '3' },
      query: { sinAportes: 'true' },
    });

    expect(body.map((f) => f.estudiante)).toEqual(['Ana']);
  });

  it('CA-2.3.1: mazo inexistente 404; id inválido 400; error inesperado 500', async () => {
    MazoRepository.obtenerPorId.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(AnaliticaController, 'resumenPorMazo', { params: { id: '3' } })).status).toBe(404);
    expect((await llamar(AnaliticaController, 'resumenPorMazo', { params: { id: '3' } })).status).toBe(500);
    expect((await llamar(AnaliticaController, 'resumenPorMazo', { params: { id: 'abc' } })).status).toBe(400);
  });
});
