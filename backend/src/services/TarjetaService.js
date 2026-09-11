import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';

export const TarjetaService = {

  async obtenerDetalleTarjeta(id_tarjeta) {

    const tarjeta =
      await TarjetaRepository.obtenerPorId(id_tarjeta);

    if (!tarjeta) {
      return null;
    }

    const etiquetas =
      await EtiquetaContextoRepository.listarPorTarjeta(id_tarjeta);

    return {
      ...tarjeta,
      etiquetas_contexto: etiquetas
    };
  }

};