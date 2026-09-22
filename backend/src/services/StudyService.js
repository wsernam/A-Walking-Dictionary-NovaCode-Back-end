import { InscripcionRepository } from '../repositories/InscripcionRepository.js';
import { StudyRepository } from '../repositories/StudyRepository.js';
import { ProgresoEstudioRepository } from '../repositories/ProgresoEstudioRepository.js';
import { SM2Service } from './SM2Service.js';

export const StudyService = {
  /**
   * Inicia una sesión de repaso para un estudiante.
   *
   * Obtiene las tarjetas aprobadas de los mazos disponibles
   * para el curso de la inscripción y determina cuáles deben
   * aparecer en la sesión.
   */
  async iniciarSesion(inscripcion_id) {
    const inscripcion = await InscripcionRepository.obtenerPorId(inscripcion_id);

    if (!inscripcion) {
      const error = new Error('Inscripción no encontrada');
      error.status = 404;
      throw error;
    }

    if (inscripcion.estado !== 'activa') {
      const error = new Error('La inscripción no está activa');
      error.status = 400;
      throw error;
    }

    const tarjetas = await StudyRepository.listarTarjetasDisponibles(
      inscripcion_id
    );

    const ahora = new Date();

    const tarjetasEstudio = [];

    for (const tarjeta of tarjetas) {
      const progreso =
        await ProgresoEstudioRepository.obtenerPorInscripcionYTarjeta(
          inscripcion_id,
          tarjeta.id_tarjeta
        );

      // Si la tarjeta nunca ha sido estudiada,
      // se incluye como tarjeta nueva.
      if (!progreso) {
        tarjetasEstudio.push({
          ...tarjeta,
          progreso: null,
        });
        continue;
      }

      // Si ya existe progreso, solo se incluye cuando
      // corresponde realizar el próximo repaso.
      if (
        !progreso.fecha_proximo_repaso ||
        new Date(progreso.fecha_proximo_repaso) <= ahora
      ) {
        tarjetasEstudio.push({
          ...tarjeta,
          progreso,
        });
      }
    }

    return {
      inscripcion_id,
      total_tarjetas: tarjetasEstudio.length,
      tarjetas: tarjetasEstudio,
    };
  },

  /**
   * Registra la valoración del estudiante sobre una tarjeta
   * y actualiza su progreso mediante SM-2.
   */
  async registrarValoracion(inscripcion_id, tarjeta_id, valoracion) {
    const tarjeta = await StudyRepository.listarTarjetasDisponibles(
      inscripcion_id
    );

    const tarjetaExiste = tarjeta.find(
      (item) => item.id_tarjeta === Number(tarjeta_id)
    );

    if (!tarjetaExiste) {
      const error = new Error(
        'La tarjeta no está disponible para esta inscripción'
      );
      error.status = 404;
      throw error;
    }

    const progreso =
      await ProgresoEstudioRepository.obtenerPorInscripcionYTarjeta(
        inscripcion_id,
        tarjeta_id
      );

    const resultadoSM2 = SM2Service.calcular({
      factor_facilidad: progreso?.factor_facilidad,
      intervalo_dias: progreso?.intervalo_dias,
      repeticiones: progreso?.repeticiones,
      valoracion,
    });

    const ahora = new Date();

    const fechaProximoRepaso = new Date(ahora);
    fechaProximoRepaso.setDate(
      fechaProximoRepaso.getDate() + resultadoSM2.intervalo_dias
    );

    return ProgresoEstudioRepository.crearOActualizar({
      inscripcion_id,
      tarjeta_id,
      factor_facilidad: resultadoSM2.factor_facilidad,
      intervalo_dias: resultadoSM2.intervalo_dias,
      repeticiones: resultadoSM2.repeticiones,
      ultima_valoracion: valoracion,
      fecha_ultimo_repaso: ahora,
      fecha_proximo_repaso: fechaProximoRepaso,
    });
  },
};