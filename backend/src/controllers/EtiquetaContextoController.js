/**
 * @file EtiquetaContextoController.js
 * @brief Controlador REST (CRUD genérico) de EtiquetaContexto: recibe la petición HTTP, llama
 * directamente al repositorio (EtiquetaContextoRepository) y devuelve la respuesta. Cuando
 * exista lógica de negocio en services/, se insertará entre el controlador y el repositorio sin
 * cambiar esta firma.
 *
 * @note Ninguna ruta montada en app.js usa este controlador; la asignación real de etiquetas es
 * PUT /api/v1/cards/:id/context (HU-2.2). Sus errores no llevan el campo "code" (decisión del
 * 2026-10-22: los controladores sin ruta montada no se tocaron).
 */

import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';

export const EtiquetaContextoController = {

  /**
   * @brief Crea una etiqueta. Exige tipo y valor (obligatorios) y respeta sus longitudes del DER
   * (tipo 40, valor 150).
   * @param {import('express').Request} req - req.body: tipo, valor y demás columnas de etiqueta_contexto.
   * @param {import('express').Response} res - 201 con la etiqueta, 400 si falta un campo o excede su longitud, 500 ante error inesperado.
   */
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

  /**
   * @brief Consulta una etiqueta por su id_etiqueta.
   * @param {import('express').Request} req - req.params.id es el id_etiqueta.
   * @param {import('express').Response} res - 200 con la etiqueta, 400 si el id no es numérico, 404 si no existe, 500 ante error inesperado.
   */
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

  /**
   * @brief Lista todas las etiquetas.
   * @param {import('express').Request} req - Sin parámetros.
   * @param {import('express').Response} res - 200 con el listado, 500 ante error inesperado.
   */
  async listar(req, res) {
    try {
      const etiquetas = await EtiquetaContextoRepository.listar();
      res.status(200).json(etiquetas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Actualiza una etiqueta.
   * @param {import('express').Request} req - req.params.id es el id_etiqueta; req.body trae las columnas.
   * @param {import('express').Response} res - 200 con la etiqueta actualizada, 400 si el id no es numérico, 404 si no existe, 500 ante error inesperado.
   */
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

  /**
   * @brief Elimina una etiqueta.
   * @param {import('express').Request} req - req.params.id es el id_etiqueta.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 si el id no es numérico, 404 si no existe, 500 ante error inesperado.
   */
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
