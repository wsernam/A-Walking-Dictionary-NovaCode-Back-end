/**
 * @file AporteController.js
 * @brief Controlador REST de Aporte.
 */

import { AporteRepository } from '../repositories/AporteRepository.js';

export const AporteController = {
  async crear(req, res) {
    try {
      const { traduccion_aportada, ejemplo_aportado, tipo_aporte } = req.body;

      const camposFaltantes = [];
      if (!traduccion_aportada) camposFaltantes.push('traduccion_aportada');
      if (!tipo_aporte) camposFaltantes.push('tipo_aporte');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      const erroresLongitud = [];
      if (traduccion_aportada.length > 255) {
        erroresLongitud.push(
          `El campo traduccion_aportada no puede superar 255 caracteres (tiene ${traduccion_aportada.length} caracteres).`
        );
      }
      if (tipo_aporte.length > 40) {
        erroresLongitud.push(
          `El campo tipo_aporte no puede superar 40 caracteres (tiene ${tipo_aporte.length} caracteres).`
        );
      }
      if (ejemplo_aportado && ejemplo_aportado.length > 150) {
        erroresLongitud.push(
          `El campo ejemplo_aportado no puede superar 150 caracteres (tiene ${ejemplo_aportado.length} caracteres).`
        );
      }
      if (erroresLongitud.length > 0) {
        return res.status(400).json({ error: erroresLongitud.join(' ') });
      }

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

  async listarPendientes(req, res) {
    try {
      const aportes = await AporteRepository.listarCoautoriasPendientes();
      res.set('Cache-Control', 'no-store');
      res.status(200).json(aportes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async aprobar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const actual = await AporteRepository.obtenerPorId(id);
      if (!actual) {
        return res.status(404).json({ error: 'Aporte no encontrado' });
      }
      if (actual.tipo_aporte === 'creada') {
        return res.status(403).json({
          error:
            'No se puede aprobar un aporte de creación original por esta vía; use el flujo de revisión individual de la tarjeta (PATCH /cards/:id/approve).',
        });
      }
      const aporte = await AporteRepository.aprobar(id, req.body);
      res.status(200).json({ mensaje: 'Aporte aprobado correctamente', aporte });
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

  async rechazar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const aporte = await AporteRepository.obtenerPorId(id);
      if (!aporte) {
        return res.status(404).json({ error: 'Aporte no encontrado' });
      }
      if (aporte.tipo_aporte === 'creada') {
        return res.status(403).json({
          error:
            'No se puede rechazar un aporte de creación original; use el flujo de revisión individual de la tarjeta (editar/aprobar).',
        });
      }
      const eliminado = await AporteRepository.eliminar(id);
      res.status(200).json({ eliminado });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};