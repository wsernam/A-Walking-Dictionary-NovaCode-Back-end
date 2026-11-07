/**
 * @file Repositorio de Curso: acceso a datos para la tabla "curso" del DER oficial.
 */

import { pool } from '../config/db.js';
import { Curso } from '../models/Curso.js';

/**
 * Repositorio: consultas SQL a PostgreSQL.
 * @namespace
 */
export const CursoRepository = {
  /**
   * Inserta un curso nuevo en la base de datos.
   * @param {Object} datos - Campos de "curso" (nombre, periodo, fecha_inicio, fecha_fin,
   * docente_id, estado).
   * @return {Promise<Curso>} El curso recién creado, con su id_curso asignado.
   */
  async crear(datos) {
    const { nombre, periodo, fecha_inicio, fecha_fin, docente_id, estado } = datos;
    const { rows } = await pool.query(
      `INSERT INTO curso (nombre, periodo, fecha_inicio, fecha_fin, docente_id, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, periodo, fecha_inicio, fecha_fin, docente_id, estado]
    );
    return new Curso(rows[0]);
  },

  /**
   * Busca un curso por su id_curso.
   * @param {number} id_curso - Id del curso a buscar.
   * @return {Promise<Curso|null>} El curso encontrado, o null si no existe.
   */
  async obtenerPorId(id_curso) {
    const { rows } = await pool.query('SELECT * FROM curso WHERE id_curso = $1', [id_curso]);
    return rows[0] ? new Curso(rows[0]) : null;
    },

  /**
   * Busca el curso que tiene un código de acceso (CA-5.3.1, inscripción por código).
   * @param {string} codigo_acceso - Código que la docente compartió con los estudiantes.
   * @return {Promise<Curso|null>} El curso, o null si ningún curso tiene ese código.
   */
  async obtenerPorCodigoAcceso(codigo_acceso) {
      const { rows } = await pool.query(
        'SELECT * FROM curso WHERE codigo_acceso = $1',
        [codigo_acceso]
      );

      return rows[0] ? new Curso(rows[0]) : null;
    },

    /**
     * Guarda (o reemplaza) el código de acceso de un curso (CA-5.3.1).
     * @param {number} id_curso - Id del curso.
     * @param {string} codigo_acceso - Código generado por InscripcionService.
     * @return {Promise<Curso|null>} El curso actualizado, o null si el id no existe.
     */
    async guardarCodigoAcceso(id_curso, codigo_acceso) {
      const { rows } = await pool.query(
        `UPDATE curso
        SET codigo_acceso = $2
        WHERE id_curso = $1
        RETURNING *`,
        [id_curso, codigo_acceso]
      );

      return rows[0] ? new Curso(rows[0]) : null;
    },



  /**
   * Lista todos los cursos, sin filtros.
   * @return {Promise<Curso[]>} Arreglo con todos los cursos existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM curso');
    return rows.map((row) => new Curso(row));
  },

  /**
   * Reemplaza todos los campos de un curso existente (UPDATE completo).
   * @param {number} id_curso - Id del curso a actualizar.
   * @param {Object} datos - nombre, periodo, fecha_inicio, fecha_fin, docente_id y estado.
   * @return {Promise<Curso|null>} El curso actualizado, o null si el id no existe.
   */
  async actualizar(id_curso, datos) {
    const { nombre, periodo, fecha_inicio, fecha_fin, docente_id, estado } = datos;
    const { rows } = await pool.query(
      `UPDATE curso
       SET nombre = $2, periodo = $3, fecha_inicio = $4, fecha_fin = $5, docente_id = $6, estado = $7
       WHERE id_curso = $1
       RETURNING *`,
      [id_curso, nombre, periodo, fecha_inicio, fecha_fin, docente_id, estado]
    );
    return rows[0] ? new Curso(rows[0]) : null;
  },

  /**
   * Elimina un curso por su id_curso.
   * @param {number} id_curso - Id del curso a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   */
  async eliminar(id_curso) {
    const { rowCount } = await pool.query('DELETE FROM curso WHERE id_curso = $1', [id_curso]);
    return rowCount > 0;
  },
};
