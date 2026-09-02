// Controlador REST de QuizMazo: recibe la petición HTTP, llama directamente al repositorio
// (QuizMazoRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.
//
// A diferencia de las demás entidades, "quiz_mazo" no tiene id propio (pk compuesta
// quiz_id + mazo_id), así que en vez de obtenerPorId/actualizar(id)/eliminar(id) se usan
// las mismas firmas que expone QuizMazoRepository: obtenerPorQuizYMazo, actualizar(quizId, mazoId, datos)
// y eliminar(quizId, mazoId).

import { QuizMazoRepository } from '../repositories/QuizMazoRepository.js';

export const QuizMazoController = {
  async crear(req, res) {
    try {
      const quizMazo = await QuizMazoRepository.crear(req.body);
      res.status(201).json(quizMazo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

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

  async listar(req, res) {
    try {
      const quizMazos = await QuizMazoRepository.listar();
      res.status(200).json(quizMazos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

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
