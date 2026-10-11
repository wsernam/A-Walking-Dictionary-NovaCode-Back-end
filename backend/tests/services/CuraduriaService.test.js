// Pruebas unitarias de src/services/CuraduriaService.js (HU-2.1, CA-2.1.1 y CA-2.1.2).
// CA-2.1.3 (rechazar una tarjeta) no tiene pruebas: el rechazo no existe en el código.
// Los repositorios se simulan: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CuraduriaService } from '../../src/services/CuraduriaService.js';
import { TarjetaRepository } from '../../src/repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../../src/repositories/EtiquetaContextoRepository.js';
import { AporteRepository } from '../../src/repositories/AporteRepository.js';

vi.mock('../../src/repositories/TarjetaRepository.js', () => ({
  TarjetaRepository: {
    listarPorEstado: vi.fn(),
    obtenerPorId: vi.fn(),
    actualizarEstado: vi.fn(),
    actualizar: vi.fn(),
  },
}));
vi.mock('../../src/repositories/EtiquetaContextoRepository.js', () => ({
  EtiquetaContextoRepository: { listarPorTarjetas: vi.fn() },
}));
vi.mock('../../src/repositories/AporteRepository.js', () => ({
  AporteRepository: { obtenerAutoresOriginales: vi.fn() },
}));

const tarjetaPendiente = {
  id_tarjeta: 7,
  mazo_id: 3,
  palabra: 'cooking',
  traduccion: 'cocinar',
  definicion: 'The act of preparing fod',
  ejemplo: 'Cooking is fun',
  estado: 'pendiente_revision',
  fecha_creacion: new Date('2026-10-01T10:00:00Z'),
  fecha_revision: null,
};

beforeEach(() => {
  TarjetaRepository.obtenerPorId.mockResolvedValue(tarjetaPendiente);
  TarjetaRepository.actualizarEstado.mockImplementation(async (id, estado, fecha) => ({
    ...tarjetaPendiente,
    estado,
    fecha_revision: fecha,
  }));
  TarjetaRepository.actualizar.mockImplementation(async (id, datos) => ({ id_tarjeta: id, ...datos }));
});

describe('CuraduriaService.listarPendientes — CA-2.1.1', () => {
  it('CA-2.1.1: lista exclusivamente las tarjetas en "pendiente_revision"', async () => {
    TarjetaRepository.listarPorEstado.mockResolvedValue([tarjetaPendiente]);

    await expect(CuraduriaService.listarPendientes()).resolves.toEqual([tarjetaPendiente]);
    expect(TarjetaRepository.listarPorEstado).toHaveBeenCalledWith('pendiente_revision');
  });
});

describe('CuraduriaService.aprobarTarjeta — CA-2.1.2', () => {
  it('CA-2.1.2: aprobar pasa la tarjeta a "revisado_docente" con fecha de revisión', async () => {
    const aprobada = await CuraduriaService.aprobarTarjeta(7);

    expect(TarjetaRepository.actualizarEstado).toHaveBeenCalledWith(7, 'revisado_docente', expect.any(Date));
    expect(aprobada.estado).toBe('revisado_docente');
  });

  it('CA-2.1.2: responde 404 si la tarjeta no existe', async () => {
    TarjetaRepository.obtenerPorId.mockResolvedValue(null);
    await expect(CuraduriaService.aprobarTarjeta(99)).rejects.toMatchObject({ status: 404 });
  });

  it('CA-2.1.2: responde 409 si la tarjeta ya no está pendiente, sin cambiar su estado', async () => {
    TarjetaRepository.obtenerPorId.mockResolvedValue({ ...tarjetaPendiente, estado: 'revisado_docente' });

    await expect(CuraduriaService.aprobarTarjeta(7)).rejects.toMatchObject({ status: 409 });
    expect(TarjetaRepository.actualizarEstado).not.toHaveBeenCalled();
  });
});

describe('CuraduriaService.editarTarjeta — CA-2.1.2 (corregir antes de aprobar)', () => {
  it('CA-2.1.2: corrige solo los campos enviados y conserva el resto y el estado', async () => {
    await CuraduriaService.editarTarjeta(7, { definicion: 'The act of preparing food' });

    expect(TarjetaRepository.actualizar).toHaveBeenCalledWith(7, {
      mazo_id: 3,
      palabra: 'cooking',
      traduccion: 'cocinar',
      definicion: 'The act of preparing food',
      ejemplo: 'Cooking is fun',
      estado: 'pendiente_revision',
      fecha_creacion: tarjetaPendiente.fecha_creacion,
      fecha_revision: null,
    });
  });

  it('CA-2.1.2: responde 404 si la tarjeta no existe', async () => {
    TarjetaRepository.obtenerPorId.mockResolvedValue(null);
    await expect(CuraduriaService.editarTarjeta(99, { palabra: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('CA-2.1.2: solo se pueden editar tarjetas pendientes (409 si ya fue aprobada)', async () => {
    TarjetaRepository.obtenerPorId.mockResolvedValue({ ...tarjetaPendiente, estado: 'revisado_docente' });

    await expect(CuraduriaService.editarTarjeta(7, { palabra: 'x' })).rejects.toMatchObject({ status: 409 });
    expect(TarjetaRepository.actualizar).not.toHaveBeenCalled();
  });
});

describe('CuraduriaService.listarAprobadas — CA-2.1.2 (historial de aprobadas)', () => {
  it('CA-2.1.2: cada tarjeta aprobada incluye su registro, variante y autor', async () => {
    TarjetaRepository.listarPorEstado.mockResolvedValue([
      { id_tarjeta: 7, palabra: 'cooking', estado: 'revisado_docente' },
      { id_tarjeta: 8, palabra: 'baking', estado: 'revisado_docente' },
    ]);
    EtiquetaContextoRepository.listarPorTarjetas.mockResolvedValue([
      { tarjeta_id: 7, tipo: 'registro', valor: 'Formal' },
      { tarjeta_id: 7, tipo: 'variante_regional', valor: 'Jamaicano' },
    ]);
    AporteRepository.obtenerAutoresOriginales.mockResolvedValue(new Map([[7, 'Juan Estudiante']]));

    const aprobadas = await CuraduriaService.listarAprobadas();

    expect(TarjetaRepository.listarPorEstado).toHaveBeenCalledWith('revisado_docente');
    expect(EtiquetaContextoRepository.listarPorTarjetas).toHaveBeenCalledWith([7, 8]);
    expect(aprobadas[0]).toMatchObject({
      id_tarjeta: 7,
      registro: 'Formal',
      variante_regional: 'Jamaicano',
      estudiante: 'Juan Estudiante',
    });
    expect(aprobadas[1]).toMatchObject({
      id_tarjeta: 8,
      registro: null,
      variante_regional: null,
      estudiante: 'Desconocido',
    });
  });
});
