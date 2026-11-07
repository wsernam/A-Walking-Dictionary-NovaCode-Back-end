/**
 * @file Repositorio de Inscripcion: acceso a datos para la tabla "inscripcion" del DER oficial.
 * @note (curso_id, estudiante_id) es único según el DER.
 */

import { pool } from '../config/db.js';
import { Inscripcion } from '../models/Inscripcion.js';

/**
 * Repositorio: consultas SQL a PostgreSQL.
 * @namespace
 */
export const InscripcionRepository = {
  /**
   * Inscribe a un estudiante en un curso.
   * @param {Object} datos - curso_id, estudiante_id, fecha_inscripcion y estado.
   * @return {Promise<Inscripcion>} La inscripción creada.
   * @throws El error de PostgreSQL 23505 si el estudiante ya está inscrito en ese curso.
   */
  async crear(datos) {
    const {
      curso_id,
      estudiante_id,
      fecha_inscripcion,
      estado,
    } = datos;

    const { rows } = await pool.query(
      `INSERT INTO inscripcion (
        curso_id,
        estudiante_id,
        fecha_inscripcion,
        estado
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        curso_id,
        estudiante_id,
        fecha_inscripcion,
        estado,
      ]
    );

    return new Inscripcion(rows[0]);
  },

  /**
   * Busca una inscripción por su id_inscripcion.
   * @param {number} id_inscripcion - Id de la inscripción.
   * @return {Promise<Inscripcion|null>} La inscripción, o null si no existe.
   */
  async obtenerPorId(id_inscripcion) {
    const { rows } = await pool.query(
      'SELECT * FROM inscripcion WHERE id_inscripcion = $1',
      [id_inscripcion]
    );

    return rows[0]
      ? new Inscripcion(rows[0])
      : null;
  },

  /**
   * Busca la inscripción de un estudiante en un curso. Se usa para comprobar que el estudiante
   * pertenece al curso antes de dejarlo aportar o responder un quiz, y para no inscribirlo dos veces.
   * @param {number} curso_id - Id del curso.
   * @param {number} estudiante_id - id_usuario del estudiante.
   * @return {Promise<Inscripcion|null>} La inscripción, o null si no está inscrito.
   */
  async obtenerPorCursoYEstudiante(
    curso_id,
    estudiante_id
  ) {
    const { rows } = await pool.query(
      `SELECT *
       FROM inscripcion
       WHERE curso_id = $1
         AND estudiante_id = $2`,
      [
        curso_id,
        estudiante_id,
      ]
    );

    return rows[0]
      ? new Inscripcion(rows[0])
      : null;
  },

  /**
   * HU-5.2: inscripción más reciente del estudiante con los datos de su curso.
   * @param {number} estudiante_id - id_usuario del estudiante.
   * @returns {Promise<{id_inscripcion:number, curso_asignado:string, semestre_activo:string}|null>}
   * id de la inscripción, curso.nombre y curso.periodo, o null si el estudiante no tiene inscripciones.
   */
  async obtenerContextoAcademico(estudiante_id) {
    const { rows } = await pool.query(
      `SELECT i.id_inscripcion, c.nombre AS curso_asignado, c.periodo AS semestre_activo
       FROM inscripcion i
       JOIN curso c ON c.id_curso = i.curso_id
       WHERE i.estudiante_id = $1
       ORDER BY i.fecha_inscripcion DESC, i.id_inscripcion DESC
       LIMIT 1`,
      [estudiante_id]
    );
    return rows[0] || null;
  },

  /**
   * Lista todas las inscripciones, sin filtros.
   * @return {Promise<Inscripcion[]>} Todas las inscripciones existentes.
   */
  async listar() {
    const { rows } = await pool.query(
      'SELECT * FROM inscripcion'
    );

    return rows.map(
      (row) => new Inscripcion(row)
    );
  },

  /**
   * Lista los estudiantes inscritos en un curso con cuántas palabras ha creado cada uno
   * (aportes con tipo_aporte = 'creada'), ordenados por nombre.
   * @param {number} curso_id - Id del curso.
   * @return {Promise<Object[]>} Una fila por estudiante con id_usuario, nombre_completo,
   * nivel_ingles, codigo_estudiantil y palabras_aportadas.
   */
  async listarEstudiantesPorCurso(curso_id) {
    const { rows } = await pool.query(
      `SELECT
        u.id_usuario,
        u.nombre_completo,
        u.nivel_ingles,
        u.codigo_estudiantil,
        COUNT(ap.id_aporte)::int AS palabras_aportadas
       FROM inscripcion i
       JOIN usuario u
         ON u.id_usuario = i.estudiante_id
       LEFT JOIN aporte ap
         ON ap.inscripcion_id = i.id_inscripcion
        AND ap.tipo_aporte = 'creada'
       WHERE i.curso_id = $1
       GROUP BY
         u.id_usuario,
         u.nombre_completo,
         u.nivel_ingles,
         u.codigo_estudiantil
       ORDER BY
         u.nombre_completo ASC`,
      [curso_id]
    );

    return rows;
  },

  /**
   * Reemplaza todos los campos de una inscripción existente (UPDATE completo).
   * @param {number} id_inscripcion - Id de la inscripción a actualizar.
   * @param {Object} datos - curso_id, estudiante_id, fecha_inscripcion y estado.
   * @return {Promise<Inscripcion|null>} La inscripción actualizada, o null si el id no existe.
   */
  async actualizar(
    id_inscripcion,
    datos
  ) {
    const {
      curso_id,
      estudiante_id,
      fecha_inscripcion,
      estado,
    } = datos;

    const { rows } = await pool.query(
      `UPDATE inscripcion
       SET
         curso_id = $2,
         estudiante_id = $3,
         fecha_inscripcion = $4,
         estado = $5
       WHERE id_inscripcion = $1
       RETURNING *`,
      [
        id_inscripcion,
        curso_id,
        estudiante_id,
        fecha_inscripcion,
        estado,
      ]
    );

    return rows[0]
      ? new Inscripcion(rows[0])
      : null;
  },

  /**
   * Elimina una inscripción por su id_inscripcion.
   * @param {number} id_inscripcion - Id de la inscripción a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   */
  async eliminar(id_inscripcion) {
    const { rowCount } = await pool.query(
      `DELETE FROM inscripcion
       WHERE id_inscripcion = $1`,
      [id_inscripcion]
    );

    return rowCount > 0;
  },
};