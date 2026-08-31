// Modelo de dominio: representa la tabla "quiz" del DER oficial.

export class Quiz {
  constructor({
    id_quiz,
    curso_id,
    titulo,
    semana_corte,
    fecha_creacion,
    fecha_apertura,
    fecha_cierre,
    tiempo_limite_min,
    estado,
  }) {
    this.id_quiz = id_quiz;
    this.curso_id = curso_id;
    this.titulo = titulo;
    this.semana_corte = semana_corte;
    this.fecha_creacion = fecha_creacion;
    this.fecha_apertura = fecha_apertura;
    this.fecha_cierre = fecha_cierre;
    this.tiempo_limite_min = tiempo_limite_min;
    this.estado = estado;
  }
}
