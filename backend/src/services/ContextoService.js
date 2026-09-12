// ContextoService.js
// HU-2.2: asignación de etiquetas de contexto cultural (registro y variante regional) a
// tarjetas, individualmente (CA-2.2.1) o en bloque por mazo (CA-2.2.2).
// Endpoints relacionados: PUT /api/v1/cards/:id/context, PATCH /api/v1/decks/:id/default-variant
// Almacenamiento: tabla etiqueta_contexto

import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';

const REGISTROS_PERMITIDOS = ['formal', 'informal', 'slang', 'coloquial', 'anticuado'];

const VARIANTES_PERMITIDAS = ['inglés ghanés', 'jamaicano', 'nigeriano', 'británico'];

function validarRegistro(registro) {
  if (registro && !REGISTROS_PERMITIDOS.includes(registro.toLowerCase())) {
    const error = new Error(
      'Registro inválido. Valores permitidos: formal, informal, slang, coloquial, anticuado'
    );
    error.status = 400;
    throw error;
  }
}

function validarVarianteRegional(variante) {
  if (variante && !VARIANTES_PERMITIDAS.includes(variante.toLowerCase())) {
    const error = new Error('Variante regional inválida');
    error.status = 400;
    throw error;
  }
}

export const ContextoService = {
  /**
   * CA-2.2.1: Selección de registro y variante regional para UNA tarjeta.
   *
   * BUG CORREGIDO: antes esta función creaba la etiqueta de variante_regional ANTES de
   * validar si el valor era válido — un valor inválido quedaba guardado en la base de datos
   * antes de que se lanzara el error 400. Ahora se valida todo primero, y solo si pasa la
   * validación se borran las etiquetas anteriores y se crean las nuevas.
   */
  async actualizarContexto(tarjeta_id, datos) {
    const tarjeta = await TarjetaRepository.obtenerPorId(tarjeta_id);

    if (!tarjeta) {
      const error = new Error('Tarjeta no encontrada');
      error.status = 404;
      throw error;
    }

    if (!datos.registro && !datos.variante_regional) {
      const error = new Error('Debe proporcionar al menos una etiqueta de contexto');
      error.status = 400;
      throw error;
    }

    // Validar ANTES de tocar la base de datos.
    validarRegistro(datos.registro);
    validarVarianteRegional(datos.variante_regional);

    const etiquetas = [];

    if (datos.registro) {
      await EtiquetaContextoRepository.eliminarPorTarjetaYTipo(tarjeta_id, 'registro');
      etiquetas.push(
        await EtiquetaContextoRepository.crear({
          tarjeta_id,
          tipo: 'registro',
          valor: datos.registro,
        })
      );
    }

    if (datos.variante_regional) {
      await EtiquetaContextoRepository.eliminarPorTarjetaYTipo(tarjeta_id, 'variante_regional');
      etiquetas.push(
        await EtiquetaContextoRepository.crear({
          tarjeta_id,
          tipo: 'variante_regional',
          valor: datos.variante_regional,
        })
      );
    }

    return etiquetas;
  },

  /**
   * CA-2.2.2: Asignación masiva por mazo.
   * Dado que la docente configura la variante regional a nivel del mazo curricular, cuando
   * guarda los cambios del mazo, todas las tarjetas de dicho mazo heredan automáticamente esa
   * etiqueta dialectal como valor predeterminado.
   *
   * Decisión de implementación: "heredar" se interpreta como sobrescribir la etiqueta
   * 'variante_regional' de TODAS las tarjetas del mazo con el nuevo valor por defecto (no se
   * dejan intactas las que ya tenían una asignada individualmente) — el DER/CA no especifica
   * un mecanismo de "no pisar si ya existe", así que se optó por la lectura más literal:
   * el valor del mazo pasa a ser el valor de todas sus tarjetas.
   *
   * @param {number} mazo_id - Id del mazo cuya variante regional por defecto se actualizó.
   * @param {string} variante_regional - Nuevo valor por defecto (debe ser una de las permitidas).
   * @return {Promise<number>} Cantidad de tarjetas actualizadas.
   */
  async aplicarVarianteRegionalPorMazo(mazo_id, variante_regional) {
    validarVarianteRegional(variante_regional);

    const tarjetas = await TarjetaRepository.listarPorMazo(mazo_id);

    for (const tarjeta of tarjetas) {
      await EtiquetaContextoRepository.eliminarPorTarjetaYTipo(tarjeta.id_tarjeta, 'variante_regional');
      await EtiquetaContextoRepository.crear({
        tarjeta_id: tarjeta.id_tarjeta,
        tipo: 'variante_regional',
        valor: variante_regional,
      });
    }

    return tarjetas.length;
  },
};
