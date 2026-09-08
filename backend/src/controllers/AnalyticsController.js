// Controlador REST de analíticas para la docente (HE-02, HU-2.3). Recibe la petición HTTP,
// valida el mazo y delega la agregación en los repositorios (AporteRepository / TarjetaRepository).
//
// SUPUESTOS PENDIENTES DE VALIDAR (ver CHANGELOG_BACKEND.md):
//   - CA-2.3.3 ("actualización en tiempo real"): este endpoint recalcula los conteos desde la
//     tabla "aporte" en cada consulta, así que siempre devuelve el valor vigente. NO hay push
//     por WebSocket/SSE al panel docente (no hay infraestructura para eso en el proyecto).
//   - "número de palabras aportadas" se interpreta como aportes con tipo_aporte='creada';
//     "coautorías" como tipo_aporte='coautoria'. Confirmar la definición exacta con el equipo.

import { MazoRepository } from '../repositories/MazoRepository.js';
import { AporteRepository } from '../repositories/AporteRepository.js';
import { TarjetaRepository } from '../repositories/TarjetaRepository.js';

export const AnalyticsController = {
  /**
   * HU-2.3 — Resumen de participación individual dentro de un mazo semanal.
   * Ruta: GET /api/v1/teacher/analytics/deck/:id  (opcional ?filtro=sin_aportes).
   *
   * CA-2.3.1: devuelve la tabla con un renglón por estudiante inscrito en el curso del mazo,
   * con palabras aportadas, coautorías y su estado de revisión.
   * CA-2.3.2: con ?filtro=sin_aportes se devuelven solo los estudiantes sin ningún aporte en
   * el mazo (los "pendientes" del cronograma activo).
   *
   * @param {import('express').Request} req - req.params.id = id_mazo; req.query.filtro opcional.
   * @param {import('express').Response} res - 200 con { mazo, filtro_aplicado, participacion,
   * resumen_revision }; 400 si el id no es numérico; 404 si el mazo no existe; 500 ante error
   * inesperado.
   */
  async analiticasPorMazo(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }

      const mazo = await MazoRepository.obtenerPorId(id);
      if (!mazo) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }

      let participacion = await AporteRepository.analiticasPorMazo(id);

      const soloSinAportes = req.query.filtro === 'sin_aportes';
      if (soloSinAportes) {
        participacion = participacion.filter((fila) => fila.sin_aportes);
      }

      const resumenRevision = await TarjetaRepository.resumenEstadosPorMazo(id);

      return res.status(200).json({
        mazo: {
          id_mazo: mazo.id_mazo,
          semana: mazo.semana,
          nombre_lectura: mazo.nombre_lectura,
          estado: mazo.estado,
        },
        filtro_aplicado: soloSinAportes ? 'sin_aportes' : null,
        participacion,
        resumen_revision: resumenRevision,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
