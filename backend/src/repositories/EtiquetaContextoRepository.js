// Repositorio de EtiquetaContexto: acceso a datos para la tabla "etiqueta_contexto" del DER oficial.
//
// upsert() y asignarPredeterminadaPorTarjetas() dependen del índice único (tarjeta_id, tipo)
// que agrega la migración 002 (HE-02) — PROPUESTA de corrección al DER pendiente de aprobar en
// Slack. Sin ese índice, el "ON CONFLICT (tarjeta_id, tipo)" falla.

import { pool } from '../config/db.js';
import { EtiquetaContexto } from '../models/EtiquetaContexto.js';

export const EtiquetaContextoRepository = {
  async crear(datos) {
    const { tarjeta_id, tipo, valor, fecha_asignacion } = datos;
    const { rows } = await pool.query(
      `INSERT INTO etiqueta_contexto (tarjeta_id, tipo, valor, fecha_asignacion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tarjeta_id, tipo, valor, fecha_asignacion]
    );
    return new EtiquetaContexto(rows[0]);
  },

  // HU-2.2 (CA-2.2.1): asigna/reemplaza la etiqueta de un tipo para una tarjeta. Una sola fila
  // por (tarjeta_id, tipo) gracias al índice único de la migración 002.
  async upsert({ tarjeta_id, tipo, valor, fecha_asignacion }) {
    const { rows } = await pool.query(
      `INSERT INTO etiqueta_contexto (tarjeta_id, tipo, valor, fecha_asignacion)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tarjeta_id, tipo)
       DO UPDATE SET valor = EXCLUDED.valor, fecha_asignacion = EXCLUDED.fecha_asignacion
       RETURNING *`,
      [tarjeta_id, tipo, valor, fecha_asignacion]
    );
    return new EtiquetaContexto(rows[0]);
  },

  // HU-2.2 (CA-2.2.2): inserta la etiqueta "predeterminada" del mazo en varias tarjetas de una
  // vez, SIN pisar las que ya tienen una de ese tipo (ON CONFLICT DO NOTHING). Devuelve cuántas
  // filas se insertaron realmente.
  async asignarPredeterminadaPorTarjetas(tarjetaIds, { tipo, valor, fecha_asignacion }) {
    if (tarjetaIds.length === 0) return 0;
    const { rowCount } = await pool.query(
      `INSERT INTO etiqueta_contexto (tarjeta_id, tipo, valor, fecha_asignacion)
       SELECT t.id, $2, $3, $4 FROM unnest($1::int[]) AS t(id)
       ON CONFLICT (tarjeta_id, tipo) DO NOTHING`,
      [tarjetaIds, tipo, valor, fecha_asignacion]
    );
    return rowCount;
  },

  async obtenerPorId(id_etiqueta) {
    const { rows } = await pool.query('SELECT * FROM etiqueta_contexto WHERE id_etiqueta = $1', [id_etiqueta]);
    return rows[0] ? new EtiquetaContexto(rows[0]) : null;
  },

  // HU-2.2 (CA-2.2.1): todas las etiquetas de contexto vinculadas a una tarjeta.
  async listarPorTarjeta(tarjeta_id) {
    const { rows } = await pool.query(
      'SELECT * FROM etiqueta_contexto WHERE tarjeta_id = $1 ORDER BY tipo',
      [tarjeta_id]
    );
    return rows.map((row) => new EtiquetaContexto(row));
  },

  // HU-2.2 (CA-2.2.1): borra las etiquetas de un tipo concreto de una tarjeta. Se usa antes de
  // insertar la etiqueta nueva para que el PUT /cards/:id/context reemplace (no acumule).
  async eliminarPorTarjetaYTipo(tarjeta_id, tipo) {
    const { rowCount } = await pool.query(
      'DELETE FROM etiqueta_contexto WHERE tarjeta_id = $1 AND tipo = $2',
      [tarjeta_id, tipo]
    );
    return rowCount;
  },

  async listar() {
    const { rows } = await pool.query('SELECT * FROM etiqueta_contexto');
    return rows.map((row) => new EtiquetaContexto(row));
  },

  async actualizar(id_etiqueta, datos) {
    const { tarjeta_id, tipo, valor, fecha_asignacion } = datos;
    const { rows } = await pool.query(
      `UPDATE etiqueta_contexto
       SET tarjeta_id = $2, tipo = $3, valor = $4, fecha_asignacion = $5
       WHERE id_etiqueta = $1
       RETURNING *`,
      [id_etiqueta, tarjeta_id, tipo, valor, fecha_asignacion]
    );
    return rows[0] ? new EtiquetaContexto(rows[0]) : null;
  },

  async eliminar(id_etiqueta) {
    const { rowCount } = await pool.query('DELETE FROM etiqueta_contexto WHERE id_etiqueta = $1', [id_etiqueta]);
    return rowCount > 0;
  },
};
