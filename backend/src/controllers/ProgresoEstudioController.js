/**
 * @file ProgresoEstudioController.js
 * @brief Controlador REST (CRUD genérico) de ProgresoEstudio: recibe la petición HTTP, llama
 * directamente al repositorio (ProgresoEstudioRepository) y devuelve la respuesta. Cuando exista
 * lógica de negocio en services/, se insertará entre el controlador y el repositorio sin cambiar
 * esta firma.
 *
 * @note Ninguna ruta montada en app.js usa este controlador; el progreso SM-2 se registra con
 * POST /api/v1/study/review-session/review (EstudioController). Sus errores no llevan el campo
 * "code" (decisión del 2026-10-22).
 */

import { ProgresoEstudioRepository } from '../repositories/ProgresoEstudioRepository.js';

export const ProgresoEstudioController = {

  /**
   * @brief Crea un registro de progreso. Solo limita ultima_valoracion a 30 caracteres (varchar 30
   * del DER); es nullable, por eso no es obligatoria.
   * @param {import('express').Request} req - req.body: columnas de progreso_estudio.
   * @param {import('express').Response} res - 201 con el progreso, 400 si ultima_valoracion excede su longitud, 500 ante error inesperado.
   */
  async crear(req, res) {
    try {
      const { ultima_valoracion } = req.body;

      // ultima_valoracion es el único varchar de "progreso_estudio" y es nullable en el DER
      // (factor_facilidad es decimal, intervalo_dias/repeticiones son int), por eso no se exige
      // como obligatorio, solo se limita su longitud si viene.
      if (ultima_valoracion && ultima_valoracion.length > 30) {
        return res.status(400).json({
          error: `El campo ultima_valoracion no puede superar 30 caracteres (tiene ${ultima_valoracion.length} caracteres).`,
        });
      }

      const progreso = await ProgresoEstudioRepository.crear(req.body);
      res.status(201).json(progreso);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Consulta un progreso por su id_progreso.
   * @param {import('express').Request} req - req.params.id es el id_progreso.
   * @param {import('express').Response} res - 200 con el progreso, 400 si el id no es numérico, 404 si no existe, 500 ante error inesperado.
   */
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

  /**
   * @brief Lista todos los registros de progreso.
   * @param {import('express').Request} req - Sin parámetros.
   * @param {import('express').Response} res - 200 con el listado, 500 ante error inesperado.
   */
  async listar(req, res) {
    try {
      const progresos = await ProgresoEstudioRepository.listar();
      res.status(200).json(progresos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Actualiza un registro de progreso.
   * @param {import('express').Request} req - req.params.id es el id_progreso; req.body trae las columnas.
   * @param {import('express').Response} res - 200 con el progreso actualizado, 400 si el id no es numérico, 404 si no existe, 500 ante error inesperado.
   */
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

  /**
   * @brief Elimina un registro de progreso.
   * @param {import('express').Request} req - req.params.id es el id_progreso.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 si el id no es numérico, 404 si no existe, 500 ante error inesperado.
   */
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
