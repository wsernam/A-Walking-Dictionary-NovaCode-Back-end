// Controlador REST de ResultadoQuiz: recibe la petición HTTP, llama directamente al repositorio
// (ResultadoQuizRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { ResultadoQuizRepository } from '../repositories/ResultadoQuizRepository.js';

export const ResultadoQuizController = {
  async crear(req, res) {
    try {
      const resultado = await ResultadoQuizRepository.crear(req.body);
      res.status(201).json(resultado);
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
      const resultado = await ResultadoQuizRepository.obtenerPorId(id);
      if (!resultado) {
        return res.status(404).json({ error: 'ResultadoQuiz no encontrado' });
      }
      res.status(200).json(resultado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const resultados = await ResultadoQuizRepository.listar();
      res.status(200).json(resultados);
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
      const resultado = await ResultadoQuizRepository.actualizar(id, req.body);
      if (!resultado) {
        return res.status(404).json({ error: 'ResultadoQuiz no encontrado' });
      }
      res.status(200).json(resultado);
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
      const eliminado = await ResultadoQuizRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'ResultadoQuiz no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
