// Pruebas unitarias de src/controllers/MazoController.js (HU-1.1, HU-2.2, HU-3.3).
// MazoRepository y los servicios se simulan: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MazoController } from '../../src/controllers/MazoController.js';
import { MazoRepository } from '../../src/repositories/MazoRepository.js';
import { ContextoService } from '../../src/services/ContextoService.js';
import { ExportarPDFService } from '../../src/services/ExportarPDFService.js';
import { crearReq, crearRes, respuesta, docente, estudiante } from '../helpers/http.js';

vi.mock('../../src/repositories/MazoRepository.js', () => ({
  MazoRepository: {
    crear: vi.fn(),
    obtenerPorId: vi.fn(),
    listar: vi.fn(),
    listarPorEstudiante: vi.fn(),
    actualizar: vi.fn(),
    actualizarVarianteRegional: vi.fn(),
    eliminar: vi.fn(),
  },
}));
vi.mock('../../src/services/ContextoService.js', () => ({
  ContextoService: { aplicarVarianteRegionalPorMazo: vi.fn() },
}));
vi.mock('../../src/services/ExportarPDFService.js', () => ({ ExportarPDFService: { generarPdfMazo: vi.fn() } }));

const otroDocente = { ...docente, id_usuario: 5 };
const mazoGuardado = {
  id_mazo: 3,
  curso_id: 10,
  docente_id: 1,
  nombre_lectura: 'Things Fall Apart',
  autor: 'Chinua Achebe',
  semana: 4,
  variante_regional_predeterminada: 'Nigeriano',
  estado: 'abierto',
  fecha_apertura: '2026-09-01',
  fecha_cierre: '2026-09-08',
};
const datosNuevos = {
  curso_id: 10,
  nombre_lectura: 'Things Fall Apart',
  semana: 4,
  autor: 'Chinua Achebe',
  fecha_apertura: '2026-09-01',
  fecha_cierre: '2026-09-08',
};

async function llamar(metodo, { id, body = {}, usuario = docente, query } = {}) {
  const res = crearRes();
  await MazoController[metodo](crearReq({ params: id === undefined ? {} : { id }, body, usuario, query }), res);
  return { ...respuesta(res), res };
}

beforeEach(() => {
  vi.stubEnv('DISABLE_AUTH', 'false');
  MazoRepository.obtenerPorId.mockResolvedValue(mazoGuardado);
  MazoRepository.crear.mockImplementation(async (datos) => ({ id_mazo: 3, ...datos }));
  MazoRepository.actualizar.mockImplementation(async (id, datos) => ({ ...datos, id_mazo: id }));
});

describe('MazoController.crear — HU-1.1 (crear mazos por semana)', () => {
  it('CA-1.1.1: crea el mazo siempre en estado "abierto", aunque el body diga otra cosa', async () => {
    const { status, body } = await llamar('crear', { body: { ...datosNuevos, estado: 'cerrado' } });

    expect(status).toBe(201);
    expect(body.estado).toBe('abierto');
  });

  it('CA-1.1.1: el docente_id sale del token y se ignora la fecha_creacion del cliente', async () => {
    await llamar('crear', { body: { ...datosNuevos, docente_id: 99, fecha_creacion: '1999-01-01' } });

    const guardado = MazoRepository.crear.mock.calls[0][0];
    expect(guardado.docente_id).toBe(1);
    expect(guardado).not.toHaveProperty('fecha_creacion');
  });

  it('CA-1.1.2: sin nombre de la lectura ni semana responde 400 indicando los campos', async () => {
    const { status, body } = await llamar('crear', { body: { ...datosNuevos, nombre_lectura: '', semana: '' } });

    expect(status).toBe(400);
    expect(body.error).toContain('nombre_lectura, semana');
    expect(MazoRepository.crear).not.toHaveBeenCalled();
  });

  it.each([
    ['nombre_lectura', 201],
    ['autor', 151],
    ['variante_regional_predeterminada', 101],
  ])('CA-1.1.2: rechaza con 400 un %s de %i caracteres', async (campo, largo) => {
    expect((await llamar('crear', { body: { ...datosNuevos, [campo]: 'x'.repeat(largo) } })).status).toBe(400);
  });

  it('con DISABLE_AUTH en desarrollo toma docente_id del body', async () => {
    vi.stubEnv('DISABLE_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'development');

    await llamar('crear', { body: { ...datosNuevos, docente_id: 7 }, usuario: undefined });

    expect(MazoRepository.crear.mock.calls[0][0].docente_id).toBe(7);
  });

  it('responde 500 ante un error inesperado', async () => {
    MazoRepository.crear.mockRejectedValue(new Error('BD caída'));
    expect((await llamar('crear', { body: datosNuevos })).status).toBe(500);
  });
});

describe('MazoController.listar / obtenerPorId — CA-1.2.1', () => {
  it('CA-1.2.1: un estudiante solo ve los mazos de sus cursos', async () => {
    MazoRepository.listarPorEstudiante.mockResolvedValue([mazoGuardado]);

    expect((await llamar('listar', { usuario: estudiante })).status).toBe(200);
    expect(MazoRepository.listarPorEstudiante).toHaveBeenCalledWith(2);
    expect(MazoRepository.listar).not.toHaveBeenCalled();
  });

  it('CA-5.4.3: un invitado (sin sesión) y la docente ven todos los mazos', async () => {
    MazoRepository.listar.mockResolvedValue([mazoGuardado]);

    await llamar('listar', { usuario: undefined });
    await llamar('listar', { usuario: docente });

    expect(MazoRepository.listar).toHaveBeenCalledTimes(2);
  });

  it('obtenerPorId: 200 si existe, 404 si no, 400 con id inválido, 500 si falla', async () => {
    expect((await llamar('obtenerPorId', { id: '3' })).status).toBe(200);
    MazoRepository.obtenerPorId.mockResolvedValueOnce(null);
    expect((await llamar('obtenerPorId', { id: '3' })).status).toBe(404);
    expect((await llamar('obtenerPorId', { id: 'abc' })).status).toBe(400);
    MazoRepository.obtenerPorId.mockRejectedValueOnce(new Error('x'));
    expect((await llamar('obtenerPorId', { id: '3' })).status).toBe(500);
  });

  it('listar responde 500 ante un error inesperado', async () => {
    MazoRepository.listar.mockRejectedValue(new Error('x'));
    expect((await llamar('listar', { usuario: undefined })).status).toBe(500);
  });
});

describe('MazoController.actualizar — HU-1.1 (editar mazo, solo el docente dueño)', () => {
  it('cambia solo los campos editables y conserva curso, docente y estado', async () => {
    const { status } = await llamar('actualizar', {
      id: '3',
      body: { autor: 'C. Achebe', estado: 'cerrado', docente_id: 99, curso_id: 50 },
    });

    expect(status).toBe(200);
    expect(MazoRepository.actualizar).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ autor: 'C. Achebe', estado: 'abierto', docente_id: 1, curso_id: 10 })
    );
  });

  it('otro docente que no es el dueño recibe 403 sin cambios', async () => {
    expect((await llamar('actualizar', { id: '3', usuario: otroDocente, body: { autor: 'x' } })).status).toBe(403);
    expect(MazoRepository.actualizar).not.toHaveBeenCalled();
  });

  it('CA-1.1.2: no permite dejar vacío el nombre o la semana (400)', async () => {
    expect((await llamar('actualizar', { id: '3', body: { nombre_lectura: '' } })).status).toBe(400);
    expect((await llamar('actualizar', { id: '3', body: { semana: '' } })).status).toBe(400);
  });

  it.each([
    ['nombre_lectura', 201],
    ['autor', 151],
    ['variante_regional_predeterminada', 101],
  ])('CA-1.1.2: rechaza con 400 un %s de %i caracteres', async (campo, largo) => {
    expect((await llamar('actualizar', { id: '3', body: { [campo]: 'x'.repeat(largo) } })).status).toBe(400);
  });

  it('responde 400 con id inválido, 404 si el mazo no existe y 500 si falla', async () => {
    expect((await llamar('actualizar', { id: 'abc' })).status).toBe(400);
    MazoRepository.obtenerPorId.mockResolvedValueOnce(null);
    expect((await llamar('actualizar', { id: '3' })).status).toBe(404);
    MazoRepository.actualizar.mockRejectedValueOnce(new Error('x'));
    expect((await llamar('actualizar', { id: '3', body: { autor: 'x' } })).status).toBe(500);
  });
});

describe('MazoController.actualizarEstado — CA-1.1.3 (abrir o cerrar el mazo)', () => {
  it('CA-1.1.3: el docente dueño puede cerrar el mazo', async () => {
    const { status, body } = await llamar('actualizarEstado', { id: '3', body: { estado: 'cerrado' } });

    expect(status).toBe(200);
    expect(body.estado).toBe('cerrado');
  });

  it.each([
    ['falta el estado', {}],
    ['el estado no es abierto ni cerrado', { estado: 'archivado' }],
  ])('CA-1.1.3: responde 400 si %s', async (_caso, body) => {
    expect((await llamar('actualizarEstado', { id: '3', body })).status).toBe(400);
  });

  it('CA-1.1.3: otro docente recibe 403; un mazo inexistente 404; id inválido 400; error 500', async () => {
    expect((await llamar('actualizarEstado', { id: '3', usuario: otroDocente, body: { estado: 'cerrado' } })).status).toBe(403);
    MazoRepository.obtenerPorId.mockResolvedValueOnce(null);
    expect((await llamar('actualizarEstado', { id: '3', body: { estado: 'cerrado' } })).status).toBe(404);
    expect((await llamar('actualizarEstado', { id: 'abc', body: { estado: 'cerrado' } })).status).toBe(400);
    MazoRepository.obtenerPorId.mockRejectedValueOnce(new Error('x'));
    expect((await llamar('actualizarEstado', { id: '3', body: { estado: 'cerrado' } })).status).toBe(500);
  });
});

describe('MazoController.actualizarVarianteRegional — CA-2.2.2 (variante por mazo)', () => {
  it('CA-2.2.2: propaga la variante a las tarjetas y devuelve cuántas se actualizaron', async () => {
    ContextoService.aplicarVarianteRegionalPorMazo.mockResolvedValue(12);
    MazoRepository.actualizarVarianteRegional.mockResolvedValue({ ...mazoGuardado, variante_regional_predeterminada: 'Jamaicano' });

    const { status, body } = await llamar('actualizarVarianteRegional', { id: '3', body: { variante_regional: 'Jamaicano' } });

    expect(status).toBe(200);
    expect(body.tarjetas_actualizadas).toBe(12);
    expect(ContextoService.aplicarVarianteRegionalPorMazo).toHaveBeenCalledWith(3, 'Jamaicano');
  });

  it('CA-2.2.2: sin variante responde 400; otro docente 403; mazo inexistente 404', async () => {
    expect((await llamar('actualizarVarianteRegional', { id: '3' })).status).toBe(400);
    expect(
      (await llamar('actualizarVarianteRegional', { id: '3', usuario: otroDocente, body: { variante_regional: 'Jamaicano' } })).status
    ).toBe(403);
    MazoRepository.obtenerPorId.mockResolvedValueOnce(null);
    expect((await llamar('actualizarVarianteRegional', { id: '3', body: { variante_regional: 'Jamaicano' } })).status).toBe(404);
    expect((await llamar('actualizarVarianteRegional', { id: 'abc' })).status).toBe(400);
  });

  it('CA-2.2.2: una variante inválida conserva el 400 que da el servicio', async () => {
    ContextoService.aplicarVarianteRegionalPorMazo.mockRejectedValue(Object.assign(new Error('Variante regional inválida'), { status: 400 }));
    expect((await llamar('actualizarVarianteRegional', { id: '3', body: { variante_regional: 'Australiano' } })).status).toBe(400);
  });
});

describe('MazoController.exportarPdf — CA-3.3.1', () => {
  it('CA-3.3.1: responde el PDF como descarga application/pdf', async () => {
    ExportarPDFService.generarPdfMazo.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));

    const { res } = await llamar('exportarPdf', { id: '3' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="mazo-3.pdf"',
    });
    expect(Buffer.isBuffer(res.send.mock.calls[0][0])).toBe(true);
  });

  it('CA-3.3.1: traduce el 404 del servicio; id inválido responde 400', async () => {
    ExportarPDFService.generarPdfMazo.mockRejectedValue(Object.assign(new Error('Mazo no encontrado'), { status: 404 }));
    expect((await llamar('exportarPdf', { id: '3' })).status).toBe(404);
    expect((await llamar('exportarPdf', { id: 'abc' })).status).toBe(400);
  });
});

describe('MazoController.eliminar — solo el docente dueño', () => {
  it('el docente dueño elimina el mazo', async () => {
    expect(await llamar('eliminar', { id: '3' })).toMatchObject({ status: 200, body: { eliminado: true } });
    expect(MazoRepository.eliminar).toHaveBeenCalledWith(3);
  });

  it('otro docente recibe 403 sin borrar; mazo inexistente 404; id inválido 400; error 500', async () => {
    expect((await llamar('eliminar', { id: '3', usuario: otroDocente })).status).toBe(403);
    expect(MazoRepository.eliminar).not.toHaveBeenCalled();
    MazoRepository.obtenerPorId.mockResolvedValueOnce(null);
    expect((await llamar('eliminar', { id: '3' })).status).toBe(404);
    expect((await llamar('eliminar', { id: 'abc' })).status).toBe(400);
    MazoRepository.eliminar.mockRejectedValueOnce(new Error('tiene tarjetas'));
    expect((await llamar('eliminar', { id: '3' })).status).toBe(500);
  });
});
