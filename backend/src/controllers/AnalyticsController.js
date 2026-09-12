/**
 * @file AnalyticsController.js
 * @brief Controlador REST de analíticas de participación para la docente (HU-2.3).
 */

import { MazoRepository } from '../repositories/MazoRepository.js';
import { AnalyticsRepository } from '../repositories/AnalyticsRepository.js';

export const AnalyticsController = {
  /**
   * @brief CA-2.3.1: resumen de participación por mazo (tabla de estudiantes con palabras
   * aportadas, coautorías y estado de revisión). CA-2.3.2: si se pasa ?sinAportes=true, filtra
   * solo a los estudiantes sin ningún aporte en el mazo.
   *
   * CA-2.3.3 ("actualización en tiempo real"): no requiere ninguna implementación adicional —
   * este endpoint no usa caché, así que cada llamada refleja el estado real de la base de
   * datos en ese instante (apenas se complete un aporte, la siguiente consulta ya lo cuenta).
   *
   * @param {import('express').Request} req - req.params.id es el id_mazo; query opcional
   * ?sinAportes=true.
   * @param {import('express').Response} res - 200 con el arreglo de participación, 400 si el
   * id no es numérico, 404 si el mazo no existe, 500 ante error inesperado.
   */
  async resumenPorMazo(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const mazo = await MazoRepository.obtenerPorId(id);
      if (!mazo) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }

      let resumen = await AnalyticsRepository.resumenParticipacionPorMazo(id, mazo.curso_id);

      if (req.query.sinAportes === 'true') {
        resumen = resumen.filter((fila) => fila.palabras_aportadas === 0 && fila.coautorias === 0);
      }

      res.status(200).json(resumen);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
