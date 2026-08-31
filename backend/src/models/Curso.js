// Modelo de dominio: representa la tabla "curso" del DER oficial.

export class Curso {
  constructor({
    id_curso,
    nombre,
    periodo,
    fecha_inicio,
    fecha_fin,
    docente_id,
    estado,
  }) {
    this.id_curso = id_curso;
    this.nombre = nombre;
    this.periodo = periodo;
    this.fecha_inicio = fecha_inicio;
    this.fecha_fin = fecha_fin;
    this.docente_id = docente_id;
    this.estado = estado;
  }
}
