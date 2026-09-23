import { pool } from '../config/db.js';

export const StudyRepository = {
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
         AND m.estado = 'abierto'
         AND t.estado = 'revisado_docente'
       ORDER BY t.id_tarjeta ASC`,
      [inscripcion_id]
    );

    return rows;
  },
};