// Controlador REST de Quiz: recibe la petición HTTP, llama directamente al repositorio
// (QuizRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { QuizRepository } from '../repositories/QuizRepository.js';

export const QuizController = {
  async crear(req, res) {
    try {
      const quiz = await QuizRepository.crear(req.body);
      res.status(201).json(quiz);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerPorId(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const quiz = await QuizRepository.obtenerPorId(id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz no encontrado' });
      }
      res.status(200).json(quiz);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const quizzes = await QuizRepository.listar();
      res.status(200).json(quizzes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const quiz = await QuizRepository.actualizar(id, req.body);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz no encontrado' });
      }
      res.status(200).json(quiz);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const eliminado = await QuizRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Quiz no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
