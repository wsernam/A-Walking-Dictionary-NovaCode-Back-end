// Pruebas unitarias de src/services/SM2Service.js (HU-4.1, CA-4.1.2).
// El servicio es puro (no usa base de datos), así que no hay nada que simular.

import { describe, it, expect } from 'vitest';
import { SM2Service } from '../../src/services/SM2Service.js';

const progresoNuevo = { factor_facilidad: null, intervalo_dias: null, repeticiones: null };

describe('SM2Service.calcular — CA-4.1.2 (algoritmo SM-2)', () => {
  it('CA-4.1.2: primera valoración "Buena" de una tarjeta nueva programa el repaso a 1 día', () => {
    expect(SM2Service.calcular({ ...progresoNuevo, valoracion: 'Buena' })).toEqual({
      factor_facilidad: 2.5,
      intervalo_dias: 1,
      repeticiones: 1,
    });
  });

  it('CA-4.1.2: segunda valoración "Buena" programa el repaso a 6 días', () => {
    const resultado = SM2Service.calcular({
      factor_facilidad: 2.5,
      intervalo_dias: 1,
      repeticiones: 1,
      valoracion: 'Buena',
    });
    expect(resultado).toEqual({ factor_facilidad: 2.5, intervalo_dias: 6, repeticiones: 2 });
  });

  it('CA-4.1.2: desde la tercera repetición el intervalo es el anterior por el factor de facilidad', () => {
    const resultado = SM2Service.calcular({
      factor_facilidad: 2.5,
      intervalo_dias: 6,
      repeticiones: 2,
      valoracion: 'Buena',
    });
    expect(resultado).toEqual({ factor_facilidad: 2.5, intervalo_dias: 15, repeticiones: 3 });
  });

  it('CA-4.1.2: "Fácil" sube el factor de facilidad', () => {
    const resultado = SM2Service.calcular({ ...progresoNuevo, valoracion: 'Fácil' });
    expect(resultado.factor_facilidad).toBe(2.6);
    expect(resultado.repeticiones).toBe(1);
  });

  it('CA-4.1.2 [SUPUESTO PENDIENTE P4]: "Difícil" baja el factor pero cuenta como acierto', () => {
    const resultado = SM2Service.calcular({
      factor_facilidad: 2.5,
      intervalo_dias: 6,
      repeticiones: 2,
      valoracion: 'Difícil',
    });
    expect(resultado.factor_facilidad).toBe(2.36);
    expect(resultado.repeticiones).toBe(3);
    expect(resultado.intervalo_dias).toBe(Math.round(6 * 2.36));
  });

  it('CA-4.1.2 [SUPUESTO PENDIENTE P4]: "Repetir" reinicia el ciclo y también baja el factor', () => {
    const resultado = SM2Service.calcular({
      factor_facilidad: 2.5,
      intervalo_dias: 15,
      repeticiones: 3,
      valoracion: 'Repetir',
    });
    expect(resultado).toEqual({ factor_facilidad: 1.96, intervalo_dias: 1, repeticiones: 0 });
  });

  it('CA-4.1.2: el factor de facilidad nunca baja de 1.3', () => {
    const resultado = SM2Service.calcular({
      factor_facilidad: 1.3,
      intervalo_dias: 1,
      repeticiones: 0,
      valoracion: 'Repetir',
    });
    expect(resultado.factor_facilidad).toBe(1.3);
  });

  it.each(['Dificil', 'buena', 'FÁCIL', '', undefined])(
    'CA-4.1.2: rechaza la valoración inválida %j con status 400',
    (valoracion) => {
      expect(() => SM2Service.calcular({ ...progresoNuevo, valoracion })).toThrow(
        expect.objectContaining({ status: 400 })
      );
    }
  );

  it('CA-4.1.2: convierte los valores numéricos que llegan como texto desde la base de datos', () => {
    const resultado = SM2Service.calcular({
      factor_facilidad: '2.50',
      intervalo_dias: '6',
      repeticiones: '2',
      valoracion: 'Buena',
    });
    expect(resultado).toEqual({ factor_facilidad: 2.5, intervalo_dias: 15, repeticiones: 3 });
  });
});
