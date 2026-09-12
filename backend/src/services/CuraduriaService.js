// CuraduriaService.js
// HU-2.1: revisión, edición y aprobación de tarjetas por parte de la docente.
// A propósito NO hay rechazo aquí: en revisión individual la docente solo edita y aprueba
// (regla del equipo). "Rechazar" solo existe en el flujo de coautoría, ver AporteController.
// Historia de Usuario: HU-2.1 (HU-004 en la numeración de ramas del equipo)
// Endpoints relacionados: GET /api/v1/cards/pending, PUT /api/v1/cards/:id,
// PATCH /api/v1/cards/:id/approve
// Almacenamiento: tabla tarjeta

import { TarjetaRepository } from '../repositories/TarjetaRepository.js';

export const CuraduriaService = {

  async listarPendientes() {
    return TarjetaRepository.listarPorEstado('pendiente_revision');
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
