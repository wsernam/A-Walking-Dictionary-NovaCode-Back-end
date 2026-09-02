// Controlador REST de Aporte: recibe la petición HTTP, llama directamente al repositorio
// (AporteRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { AporteRepository } from '../repositories/AporteRepository.js';

export const AporteController = {
  async crear(req, res) {
    try {
      const aporte = await AporteRepository.crear(req.body);
      res.status(201).json(aporte);
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
      const aporte = await AporteRepository.obtenerPorId(id);
      if (!aporte) {
        return res.status(404).json({ error: 'Aporte no encontrado' });
      }
      res.status(200).json(aporte);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const aportes = await AporteRepository.listar();
      res.status(200).json(aportes);
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
      const aporte = await AporteRepository.actualizar(id, req.body);
      if (!aporte) {
        return res.status(404).json({ error: 'Aporte no encontrado' });
      }
      res.status(200).json(aporte);
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
      const eliminado = await AporteRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Aporte no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
