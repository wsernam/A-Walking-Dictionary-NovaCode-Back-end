// CuraduriaService.js
// Pendiente: lógica de aprobación/edición de tarjetas por parte de la docente, cambio de estado pendiente_revision a revisado_docente
// Historia de Usuario: HU-004
// Endpoint relacionado: PATCH /api/v1/cards/{card_id}/approve
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