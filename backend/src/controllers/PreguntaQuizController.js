// Controlador REST de PreguntaQuiz: recibe la petición HTTP, llama directamente al repositorio
// (PreguntaQuizRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { PreguntaQuizRepository } from '../repositories/PreguntaQuizRepository.js';

export const PreguntaQuizController = {
  async crear(req, res) {
    try {
      const pregunta = await PreguntaQuizRepository.crear(req.body);
      res.status(201).json(pregunta);
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
      const pregunta = await PreguntaQuizRepository.obtenerPorId(id);
      if (!pregunta) {
        return res.status(404).json({ error: 'PreguntaQuiz no encontrada' });
      }
      res.status(200).json(pregunta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const preguntas = await PreguntaQuizRepository.listar();
      res.status(200).json(preguntas);
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
      const pregunta = await PreguntaQuizRepository.actualizar(id, req.body);
      if (!pregunta) {
        return res.status(404).json({ error: 'PreguntaQuiz no encontrada' });
      }
      res.status(200).json(pregunta);
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
      const eliminado = await PreguntaQuizRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'PreguntaQuiz no encontrada' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
