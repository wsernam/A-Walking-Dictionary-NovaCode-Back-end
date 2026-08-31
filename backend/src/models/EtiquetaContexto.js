// Modelo de dominio: representa la tabla "etiqueta_contexto" del DER oficial.

export class EtiquetaContexto {
  constructor({
    id_etiqueta,
    tarjeta_id,
    tipo,
    valor,
    fecha_asignacion,
  }) {
    this.id_etiqueta = id_etiqueta;
    this.tarjeta_id = tarjeta_id;
    this.tipo = tipo;
    this.valor = valor;
    this.fecha_asignacion = fecha_asignacion;
  }
}
