// Controlador REST de EtiquetaContexto: recibe la petición HTTP, llama directamente al repositorio
// (EtiquetaContextoRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';

export const EtiquetaContextoController = {
  async crear(req, res) {
    try {
      const { tipo, valor } = req.body;

      // tipo y valor son varchar NOT NULL en el DER.
      const camposFaltantes = [];
      if (!tipo) camposFaltantes.push('tipo');
      if (!valor) camposFaltantes.push('valor');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      // Longitud máxima según el DER: tipo varchar(40), valor varchar(150).
      const erroresLongitud = [];
      if (tipo.length > 40) {
        erroresLongitud.push(
          `El campo tipo no puede superar 40 caracteres (tiene ${tipo.length} caracteres).`
        );
      }
      if (valor.length > 150) {
        erroresLongitud.push(
          `El campo valor no puede superar 150 caracteres (tiene ${valor.length} caracteres).`
        );
      }
      if (erroresLongitud.length > 0) {
        return res.status(400).json({ error: erroresLongitud.join(' ') });
      }

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
