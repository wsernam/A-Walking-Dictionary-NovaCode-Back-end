/**
 * @file ProgresoEstudio.js
 * @brief Modelo de dominio: representa la tabla "progreso_estudio" del DER oficial.
 */

/**
 * @class ProgresoEstudio
 * @brief Estado SM-2 de una tarjeta para un estudiante (HU-4.1). Único por
 * (inscripcion_id, tarjeta_id) según el DER.
 */
export class ProgresoEstudio {
  /**
   * @brief Construye un ProgresoEstudio a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_progreso - Id autoincremental (pk).
   * @param {number} config.inscripcion_id - Id de la inscripción (fk -> inscripcion.id_inscripcion).
   * @param {number} config.tarjeta_id - Id de la tarjeta (fk -> tarjeta.id_tarjeta).
   * @param {number|null} config.factor_facilidad - Factor de facilidad de SM-2 (decimal).
   * @param {number|null} config.intervalo_dias - Intervalo actual en días (int).
   * @param {number} config.repeticiones - Repeticiones consecutivas correctas (int, default 0).
   * @param {string|null} config.ultima_valoracion - Última valoración (varchar 30; HU-4.1:
   * Repetir, Difícil, Buena o Fácil).
   * @param {string|null} config.fecha_ultimo_repaso - Marca de tiempo del último repaso.
   * @param {string|null} config.fecha_proximo_repaso - Marca de tiempo del próximo repaso.
   */
  constructor({
    id_progreso,
    inscripcion_id,
    tarjeta_id,
    factor_facilidad,
    intervalo_dias,
    repeticiones,
    ultima_valoracion,
    fecha_ultimo_repaso,
    fecha_proximo_repaso,
  }) {
    this.id_progreso = id_progreso;
    this.inscripcion_id = inscripcion_id;
    this.tarjeta_id = tarjeta_id;
    this.factor_facilidad = factor_facilidad;
    this.intervalo_dias = intervalo_dias;
    this.repeticiones = repeticiones;
    this.ultima_valoracion = ultima_valoracion;
    this.fecha_ultimo_repaso = fecha_ultimo_repaso;
    this.fecha_proximo_repaso = fecha_proximo_repaso;
  }
}