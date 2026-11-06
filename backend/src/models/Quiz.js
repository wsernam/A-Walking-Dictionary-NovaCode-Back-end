/**
 * @file Quiz.js
 * @brief Modelo de dominio: representa la tabla "quiz" del DER oficial.
 */

/**
 * @class Quiz
 * @brief Quiz acumulativo de un curso (HU-3.1).
 *
 * @note fecha_apertura y fecha_cierre son TIMESTAMP sin zona horaria; src/config/db.js los lee
 * y escribe en UTC. El estado efectivo (programado, abierto, cerrado) se calcula por fecha en
 * QuizService; la columna "estado" guarda el estado inicial.
 */
export class Quiz {
  /**
   * @brief Construye un Quiz a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_quiz - Id autoincremental (pk).
   * @param {number} config.curso_id - Id del curso (fk -> curso.id_curso).
   * @param {string} config.titulo - Título del quiz (varchar 200).
   * @param {number} config.semana_corte - Semana de corte acumulativa del quiz (int).
   * @param {string} config.fecha_creacion - Marca de tiempo de creación (default NOW()).
   * @param {string|null} config.fecha_apertura - Marca de tiempo de apertura.
   * @param {string|null} config.fecha_cierre - Marca de tiempo de cierre.
   * @param {number|null} config.tiempo_limite_min - Tiempo límite en minutos.
   * @param {string} config.estado - Estado guardado (varchar 30, por ejemplo "programado").
   */
  constructor({
    id_quiz,
    curso_id,
    titulo,
    semana_corte,
    fecha_creacion,
    fecha_apertura,
    fecha_cierre,
    tiempo_limite_min,
    estado,
  }) {
    this.id_quiz = id_quiz;
    this.curso_id = curso_id;
    this.titulo = titulo;
    this.semana_corte = semana_corte;
    this.fecha_creacion = fecha_creacion;
    this.fecha_apertura = fecha_apertura;
    this.fecha_cierre = fecha_cierre;
    this.tiempo_limite_min = tiempo_limite_min;
    this.estado = estado;
  }
}