// Pruebas unitarias de src/utils/codigosError.js: códigos de error fijos en inglés que acompañan al
// mensaje de cada respuesta de error ({ error, code }). Ver docs/codigos-error.md.

import { describe, it, expect } from 'vitest';
import { codigoPorStatus, errorApi } from '../../src/utils/codigosError.js';

describe('codigoPorStatus — código genérico cuando el error no trae uno específico', () => {
  it.each([
    [400, 'BAD_REQUEST'],
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [429, 'RATE_LIMITED'],
    [500, 'INTERNAL_ERROR'],
    [503, 'INTERNAL_ERROR'],
  ])('status %i → %s', (status, codigo) => {
    expect(codigoPorStatus(status)).toBe(codigo);
  });

  it('un status 4xx sin código propio cae en INTERNAL_ERROR', () => {
    expect(codigoPorStatus(418)).toBe('INTERNAL_ERROR');
  });
});

describe('errorApi — error que lanzan los servicios', () => {
  it('lleva el mensaje, el status y el código', () => {
    const error = errorApi(404, 'DECK_NOT_FOUND', 'Mazo no encontrado');

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ message: 'Mazo no encontrado', status: 404, code: 'DECK_NOT_FOUND' });
  });
});
