/**
 * @file HU-010: repaso con repetición espaciada (algoritmo SM-2).
 *
 * Se encarga únicamente de calcular el nuevo estado de repetición de una tarjeta (próxima fecha
 * de repaso según la facilidad de recuerdo) a partir de la valoración del estudiante.
 *
 * Valoraciones: Repetir, Difícil, Buena, Fácil.
 *
 * Endpoint relacionado: POST /api/v1/study/review-session. Almacenamiento: tabla progreso_estudio.
 * @see docs/CAMBIO_REPASO_SM2.md
 */

const VALORACIONES = {
  REPETIR: 'Repetir',
  DIFICIL: 'Difícil',
  BUENA: 'Buena',
  FACIL: 'Fácil',
};

function obtenerCalidad(valoracion) {
  switch (valoracion) {
    case VALORACIONES.REPETIR:
      return 1;

    case VALORACIONES.DIFICIL:
      return 3;

    case VALORACIONES.BUENA:
      return 4;

    case VALORACIONES.FACIL:
      return 5;

    default: {
      const error = new Error(
        'Valoración inválida. Valores permitidos: Repetir, Difícil, Buena, Fácil'
      );
      error.status = 400;
      error.code = 'STUDY_INVALID_RATING';
      throw error;
    }
  }
}

function calcularFactorFacilidad(factorActual, calidad) {
  const factor = Number(factorActual) || 2.5;

  const nuevoFactor =
    factor +
    (0.1 - (5 - calidad) * (0.08 + (5 - calidad) * 0.02));

  return Math.max(1.3, Number(nuevoFactor.toFixed(2)));
}

/**
 * Servicio: lógica de negocio que usan los controladores.
 * @namespace
 */
export const SM2Service = {
  /**
   * Calcula el nuevo progreso de una tarjeta según SM-2.
   *
   * @param {Object} datos
   * @param {number|null} datos.factor_facilidad
   * @param {number|null} datos.intervalo_dias
   * @param {number|null} datos.repeticiones
   * @param {string} datos.valoracion
   * @returns {{
   *   factor_facilidad: number,
   *   intervalo_dias: number,
   *   repeticiones: number
   * }}
   */
  calcular(datos) {
    const {
      factor_facilidad,
      intervalo_dias,
      repeticiones,
      valoracion,
    } = datos;

    const calidad = obtenerCalidad(valoracion);

    let factor = Number(factor_facilidad) || 2.5;
    let intervalo = Number(intervalo_dias) || 0;
    let reps = Number(repeticiones) || 0;

    factor = calcularFactorFacilidad(factor, calidad);

    // Repetir: la tarjeta vuelve a comenzar su ciclo.
    if (calidad < 3) {
      reps = 0;
      intervalo = 1;
    } else {
      reps += 1;

      if (reps === 1) {
        intervalo = 1;
      } else if (reps === 2) {
        intervalo = 6;
      } else {
        intervalo = Math.round(intervalo * factor);
      }
    }

    return {
      factor_facilidad: factor,
      intervalo_dias: intervalo,
      repeticiones: reps,
    };
  },
};