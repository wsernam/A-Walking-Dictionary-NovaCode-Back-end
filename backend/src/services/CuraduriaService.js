// CuraduriaService.js
// HU-2.1: revisión, edición y aprobación de tarjetas por parte de la docente.
// A propósito NO hay rechazo aquí: en revisión individual la docente solo edita y aprueba
// (regla del equipo). "Rechazar" solo existe en el flujo de coautoría, ver AporteController.
// Historia de Usuario: HU-2.1 (HU-004 en la numeración de ramas del equipo)
// Endpoints relacionados: GET /api/v1/cards/pending, PUT /api/v1/cards/:id,
// PATCH /api/v1/cards/:id/approve
// Almacenamiento: tabla tarjeta

import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';
import { AporteRepository } from '../repositories/AporteRepository.js';

export const CuraduriaService = {

  async listarPendientes() {
    return TarjetaRepository.listarPorEstado('pendiente_revision');
  },

  // Historial de aprobadas: cada tarjeta lleva además su registro, variante_regional
  // (etiqueta_contexto) y el nombre del estudiante que la creó. Se consulta en lote (3 queries
  // en total) en vez de una por tarjeta.
  async listarAprobadas() {
    const tarjetas = await TarjetaRepository.listarPorEstado('revisado_docente');
    const ids = tarjetas.map((t) => t.id_tarjeta);

    const [etiquetas, autores] = await Promise.all([
      EtiquetaContextoRepository.listarPorTarjetas(ids),
      AporteRepository.obtenerAutoresOriginales(ids),
    ]);

    return tarjetas.map((tarjeta) => {
      const propias = etiquetas.filter((e) => e.tarjeta_id === tarjeta.id_tarjeta);
      return {
        ...tarjeta,
        registro: propias.find((e) => e.tipo === 'registro')?.valor ?? null,
        variante_regional: propias.find((e) => e.tipo === 'variante_regional')?.valor ?? null,
        estudiante: autores.get(tarjeta.id_tarjeta) ?? 'Desconocido',
      };
    });
  },

  async aprobarTarjeta(idTarjeta) {
    const tarjeta = await TarjetaRepository.obtenerPorId(idTarjeta);

    if (!tarjeta) {
      const error = new Error('Tarjeta no encontrada');
      error.status = 404;
      throw error;
    }

    if (tarjeta.estado !== 'pendiente_revision') {
      const error = new Error(
        'La tarjeta no está pendiente de revisión'
      );
      error.status = 409;
      throw error;
    }

    // Si se aprueba con coautorías/acepciones pendientes, estas desaparecen de
    // GET /aportes/pending (solo lista las de tarjetas pendientes) y quedan sin revisar para
    // siempre. Por eso primero hay que aprobarlas o rechazarlas.
    const aportesPendientes = await AporteRepository.listarIdsPendientesPorTarjeta(idTarjeta);
    if (aportesPendientes.length > 0) {
      const error = new Error(
        `La tarjeta tiene ${aportesPendientes.length} coautoría(s)/acepción(es) pendiente(s) de revisión; apruébalas o recházalas antes de aprobar la tarjeta.`
      );
      error.status = 409;
      error.aportes_pendientes = aportesPendientes;
      throw error;
    }

    return TarjetaRepository.actualizarEstado(
      idTarjeta,
      'revisado_docente',
      new Date()
    );
  },

  async editarTarjeta(idTarjeta, datos) {
    const tarjeta = await TarjetaRepository.obtenerPorId(idTarjeta);

    if (!tarjeta) {
      const error = new Error('Tarjeta no encontrada');
      error.status = 404;
      throw error;
    }

    if (tarjeta.estado !== 'pendiente_revision') {
      const error = new Error(
        'Solo se pueden editar tarjetas pendientes de revisión'
      );
      error.status = 409;
      throw error;
    }

    return TarjetaRepository.actualizar(idTarjeta, {
      mazo_id: tarjeta.mazo_id,
      palabra: datos.palabra ?? tarjeta.palabra,
      traduccion: datos.traduccion ?? tarjeta.traduccion,
      definicion: datos.definicion ?? tarjeta.definicion,
      ejemplo: datos.ejemplo ?? tarjeta.ejemplo,
      estado: tarjeta.estado,
      fecha_creacion: tarjeta.fecha_creacion,
      fecha_revision: tarjeta.fecha_revision,
    });
  },
};
