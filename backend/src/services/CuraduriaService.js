import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';
import { AporteRepository } from '../repositories/AporteRepository.js';

const LETRAS_ESTUDIANTE = ['A', 'B', 'C'];

function derivarEstudiantePlaceholder(inscripcionId) {
  if (inscripcionId == null) return 'Desconocido';
  const indice = (inscripcionId - 1) % LETRAS_ESTUDIANTE.length;
  return `Estudiante ${LETRAS_ESTUDIANTE[indice]}`;
}

export const CuraduriaService = {

  async listarPendientes() {
    return TarjetaRepository.listarPorEstado('pendiente_revision');
  },

  async listarAprobadas() {
    const tarjetas = await TarjetaRepository.listarPorEstado('revisado_docente');

    const tarjetasEnriquecidas = await Promise.all(
      tarjetas.map(async (tarjeta) => {
        const etiquetas = await EtiquetaContextoRepository.listarPorTarjeta(tarjeta.id_tarjeta);
        const registro = etiquetas.find((e) => e.tipo === 'registro')?.valor ?? null;
        const variante_regional = etiquetas.find((e) => e.tipo === 'variante_regional')?.valor ?? null;

        const inscripcionId = await AporteRepository.obtenerInscripcionOriginal(tarjeta.id_tarjeta);
        const estudiante = derivarEstudiantePlaceholder(inscripcionId);

        return { ...tarjeta, registro, variante_regional, estudiante };
      })
    );

    return tarjetasEnriquecidas;
  },

  async aprobarTarjeta(idTarjeta) {
    const tarjeta = await TarjetaRepository.obtenerPorId(idTarjeta);

    if (!tarjeta) {
      const error = new Error('Tarjeta no encontrada');
      error.status = 404;
      throw error;
    }

    if (tarjeta.estado !== 'pendiente_revision') {
      const error = new Error('La tarjeta no está pendiente de revisión');
      error.status = 409;
      throw error;
    }

    return TarjetaRepository.actualizarEstado(idTarjeta, 'revisado_docente', new Date());
  },

  async editarTarjeta(idTarjeta, datos) {
    const tarjeta = await TarjetaRepository.obtenerPorId(idTarjeta);

    if (!tarjeta) {
      const error = new Error('Tarjeta no encontrada');
      error.status = 404;
      throw error;
    }

    if (tarjeta.estado !== 'pendiente_revision') {
      const error = new Error('Solo se pueden editar tarjetas pendientes de revisión');
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