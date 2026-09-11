/**
 * @file AporteController.js
 * @brief Controlador REST de Aporte: recibe la petición HTTP, llama directamente al
 * repositorio (AporteRepository) y devuelve la respuesta.
 *
 * @note rechazar() implementa el flujo de coautoría/acepción nueva: es la única acción de
 * "Rechazar" disponible en el sistema. La tarjeta individual (revisión docente) NO tiene
 * rechazo — solo editar/aprobar, ver TarjetaController.aprobar.
 */

import { AporteRepository } from '../repositories/AporteRepository.js';

export const AporteController = {
  async crear(req, res) {
    try {
      const { traduccion_aportada, ejemplo_aportado, tipo_aporte } = req.body;

      // traduccion_aportada y tipo_aporte son varchar NOT NULL en el DER.
      // definicion_aportada es "text" (sin límite definido en el DER), queda fuera de este alcance.
      const camposFaltantes = [];
      if (!traduccion_aportada) camposFaltantes.push('traduccion_aportada');
      if (!tipo_aporte) camposFaltantes.push('tipo_aporte');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      // Longitud máxima según el DER: traduccion_aportada varchar(255), tipo_aporte varchar(40),
      // ejemplo_aportado varchar(150) (nullable).
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

  /**
   * @brief Rechaza (elimina) un aporte de coautoría o acepción nueva.
   *
   * Regla de negocio: NO permite rechazar un aporte de tipo 'creada' — ese es el aporte
   * original de una tarjeta en revisión individual, donde la docente solo puede editar/aprobar
   * la tarjeta (ver TarjetaController.aprobar), nunca rechazarla. "Rechazar" solo existe para
   * aportes 'coautoria' o 'acepcion_nueva'.
   *
   * @param {import('express').Request} req - req.params.id es el id_aporte a rechazar.
   * @param {import('express').Response} res - 200 con { eliminado: true } si se rechazó, 400 si
   * el id no es numérico, 403 si el aporte es de tipo 'creada' (no se puede rechazar en ese
   * flujo), 404 si no existe, 500 ante error inesperado.
   */
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
