// Pruebas unitarias de src/controllers/TarjetaController.js
// (HU-1.2, HU-1.3, HU-2.1, HU-2.2). Repositorios y servicios simulados: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TarjetaController } from '../../src/controllers/TarjetaController.js';
import { TarjetaRepository } from '../../src/repositories/TarjetaRepository.js';
import { MazoRepository } from '../../src/repositories/MazoRepository.js';
import { AporteRepository } from '../../src/repositories/AporteRepository.js';
import { InscripcionRepository } from '../../src/repositories/InscripcionRepository.js';
import { DeduplicacionService } from '../../src/services/DeduplicacionService.js';
import { CuraduriaService } from '../../src/services/CuraduriaService.js';
import { ContextoService } from '../../src/services/ContextoService.js';
import { TarjetaService } from '../../src/services/TarjetaService.js';
import { crearReq, crearRes, respuesta, estudiante } from '../helpers/http.js';

vi.mock('../../src/repositories/TarjetaRepository.js', () => ({
  TarjetaRepository: { crear: vi.fn(), listar: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn() },
}));
vi.mock('../../src/repositories/MazoRepository.js', () => ({ MazoRepository: { obtenerPorId: vi.fn() } }));
vi.mock('../../src/repositories/AporteRepository.js', () => ({ AporteRepository: { crear: vi.fn() } }));
vi.mock('../../src/repositories/InscripcionRepository.js', () => ({
  InscripcionRepository: { obtenerPorCursoYEstudiante: vi.fn() },
}));
vi.mock('../../src/services/DeduplicacionService.js', () => ({
  DeduplicacionService: {
    buscarDuplicado: vi.fn(),
    resolverAporte: vi.fn(),
    normalizarPalabra: vi.fn((p) => p.trim().toLowerCase()),
  },
}));
vi.mock('../../src/services/CuraduriaService.js', () => ({
  CuraduriaService: {
    editarTarjeta: vi.fn(),
    aprobarTarjeta: vi.fn(),
    listarPendientes: vi.fn(),
    listarAprobadas: vi.fn(),
  },
}));
vi.mock('../../src/services/ContextoService.js', () => ({ ContextoService: { actualizarContexto: vi.fn() } }));
vi.mock('../../src/services/TarjetaService.js', () => ({ TarjetaService: { obtenerDetalleTarjeta: vi.fn() } }));

const mazoAbierto = { id_mazo: 3, curso_id: 10, estado: 'abierto' };
const palabraValida = { palabra: 'Cooking', traduccion: 'cocinar', definicion: 'The act of preparing food' };
const tarjetaExistente = { id_tarjeta: 7, palabra: 'cooking', definicion: 'The act of preparing food' };

function errorConStatus(status, message = 'error del servicio') {
  return Object.assign(new Error(message), { status });
}

async function crearPalabra(body = palabraValida, usuario = estudiante) {
  const res = crearRes();
  await TarjetaController.crear(crearReq({ params: { id: '3' }, body, usuario }), res);
  return respuesta(res);
}

beforeEach(() => {
  vi.stubEnv('DISABLE_AUTH', 'false');
  MazoRepository.obtenerPorId.mockResolvedValue(mazoAbierto);
  InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue({ id_inscripcion: 5, estado: 'activa' });
  DeduplicacionService.buscarDuplicado.mockResolvedValue(null);
  TarjetaRepository.crear.mockImplementation(async (datos) => ({ id_tarjeta: 20, ...datos }));
  AporteRepository.crear.mockImplementation(async (datos) => ({ id_aporte: 30, ...datos }));
});

describe('TarjetaController.crear — HU-1.2 (registrar palabra) y HU-1.3 (duplicados)', () => {
  it('CA-1.2.1: crea la tarjeta "pendiente_revision" con la palabra normalizada y el aporte "creada"', async () => {
    const { status, body } = await crearPalabra();

    expect(status).toBe(201);
    expect(body.resultado).toBe('creada');
    expect(TarjetaRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ mazo_id: 3, palabra: 'cooking', estado: 'pendiente_revision', ejemplo: null })
    );
    expect(AporteRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ tarjeta_id: 20, inscripcion_id: 5, tipo_aporte: 'creada' })
    );
  });

  it('CA-1.2.1: la inscripción autora sale del token; se ignora inscripcion_id del body', async () => {
    await crearPalabra({ ...palabraValida, inscripcion_id: 999 });

    expect(InscripcionRepository.obtenerPorCursoYEstudiante).toHaveBeenCalledWith(10, 2);
    expect(AporteRepository.crear.mock.calls[0][0].inscripcion_id).toBe(5);
  });

  it.each([
    ['sin inscripción en el curso del mazo', null],
    ['con la inscripción inactiva', { id_inscripcion: 5, estado: 'retirada' }],
  ])('CA-1.2.1: un estudiante %s recibe 403', async (_caso, inscripcion) => {
    InscripcionRepository.obtenerPorCursoYEstudiante.mockResolvedValue(inscripcion);

    expect((await crearPalabra()).status).toBe(403);
    expect(TarjetaRepository.crear).not.toHaveBeenCalled();
  });

  it('CA-1.2.2: indica qué campos obligatorios faltan', async () => {
    const { status, body } = await crearPalabra({ palabra: 'cooking' });

    expect(status).toBe(400);
    expect(body.error).toContain('traduccion, definicion');
  });

  it.each([
    ['un ejemplo de más de 150 caracteres', { ...palabraValida, ejemplo: 'x'.repeat(151) }],
    ['una palabra de más de 150 caracteres', { ...palabraValida, palabra: 'x'.repeat(151) }],
    ['una traducción de más de 255 caracteres', { ...palabraValida, traduccion: 'x'.repeat(256) }],
  ])('CA-1.2.2: rechaza con 400 %s', async (_caso, body) => {
    expect((await crearPalabra(body)).status).toBe(400);
    expect(TarjetaRepository.crear).not.toHaveBeenCalled();
  });

  it('CA-1.2.3: un mazo cerrado no acepta palabras (409)', async () => {
    MazoRepository.obtenerPorId.mockResolvedValue({ ...mazoAbierto, estado: 'cerrado' });

    const { status, body } = await crearPalabra();

    expect(status).toBe(409);
    expect(body.error).toContain('no acepta más palabras');
  });

  it('responde 404 si el mazo no existe y 400 si el id de la URL no es un número', async () => {
    MazoRepository.obtenerPorId.mockResolvedValue(null);
    expect((await crearPalabra()).status).toBe(404);

    const res = crearRes();
    await TarjetaController.crear(crearReq({ params: { id: 'abc' }, body: palabraValida, usuario: estudiante }), res);
    expect(respuesta(res).status).toBe(400);
  });

  it.each(['coautoria', 'acepcion_nueva'])(
    'CA-1.3.1 / CA-1.3.2: con duplicado registra un aporte "%s" sin crear otra tarjeta',
    async (tipo) => {
      DeduplicacionService.buscarDuplicado.mockResolvedValue(tarjetaExistente);
      DeduplicacionService.resolverAporte.mockReturnValue({ tipo });

      const { status, body } = await crearPalabra();

      expect(status).toBe(201);
      expect(body).toMatchObject({ resultado: tipo, tarjeta: tarjetaExistente });
      expect(TarjetaRepository.crear).not.toHaveBeenCalled();
      expect(AporteRepository.crear).toHaveBeenCalledWith(expect.objectContaining({ tarjeta_id: 7, tipo_aporte: tipo }));
    }
  );

  it('con DISABLE_AUTH en desarrollo exige inscripcion_id en el body', async () => {
    vi.stubEnv('DISABLE_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'development');

    expect((await crearPalabra(palabraValida, undefined)).status).toBe(400);
    expect((await crearPalabra({ ...palabraValida, inscripcion_id: 5 }, undefined)).status).toBe(201);
  });

  it('responde 500 ante un error inesperado', async () => {
    MazoRepository.obtenerPorId.mockRejectedValue(new Error('BD caída'));
    expect((await crearPalabra()).status).toBe(500);
  });
});

describe('TarjetaController.checkDuplicate — CA-1.3.4 (aviso antes de confirmar)', () => {
  async function revisar(body) {
    const res = crearRes();
    await TarjetaController.checkDuplicate(crearReq({ body }), res);
    return respuesta(res);
  }

  it('CA-1.3.4: sin coincidencia responde duplicado: false', async () => {
    expect(await revisar({ mazo_id: 3, palabra: 'cooking' })).toEqual({
      status: 200,
      body: { duplicado: false, resultado: 'creada' },
    });
  });

  it('CA-1.3.4: con coincidencia avisa si será coautoría o acepción, sin crear nada', async () => {
    DeduplicacionService.buscarDuplicado.mockResolvedValue(tarjetaExistente);
    DeduplicacionService.resolverAporte.mockReturnValue({ tipo: 'coautoria' });

    const { status, body } = await revisar({ mazo_id: 3, palabra: 'Cooking', definicion: 'x' });

    expect(status).toBe(200);
    expect(body).toMatchObject({ duplicado: true, resultado: 'coautoria' });
    expect(TarjetaRepository.crear).not.toHaveBeenCalled();
    expect(AporteRepository.crear).not.toHaveBeenCalled();
  });

  it('responde 400 si falta la palabra o el mazo_id no es un número', async () => {
    expect((await revisar({ mazo_id: 3 })).status).toBe(400);
    expect((await revisar({ mazo_id: 'abc', palabra: 'x' })).status).toBe(400);
  });

  it('responde 500 ante un error inesperado', async () => {
    DeduplicacionService.buscarDuplicado.mockRejectedValue(new Error('BD caída'));
    expect((await revisar({ mazo_id: 3, palabra: 'x' })).status).toBe(500);
  });
});

describe('TarjetaController — curaduría docente (HU-2.1) y contexto (HU-2.2)', () => {
  async function llamar(metodo, { id = '7', body = {} } = {}) {
    const res = crearRes();
    await TarjetaController[metodo](crearReq({ params: { id }, body }), res);
    return respuesta(res);
  }

  it('CA-2.1.1: lista las tarjetas pendientes y las aprobadas', async () => {
    CuraduriaService.listarPendientes.mockResolvedValue([tarjetaExistente]);
    CuraduriaService.listarAprobadas.mockResolvedValue([]);

    expect(await llamar('listarPendientes')).toEqual({ status: 200, body: [tarjetaExistente] });
    expect(await llamar('listarAprobadas')).toEqual({ status: 200, body: [] });
  });

  it('CA-2.1.2: aprobar responde 200 con la tarjeta aprobada', async () => {
    CuraduriaService.aprobarTarjeta.mockResolvedValue({ ...tarjetaExistente, estado: 'revisado_docente' });

    const { status, body } = await llamar('aprobar');

    expect(status).toBe(200);
    expect(body.tarjeta.estado).toBe('revisado_docente');
    expect(CuraduriaService.aprobarTarjeta).toHaveBeenCalledWith(7);
  });

  it('CA-2.1.2: editar envía las correcciones al servicio', async () => {
    CuraduriaService.editarTarjeta.mockResolvedValue(tarjetaExistente);

    expect((await llamar('editarRevision', { body: { definicion: 'nueva' } })).status).toBe(200);
    expect(CuraduriaService.editarTarjeta).toHaveBeenCalledWith(7, { definicion: 'nueva' });
  });

  it('CA-2.2.1: actualizar el contexto devuelve las etiquetas creadas', async () => {
    ContextoService.actualizarContexto.mockResolvedValue([{ tipo: 'registro', valor: 'Formal' }]);

    const { status, body } = await llamar('actualizarContexto', { body: { registro: 'Formal' } });

    expect(status).toBe(200);
    expect(body.etiquetas).toHaveLength(1);
  });

  it.each([
    ['aprobar', 'aprobarTarjeta', 409],
    ['aprobar', 'aprobarTarjeta', 404],
    ['editarRevision', 'editarTarjeta', 409],
    ['actualizarContexto', 'actualizarContexto', 400],
  ])('%s traduce el error %s del servicio a HTTP %i', async (metodo, metodoServicio, codigo) => {
    const servicio = metodoServicio === 'actualizarContexto' ? ContextoService : CuraduriaService;
    servicio[metodoServicio].mockRejectedValue(errorConStatus(codigo));

    expect((await llamar(metodo)).status).toBe(codigo);
  });

  it.each(['aprobar', 'editarRevision', 'actualizarContexto', 'obtenerPorId', 'actualizar', 'eliminar'])(
    '%s responde 400 si el id no es un número',
    async (metodo) => {
      expect((await llamar(metodo, { id: 'abc' })).status).toBe(400);
    }
  );

  it.each(['listarPendientes', 'listarAprobadas'])('%s responde 500 ante un error inesperado', async (metodo) => {
    CuraduriaService[metodo].mockRejectedValue(new Error('BD caída'));
    expect((await llamar(metodo)).status).toBe(500);
  });
});

describe('TarjetaController.obtenerPorId — CA-2.2.3 (detalle con contexto)', () => {
  it('CA-2.2.3: devuelve la tarjeta con sus etiquetas, o 404 si no existe', async () => {
    TarjetaService.obtenerDetalleTarjeta.mockResolvedValueOnce({ ...tarjetaExistente, etiquetas_contexto: [] });
    let res = crearRes();
    await TarjetaController.obtenerPorId(crearReq({ params: { id: '7' } }), res);
    expect(respuesta(res).status).toBe(200);

    TarjetaService.obtenerDetalleTarjeta.mockResolvedValueOnce(null);
    res = crearRes();
    await TarjetaController.obtenerPorId(crearReq({ params: { id: '7' } }), res);
    expect(respuesta(res).status).toBe(404);
  });

  it('responde 500 ante un error inesperado', async () => {
    TarjetaService.obtenerDetalleTarjeta.mockRejectedValue(new Error('BD caída'));
    const res = crearRes();
    await TarjetaController.obtenerPorId(crearReq({ params: { id: '7' } }), res);
    expect(respuesta(res).status).toBe(500);
  });
});

describe('TarjetaController — CRUD genérico [SIN RUTA MONTADA]', () => {
  async function llamar(metodo, id = '7') {
    const res = crearRes();
    await TarjetaController[metodo](crearReq({ params: { id }, body: { palabra: 'x' } }), res);
    return respuesta(res);
  }

  it('listar responde 200 con todas las tarjetas, o 500 si falla', async () => {
    TarjetaRepository.listar.mockResolvedValueOnce([tarjetaExistente]).mockRejectedValueOnce(new Error('x'));
    expect(await llamar('listar')).toEqual({ status: 200, body: [tarjetaExistente] });
    expect((await llamar('listar')).status).toBe(500);
  });

  it.each([
    ['actualizar', 'actualizar', tarjetaExistente],
    ['eliminar', 'eliminar', true],
  ])('%s responde 200 si existe, 404 si no y 500 si falla', async (metodo, metodoRepo, valor) => {
    TarjetaRepository[metodoRepo]
      .mockResolvedValueOnce(valor)
      .mockResolvedValueOnce(metodo === 'eliminar' ? false : null)
      .mockRejectedValueOnce(new Error('x'));

    expect((await llamar(metodo)).status).toBe(200);
    expect((await llamar(metodo)).status).toBe(404);
    expect((await llamar(metodo)).status).toBe(500);
  });
});
