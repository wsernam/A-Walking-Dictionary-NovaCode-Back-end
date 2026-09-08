// Modelo de dominio: representa la tabla "notificacion".
//
// Entidad NUEVA introducida por la migración 002 (HE-02, CA-2.1.3): al rechazar una tarjeta
// "se le notifica al estudiante aportante para su corrección". PROPUESTA de corrección al DER
// pendiente de aprobar en Slack (no está en el DER oficial / init.sql todavía).

export class Notificacion {
  constructor({
    id_notificacion,
    usuario_id,
    tarjeta_id,
    tipo,
    mensaje,
    leida,
    fecha_creacion,
  }) {
    this.id_notificacion = id_notificacion;
    this.usuario_id = usuario_id;
    this.tarjeta_id = tarjeta_id;
    this.tipo = tipo;
    this.mensaje = mensaje;
    this.leida = leida;
    this.fecha_creacion = fecha_creacion;
  }
}
