/**
 * @file Tarjeta.js
 * @brief Modelo de dominio: representa la tabla "tarjeta" del DER oficial.
 */

/**
 * @class Tarjeta
 * @brief Representa una palabra de vocabulario registrada en un mazo. Única por
 * (mazo_id, palabra) según el índice único del DER.
 */
export class Tarjeta {
  /**
   * @brief Construye una Tarjeta a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_tarjeta - Id autoincremental (pk).
   * @param {number} config.mazo_id - Id del mazo al que pertenece (fk -> mazo.id_mazo).
   * @param {string} config.palabra - La palabra en inglés (varchar 150), guardada ya
   * normalizada (trim + minúsculas) por DeduplicacionService.normalizarPalabra.
   * @param {string} config.traduccion - Traducción de la palabra (varchar 255).
   * @param {string} config.definicion - Definición de la palabra (text, sin límite en el DER).
   * @param {string} [config.ejemplo] - Frase de ejemplo (varchar 150, opcional).
   * @param {string} config.estado - Estado de revisión ("pendiente_revision", etc., varchar 30).
   * @param {string} config.fecha_creacion - Marca de tiempo de creación.
   * @param {string|null} [config.fecha_revision] - Marca de tiempo de revisión docente (null
   * hasta que se revise).
   */
  constructor({
    id_tarjeta,
    mazo_id,
    palabra,
    traduccion,
    definicion,
    ejemplo,
    estado,
    fecha_creacion,
    fecha_revision,
  }) {
    this.id_tarjeta = id_tarjeta;
    this.mazo_id = mazo_id;
    this.palabra = palabra;
    this.traduccion = traduccion;
    this.definicion = definicion;
    this.ejemplo = ejemplo;
    this.estado = estado;
    this.fecha_creacion = fecha_creacion;
    this.fecha_revision = fecha_revision;
  }
}
