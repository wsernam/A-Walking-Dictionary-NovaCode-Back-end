/**
 * @file Modelo de dominio: representa la tabla "inscripcion" del DER oficial.
 */

/**
 * Vínculo de un estudiante con un curso (HU-5.3). Única por (curso_id, estudiante_id)
 * según el DER.
 */
export class Inscripcion {
  /**
   * Construye una Inscripcion a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_inscripcion - Id autoincremental (pk).
   * @param {number} config.curso_id - Id del curso (fk -> curso.id_curso).
   * @param {number} config.estudiante_id - Id del estudiante (fk -> usuario.id_usuario).
   * @param {string} config.fecha_inscripcion - Fecha de inscripción (date).
   * @param {string} config.estado - Estado de la inscripción (varchar 30, por ejemplo "activa").
   */
  constructor({
    id_inscripcion,
    curso_id,
    estudiante_id,
    fecha_inscripcion,
    estado,
  }) {
    this.id_inscripcion = id_inscripcion;
    this.curso_id = curso_id;
    this.estudiante_id = estudiante_id;
    this.fecha_inscripcion = fecha_inscripcion;
    this.estado = estado;
  }
}