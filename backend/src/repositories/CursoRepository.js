// Repositorio de Curso: acceso a datos para la tabla "curso" del DER oficial.

import { pool } from '../config/db.js';
import { Curso } from '../models/Curso.js';

export const CursoRepository = {
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

  async obtenerPorId(id_curso) {
    const { rows } = await pool.query('SELECT * FROM curso WHERE id_curso = $1', [id_curso]);
    return rows[0] ? new Curso(rows[0]) : null;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM curso');
    return rows.map((row) => new Curso(row));
  },

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

  async eliminar(id_curso) {
    const { rowCount } = await pool.query('DELETE FROM curso WHERE id_curso = $1', [id_curso]);
    return rowCount > 0;
  },
};
