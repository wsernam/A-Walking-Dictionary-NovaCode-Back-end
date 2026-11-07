/**
 * @file CA-2.2.3: detalle de una tarjeta con sus etiquetas de contexto (registro y variante
 * regional). Lo usa GET /api/v1/cards/:id.
 */

import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';

/**
 * Servicio: lógica de negocio que usan los controladores.
 * @namespace
 */
export const TarjetaService = {

  /**
   * Obtiene una tarjeta junto con sus etiquetas de contexto.
   * @param {number} id_tarjeta - Id de la tarjeta.
   * @return {Promise<Object|null>} La tarjeta con el campo etiquetas_contexto, o null si no existe.
   */
  async obtenerDetalleTarjeta(id_tarjeta) {

    const tarjeta =
      await TarjetaRepository.obtenerPorId(id_tarjeta);

    if (!tarjeta) {
      return null;
    }

    const etiquetas =
      await EtiquetaContextoRepository.listarPorTarjeta(id_tarjeta);

    return {
      ...tarjeta,
      etiquetas_contexto: etiquetas
    };
  }

};