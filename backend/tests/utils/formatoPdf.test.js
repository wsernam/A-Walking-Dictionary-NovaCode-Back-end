import { describe, it, expect } from 'vitest';
import { limpiar, recortar, formatearFecha } from '../../src/utils/formatoPdf.js';

// Fuente simulada: cada carácter mide 1 punto por punto de tamaño.
const fuente = { widthOfTextAtSize: (texto, tamano) => texto.length * tamano };

describe('formatoPdf.limpiar', () => {
  it('conserva letras con tilde y la ñ (Latin-1)', () => {
    expect(limpiar('Anglófona, niño')).toBe('Anglófona, niño');
  });

  it('sustituye por "?" los caracteres fuera de Latin-1', () => {
    expect(limpiar('Zoe 😀')).toBe('Zoe ??');
  });

  it('null y undefined quedan como cadena vacía', () => {
    expect(limpiar(null)).toBe('');
    expect(limpiar(undefined)).toBe('');
  });
});

describe('formatoPdf.recortar', () => {
  it('no toca un texto que cabe', () => {
    expect(recortar('hola', fuente, 1, 10)).toBe('hola');
  });

  it('recorta con "..." un texto que no cabe', () => {
    const resultado = recortar('a'.repeat(50), fuente, 1, 10);
    expect(resultado.endsWith('...')).toBe(true);
    expect(resultado.length).toBeLessThanOrEqual(10);
  });
});

describe('formatoPdf.formatearFecha', () => {
  it('da AAAA-MM-DD en UTC', () => {
    expect(formatearFecha(new Date('2026-10-20T23:30:00Z'))).toBe('2026-10-20');
  });

  it.each([null, undefined, '', 'no es fecha'])('"%s" da "Sin registro"', (valor) => {
    expect(formatearFecha(valor)).toBe('Sin registro');
  });
});
