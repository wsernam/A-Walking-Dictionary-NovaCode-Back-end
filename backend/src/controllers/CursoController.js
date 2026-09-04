// Controlador REST de Curso: recibe la petición HTTP, llama directamente al repositorio
// (CursoRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { CursoRepository } from '../repositories/CursoRepository.js';

export const CursoController = {
  async crear(req, res) {
    try {
      const curso = await CursoRepository.crear(req.body);
      res.status(201).json(curso);
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
      const curso = await CursoRepository.obtenerPorId(id);
      if (!curso) {
        return res.status(404).json({ error: 'Curso no encontrado' });
      }
      res.status(200).json(curso);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const cursos = await CursoRepository.listar();
      res.status(200).json(cursos);
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
      const curso = await CursoRepository.actualizar(id, req.body);
      if (!curso) {
        return res.status(404).json({ error: 'Curso no encontrado' });
      }
      res.status(200).json(curso);
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
      const eliminado = await CursoRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Curso no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
