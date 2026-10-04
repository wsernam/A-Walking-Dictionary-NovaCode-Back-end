// Repositorio de Inscripcion: acceso a datos para la tabla "inscripcion" del DER oficial.
// (curso_id, estudiante_id) es único según el DER.

import { pool } from '../config/db.js';
import { Inscripcion } from '../models/Inscripcion.js';

export const InscripcionRepository = {
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

  async obtenerPorId(id_inscripcion) {
    const { rows } = await pool.query(
      'SELECT * FROM inscripcion WHERE id_inscripcion = $1',
      [id_inscripcion]
    );

    return rows[0]
      ? new Inscripcion(rows[0])
      : null;
  },

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

  async listar() {
    const { rows } = await pool.query(
      'SELECT * FROM inscripcion'
    );

    return rows.map(
      (row) => new Inscripcion(row)
    );
  },

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

  async eliminar(id_inscripcion) {
    const { rowCount } = await pool.query(
      `DELETE FROM inscripcion
       WHERE id_inscripcion = $1`,
      [id_inscripcion]
    );

    return rowCount > 0;
  },
};