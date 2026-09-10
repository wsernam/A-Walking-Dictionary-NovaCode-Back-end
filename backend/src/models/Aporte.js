/**
 * @file Aporte.js
 * @brief Modelo de dominio: representa la tabla "aporte" del DER oficial.
 */

/**
 * @class Aporte
 * @brief Representa el registro de un estudiante proponiendo o coautorando una palabra.
 * Cada tarjeta puede tener varios aportes (creación original, coautorías, acepciones nuevas).
 */
export class Aporte {
  /**
   * @brief Construye un Aporte a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_aporte - Id autoincremental (pk).
   * @param {number} config.tarjeta_id - Id de la tarjeta sobre la que se hace el aporte
   * (fk -> tarjeta.id_tarjeta).
   * @param {number} config.inscripcion_id - Id de la inscripción del estudiante que aporta
   * (fk -> inscripcion.id_inscripcion).
   * @param {string} config.traduccion_aportada - Traducción propuesta en este aporte (varchar 255).
   * @param {string} config.definicion_aportada - Definición propuesta en este aporte (text).
   * @param {string} [config.ejemplo_aportado] - Ejemplo propuesto en este aporte (varchar 150, opcional).
   * @param {string} config.tipo_aporte - Tipo de aporte: 'creada' | 'coautoria' | 'acepcion_nueva'
   * (varchar 40), decidido por DeduplicacionService.resolverAporte.
   * @param {string} config.fecha_aporte - Marca de tiempo del aporte.
   */
  constructor({
    id_aporte,
    tarjeta_id,
    inscripcion_id,
    traduccion_aportada,
    definicion_aportada,
    ejemplo_aportado,
    tipo_aporte,
    fecha_aporte,
  }) {
    this.id_aporte = id_aporte;
    this.tarjeta_id = tarjeta_id;
    this.inscripcion_id = inscripcion_id;
    this.traduccion_aportada = traduccion_aportada;
    this.definicion_aportada = definicion_aportada;
    this.ejemplo_aportado = ejemplo_aportado;
    this.tipo_aporte = tipo_aporte;
    this.fecha_aporte = fecha_aporte;
  }
}
