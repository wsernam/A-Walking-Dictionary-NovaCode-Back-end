
/**
 * @file DiccionarioController.js
 * @brief Controlador REST del Diccionario Global.
 *
 * HU-016 / HU-1.4
 */

import { DiccionarioService } from '../services/DiccionarioService.js';

export const DiccionarioController = {

  /**
   * @brief Lista y busca el vocabulario aprobado.
   *
   * CA-1.4.1: Consulta de tarjetas aprobadas.
   * CA-1.4.2: Búsqueda parcial de palabras.
   * CA-1.4.3: Ausencia de resultados sin error.
   *
   * GET /api/v1/dictionary
   * GET /api/v1/dictionary?q=house
   */
  async listar(req, res) {
    try {
      const { q } = req.query;

      if (q !== undefined && typeof q !== 'string') {
        return res.status(400).json({
          error: 'El parámetro q debe ser un texto'
        });
      }

      const termino = q || '';

      const tarjetas =
        await DiccionarioService.listarVocabulario(termino);

      // CA-1.4.3: Ausencia de resultados
        if (tarjetas.length === 0) {
        return res.status(200).json({
            success: true,
            message: termino.trim()
            ? `No se encontraron palabras que coincidan con "${termino.trim()}".`
            : 'No hay palabras aprobadas disponibles en el Diccionario Global.',
            data: []
        });
        }

        // CA-1.4.1 y CA-1.4.2: Consulta y búsqueda exitosa
        return res.status(200).json({
        success: true,
        message: 'Vocabulario consultado correctamente.',
        data: tarjetas
        });

    } catch (error) {
      console.error(
        'Error al consultar el Diccionario Global:',
        error
      );

      return res.status(500).json({
        error: 'No fue posible consultar el Diccionario Global'
      });
    }
  },

  /**
   * @brief Obtiene el detalle de una tarjeta aprobada.
   *
   * GET /api/v1/dictionary/:card_id
   */
  async obtenerPorId(req, res) {
    try {
      const { card_id } = req.params;

      if (!/^[1-9]\d*$/.test(card_id)) {
        return res.status(400).json({
          error: 'El identificador de la tarjeta no es válido'
        });
      }

      const id = Number(card_id);

      if (!Number.isSafeInteger(id)) {
        return res.status(400).json({
          error: 'El identificador de la tarjeta no es válido'
        });
      }

      const tarjeta =
        await DiccionarioService.obtenerDetalle(id);

      if (!tarjeta) {
        return res.status(404).json({
          error: 'Tarjeta no encontrada en el Diccionario Global'
        });
      }

      return res.status(200).json(tarjeta);

    } catch (error) {
      console.error(
        'Error al consultar el detalle de la tarjeta:',
        error
      );

      return res.status(500).json({
        error: 'No fue posible consultar la tarjeta'
      });
    }
  }
};
