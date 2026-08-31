// Modelo de dominio: representa la tabla "resultado_quiz" del DER oficial.

export class ResultadoQuiz {
  constructor({
    id_resultado,
    quiz_id,
    estudiante_id,
    fecha_inicio,
    fecha_envio,
    puntaje_obtenido,
    puntaje_maximo,
    calificacion,
    tiempo_empleado_seg,
  }) {
    this.id_resultado = id_resultado;
    this.quiz_id = quiz_id;
    this.estudiante_id = estudiante_id;
    this.fecha_inicio = fecha_inicio;
    this.fecha_envio = fecha_envio;
    this.puntaje_obtenido = puntaje_obtenido;
    this.puntaje_maximo = puntaje_maximo;
    this.calificacion = calificacion;
    this.tiempo_empleado_seg = tiempo_empleado_seg;
  }
}
