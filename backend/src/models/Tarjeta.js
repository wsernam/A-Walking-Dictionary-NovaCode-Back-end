// Modelo de dominio: representa la tabla "tarjeta" del DER oficial.

export class Tarjeta {
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
