// Pruebas unitarias de src/services/DeduplicacionService.js (HU-1.3, CA-1.3.1 a CA-1.3.3).
// TarjetaRepository se simula: las pruebas no necesitan PostgreSQL.

import { describe, it, expect, vi } from 'vitest';
import { DeduplicacionService } from '../../src/services/DeduplicacionService.js';
import { TarjetaRepository } from '../../src/repositories/TarjetaRepository.js';

vi.mock('../../src/repositories/TarjetaRepository.js', () => ({
  TarjetaRepository: { obtenerPorMazoYPalabra: vi.fn() },
}));

const tarjetaExistente = {
  id_tarjeta: 7,
  mazo_id: 3,
  palabra: 'cooking',
  definicion: 'The act of preparing food',
  ejemplo: 'Cooking is fun',
};

describe('DeduplicacionService.normalizarPalabra — CA-1.3.3', () => {
  it('CA-1.3.3: ignora mayúsculas y espacios al inicio y al final', () => {
    expect(DeduplicacionService.normalizarPalabra('  Cooking ')).toBe('cooking');
    expect(DeduplicacionService.normalizarPalabra('COOKING')).toBe('cooking');
  });
});

describe('DeduplicacionService.buscarDuplicado — CA-1.3.1, CA-1.3.3', () => {
  it('CA-1.3.3: consulta el repositorio con la palabra normalizada y el mazo indicado', async () => {
    TarjetaRepository.obtenerPorMazoYPalabra.mockResolvedValue(null);

    await DeduplicacionService.buscarDuplicado(3, '  Cooking ');

    expect(TarjetaRepository.obtenerPorMazoYPalabra).toHaveBeenCalledWith(3, 'cooking');
  });

  it('CA-1.3.1: devuelve la tarjeta existente cuando la palabra ya está en el mazo', async () => {
    TarjetaRepository.obtenerPorMazoYPalabra.mockResolvedValue(tarjetaExistente);

    await expect(DeduplicacionService.buscarDuplicado(3, 'Cooking')).resolves.toBe(tarjetaExistente);
  });

  it('CA-1.3.1: devuelve null cuando la palabra no existe en el mazo', async () => {
    TarjetaRepository.obtenerPorMazoYPalabra.mockResolvedValue(null);

    await expect(DeduplicacionService.buscarDuplicado(3, 'baking')).resolves.toBeNull();
  });
});

describe('DeduplicacionService.resolverAporte — CA-1.3.1, CA-1.3.2', () => {
  it('CA-1.3.1: misma definición y mismo ejemplo → coautoría sobre la tarjeta existente', () => {
    expect(
      DeduplicacionService.resolverAporte(tarjetaExistente, 'The act of preparing food', 'Cooking is fun')
    ).toEqual({ tipo: 'coautoria', tarjeta: tarjetaExistente });
  });

  it('CA-1.3.1: ejemplo vacío en ambos (null y undefined) también es coautoría', () => {
    const sinEjemplo = { ...tarjetaExistente, ejemplo: null };
    expect(
      DeduplicacionService.resolverAporte(sinEjemplo, 'The act of preparing food', undefined).tipo
    ).toBe('coautoria');
  });

  it('CA-1.3.2: definición distinta → acepción adicional, sin tocar la existente', () => {
    const resultado = DeduplicacionService.resolverAporte(tarjetaExistente, 'A way of making food', 'Cooking is fun');
    expect(resultado).toEqual({ tipo: 'acepcion_nueva' });
    expect(tarjetaExistente.definicion).toBe('The act of preparing food');
  });

  it('CA-1.3.2: misma definición pero ejemplo distinto → acepción adicional', () => {
    expect(
      DeduplicacionService.resolverAporte(tarjetaExistente, 'The act of preparing food', 'I love cooking').tipo
    ).toBe('acepcion_nueva');
  });

  it('CA-1.3.2 [SUPUESTO PENDIENTE P7]: una definición que solo difiere en mayúsculas es acepción adicional', () => {
    expect(
      DeduplicacionService.resolverAporte(tarjetaExistente, 'the act of preparing food', 'Cooking is fun').tipo
    ).toBe('acepcion_nueva');
  });
});
