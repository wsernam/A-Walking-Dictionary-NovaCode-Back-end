// Modelo de dominio: representa la tabla "wordnet_cache" del DER oficial.

export class WordNetCache {
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
