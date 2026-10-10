/**
 * @file WordnetService.js
 * @brief Servicio de enriquecimiento léxico mediante WordNet 3.1.
 *
 * HU-011 - Sugerencias léxicas (WordNet)
 *
 * Flujo:
 * 1. Busca la palabra en wordnet_cache.
 * 2. Si existe, devuelve los datos almacenados.
 * 3. Si no existe, consulta WordNet 3.1 local.
 * 4. Procesa sinónimos, hiperónimos, hipónimos y familias léxicas.
 * 5. Guarda el resultado en wordnet_cache.
 * 6. Devuelve una respuesta limpia para el frontend.
 */

import { createRequire } from 'node:module';
import { WordnetCacheRepository } from '../repositories/WordnetCacheRepository.js';

const require = createRequire(import.meta.url);

const WordNet = require('node-wordnet');
const wndb = require('wordnet-db');

/**
 * WordNet 3.1 instalado localmente dentro de node_modules.
 *
 * wordnet-db proporciona la ruta hacia los archivos:
 * data.noun, data.verb, data.adj, data.adv, etc.
 *
 * No usamos open() porque esta versión de node-wordnet
 * permite utilizar directamente lookupAsync/getAsync.
 */
const wordnet = new WordNet(wndb.path);

const FUENTE = 'WordNet 3.1';

/**
 * Convierte los códigos POS de WordNet a categorías legibles.
 */
function categoriaPorPos(pos) {
  switch (pos) {
    case 'n':
      return 'sustantivos';

    case 'v':
      return 'verbos';

    case 'a':
    case 's':
      return 'adjetivos';

    case 'r':
      return 'adverbios';

    default:
      return null;
  }
}

/**
 * Convierte una palabra de WordNet a una forma más amigable
 * para mostrar en la interfaz.
 *
 * WordNet utiliza "_" para palabras compuestas.
 */
function limpiarPalabra(palabra) {
  return String(palabra || '')
    .replace(/_/g, ' ')
    .trim();
}

/**
 * Normaliza una palabra para comparaciones.
 */
function normalizarPalabra(palabra) {
  return limpiarPalabra(palabra).toLowerCase();
}

/**
 * Crea la estructura de sugerencias agrupada por categoría gramatical.
 */
function crearSugerenciasVacias() {
  return {
    sustantivos: {
      sinonimos: [],
      hiperonimos: [],
      hiponimos: [],
      familia: [],
    },

    verbos: {
      sinonimos: [],
      hiperonimos: [],
      hiponimos: [],
      familia: [],
    },

    adjetivos: {
      sinonimos: [],
      hiperonimos: [],
      hiponimos: [],
      familia: [],
    },

    adverbios: {
      sinonimos: [],
      hiperonimos: [],
      hiponimos: [],
      familia: [],
    },
  };
}

/**
 * Agrega una palabra evitando duplicados.
 */
function agregarUnico(lista, palabra) {
  const palabraLimpia = limpiarPalabra(palabra);

  if (!palabraLimpia) {
    return;
  }

  const existe = lista.some(
    (item) => normalizarPalabra(item) === normalizarPalabra(palabraLimpia)
  );

  if (!existe) {
    lista.push(palabraLimpia);
  }
}

/**
 * Obtiene las palabras del synset destino de un pointer.
 *
 * Cuando sourceTarget es 0000 significa que la relación es semántica
 * y se pueden considerar todos los términos del synset destino.
 *
 * Cuando contiene un índice de palabra, por ejemplo 0305,
 * los dos últimos dígitos identifican la palabra destino.
 */
function obtenerPalabrasDestino(target, pointer) {
  if (!target || !Array.isArray(target.synonyms)) {
    return [];
  }

  const sourceTarget = String(pointer.sourceTarget || '0000');

  // 0000 = relación semántica entre synsets.
  if (sourceTarget === '0000') {
    return target.synonyms;
  }

  // Los dos últimos caracteres representan el índice
  // de la palabra destino en hexadecimal.
  const indiceDestino = Number.parseInt(sourceTarget.slice(2), 16);

  if (
    Number.isInteger(indiceDestino) &&
    indiceDestino > 0 &&
    indiceDestino <= target.synonyms.length
  ) {
    return [target.synonyms[indiceDestino - 1]];
  }

  // Si no se puede determinar el índice, usamos
  // las palabras del synset como respaldo.
  return target.synonyms;
}

/**
 * Procesa un conjunto de filas provenientes de la caché
 * y genera la estructura final para el frontend.
 */
function construirRespuestaDesdeCache(palabra, filas) {
  const sugerencias = crearSugerenciasVacias();

  for (const fila of filas) {
    const pos =
      Array.isArray(fila.sinonimos) && fila.sinonimos.length > 0
        ? fila.sinonimos[0]?.pos
        : null;

    /**
     * Las estructuras almacenadas pueden ser:
     * - objetos { palabra, pos }
     * - strings, dependiendo de datos anteriores.
     *
     * Por eso procesamos ambos casos.
     */

    procesarElementosCache(
      fila.sinonimos,
      sugerencias,
      'sinonimos',
      pos
    );

    procesarElementosCache(
      fila.hiperonimos,
      sugerencias,
      'hiperonimos',
      null
    );

    procesarElementosCache(
      fila.hiponimos,
      sugerencias,
      'hiponimos',
      null
    );

    procesarElementosCache(
      fila.familia,
      sugerencias,
      'familia',
      null
    );
  }

  return {
    palabra,
    encontrado: true,
    desde_cache: true,
    fuente: FUENTE,
    sugerencias,
  };
}

/**
 * Procesa elementos almacenados en la caché.
 */
function procesarElementosCache(
  elementos,
  sugerencias,
  tipoRelacion,
  posPorDefecto
) {
  if (!Array.isArray(elementos)) {
    return;
  }

  for (const elemento of elementos) {
    let palabra;
    let pos = posPorDefecto;

    if (typeof elemento === 'string') {
      palabra = elemento;
    } else if (elemento && typeof elemento === 'object') {
      palabra = elemento.palabra;
      pos = elemento.pos || posPorDefecto;
    }

    const categoria = categoriaPorPos(pos);

    if (!categoria || !palabra) {
      continue;
    }

    agregarUnico(
      sugerencias[categoria][tipoRelacion],
      palabra
    );
  }
}

/**
 * Agrega una relación obtenida directamente desde WordNet
 * a la estructura de sugerencias.
 */
function agregarRelacion(
  sugerencias,
  tipoRelacion,
  palabra,
  pos,
  palabraConsultada
) {
  const categoria = categoriaPorPos(pos);

  if (!categoria || !palabra) {
    return;
  }

  const palabraLimpia = limpiarPalabra(palabra);

  // No mostramos la misma palabra consultada.
  if (
    normalizarPalabra(palabraLimpia) ===
    normalizarPalabra(palabraConsultada)
  ) {
    return;
  }

  agregarUnico(
    sugerencias[categoria][tipoRelacion],
    palabraLimpia
  );
}

/**
 * Procesa los pointers de un resultado de WordNet.
 */
async function procesarPointers(
  resultado,
  sugerencias,
  palabraConsultada
) {
  if (!Array.isArray(resultado.ptrs)) {
    return {
      sinonimos: resultado.synonyms || [],
      hiperonimos: [],
      hiponimos: [],
      familia: [],
    };
  }

  const hiperonimos = [];
  const hiponimos = [];
  const familia = [];

  /**
   * Solo procesamos las relaciones necesarias para HU-011:
   *
   * @  = Hypernym
   * ~  = Hyponym
   * +  = Derivationally related form
   *
   * Ignoramos relaciones como -c, %p, etc.,
   * porque no forman parte del alcance de esta HU.
   */
  const pointersRelevantes = resultado.ptrs.filter(
    (pointer) =>
      pointer.pointerSymbol === '@' ||
      pointer.pointerSymbol === '@i' ||
      pointer.pointerSymbol === '~' ||
      pointer.pointerSymbol === '~i' ||
      pointer.pointerSymbol === '+'
  );

  /**
   * Evitamos consultar dos veces el mismo synset destino.
   */
  const vistos = new Set();

  for (const pointer of pointersRelevantes) {
    const clave = [
      pointer.pointerSymbol,
      pointer.synsetOffset,
      pointer.pos,
      pointer.sourceTarget,
    ].join(':');

    if (vistos.has(clave)) {
      continue;
    }

    vistos.add(clave);

    try {
      const target = await wordnet.getAsync(
        pointer.synsetOffset,
        pointer.pos
      );

      if (!target) {
        continue;
      }

      const palabrasDestino = obtenerPalabrasDestino(
        target,
        pointer
      );

      for (const palabraDestino of palabrasDestino) {
        const palabraLimpia = limpiarPalabra(palabraDestino);

        if (
          !palabraLimpia ||
          normalizarPalabra(palabraLimpia) ===
            normalizarPalabra(palabraConsultada)
        ) {
          continue;
        }

        if (
          pointer.pointerSymbol === '@' ||
          pointer.pointerSymbol === '@i'
        ) {
          hiperonimos.push({
            palabra: palabraLimpia,
            pos: target.pos,
          });
        }

        if (
          pointer.pointerSymbol === '~' ||
          pointer.pointerSymbol === '~i'
        ) {
          hiponimos.push({
            palabra: palabraLimpia,
            pos: target.pos,
          });
        }

        if (pointer.pointerSymbol === '+') {
          familia.push({
            palabra: palabraLimpia,
            pos: target.pos,
          });
        }
      }
    } catch (error) {
      /**
       * Si un pointer individual no puede resolverse,
       * no hacemos fallar toda la consulta.
       *
       * WordNet puede contener relaciones hacia synsets
       * que no sean recuperables de la misma manera.
       */
      console.warn(
        `No se pudo resolver pointer ${pointer.pointerSymbol} ` +
          `${pointer.synsetOffset}/${pointer.pos}:`,
        error.message
      );
    }
  }

  return {
    sinonimos: resultado.synonyms || [],
    hiperonimos,
    hiponimos,
    familia,
  };
}

/**
 * Construye las sugerencias a partir de los resultados
 * obtenidos directamente desde WordNet.
 */
function construirSugerenciasWordnet(
  resultados,
  palabraConsultada
) {
  const sugerencias = crearSugerenciasVacias();

  return (async () => {
    const datosPorSentido = [];

    for (let indice = 0; indice < resultados.length; indice += 1) {
      const resultado = resultados[indice];

      const categoria = categoriaPorPos(resultado.pos);

      /**
       * Si WordNet devuelve una categoría que no manejamos,
       * simplemente no la presentamos.
       */
      if (!categoria) {
        continue;
      }

      /**
       * El sentido de nuestra tabla es INTEGER.
       *
       * IMPORTANTE:
       * NO usamos resultado.pos aquí.
       *
       * 1 = primer sentido encontrado
       * 2 = segundo sentido encontrado
       * etc.
       */
      const sentido = indice + 1;

      const relaciones = await procesarPointers(
        resultado,
        sugerencias,
        palabraConsultada
      );

      /**
       * Sinónimos del propio synset.
       */
      for (const sinonimo of resultado.synonyms || []) {
        agregarRelacion(
          sugerencias,
          'sinonimos',
          sinonimo,
          resultado.pos,
          palabraConsultada
        );
      }

      /**
       * Hiperónimos.
       */
      for (const elemento of relaciones.hiperonimos) {
        agregarRelacion(
          sugerencias,
          'hiperonimos',
          elemento.palabra,
          elemento.pos,
          palabraConsultada
        );
      }

      /**
       * Hipónimos.
       */
      for (const elemento of relaciones.hiponimos) {
        agregarRelacion(
          sugerencias,
          'hiponimos',
          elemento.palabra,
          elemento.pos,
          palabraConsultada
        );
      }

      /**
       * Familia léxica.
       */
      for (const elemento of relaciones.familia) {
        agregarRelacion(
          sugerencias,
          'familia',
          elemento.palabra,
          elemento.pos,
          palabraConsultada
        );
      }

      /**
       * Preparamos la información que se almacenará
       * en wordnet_cache para este sentido.
       *
       * Guardamos objetos { palabra, pos } para poder
       * reconstruir posteriormente las categorías.
       */
      datosPorSentido.push({
        sentido,
        pos: resultado.pos,
        definicion:
          resultado.def ||
          resultado.gloss ||
          null,

        sinonimos: (resultado.synonyms || [])
          .filter(
            (palabra) =>
              normalizarPalabra(palabra) !==
              normalizarPalabra(palabraConsultada)
          )
          .map((palabra) => ({
            palabra: limpiarPalabra(palabra),
            pos: resultado.pos,
          })),

        hiperonimos: relaciones.hiperonimos,

        hiponimos: relaciones.hiponimos,

        familia: relaciones.familia,
      });
    }

    return {
      sugerencias,
      datosPorSentido,
    };
  })();
}

/**
 * Servicio principal de HU-011.
 */
export const WordnetService = {
  /**
   * Consulta sugerencias léxicas para una palabra.
   *
   * @param {string} palabra Palabra en inglés.
   * @returns {Promise<object>} Resultado del enriquecimiento.
   */
  async obtenerFamilia(palabra) {
    if (!palabra || typeof palabra !== 'string') {
      throw new Error('La palabra es obligatoria');
    }

    const palabraLimpia = palabra
      .trim()
      .toLowerCase();

    if (!palabraLimpia) {
      throw new Error('La palabra es obligatoria');
    }

    if (palabraLimpia.length > 150) {
      throw new Error(
        'La palabra no puede superar 150 caracteres'
      );
    }

    /**
     * =====================================================
     * 1. BUSCAR EN CACHÉ
     * =====================================================
     */
    const cache =
      await WordnetCacheRepository.buscarPorPalabra(
        palabraLimpia
      );

    if (cache.length > 0) {
      return construirRespuestaDesdeCache(
        palabraLimpia,
        cache
      );
    }

    /**
     * =====================================================
     * 2. CONSULTAR WORDNET
     * =====================================================
     */
    const resultados =
      await wordnet.lookupAsync(palabraLimpia);

    /**
     * WordNet no encontró la palabra.
     *
     * Esto permite al frontend mostrar la alternativa
     * de registrar manualmente la palabra.
     */
    if (
      !Array.isArray(resultados) ||
      resultados.length === 0
    ) {
      return {
        palabra: palabraLimpia,
        encontrado: false,
        desde_cache: false,
        fuente: FUENTE,

        sugerencias: crearSugerenciasVacias(),

        accion: {
          tipo: 'registrar_palabra',
          mensaje:
            'No se encontraron coincidencias en WordNet. ' +
            'Puede registrar la palabra manualmente.',
        },
      };
    }

    /**
     * =====================================================
     * 3. PROCESAR RESULTADOS
     * =====================================================
     */
    const {
      sugerencias,
      datosPorSentido,
    } = await construirSugerenciasWordnet(
      resultados,
      palabraLimpia
    );

    /**
     * =====================================================
     * 4. GUARDAR EN CACHÉ
     * =====================================================
     *
     * Guardamos cada sentido por separado.
     *
     * IMPORTANTE:
     * sentido es INTEGER:
     *
     * 1, 2, 3...
     *
     * No usamos:
     *
     * 'n'
     * 'v'
     * 'a'
     *
     * porque esos valores corresponden a POS y no al
     * número de sentido de nuestra tabla.
     */
    for (const dato of datosPorSentido) {
      await WordnetCacheRepository.guardarSense({
        palabra: palabraLimpia,

        sentido: dato.sentido,

        definicion: dato.definicion,

        sinonimos: dato.sinonimos,

        hiperonimos: dato.hiperonimos,

        hiponimos: dato.hiponimos,

        familia: dato.familia,

        fuente: FUENTE,
      });
    }

    /**
     * =====================================================
     * 5. RESPUESTA PARA FRONTEND
     * =====================================================
     */
    const tieneSugerencias =
      Object.values(sugerencias).some(
        (categoria) =>
          categoria.sinonimos.length > 0 ||
          categoria.hiperonimos.length > 0 ||
          categoria.hiponimos.length > 0 ||
          categoria.familia.length > 0
      );

    return {
      palabra: palabraLimpia,

      encontrado: true,

      desde_cache: false,

      fuente: FUENTE,

      sugerencias,

      accion: tieneSugerencias
        ? {
            tipo: 'mostrar_sugerencias',
            mensaje:
              'Se encontraron términos relacionados en WordNet.',
          }
        : {
            tipo: 'registrar_palabra',
            mensaje:
              'La palabra existe en WordNet, pero no se encontraron ' +
              'relaciones adicionales para sugerir.',
          },
    };
  },
};