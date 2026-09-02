// Controlador REST de Inscripcion: recibe la petición HTTP, llama directamente al repositorio
// (InscripcionRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { InscripcionRepository } from '../repositories/InscripcionRepository.js';

export const InscripcionController = {
  async crear(req, res) {
    try {
      const inscripcion = await InscripcionRepository.crear(req.body);
      res.status(201).json(inscripcion);
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
      const inscripcion = await InscripcionRepository.obtenerPorId(id);
      if (!inscripcion) {
        return res.status(404).json({ error: 'Inscripcion no encontrada' });
      }
      res.status(200).json(inscripcion);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const inscripciones = await InscripcionRepository.listar();
      res.status(200).json(inscripciones);
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
      const inscripcion = await InscripcionRepository.actualizar(id, req.body);
      if (!inscripcion) {
        return res.status(404).json({ error: 'Inscripcion no encontrada' });
      }
      res.status(200).json(inscripcion);
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
      const eliminado = await InscripcionRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Inscripcion no encontrada' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
