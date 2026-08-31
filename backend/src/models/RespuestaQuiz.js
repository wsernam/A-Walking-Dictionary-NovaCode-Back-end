// Modelo de dominio: representa la tabla "respuesta_quiz" del DER oficial.

export class RespuestaQuiz {
  constructor({
    id_respuesta,
    resultado_id,
    pregunta_id,
    respuesta_estudiante,
    es_correcta,
    puntaje_obtenido,
  }) {
    this.id_respuesta = id_respuesta;
    this.resultado_id = resultado_id;
    this.pregunta_id = pregunta_id;
    this.respuesta_estudiante = respuesta_estudiante;
    this.es_correcta = es_correcta;
    this.puntaje_obtenido = puntaje_obtenido;
  }
}
