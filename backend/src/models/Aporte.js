// Modelo de dominio: representa la tabla "aporte" del DER oficial.

export class Aporte {
  constructor({
    id_aporte,
    tarjeta_id,
    inscripcion_id,
    traduccion_aportada,
    definicion_aportada,
    ejemplo_aportado,
    tipo_aporte,
    fecha_aporte,
  }) {
    this.id_aporte = id_aporte;
    this.tarjeta_id = tarjeta_id;
    this.inscripcion_id = inscripcion_id;
    this.traduccion_aportada = traduccion_aportada;
    this.definicion_aportada = definicion_aportada;
    this.ejemplo_aportado = ejemplo_aportado;
    this.tipo_aporte = tipo_aporte;
    this.fecha_aporte = fecha_aporte;
  }
}
