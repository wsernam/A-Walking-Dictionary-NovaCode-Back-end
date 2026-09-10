/**
 * @file DeduplicacionService.js
 * @brief Implementa la detección de duplicados de HU-1.3: normaliza la palabra (CA-1.3.3),
 * busca si ya existe en el mazo (usando el índice único mazo_id+palabra de la tabla tarjeta)
 * y resuelve si el aporte nuevo es coautoría (CA-1.3.1) o acepción adicional (CA-1.3.2).
 *
 * Historia de Usuario: HU-1.3.
 * Endpoints relacionados: usado internamente por TarjetaController.crear
 * (POST /api/v1/decks/:id/cards) y TarjetaController.checkDuplicate
 * (POST /api/v1/cards/check-duplicate).
 * Almacenamiento: tabla tarjeta (búsqueda indexada por mazo_id + palabra). Este servicio
 * nunca escribe en la base de datos, solo consulta (vía TarjetaRepository) y decide.
 */

import { TarjetaRepository } from '../repositories/TarjetaRepository.js';

export const DeduplicacionService = {
  /**
   * @brief Normaliza una palabra para que la comparación de duplicados ignore
   * mayúsculas/minúsculas y espacios sobrantes (CA-1.3.3).
   * @param {string} palabra - Palabra tal como la escribió el estudiante.
   * @return {string} La palabra sin espacios al inicio/final y en minúsculas.
   */
  normalizarPalabra(palabra) {
    return palabra.trim().toLowerCase();
  },

  /**
   * @brief Busca si la palabra ya fue registrada como tarjeta en el mismo mazo. Normaliza la
   * palabra antes de buscar, para que la comparación sea insensible a mayúsculas.
   * @param {number} mazoId - id_mazo del mazo donde se está registrando la palabra.
   * @param {string} palabra - Palabra tal como la escribió el estudiante (sin normalizar).
   * @return {Promise<Tarjeta|null>} La tarjeta existente si hay coincidencia, o null si no existe.
   */
  async buscarDuplicado(mazoId, palabra) {
    const palabraNormalizada = this.normalizarPalabra(palabra);
    return TarjetaRepository.obtenerPorMazoYPalabra(mazoId, palabraNormalizada);
  },

  /**
   * @brief Decide qué tipo de aporte corresponde cuando ya existe una tarjeta con esa palabra
   * en el mazo.
   *
   * Si la definición y el ejemplo nuevos coinciden exactamente con los de la tarjeta
   * existente, es un duplicado exacto (CA-1.3.1: coautoría). Si algo difiere, es un duplicado
   * parcial (CA-1.3.2: acepción adicional).
   *
   * @param {Tarjeta} tarjetaExistente - Tarjeta ya registrada en el mazo con la misma palabra.
   * @param {string} definicionNueva - Definición que envió el estudiante en este aporte.
   * @param {string|null} ejemploNuevo - Ejemplo que envió el estudiante en este aporte
   * (puede ser null).
   * @return {{tipo: 'coautoria', tarjeta: Tarjeta} | {tipo: 'acepcion_nueva'}} El tipo de
   * resolución y, si es coautoría, la tarjeta existente sobre la que se debe registrar el aporte.
   */
  resolverAporte(tarjetaExistente, definicionNueva, ejemploNuevo) {
    const definicionCoincide = tarjetaExistente.definicion === definicionNueva;
    const ejemploCoincide = (tarjetaExistente.ejemplo ?? null) === (ejemploNuevo ?? null);

    if (definicionCoincide && ejemploCoincide) {
      return { tipo: 'coautoria', tarjeta: tarjetaExistente };
    }

    return { tipo: 'acepcion_nueva' };
  },
};
