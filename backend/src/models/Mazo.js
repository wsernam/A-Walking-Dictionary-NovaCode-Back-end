// Modelo de dominio: representa la tabla "mazo" del DER oficial.

export class Mazo {
  constructor({
    id_mazo,
    curso_id,
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
