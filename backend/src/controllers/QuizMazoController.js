/**
 * @file QuizMazoController.js
 * @brief Controlador REST (CRUD genérico) de QuizMazo: recibe la petición HTTP, llama
 * directamente al repositorio (QuizMazoRepository) y devuelve la respuesta. Cuando exista lógica
 * de negocio en services/, se insertará entre el controlador y el repositorio sin cambiar esta
 * firma.
 *
 * A diferencia de las demás entidades, "quiz_mazo" no tiene id propio (pk compuesta
 * quiz_id + mazo_id), así que en vez de obtenerPorId/actualizar(id)/eliminar(id) se usan las
 * mismas firmas que expone QuizMazoRepository: obtenerPorQuizYMazo, actualizar(quizId, mazoId,
 * datos) y eliminar(quizId, mazoId).
 *
 * @note Ninguna ruta montada en app.js usa este controlador; la relación quiz-mazo se crea al
 * generar el quiz (POST /api/v1/quizzes/generate). Sus errores no llevan el campo "code"
 * (decisión del 2026-10-22).
 */

import { QuizMazoRepository } from '../repositories/QuizMazoRepository.js';

export const QuizMazoController = {

  /**
   * @brief Crea la relación entre un quiz y un mazo. No valida campos propios: ambos son int.
   * @param {import('express').Request} req - req.body: quiz_id y mazo_id.
   * @param {import('express').Response} res - 201 con la relación, 500 ante error inesperado.
   */
  async crear(req, res) {
    try {
      const quizMazo = await QuizMazoRepository.crear(req.body);
      res.status(201).json(quizMazo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Consulta una relación por su pk compuesta.
   * @param {import('express').Request} req - req.params.quizId y req.params.mazoId.
   * @param {import('express').Response} res - 200 con la relación, 400 si alguno no es numérico, 404 si no existe, 500 ante error inesperado.
   */
  async obtenerPorQuizYMazo(req, res) {
    try {
      const quizId = Number(req.params.quizId);
      const mazoId = Number(req.params.mazoId);
      if (Number.isNaN(quizId) || Number.isNaN(mazoId)) {
        return res.status(400).json({ error: 'quizId o mazoId inválido' });
      }
      const quizMazo = await QuizMazoRepository.obtenerPorQuizYMazo(quizId, mazoId);
      if (!quizMazo) {
        return res.status(404).json({ error: 'QuizMazo no encontrado' });
      }
      res.status(200).json(quizMazo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Lista todas las relaciones quiz-mazo.
   * @param {import('express').Request} req - Sin parámetros.
   * @param {import('express').Response} res - 200 con el listado, 500 ante error inesperado.
   */
  async listar(req, res) {
    try {
      const quizMazos = await QuizMazoRepository.listar();
      res.status(200).json(quizMazos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Actualiza una relación identificada por su pk compuesta.
   * @param {import('express').Request} req - req.params.quizId y req.params.mazoId; req.body trae las columnas.
   * @param {import('express').Response} res - 200 con la relación actualizada, 400 si alguno no es numérico, 404 si no existe, 500 ante error inesperado.
   */
  async actualizar(req, res) {
    try {
      const quizId = Number(req.params.quizId);
      const mazoId = Number(req.params.mazoId);
      if (Number.isNaN(quizId) || Number.isNaN(mazoId)) {
        return res.status(400).json({ error: 'quizId o mazoId inválido' });
      }
      const quizMazo = await QuizMazoRepository.actualizar(quizId, mazoId, req.body);
      if (!quizMazo) {
        return res.status(404).json({ error: 'QuizMazo no encontrado' });
      }
      res.status(200).json(quizMazo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Elimina una relación identificada por su pk compuesta.
   * @param {import('express').Request} req - req.params.quizId y req.params.mazoId.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 si alguno no es numérico, 404 si no existe, 500 ante error inesperado.
   */
  async eliminar(req, res) {
    try {
      const quizId = Number(req.params.quizId);
      const mazoId = Number(req.params.mazoId);
      if (Number.isNaN(quizId) || Number.isNaN(mazoId)) {
        return res.status(400).json({ error: 'quizId o mazoId inválido' });
      }
      const eliminado = await QuizMazoRepository.eliminar(quizId, mazoId);
      if (!eliminado) {
        return res.status(404).json({ error: 'QuizMazo no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
