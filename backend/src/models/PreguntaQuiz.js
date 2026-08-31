// Modelo de dominio: representa la tabla "pregunta_quiz" del DER oficial.

export class PreguntaQuiz {
  constructor({
    id_pregunta,
    quiz_id,
    tarjeta_id,
    tipo_pregunta,
    enunciado,
    opcion_a,
    opcion_b,
    opcion_c,
    opcion_d,
    respuesta_correcta,
    orden,
  }) {
    this.id_pregunta = id_pregunta;
    this.quiz_id = quiz_id;
    this.tarjeta_id = tarjeta_id;
    this.tipo_pregunta = tipo_pregunta;
    this.enunciado = enunciado;
    this.opcion_a = opcion_a;
    this.opcion_b = opcion_b;
    this.opcion_c = opcion_c;
    this.opcion_d = opcion_d;
    this.respuesta_correcta = respuesta_correcta;
    this.orden = orden;
  }
}
