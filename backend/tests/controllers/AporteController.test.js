// Pruebas unitarias de src/controllers/AporteController.js (HU-1.3, coautorías y acepciones).
// AporteRepository se simula: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AporteController } from '../../src/controllers/AporteController.js';
import { AporteRepository } from '../../src/repositories/AporteRepository.js';
import { llamar } from '../helpers/http.js';

vi.mock('../../src/repositories/AporteRepository.js', () => ({
  AporteRepository: {
    crear: vi.fn(),
    obtenerPorId: vi.fn(),
    listar: vi.fn(),
    listarCoautoriasPendientes: vi.fn(),
    aprobar: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  },
}));

const coautoria = { id_aporte: 30, tarjeta_id: 7, tipo_aporte: 'coautoria', traduccion_aportada: 'cocinar' };

beforeEach(() => {
  AporteRepository.obtenerPorId.mockResolvedValue(coautoria);
  AporteRepository.aprobar.mockImplementation(async (id, datos) => ({ ...coautoria, ...datos }));
});

describe('AporteController.crear', () => {
  const valido = {
    tarjeta_id: 7,
    inscripcion_id: 3,
    traduccion_aportada: 'cocinar',
    definicion_aportada: 'preparar alimentos',
    tipo_aporte: 'coautoria',
  };

  it('responde 201 con el aporte creado', async () => {
    AporteRepository.crear.mockResolvedValue({ id_aporte: 30, ...valido });
    expect((await llamar(AporteController, 'crear', { body: valido })).status).toBe(201);
  });

  it('indica los campos obligatorios que faltan (400)', async () => {
    const { status, body } = await llamar(AporteController, 'crear', { body: {} });
    expect(status).toBe(400);
    expect(body.error).toContain('tarjeta_id, inscripcion_id, traduccion_aportada, definicion_aportada, tipo_aporte');
    expect(body.code).toBe('REQUIRED_FIELDS_MISSING');
  });

  // Fuzzing Schemathesis (docente y estudiante): sin tarjeta_id el INSERT violaba el NOT NULL y respondía 500.
  it('rechaza con 400 un aporte sin tarjeta_id, sin llegar a la base de datos', async () => {
    const { tarjeta_id, ...sinTarjeta } = valido;
    const { status, body } = await llamar(AporteController, 'crear', { body: sinTarjeta });
    expect(status).toBe(400);
    expect(body.code).toBe('REQUIRED_FIELDS_MISSING');
    expect(AporteRepository.crear).not.toHaveBeenCalled();
  });

  it.each([
    ['tarjeta_id', 0],
    ['tarjeta_id', 1.5],
    ['inscripcion_id', -12740959744381226],
    ['inscripcion_id', 2147483648],
    ['inscripcion_id', '3'],
  ])('rechaza con 400 INVALID_ID un %s = %s', async (campo, valor) => {
    const { status, body } = await llamar(AporteController, 'crear', { body: { ...valido, [campo]: valor } });
    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_ID');
  });

  it.each([
    ['tipo_aporte', 'otro'],
    ['definicion_aportada', 42],
    ['ejemplo_aportado', ['x']],
    ['fecha_aporte', '2026-02-30'],
    // Fuzzing Schemathesis run #29 (docente y estudiante): "" llegaba a PostgreSQL y respondía 500.
    ['fecha_aporte', ''],
  ])('rechaza con 400 INVALID_FIELD_TYPE un %s inválido', async (campo, valor) => {
    const { status, body } = await llamar(AporteController, 'crear', { body: { ...valido, [campo]: valor } });
    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_FIELD_TYPE');
  });

  it('acepta fecha_aporte null u omitida (la pone la base de datos)', async () => {
    AporteRepository.crear.mockResolvedValue({ id_aporte: 31 });
    expect((await llamar(AporteController, 'crear', { body: { ...valido, fecha_aporte: null } })).status).toBe(201);
    expect((await llamar(AporteController, 'crear', { body: valido })).status).toBe(201);
  });

  it.each([
    ['fk_aporte_tarjeta', 'CARD_NOT_FOUND'],
    ['fk_aporte_inscripcion', 'ENROLLMENT_NOT_FOUND'],
  ])('responde 404 si la foreign key %s no existe', async (constraint, code) => {
    AporteRepository.crear.mockRejectedValue(Object.assign(new Error('fk'), { code: '23503', constraint }));
    const { status, body } = await llamar(AporteController, 'crear', { body: valido });
    expect(status).toBe(404);
    expect(body.code).toBe(code);
  });

  it.each([
    ['traduccion_aportada', 256],
    ['tipo_aporte', 41],
    ['ejemplo_aportado', 151],
  ])('rechaza con 400 un %s de %i caracteres', async (campo, largo) => {
    expect((await llamar(AporteController, 'crear', { body: { ...valido, [campo]: 'x'.repeat(largo) } })).status).toBe(400);
    expect(AporteRepository.crear).not.toHaveBeenCalled();
  });

  it('responde 500 ante un error inesperado', async () => {
    AporteRepository.crear.mockRejectedValue(new Error('x'));
    expect((await llamar(AporteController, 'crear', { body: valido })).status).toBe(500);
  });
});

describe('AporteController.aprobar — CA-1.3.1 / CA-1.3.2 (la docente aprueba coautorías y acepciones)', () => {
  it('CA-1.3.1: aprueba una coautoría con las correcciones enviadas', async () => {
    const { status, body } = await llamar(AporteController, 'aprobar', {
      params: { id: '30' },
      body: { traduccion_aportada: 'cocinar (corregido)' },
    });

    expect(status).toBe(200);
    expect(body.aporte.traduccion_aportada).toBe('cocinar (corregido)');
  });

  it('un aporte de creación original no se aprueba por esta vía (403)', async () => {
    AporteRepository.obtenerPorId.mockResolvedValue({ ...coautoria, tipo_aporte: 'creada' });

    expect((await llamar(AporteController, 'aprobar', { params: { id: '30' } })).status).toBe(403);
    expect(AporteRepository.aprobar).not.toHaveBeenCalled();
  });

  it.each([
    ['traduccion_aportada', 256],
    ['ejemplo_aportado', 151],
  ])('rechaza con 400 un %s de %i caracteres', async (campo, largo) => {
    expect((await llamar(AporteController, 'aprobar', { params: { id: '30' }, body: { [campo]: 'x'.repeat(largo) } })).status).toBe(400);
  });

  it('responde 404 si no existe, 400 con id inválido y 500 si falla', async () => {
    AporteRepository.obtenerPorId.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(AporteController, 'aprobar', { params: { id: '30' } })).status).toBe(404);
    expect((await llamar(AporteController, 'aprobar', { params: { id: '30' } })).status).toBe(500);
    expect((await llamar(AporteController, 'aprobar', { params: { id: 'abc' } })).status).toBe(400);
  });
});

describe('AporteController.listarPendientes', () => {
  it('lista las coautorías pendientes sin permitir caché del navegador', async () => {
    AporteRepository.listarCoautoriasPendientes.mockResolvedValue([coautoria]);

    const { status, res } = await llamar(AporteController, 'listarPendientes');

    expect(status).toBe(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('responde 500 ante un error inesperado', async () => {
    AporteRepository.listarCoautoriasPendientes.mockRejectedValue(new Error('x'));
    expect((await llamar(AporteController, 'listarPendientes')).status).toBe(500);
  });
});

describe('AporteController — lectura, edición y borrado', () => {
  it('listar responde 200, o 500 si falla', async () => {
    AporteRepository.listar.mockResolvedValueOnce([coautoria]).mockRejectedValueOnce(new Error('x'));
    expect((await llamar(AporteController, 'listar')).status).toBe(200);
    expect((await llamar(AporteController, 'listar')).status).toBe(500);
  });

  const cuerpoCompleto = {
    tarjeta_id: 7,
    inscripcion_id: 3,
    traduccion_aportada: 'cocinar',
    definicion_aportada: 'preparar alimentos',
    tipo_aporte: 'coautoria',
  };

  it.each([
    ['obtenerPorId', coautoria, null],
    ['actualizar', coautoria, null],
    ['eliminar', true, false],
  ])('%s: 200 si existe, 404 si no, 400 con id inválido, 500 si falla', async (metodo, valor, vacio) => {
    AporteRepository[metodo].mockReset();
    AporteRepository[metodo].mockResolvedValueOnce(valor).mockResolvedValueOnce(vacio).mockRejectedValueOnce(new Error('x'));
    const peticion = (id) => ({ params: { id }, body: cuerpoCompleto });

    expect((await llamar(AporteController, metodo, peticion('30'))).status).toBe(200);
    expect((await llamar(AporteController, metodo, peticion('30'))).status).toBe(404);
    expect((await llamar(AporteController, metodo, peticion('30'))).status).toBe(500);
    expect((await llamar(AporteController, metodo, peticion('abc'))).status).toBe(400);
  });

  // Fuzzing Schemathesis (docente): un PUT sin tarjeta_id la dejaba en NULL y respondía 500.
  it('actualizar rechaza con 400 un body sin las columnas NOT NULL', async () => {
    AporteRepository.actualizar.mockReset();
    const { status, body } = await llamar(AporteController, 'actualizar', {
      params: { id: '1' },
      body: { id_aporte: 1, fecha_aporte: '2026-08-08T00:00:00.000Z', estado: 'pendiente_revision' },
    });
    expect(status).toBe(400);
    expect(body.code).toBe('REQUIRED_FIELDS_MISSING');
    expect(AporteRepository.actualizar).not.toHaveBeenCalled();
  });
});
