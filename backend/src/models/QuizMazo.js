// Modelo de dominio: representa la tabla "quiz_mazo" del DER oficial (tabla puente, pk compuesta quiz_id+mazo_id).

export class QuizMazo {
  constructor({
    quiz_id,
    mazo_id,
  }) {
    this.quiz_id = quiz_id;
    this.mazo_id = mazo_id;
  }
}
