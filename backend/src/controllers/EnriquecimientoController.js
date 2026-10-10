/**
 * @file EnriquecimientoController.js
 * @brief Controlador REST para las sugerencias léxicas mediante WordNet.
 *
 * HU-011: Sugerencias léxicas (WordNet)
 *
 * Endpoint:
 * GET /api/v1/enrichment/family/:word
 */

import { WordnetService } from '../services/WordnetService.js';

export const EnriquecimientoController = {

  /**
   * @brief Obtiene sugerencias léxicas relacionadas con una palabra.
   *
   * Consulta WordNet 3.1 mediante el servicio de enriquecimiento.
   * Si la información ya está almacenada en wordnet_cache,
   * el servicio la obtiene desde la base de datos.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async obtenerFamilia(req, res) {
    try {
      const palabra = req.params.word?.trim();

      if (!palabra) {
        return res.status(400).json({
          error: 'La palabra es obligatoria',
        });
      }

      const resultado =
        await WordnetService.obtenerFamilia(palabra);
      return res.status(200).json(resultado);

    } catch (error) {
      console.error(
        'Error al obtener sugerencias léxicas:',
        error
      );

      return res.status(error.status || 500).json({
        error: error.message || 'Error al obtener sugerencias léxicas',
      });
    }
  },
};