/**
 * @file Modelo de dominio: representa la tabla "etiqueta_contexto" del DER oficial.
 */

/**
 * Etiqueta de contexto cultural que la docente asigna a una tarjeta (HU-2.2), por ejemplo
 * su registro ("registro") o su variante regional ("variante_regional").
 */
export class EtiquetaContexto {
  /**
   * Construye una EtiquetaContexto a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_etiqueta - Id autoincremental (pk).
   * @param {number} config.tarjeta_id - Id de la tarjeta etiquetada (fk -> tarjeta.id_tarjeta).
   * @param {string} config.tipo - Tipo de etiqueta (varchar 40, obligatorio).
   * @param {string} config.valor - Valor de la etiqueta (varchar 150, obligatorio).
   * @param {string} config.fecha_asignacion - Marca de tiempo de asignación (default NOW()).
   */
  constructor({
    id_etiqueta,
    tarjeta_id,
    tipo,
    valor,
    fecha_asignacion,
  }) {
    this.id_etiqueta = id_etiqueta;
    this.tarjeta_id = tarjeta_id;
    this.tipo = tipo;
    this.valor = valor;
    this.fecha_asignacion = fecha_asignacion;
  }
}