/**
 * @file Curso.js
 * @brief Modelo de dominio: representa la tabla "curso" del DER oficial.
 */

/**
 * @class Curso
 * @brief Representa una fila de la tabla "curso": una asignatura dictada por un docente en un periodo.
 */
export class Curso {
  /**
   * @brief Construye un Curso a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_curso - Id autoincremental (pk).
   * @param {string} config.nombre - Nombre del curso (varchar 150).
   * @param {string} config.periodo - Periodo académico, ej. "2026-2" (varchar 20).
   * @param {string} config.fecha_inicio - Fecha de inicio del curso.
   * @param {string} config.fecha_fin - Fecha de fin del curso.
   * @param {number} config.docente_id - Id del docente que dicta el curso (fk -> usuario.id_usuario).
   * @param {string} config.estado - Estado del curso (varchar 30).
   */
  constructor({
    id_curso,
    nombre,
    periodo,
    fecha_inicio,
    fecha_fin,
    docente_id,
    estado,
  }) {
    this.id_curso = id_curso;
    this.nombre = nombre;
    this.periodo = periodo;
    this.fecha_inicio = fecha_inicio;
    this.fecha_fin = fecha_fin;
    this.docente_id = docente_id;
    this.estado = estado;
  }
}
