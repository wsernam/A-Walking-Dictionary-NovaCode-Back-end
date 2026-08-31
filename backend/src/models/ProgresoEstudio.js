// Modelo de dominio: representa la tabla "progreso_estudio" del DER oficial.

export class ProgresoEstudio {
  constructor({
    id_progreso,
    inscripcion_id,
    tarjeta_id,
    factor_facilidad,
    intervalo_dias,
    repeticiones,
    ultima_valoracion,
    fecha_ultimo_repaso,
    fecha_proximo_repaso,
  }) {
    this.id_progreso = id_progreso;
    this.inscripcion_id = inscripcion_id;
    this.tarjeta_id = tarjeta_id;
    this.factor_facilidad = factor_facilidad;
    this.intervalo_dias = intervalo_dias;
    this.repeticiones = repeticiones;
    this.ultima_valoracion = ultima_valoracion;
    this.fecha_ultimo_repaso = fecha_ultimo_repaso;
    this.fecha_proximo_repaso = fecha_proximo_repaso;
  }
}
