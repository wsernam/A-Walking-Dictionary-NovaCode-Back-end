// Pruebas unitarias de src/controllers/EstudioController.js (HU-4.1), centradas en la validación de
// ids que agregó el arreglo del fuzzing con Schemathesis (rol estudiante).
// EstudioService e InscripcionRepository se simulan: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EstudioController } from '../../src/controllers/EstudioController.js';
import { EstudioService } from '../../src/services/EstudioService.js';
import { InscripcionRepository } from '../../src/repositories/InscripcionRepository.js';
import { llamar, estudiante } from '../helpers/http.js';

vi.mock('../../src/services/EstudioService.js', () => ({
  EstudioService: { iniciarSesion: vi.fn(), registrarValoracion: vi.fn() },
}));
vi.mock('../../src/repositories/InscripcionRepository.js', () => ({
  InscripcionRepository: { obtenerPorId: vi.fn() },
}));

beforeEach(() => {
  vi.stubEnv('DISABLE_AUTH', 'false');
  InscripcionRepository.obtenerPorId.mockResolvedValue({ id_inscripcion: 5, estudiante_id: estudiante.id_usuario });
  EstudioService.iniciarSesion.mockResolvedValue({ tarjetas: [] });
  EstudioService.registrarValoracion.mockResolvedValue({ intervalo_dias: 1 });
});

describe('EstudioController.iniciarSesion — CA-4.1.1', () => {
  it('inicia la sesión de la inscripción propia', async () => {
    const { status } = await llamar(EstudioController, 'iniciarSesion', { body: { inscripcion_id: 5 }, usuario: estudiante });
    expect(status).toBe(200);
    expect(EstudioService.iniciarSesion).toHaveBeenCalledWith(5);
  });

  // Fuzzing Schemathesis (estudiante): un decimal o un número fuera del rango de INT llegaba a
  // PostgreSQL y respondía 500.
  it.each([2.5890419884777833e-42, -12740959744381226, 2147483648, 'abc'])(
    'rechaza con 400 INVALID_ID un inscripcion_id = %s sin consultar la base de datos',
    async (valor) => {
      const { status, body } = await llamar(EstudioController, 'iniciarSesion', {
        body: { inscripcion_id: valor },
        usuario: estudiante,
      });
      expect(status).toBe(400);
      expect(body.code).toBe('INVALID_ID');
      expect(InscripcionRepository.obtenerPorId).not.toHaveBeenCalled();
    }
  );

  it('acepta el id como texto numérico, como antes', async () => {
    expect((await llamar(EstudioController, 'iniciarSesion', { body: { inscripcion_id: '5' }, usuario: estudiante })).status).toBe(200);
  });

  it('sin inscripcion_id responde 400 REQUIRED_FIELDS_MISSING', async () => {
    const { status, body } = await llamar(EstudioController, 'iniciarSesion', { body: {}, usuario: estudiante });
    expect(status).toBe(400);
    expect(body.code).toBe('REQUIRED_FIELDS_MISSING');
  });

  it('una inscripción ajena responde 403 ENROLLMENT_FORBIDDEN', async () => {
    InscripcionRepository.obtenerPorId.mockResolvedValue({ id_inscripcion: 5, estudiante_id: 99 });
    const { status, body } = await llamar(EstudioController, 'iniciarSesion', { body: { inscripcion_id: 5 }, usuario: estudiante });
    expect(status).toBe(403);
    expect(body.code).toBe('ENROLLMENT_FORBIDDEN');
  });
});

describe('EstudioController.registrarValoracion — CA-4.1.2', () => {
  const valido = { inscripcion_id: 5, tarjeta_id: 9, valoracion: 'Buena' };

  it('registra la valoración de una inscripción propia', async () => {
    const { status } = await llamar(EstudioController, 'registrarValoracion', { body: valido, usuario: estudiante });
    expect(status).toBe(200);
    expect(EstudioService.registrarValoracion).toHaveBeenCalledWith(5, 9, 'Buena');
  });

  it.each([
    ['inscripcion_id', -12740959744381226],
    ['inscripcion_id', 1.5],
    ['tarjeta_id', 2147483648],
    ['tarjeta_id', -3],
  ])('rechaza con 400 INVALID_ID un %s = %s', async (campo, valor) => {
    const { status, body } = await llamar(EstudioController, 'registrarValoracion', {
      body: { ...valido, [campo]: valor },
      usuario: estudiante,
    });
    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_ID');
    expect(EstudioService.registrarValoracion).not.toHaveBeenCalled();
  });
});
