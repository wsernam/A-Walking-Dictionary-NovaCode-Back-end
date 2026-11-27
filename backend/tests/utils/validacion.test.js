// Pruebas unitarias de src/utils/validacion.js (validaciones de entrada compartidas).
// Origen: fallos ST101 del fuzzing con Schemathesis por rol.

import { describe, it, expect } from 'vitest';
import {
  ID_MAXIMO,
  esIdValido,
  esEnteroEnRango,
  esFechaValida,
  tieneCaracteresDeControl,
} from '../../src/utils/validacion.js';

describe('esIdValido', () => {
  it.each([1, 42, ID_MAXIMO])('acepta %s', (valor) => {
    expect(esIdValido(valor)).toBe(true);
  });

  it.each([
    0,
    -1,
    ID_MAXIMO + 1,
    1.5,
    2.5890419884777833e-42, // fuzzing: llegaba a PostgreSQL como "invalid input syntax for type integer"
    -12740959744381226, // fuzzing: "out of range for type integer"
    '1',
    null,
    undefined,
    NaN,
  ])('rechaza %s', (valor) => {
    expect(esIdValido(valor)).toBe(false);
  });
});

describe('esEnteroEnRango', () => {
  it('usa 1 como mínimo por defecto y respeta un mínimo distinto', () => {
    expect(esEnteroEnRango(0)).toBe(false);
    expect(esEnteroEnRango(0, 0)).toBe(true);
    expect(esEnteroEnRango(ID_MAXIMO + 1, 0)).toBe(false);
  });
});

describe('esFechaValida', () => {
  it.each([
    '2026-09-01',
    '2024-02-29', // año bisiesto
    '2000-02-29', // divisible por 400
    '0501-10-04', // PostgreSQL acepta años antiguos
    '2026-12-01T08:00',
    '2026-12-01T08:00:00Z',
    '2026-12-01T08:00:00.123Z',
    '2026-12-01T08:00:00-05:00',
    '2026-12-01T08:00:00+1400',
    '2026-12-01 08:00:00',
  ])('acepta %s', (valor) => {
    expect(esFechaValida(valor)).toBe(true);
  });

  it.each([
    '0204-01-14T07:53:17+22:38', // fuzzing: "time zone displacement out of range"
    '2026-12-01T08:00:00+15:00',
    '2026-02-30',
    '2025-02-29', // no bisiesto
    '1900-02-29', // divisible por 100 pero no por 400
    '2026-13-01',
    '2026-00-10',
    '0000-01-01',
    '2026-12-01T24:00',
    '2026-12-01T08:60',
    '01/12/2026',
    'mañana',
    '',
    20261201,
    null,
  ])('rechaza %s', (valor) => {
    expect(esFechaValida(valor)).toBe(false);
  });
});

describe('tieneCaracteresDeControl', () => {
  it('detecta el byte nulo, saltos de línea y DEL', () => {
    expect(tieneCaracteresDeControl('ana\u0000')).toBe(true);
    expect(tieneCaracteresDeControl('ana\nmaria')).toBe(true);
    expect(tieneCaracteresDeControl('ana\u007F')).toBe(true);
  });

  it('acepta texto normal con tildes y emojis', () => {
    expect(tieneCaracteresDeControl('María José 👍')).toBe(false);
  });
});
