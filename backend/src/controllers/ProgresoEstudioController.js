// Controlador REST de ProgresoEstudio: recibe la petición HTTP, llama directamente al repositorio
// (ProgresoEstudioRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { ProgresoEstudioRepository } from '../repositories/ProgresoEstudioRepository.js';

export const ProgresoEstudioController = {
  async crear(req, res) {
    try {
      const progreso = await ProgresoEstudioRepository.crear(req.body);
      res.status(201).json(progreso);
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
      const progreso = await ProgresoEstudioRepository.obtenerPorId(id);
      if (!progreso) {
        return res.status(404).json({ error: 'ProgresoEstudio no encontrado' });
      }
      res.status(200).json(progreso);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const progresos = await ProgresoEstudioRepository.listar();
      res.status(200).json(progresos);
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
      const progreso = await ProgresoEstudioRepository.actualizar(id, req.body);
      if (!progreso) {
        return res.status(404).json({ error: 'ProgresoEstudio no encontrado' });
      }
      res.status(200).json(progreso);
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
      const eliminado = await ProgresoEstudioRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'ProgresoEstudio no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
