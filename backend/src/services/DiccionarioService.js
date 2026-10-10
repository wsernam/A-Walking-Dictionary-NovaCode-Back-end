
/**
 * @file DiccionarioService.js
 * @brief Lógica de negocio del Diccionario Global.
 *
 * HU-016 / HU-1.4
 */

import { DiccionarioRepository } from '../repositories/DiccionarioRepository.js';

export const DiccionarioService = {

  /**
   * @brief Consulta el vocabulario aprobado.
   *
   * CA-1.4.1: Solo tarjetas aprobadas.
   * CA-1.4.2: Búsqueda parcial por palabra.
   * CA-1.4.3: Permite devolver un arreglo vacío.
   *
   * @param {string} termino Palabra a buscar.
   * @returns {Promise<Array>} Tarjetas aprobadas.
   */
  async listarVocabulario(termino = '') {

    const busqueda = termino.trim();

    return await DiccionarioRepository.listarAprobadas(busqueda);
  },

  /**
   * @brief Obtiene una tarjeta aprobada por su ID.
   *
   * @param {number} id Identificador de tarjeta.
   * @returns {Promise<Object|null>} Tarjeta o null.
   */
  async obtenerDetalle(id) {

    return await DiccionarioRepository.obtenerAprobadaPorId(id);
  }
};
