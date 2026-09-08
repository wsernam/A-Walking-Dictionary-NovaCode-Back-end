// Modelo de dominio: representa la tabla "tarjeta" del DER oficial.
//
// "motivo_rechazo" viene de la migración 002 (HE-02, CA-2.1.3) — PROPUESTA de corrección
// al DER pendiente de aprobar en Slack. Si la migración aún no se aplicó, la columna no
// existe y este campo llega como undefined (inofensivo para lectura).

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
    motivo_rechazo,
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
    this.motivo_rechazo = motivo_rechazo;
  }
}
