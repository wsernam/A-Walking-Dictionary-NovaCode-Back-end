
/**
 * @file DiccionarioRepository.js
 * @brief Acceso a datos del Diccionario Global.
 *
 * HU-016 / HU-1.4
 *
 * Consulta únicamente tarjetas aprobadas por la docente.
 */

import { pool } from '../config/db.js';

export const DiccionarioRepository = {

  /**
   * @brief Lista las tarjetas aprobadas.
   *
   * CA-1.4.1: Solo vocabulario revisado_docente.
   * CA-1.4.2: Búsqueda parcial sin distinguir
   *           mayúsculas y minúsculas.
   *
   * @param {string} termino Palabra a buscar.
   * @returns {Promise<Array>} Tarjetas aprobadas.
   */
  async listarAprobadas(termino = '') {

    const { rows } = await pool.query(
      `
      SELECT
        t.id_tarjeta,
        t.mazo_id,
        t.palabra,
        t.traduccion,
        t.definicion,
        t.ejemplo,
        t.estado,
        t.fecha_creacion,
        t.fecha_revision,

        m.nombre_lectura,
        m.autor AS autor_lectura,
        m.semana,
        m.curso_id,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id_etiqueta', e.id_etiqueta,
                'tipo', e.tipo,
                'valor', e.valor
              )
              ORDER BY e.tipo, e.valor
            )
            FROM etiqueta_contexto e
            WHERE e.tarjeta_id = t.id_tarjeta
          ),
          '[]'::json
        ) AS contexto

      FROM tarjeta t

      INNER JOIN mazo m
        ON m.id_mazo = t.mazo_id

      WHERE
        t.estado = 'revisado_docente'
        AND (
          $1 = ''
          OR t.palabra ILIKE '%' || $1 || '%'
        )

      ORDER BY
        LOWER(t.palabra),
        t.id_tarjeta;
      `,
      [termino.trim()]
    );

    return rows;
  },

  /**
   * @brief Obtiene el detalle de una tarjeta aprobada.
   *
   * Solo permite consultar tarjetas cuyo estado
   * sea revisado_docente.
   *
   * @param {number} id Identificador de la tarjeta.
   * @returns {Promise<Object|null>} Tarjeta o null.
   */
  async obtenerAprobadaPorId(id) {

    const { rows } = await pool.query(
      `
      SELECT
        t.id_tarjeta,
        t.mazo_id,
        t.palabra,
        t.traduccion,
        t.definicion,
        t.ejemplo,
        t.estado,
        t.fecha_creacion,
        t.fecha_revision,

        m.nombre_lectura,
        m.autor AS autor_lectura,
        m.semana,
        m.curso_id,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id_etiqueta', e.id_etiqueta,
                'tipo', e.tipo,
                'valor', e.valor
              )
              ORDER BY e.tipo, e.valor
            )
            FROM etiqueta_contexto e
            WHERE e.tarjeta_id = t.id_tarjeta
          ),
          '[]'::json
        ) AS contexto

      FROM tarjeta t

      INNER JOIN mazo m
        ON m.id_mazo = t.mazo_id

      WHERE
        t.id_tarjeta = $1
        AND t.estado = 'revisado_docente';
      `,
      [id]
    );

    return rows[0] || null;
  }
};
