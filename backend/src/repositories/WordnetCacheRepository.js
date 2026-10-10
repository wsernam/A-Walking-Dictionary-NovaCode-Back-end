import { pool } from '../config/db.js';

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const WordnetCacheRepository = {
  /**
   * Busca todos los sentidos almacenados para una palabra.
   */
  async buscarPorPalabra(palabra) {
    const { rows } = await pool.query(
      `
      SELECT
        id_cache,
        palabra,
        sentido,
        categoria_gramatical,
        definicion,
        sinonimos,
        hiperonimos,
        hiponimos,
        familia,
        fuente,
        confirmado_por_estudiante,
        fecha_consulta
      FROM wordnet_cache
      WHERE palabra = $1
      ORDER BY sentido
      `,
      [palabra]
    );

    return rows.map((row) => ({
      id_cache: row.id_cache,
      palabra: row.palabra,
      sentido: row.sentido,
      definicion: row.definicion,
      sinonimos: parseJsonArray(row.sinonimos),
      hiperonimos: parseJsonArray(row.hiperonimos),
      hiponimos: parseJsonArray(row.hiponimos),
      familia: parseJsonArray(row.familia),
      fuente: row.fuente,
      confirmado_por_estudiante: row.confirmado_por_estudiante,
      fecha_consulta: row.fecha_consulta,
    }));
  },

  /**
   * Guarda o actualiza un sentido de WordNet.
   *
   * La restricción UNIQUE(palabra, sentido) evita duplicados.
   */
  async guardarSense({
    palabra,
    sentido,
    categoria_gramatical,
    definicion,
    sinonimos = [],
    hiperonimos = [],
    hiponimos = [],
    familia = [],
    fuente = 'WordNet 3.1',
  }) {
    const { rows } = await pool.query(
      `
      INSERT INTO wordnet_cache (
        palabra,
        sentido,
        categoria_gramatical,
        definicion,
        sinonimos,
        hiperonimos,
        hiponimos,
        familia,
        fuente
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (palabra, sentido)
      DO UPDATE SET
        definicion = EXCLUDED.definicion,
        sinonimos = EXCLUDED.sinonimos,
        hiperonimos = EXCLUDED.hiperonimos,
        hiponimos = EXCLUDED.hiponimos,
        familia = EXCLUDED.familia,
        fuente = EXCLUDED.fuente,
        fecha_consulta = NOW()
      RETURNING
        id_cache,
        palabra,
        sentido,
        categoria_gramatical,
        definicion,
        sinonimos,
        hiperonimos,
        hiponimos,
        familia,
        fuente,
        confirmado_por_estudiante,
        fecha_consulta
      `,
      [
        palabra,
        sentido,
        categoria_gramatical,
        definicion ?? null,
        JSON.stringify(sinonimos),
        JSON.stringify(hiperonimos),
        JSON.stringify(hiponimos),
        JSON.stringify(familia),
        fuente,
      ]
    );

    const row = rows[0];

    return {
      id_cache: row.id_cache,
      palabra: row.palabra,
      sentido: row.sentido,
      definicion: row.definicion,
      sinonimos: parseJsonArray(row.sinonimos),
      hiperonimos: parseJsonArray(row.hiperonimos),
      hiponimos: parseJsonArray(row.hiponimos),
      familia: parseJsonArray(row.familia),
      fuente: row.fuente,
      confirmado_por_estudiante: row.confirmado_por_estudiante,
      fecha_consulta: row.fecha_consulta,
    };
  },
};