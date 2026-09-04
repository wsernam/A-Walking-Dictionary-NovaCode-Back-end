// Controlador REST de RespuestaQuiz: recibe la petición HTTP, llama directamente al repositorio
// (RespuestaQuizRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { RespuestaQuizRepository } from '../repositories/RespuestaQuizRepository.js';

export const RespuestaQuizController = {
  async crear(req, res) {
    try {
      const respuesta = await RespuestaQuizRepository.crear(req.body);
      res.status(201).json(respuesta);
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
      const respuesta = await RespuestaQuizRepository.obtenerPorId(id);
      if (!respuesta) {
        return res.status(404).json({ error: 'RespuestaQuiz no encontrada' });
      }
      res.status(200).json(respuesta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const respuestas = await RespuestaQuizRepository.listar();
      res.status(200).json(respuestas);
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
      const respuesta = await RespuestaQuizRepository.actualizar(id, req.body);
      if (!respuesta) {
        return res.status(404).json({ error: 'RespuestaQuiz no encontrada' });
      }
      res.status(200).json(respuesta);
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
      const eliminado = await RespuestaQuizRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'RespuestaQuiz no encontrada' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
