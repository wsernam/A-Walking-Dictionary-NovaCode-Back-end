// Pruebas unitarias de src/services/ContextoService.js (HU-2.2, CA-2.2.1 y CA-2.2.2).
// Los repositorios se simulan: no hay base de datos.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextoService } from '../../src/services/ContextoService.js';
import { TarjetaRepository } from '../../src/repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../../src/repositories/EtiquetaContextoRepository.js';

vi.mock('../../src/repositories/TarjetaRepository.js', () => ({
  TarjetaRepository: { obtenerPorId: vi.fn(), listarPorMazo: vi.fn() },
}));
vi.mock('../../src/repositories/EtiquetaContextoRepository.js', () => ({
  EtiquetaContextoRepository: { eliminarPorTarjetaYTipo: vi.fn(), crear: vi.fn() },
}));

beforeEach(() => {
  TarjetaRepository.obtenerPorId.mockResolvedValue({ id_tarjeta: 7, mazo_id: 3 });
  EtiquetaContextoRepository.eliminarPorTarjetaYTipo.mockResolvedValue(undefined);
  EtiquetaContextoRepository.crear.mockImplementation(async (datos) => ({ id_etiqueta: 1, ...datos }));
});

describe('ContextoService.actualizarContexto — CA-2.2.1 (registro y variante regional)', () => {
  it.each(['Formal', 'informal', 'SLANG'])('CA-2.2.1: acepta el registro %s sin distinguir mayúsculas', async (registro) => {
    const etiquetas = await ContextoService.actualizarContexto(7, { registro });
    expect(etiquetas).toEqual([expect.objectContaining({ tarjeta_id: 7, tipo: 'registro', valor: registro })]);
  });

  it('CA-2.2.1 [SUPUESTO PENDIENTE P8]: también acepta los registros "coloquial" y "anticuado"', async () => {
    await expect(ContextoService.actualizarContexto(7, { registro: 'coloquial' })).resolves.toHaveLength(1);
    await expect(ContextoService.actualizarContexto(7, { registro: 'anticuado' })).resolves.toHaveLength(1);
  });

  it('CA-2.2.1 [SUPUESTO PENDIENTE P8]: acepta las variantes de la lista cerrada, como "Inglés Ghanés"', async () => {
    const etiquetas = await ContextoService.actualizarContexto(7, { variante_regional: 'Inglés Ghanés' });
    expect(etiquetas[0]).toMatchObject({ tipo: 'variante_regional', valor: 'Inglés Ghanés' });
  });

  it('CA-2.2.1: guarda registro y variante juntos', async () => {
    const etiquetas = await ContextoService.actualizarContexto(7, { registro: 'Formal', variante_regional: 'Jamaicano' });
    expect(etiquetas.map((e) => e.tipo)).toEqual(['registro', 'variante_regional']);
  });

  it('CA-2.2.1: reemplaza la etiqueta anterior del mismo tipo en vez de duplicarla', async () => {
    await ContextoService.actualizarContexto(7, { registro: 'Formal' });

    expect(EtiquetaContextoRepository.eliminarPorTarjetaYTipo).toHaveBeenCalledWith(7, 'registro');
    expect(EtiquetaContextoRepository.eliminarPorTarjetaYTipo.mock.invocationCallOrder[0]).toBeLessThan(
      EtiquetaContextoRepository.crear.mock.invocationCallOrder[0]
    );
  });

  it.each([
    ['un registro desconocido', { registro: 'Poético' }],
    ['una variante desconocida', { variante_regional: 'Australiano' }],
    ['un registro válido con una variante desconocida', { registro: 'Formal', variante_regional: 'Australiano' }],
  ])('CA-2.2.1: con %s responde 400 sin borrar ni crear ninguna etiqueta', async (_caso, datos) => {
    await expect(ContextoService.actualizarContexto(7, datos)).rejects.toMatchObject({ status: 400 });
    expect(EtiquetaContextoRepository.eliminarPorTarjetaYTipo).not.toHaveBeenCalled();
    expect(EtiquetaContextoRepository.crear).not.toHaveBeenCalled();
  });

  it('CA-2.2.1: sin registro ni variante responde 400', async () => {
    await expect(ContextoService.actualizarContexto(7, {})).rejects.toMatchObject({ status: 400 });
  });

  it('CA-2.2.1: responde 404 si la tarjeta no existe', async () => {
    TarjetaRepository.obtenerPorId.mockResolvedValue(null);
    await expect(ContextoService.actualizarContexto(99, { registro: 'Formal' })).rejects.toMatchObject({ status: 404 });
  });
});

describe('ContextoService.aplicarVarianteRegionalPorMazo — CA-2.2.2 (asignación masiva por mazo)', () => {
  it('CA-2.2.2: todas las tarjetas del mazo heredan la variante y devuelve cuántas se actualizaron', async () => {
    TarjetaRepository.listarPorMazo.mockResolvedValue([{ id_tarjeta: 7 }, { id_tarjeta: 8 }, { id_tarjeta: 9 }]);

    await expect(ContextoService.aplicarVarianteRegionalPorMazo(3, 'Nigeriano')).resolves.toBe(3);
    expect(TarjetaRepository.listarPorMazo).toHaveBeenCalledWith(3);
    for (const id of [7, 8, 9]) {
      expect(EtiquetaContextoRepository.crear).toHaveBeenCalledWith({
        tarjeta_id: id,
        tipo: 'variante_regional',
        valor: 'Nigeriano',
      });
    }
  });

  it('CA-2.2.2 [SUPUESTO PENDIENTE P9]: sobrescribe también las variantes asignadas individualmente', async () => {
    TarjetaRepository.listarPorMazo.mockResolvedValue([{ id_tarjeta: 7 }]);

    await ContextoService.aplicarVarianteRegionalPorMazo(3, 'Británico');

    expect(EtiquetaContextoRepository.eliminarPorTarjetaYTipo).toHaveBeenCalledWith(7, 'variante_regional');
  });

  it('CA-2.2.2: una variante inválida responde 400 sin tocar ninguna tarjeta', async () => {
    await expect(ContextoService.aplicarVarianteRegionalPorMazo(3, 'Australiano')).rejects.toMatchObject({ status: 400 });
    expect(TarjetaRepository.listarPorMazo).not.toHaveBeenCalled();
    expect(EtiquetaContextoRepository.crear).not.toHaveBeenCalled();
  });

  it('CA-2.2.2: un mazo sin tarjetas devuelve 0', async () => {
    TarjetaRepository.listarPorMazo.mockResolvedValue([]);
    await expect(ContextoService.aplicarVarianteRegionalPorMazo(3, 'Jamaicano')).resolves.toBe(0);
  });
});
