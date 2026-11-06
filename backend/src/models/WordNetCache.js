/**
 * @file WordNetCache.js
 * @brief Modelo de dominio: representa la tabla "wordnet_cache" del DER oficial.
 */

/**
 * @class WordNetCache
 * @brief Caché de consultas léxicas por palabra y sentido (HU-4.2 / HU-011). Única por
 * (palabra, sentido) según el DER. La política de qué se guarda y cuándo está explicada en el
 * comentario al final de este archivo.
 */
export class WordNetCache {
  /**
   * @brief Construye un WordNetCache a partir de una fila de la base de datos (o de un payload equivalente).
   * @param {number} config.id_cache - Id autoincremental (pk).
   * @param {string} config.palabra - Palabra consultada (varchar 150).
   * @param {number} config.sentido - Número de sentido de la palabra (int, default 1).
   * @param {string|null} config.definicion - Definición (text).
   * @param {string|null} config.sinonimos - Sinónimos (text).
   * @param {string|null} config.hiperonimos - Hiperónimos (text).
   * @param {string|null} config.hiponimos - Hipónimos (text).
   * @param {string} config.fuente - Origen del dato (varchar 20, por ejemplo "WordNet 3.1" o
   * "free_dictionary").
   * @param {boolean} config.confirmado_por_estudiante - Si un estudiante confirmó el resultado
   * (default false).
   * @param {string} config.fecha_consulta - Marca de tiempo de la consulta (default NOW()).
   */
  constructor({
    id_cache,
    palabra,
    sentido,
    definicion,
    sinonimos,
    hiperonimos,
    hiponimos,
    fuente,
    confirmado_por_estudiante,
    fecha_consulta,
  }) {
    this.id_cache = id_cache;
    this.palabra = palabra;
    this.sentido = sentido;
    this.definicion = definicion;
    this.sinonimos = sinonimos;
    this.hiperonimos = hiperonimos;
    this.hiponimos = hiponimos;
    this.fuente = fuente;
    this.confirmado_por_estudiante = confirmado_por_estudiante;
    this.fecha_consulta = fecha_consulta;
  }
}

//Cuando un estudiante consulta una palabra para enriquecimiento léxico, el sistema primero intenta resolverla con WordNet local, 
// la fuente principal ya definida en la Decisión 4. Si WordNet no tiene esa palabra —algo común con modismos, variantes regionales o 
// vocabulario coloquial, como señala la Tabla 1D—, el sistema consulta la Free Dictionary API como respaldo opcional. Sin embargo, 
// este resultado externo no se guarda automáticamente en la base de datos: se muestra primero al estudiante como una sugerencia, 
// y solo si él la confirma explícitamente, el backend inserta el registro en wordnet_cache marcándolo con fuente = 'free_dictionary' 
// y confirmado_por_estudiante = true. Si el estudiante no confirma, ningún dato se guarda. En cambio, cuando WordNet sí resuelve la palabra 
// directamente, el resultado se guarda de inmediato sin pedir confirmación, ya que es la fuente de confianza principal del sistema. 
// Esta distinción evita que información no verificada de un servicio externo se acumule silenciosamente en el diccionario compartido 
// del curso, respetando la restricción definida en la Decisión 4: "Free Dictionary API como apoyo opcional que nunca se guarda sin confirmación
//  del estudiante."
