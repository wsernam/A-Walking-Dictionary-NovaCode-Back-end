import { InscripcionRepository } from '../repositories/InscripcionRepository.js';
import { EstudioRepository } from '../repositories/EstudioRepository.js';
import { ProgresoEstudioRepository } from '../repositories/ProgresoEstudioRepository.js';
import { SM2Service } from './SM2Service.js';

export const EstudioService = {
  /**
   * Inicia una sesión de repaso para un estudiante.
   *
   * Devuelve TODAS las tarjetas aprobadas de los mazos disponibles para el
   * curso de la inscripción, para que el estudiante pueda repasar cuantas
   * veces quiera (p. ej. antes de un quiz). SM-2 no filtra, solo ordena:
   *   1. Las que ya les tocaba repaso (las más atrasadas primero).
   *   2. Las que nunca ha estudiado.
   *   3. El resto, primero las que más le cuestan (menor factor de facilidad).
   * Decisión del equipo (2026-09-30), ver CHANGELOG_BACKEND.md.
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

    const tarjetas = await EstudioRepository.listarTarjetasDisponibles(
      inscripcion_id
    );

    const ahora = new Date();

    const vencidas = [];
    const nuevas = [];
    const pendientes = [];

    for (const tarjeta of tarjetas) {
      const progreso =
        await ProgresoEstudioRepository.obtenerPorInscripcionYTarjeta(
          inscripcion_id,
          tarjeta.id_tarjeta
        );

      if (!progreso) {
        nuevas.push({ ...tarjeta, progreso: null });
      } else if (
        !progreso.fecha_proximo_repaso ||
        new Date(progreso.fecha_proximo_repaso) <= ahora
      ) {
        vencidas.push({ ...tarjeta, progreso });
      } else {
        pendientes.push({ ...tarjeta, progreso });
      }
    }

    const fechaRepaso = (t) => new Date(t.progreso.fecha_proximo_repaso ?? 0);

    vencidas.sort((a, b) => fechaRepaso(a) - fechaRepaso(b));
    pendientes.sort(
      (a, b) =>
        Number(a.progreso.factor_facilidad) - Number(b.progreso.factor_facilidad) ||
        fechaRepaso(a) - fechaRepaso(b)
    );

    const tarjetasEstudio = [...vencidas, ...nuevas, ...pendientes];

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
    const tarjeta = await EstudioRepository.listarTarjetasDisponibles(
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