/**
 * @file HU-2.1: revisión, edición y aprobación de tarjetas por parte de la docente.
 *
 * Historia de Usuario: HU-2.1 (HU-004 en la numeración de ramas del equipo)
 * Endpoints relacionados: GET /api/v1/cards/pending, PUT /api/v1/cards/:id,
 * PATCH /api/v1/cards/:id/approve
 * Almacenamiento: tabla tarjeta
 *
 * @note A propósito NO hay rechazo aquí: en revisión individual la docente solo edita y aprueba
 * (regla del equipo). Tampoco existe rechazo en coautorías (ver aporteRoutes.js), así que
 * CA-2.1.3 queda sin implementar (ver CLAUDE.md).
 */

import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';
import { AporteRepository } from '../repositories/AporteRepository.js';

/**
 * Servicio: lógica de negocio que usan los controladores.
 * @namespace
 */
export const CuraduriaService = {

  /**
   * CA-2.1.1: lista las tarjetas en estado "pendiente_revision". Cada tarjeta lleva el
   * nombre del estudiante que la creó ("Desconocido" si no se encuentra), para que la docente
   * vea quién la aportó en "Revisión de palabras".
   * @return {Promise<Object[]>} Tarjetas pendientes, cada una con el campo estudiante.
   */
  async listarPendientes() {
    const tarjetas = await TarjetaRepository.listarPorEstado('pendiente_revision');
    const autores = await AporteRepository.obtenerAutoresOriginales(
      tarjetas.map((t) => t.id_tarjeta)
    );

    return tarjetas.map((tarjeta) => ({
      ...tarjeta,
      estudiante: autores.get(tarjeta.id_tarjeta) ?? 'Desconocido',
    }));
  },

  /**
   * Historial de tarjetas aprobadas ("revisado_docente"). Cada una lleva además su
   * registro, su variante_regional (etiqueta_contexto) y el nombre del estudiante que la creó.
   * Se consulta en lote (3 queries en total) en vez de una por tarjeta.
   * @return {Promise<Object[]>} Tarjetas aprobadas con registro, variante_regional y estudiante.
   */
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

  /**
   * CA-2.1.2: aprueba una tarjeta pendiente: pasa a "revisado_docente" con la fecha de
   * revisión actual, y queda habilitada para quices.
   * @param {number} idTarjeta - Id de la tarjeta.
   * @return {Promise<Object>} La tarjeta actualizada.
   * @throws {Error} 404 (CARD_NOT_FOUND) si no existe; 409 (CARD_NOT_PENDING) si no está pendiente.
   */
  async aprobarTarjeta(idTarjeta) {
    const tarjeta = await TarjetaRepository.obtenerPorId(idTarjeta);

    if (!tarjeta) {
      const error = new Error('Tarjeta no encontrada');
      error.status = 404;
      error.code = 'CARD_NOT_FOUND';
      throw error;
    }

    if (tarjeta.estado !== 'pendiente_revision') {
      const error = new Error(
        'La tarjeta no está pendiente de revisión'
      );
      error.status = 409;
      error.code = 'CARD_NOT_PENDING';
      throw error;
    }

    return TarjetaRepository.actualizarEstado(
      idTarjeta,
      'revisado_docente',
      new Date()
    );
  },

  /**
   * CA-2.1.2: corrige una tarjeta que sigue pendiente de revisión. Los campos que no
   * lleguen en "datos" conservan su valor actual; el estado no cambia.
   * @param {number} idTarjeta - Id de la tarjeta.
   * @param {Object} datos - Campos corregidos: palabra, traduccion, definicion, ejemplo.
   * @return {Promise<Object>} La tarjeta actualizada.
   * @throws {Error} 404 (CARD_NOT_FOUND) si no existe; 409 (CARD_NOT_PENDING) si no está pendiente.
   */
  async editarTarjeta(idTarjeta, datos) {
    const tarjeta = await TarjetaRepository.obtenerPorId(idTarjeta);

    if (!tarjeta) {
      const error = new Error('Tarjeta no encontrada');
      error.status = 404;
      error.code = 'CARD_NOT_FOUND';
      throw error;
    }

    if (tarjeta.estado !== 'pendiente_revision') {
      const error = new Error(
        'Solo se pueden editar tarjetas pendientes de revisión'
      );
      error.status = 409;
      error.code = 'CARD_NOT_PENDING';
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
