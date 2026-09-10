/**
 * @file Mazo.js
 * @brief Modelo de dominio: representa la tabla "mazo" del DER oficial.
 *
 * @note "docente_id" es redundante con curso.docente_id (mazo.curso_id -> curso.docente_id
 * ya da el mismo dato), pero el equipo confirmó mantenerlo duplicado aquí por conveniencia
 * de consulta. Decisión confirmada, ya no es un pendiente.
 */

/**
 * @class Mazo
 * @brief Representa una fila de la tabla "mazo": una lectura semanal asignada dentro de un curso.
 */
export class Mazo {
  /**
   * @brief Construye un Mazo a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_mazo - Id autoincremental (pk).
   * @param {number} config.curso_id - Id del curso al que pertenece (fk -> curso.id_curso).
   * @param {number} config.docente_id - Id del docente dueño del mazo (fk -> usuario.id_usuario).
   * Redundante con curso.docente_id (ver nota de archivo arriba), duplicado a propósito.
   * @param {string} config.nombre_lectura - Nombre del libro/lectura (varchar 200).
   * @param {string} config.autor - Autor de la lectura (varchar 150).
   * @param {number} config.semana - Semana del cronograma a la que corresponde.
   * @param {string} [config.variante_regional_predeterminada] - Variante regional del inglés
   * por defecto para este mazo (varchar 100, opcional).
   * @param {string} config.estado - Estado del mazo ("abierto" | "cerrado", varchar 30).
   * @param {string} config.fecha_apertura - Fecha en que el mazo empieza a aceptar aportes.
   * @param {string} config.fecha_cierre - Fecha en que el mazo deja de aceptar aportes.
   * @param {string} config.fecha_creacion - Marca de tiempo de creación (la asigna Postgres
   * con NOW(), no el cliente).
   */
  constructor({
    id_mazo,
    curso_id,
    docente_id,
    nombre_lectura,
    autor,
    semana,
    variante_regional_predeterminada,
    estado,
    fecha_apertura,
    fecha_cierre,
    fecha_creacion,
  }) {
    this.id_mazo = id_mazo;
    this.curso_id = curso_id;
    this.docente_id = docente_id;
    this.nombre_lectura = nombre_lectura;
    this.autor = autor;
    this.semana = semana;
    this.variante_regional_predeterminada = variante_regional_predeterminada;
    this.estado = estado;
    this.fecha_apertura = fecha_apertura;
    this.fecha_cierre = fecha_cierre;
    this.fecha_creacion = fecha_creacion;
  }
}
