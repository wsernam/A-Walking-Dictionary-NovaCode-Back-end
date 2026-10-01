import { pool } from '../config/db.js';

export const EstudioRepository = {
  /**
   * Tarjetas aprobadas de los mazos del curso de la inscripción que ya abrieron.
   *
   * El repaso es acumulativo: incluye mazos cerrados (cerrar solo impide agregar palabras,
   * CA-1.2.3) y excluye los que la docente creó por adelantado y aún no llegan a su
   * fecha_apertura. Decisión del equipo (2026-09-30), ver CHANGELOG_BACKEND.md.
   */
  async listarTarjetasDisponibles(inscripcion_id) {
    const { rows } = await pool.query(
      `SELECT
         t.id_tarjeta,
         t.mazo_id,
         t.palabra,
         t.traduccion,
         t.definicion,
         t.ejemplo,
         t.estado,
         t.fecha_creacion,
         t.fecha_revision
       FROM inscripcion i
       INNER JOIN mazo m
         ON m.curso_id = i.curso_id
       INNER JOIN tarjeta t
         ON t.mazo_id = m.id_mazo
       WHERE i.id_inscripcion = $1
         AND i.estado = 'activa'
         AND m.fecha_apertura <= CURRENT_DATE
         AND t.estado = 'revisado_docente'
       ORDER BY t.id_tarjeta ASC`,
      [inscripcion_id]
    );

    return rows;
  },
};