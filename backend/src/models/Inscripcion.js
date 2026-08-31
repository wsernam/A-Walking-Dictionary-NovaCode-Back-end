// Modelo de dominio: representa la tabla "inscripcion" del DER oficial.

export class Inscripcion {
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
