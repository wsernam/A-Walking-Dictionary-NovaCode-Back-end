// Controlador REST de EtiquetaContexto: recibe la petición HTTP, llama directamente al repositorio
// (EtiquetaContextoRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';

export const EtiquetaContextoController = {
  async crear(req, res) {
    try {
      const etiqueta = await EtiquetaContextoRepository.crear(req.body);
      res.status(201).json(etiqueta);
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
      const etiqueta = await EtiquetaContextoRepository.obtenerPorId(id);
      if (!etiqueta) {
        return res.status(404).json({ error: 'EtiquetaContexto no encontrada' });
      }
      res.status(200).json(etiqueta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const etiquetas = await EtiquetaContextoRepository.listar();
      res.status(200).json(etiquetas);
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
      const etiqueta = await EtiquetaContextoRepository.actualizar(id, req.body);
      if (!etiqueta) {
        return res.status(404).json({ error: 'EtiquetaContexto no encontrada' });
      }
      res.status(200).json(etiqueta);
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
      const eliminado = await EtiquetaContextoRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'EtiquetaContexto no encontrada' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
