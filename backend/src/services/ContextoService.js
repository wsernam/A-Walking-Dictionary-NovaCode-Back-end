import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';

export const ContextoService = {

  async actualizarContexto(tarjeta_id, datos) {

    // Verificar que exista la tarjeta
    const tarjeta = await TarjetaRepository.obtenerPorId(tarjeta_id);

    if (!tarjeta) {
      const error = new Error('Tarjeta no encontrada');
      error.status = 404;
      throw error;
    }
    // Validar que llegue al menos una etiqueta de contexto
    if (
    !datos.registro &&
    !datos.variante_regional 
    ) {
    const error = new Error(
        'Debe proporcionar al menos una etiqueta de contexto'
    );

    error.status = 400;
    throw error;
    }

    // Validar registro
    const registrosPermitidos = [
      'formal',
      'informal',
      'slang',
      'coloquial',
      'anticuado'
    ];


    if (
      datos.registro &&
      !registrosPermitidos.includes(
        datos.registro.toLowerCase()
      )
    ) {
      const error = new Error(
        'Registro inválido. Valores permitidos: formal, informal, slang, coloquial, anticuado'
      );

      error.status = 400;
      throw error;
    }


    // Eliminar etiquetas anteriores
    await EtiquetaContextoRepository.eliminarPorTarjeta(tarjeta_id);


    const etiquetas = [];


    // Crear etiqueta de registro
    if (datos.registro) {
      etiquetas.push(
        await EtiquetaContextoRepository.crear({
          tarjeta_id,
          tipo: 'registro',
          valor: datos.registro
        })
      );
    }


    // Crear etiqueta de variante regional
    if (datos.variante_regional) {
      etiquetas.push(
        await EtiquetaContextoRepository.crear({
          tarjeta_id,
          tipo: 'variante_regional',
          valor: datos.variante_regional
        })
            );
          }

      const variantesPermitidas = [
        'inglés ghanés',
        'jamaicano',
        'nigeriano',
        'británico'
      ];


      if (
      datos.variante_regional &&
      !variantesPermitidas.includes(
        datos.variante_regional.toLowerCase()
      )
      ) {
      const error = new Error(
        'Variante regional inválida'
      );

      error.status = 400;
      throw error;
      }
          


    return etiquetas;
  }

  




};