/**
 * @file ResultadoQuizRepository.js
 * @brief Repositorio de ResultadoQuiz: acceso a datos para la tabla "resultado_quiz" del DER
 * oficial. (quiz_id, estudiante_id) es único según el DER.
 * @note Usado por QuizService.enviarRespuestas() (HU-3.2) para registrar la calificación de un
 * estudiante y, mediante obtenerPorQuizYEstudiante(), para bloquear reintentos (CA-3.2.3).
 */

import { pool } from '../config/db.js';
import { ResultadoQuiz } from '../models/ResultadoQuiz.js';
import { RespuestaQuizRepository } from './RespuestaQuizRepository.js';

export const ResultadoQuizRepository = {
  /**
   * @brief Inserta un resultado_quiz nuevo en la base de datos.
   * @param {Object} datos - Campos de "resultado_quiz" (quiz_id, estudiante_id, fecha_inicio,
   * fecha_envio, puntaje_obtenido, puntaje_maximo, calificacion, tiempo_empleado_seg).
   * @param {import('pg').Pool|import('pg').PoolClient} [db=pool] - Conexión a usar; se pasa un
   * cliente cuando la inserción forma parte de una transacción (ver crearConRespuestas).
   * @return {Promise<ResultadoQuiz>} El resultado recién creado, con su id_resultado asignado.
   * @note Falla (rechaza la promesa, código Postgres 23505) si ya existe un resultado para ese
   * (quiz_id, estudiante_id) — índice único del DER; QuizService.enviarRespuestas() traduce ese
   * error a un 409 con el resumen previo (CA-3.2.3).
   */
  async crear(datos, db = pool) {
    const {
      quiz_id,
      estudiante_id,
      fecha_inicio,
      fecha_envio,
      puntaje_obtenido,
      puntaje_maximo,
      calificacion,
      tiempo_empleado_seg,
    } = datos;
    const { rows } = await db.query(
      `INSERT INTO resultado_quiz (quiz_id, estudiante_id, fecha_inicio, fecha_envio, puntaje_obtenido, puntaje_maximo, calificacion, tiempo_empleado_seg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [quiz_id, estudiante_id, fecha_inicio, fecha_envio, puntaje_obtenido, puntaje_maximo, calificacion, tiempo_empleado_seg]
    );
    return new ResultadoQuiz(rows[0]);
  },

  /**
   * @brief HU-3.2 (CA-3.2.2): guarda el resultado_quiz de un estudiante junto con sus filas de
   * respuesta_quiz en una sola transacción. Si cualquier inserción falla, se revierte todo y no
   * queda un resultado sin desglose que bloquee un nuevo envío (CA-3.2.3) sin haberse calificado.
   * @param {Object} datosResultado - Campos de "resultado_quiz" (ver crear).
   * @param {Object[]} respuestas - Datos de cada respuesta (ver RespuestaQuizRepository.crear),
   * sin resultado_id: se asigna aquí con el id del resultado recién creado.
   * @return {Promise<{resultado:ResultadoQuiz,
   * respuestas:import('../models/RespuestaQuiz.js').RespuestaQuiz[]}>} El resultado y las
   * respuestas creadas.
   */
  async crearConRespuestas(datosResultado, respuestas) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await this.crear(datosResultado, client);
      const respuestasCreadas = [];
      for (const respuesta of respuestas) {
        respuestasCreadas.push(
          await RespuestaQuizRepository.crear({ resultado_id: resultado.id_resultado, ...respuesta }, client)
        );
      }
      await client.query('COMMIT');
      return { resultado, respuestas: respuestasCreadas };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * @brief Busca un resultado_quiz por su id_resultado.
   * @param {number} id_resultado - Id del resultado a buscar.
   * @return {Promise<ResultadoQuiz|null>} El resultado encontrado, o null si no existe.
   */
  async obtenerPorId(id_resultado) {
    const { rows } = await pool.query('SELECT * FROM resultado_quiz WHERE id_resultado = $1', [id_resultado]);
    return rows[0] ? new ResultadoQuiz(rows[0]) : null;
  },

  /**
   * @brief CA-3.2.3: busca si un estudiante ya envió un quiz específico, para bloquear un
   * segundo intento y devolver el resumen del resultado previo en su lugar.
   * @param {number} quiz_id - Id del quiz.
   * @param {number} estudiante_id - Id del estudiante (usuario).
   * @return {Promise<ResultadoQuiz|null>} El resultado previo, o null si el estudiante no ha
   * enviado ese quiz todavía.
   */
  async obtenerPorQuizYEstudiante(quiz_id, estudiante_id) {
    const { rows } = await pool.query(
      'SELECT * FROM resultado_quiz WHERE quiz_id = $1 AND estudiante_id = $2',
      [quiz_id, estudiante_id]
    );
    return rows[0] ? new ResultadoQuiz(rows[0]) : null;
  },

  /**
   * @brief Lista todos los resultados existentes, sin filtros.
   * @return {Promise<ResultadoQuiz[]>} Arreglo con todos los resultados existentes.
   */
  async listar() {
    const { rows } = await pool.query('SELECT * FROM resultado_quiz');
    return rows.map((row) => new ResultadoQuiz(row));
  },

  /**
   * @brief Reemplaza todos los campos de un resultado existente (UPDATE completo).
   * @param {number} id_resultado - Id del resultado a actualizar.
   * @param {Object} datos - Nuevos valores de todas las columnas de "resultado_quiz".
   * @return {Promise<ResultadoQuiz|null>} El resultado actualizado, o null si el id no existe.
   */
  async actualizar(id_resultado, datos) {
    const {
      quiz_id,
      estudiante_id,
      fecha_inicio,
      fecha_envio,
      puntaje_obtenido,
      puntaje_maximo,
      calificacion,
      tiempo_empleado_seg,
    } = datos;
    const { rows } = await pool.query(
      `UPDATE resultado_quiz
       SET quiz_id = $2, estudiante_id = $3, fecha_inicio = $4, fecha_envio = $5,
           puntaje_obtenido = $6, puntaje_maximo = $7, calificacion = $8, tiempo_empleado_seg = $9
       WHERE id_resultado = $1
       RETURNING *`,
      [id_resultado, quiz_id, estudiante_id, fecha_inicio, fecha_envio, puntaje_obtenido, puntaje_maximo, calificacion, tiempo_empleado_seg]
    );
    return rows[0] ? new ResultadoQuiz(rows[0]) : null;
  },

  /**
   * @brief Elimina un resultado por su id_resultado.
   * @param {number} id_resultado - Id del resultado a eliminar.
   * @return {Promise<boolean>} true si se eliminó una fila, false si el id no existía.
   * @note Falla (rechaza la promesa) si el resultado todavía tiene respuestas asociadas en
   * respuesta_quiz, por la foreign key respuesta_quiz.resultado_id -> resultado_quiz.id_resultado.
   */
  async eliminar(id_resultado) {
    const { rowCount } = await pool.query('DELETE FROM resultado_quiz WHERE id_resultado = $1', [id_resultado]);
    return rowCount > 0;
  },
};
