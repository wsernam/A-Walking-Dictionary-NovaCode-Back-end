/**
 * @file QuizService.js
 * @brief HU-3.1: generación automática de quices acumulativos a partir de las tarjetas
 * aprobadas ("revisado_docente") de un rango de mazos elegido por la docente.
 *
 * Endpoints relacionados: POST /api/v1/quizzes/generate
 * Almacenamiento: tablas quiz, quiz_mazo, pregunta_quiz
 *
 * @note ALCANCE (no documentado explícitamente en el backlog, dejar constancia en vez de
 * asumir en silencio):
 * - El body de /generate recibe "mazo_ids" (array de id_mazo) explícitos elegidos por la
 *   docente en la pantalla de configuración, en vez de resolver un "rango de semanas" de forma
 *   automática — el backlog no define cómo se traduce un rango de semanas a mazos, así que se
 *   deja esa selección en manos del cliente (React), que ya tiene la lista de mazos.
 * - "cantidad_preguntas" es opcional: si se envía, se seleccionan aleatoriamente esa cantidad
 *   de tarjetas del pool de aprobadas (HU-3.1 dice "Lógica: selección aleatoria de tarjetas");
 *   si no se envía, se usan todas las tarjetas aprobadas del rango.
 * - "semana_corte" (columna NOT NULL de "quiz") se calcula como la semana más alta entre los
 *   mazos incluidos, representando el corte acumulativo del quiz.
 * - El texto de "enunciado" y el número de opciones (1 correcta + hasta 3 distractores, según
 *   cuántas tarjetas aprobadas haya disponibles) son una interpretación razonable de "quiz de
 *   opción múltiple", no vienen especificados literalmente en el backlog.
 */

import { MazoRepository } from '../repositories/MazoRepository.js';
import { QuizRepository } from '../repositories/QuizRepository.js';
import { QuizMazoRepository } from '../repositories/QuizMazoRepository.js';
import { PreguntaQuizRepository } from '../repositories/PreguntaQuizRepository.js';
import { TarjetaRepository } from '../repositories/TarjetaRepository.js';

/**
 * @brief Crea un Error con un código HTTP adjunto, para que el controlador que atrapa la
 * excepción sepa con qué status responder (mismo patrón que ContextoService.js).
 * @param {number} status - Código HTTP a usar en la respuesta (400, 404, 409, ...).
 * @param {string} message - Mensaje de error legible para el cliente.
 * @return {Error} Error con la propiedad adicional `status`.
 */
function error(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * @brief Baraja un arreglo sin mutar el original (algoritmo Fisher-Yates).
 * @param {Array} arreglo - Arreglo a barajar.
 * @return {Array} Copia nueva de `arreglo` en orden aleatorio.
 */
function barajar(arreglo) {
  const copia = [...arreglo];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * @brief Construye una pregunta de opción múltiple para una tarjeta, con distractores
 * aleatorios tomados del resto del pool de tarjetas aprobadas (CA-3.1.2), sin repetir opciones.
 * @param {import('../models/Tarjeta.js').Tarjeta} tarjetaObjetivo - Tarjeta sobre la que se
 * pregunta; su traducción es la respuesta correcta.
 * @param {import('../models/Tarjeta.js').Tarjeta[]} poolCompleto - Todas las tarjetas
 * aprobadas del rango del quiz, de donde se toman los distractores.
 * @param {number} orden - Posición de esta pregunta dentro del quiz (1-indexado).
 * @return {Object} Datos listos para PreguntaQuizRepository.crear() (sin quiz_id, que lo
 * agrega quien llama): { tarjeta_id, tipo_pregunta, enunciado, opcion_a..d,
 * respuesta_correcta, orden }.
 */
function construirPregunta(tarjetaObjetivo, poolCompleto, orden) {
  const normalizar = (texto) => String(texto).trim().toLowerCase();

  // CA-3.1.2 "sin repetir opciones": se descartan traducciones iguales a la correcta y también
  // iguales entre sí (dos tarjetas distintas pueden compartir traducción).
  const vistas = new Set([normalizar(tarjetaObjetivo.traduccion)]);
  const distractores = [];
  for (const candidata of barajar(poolCompleto)) {
    if (distractores.length === 3) break;
    const clave = normalizar(candidata.traduccion);
    if (candidata.id_tarjeta === tarjetaObjetivo.id_tarjeta || vistas.has(clave)) continue;
    vistas.add(clave);
    distractores.push(candidata);
  }

  const opciones = barajar([tarjetaObjetivo.traduccion, ...distractores.map((t) => t.traduccion)]);
  const [opcion_a = null, opcion_b = null, opcion_c = null, opcion_d = null] = opciones;

  return {
    tarjeta_id: tarjetaObjetivo.id_tarjeta,
    tipo_pregunta: 'seleccion_multiple',
    enunciado: `¿Cuál es la traducción correcta de "${tarjetaObjetivo.palabra}"?`,
    opcion_a,
    opcion_b,
    opcion_c,
    opcion_d,
    respuesta_correcta: tarjetaObjetivo.traduccion,
    orden,
  };
}

export const QuizService = {
  /**
   * @brief CA-3.1.3: calcula el estado "efectivo" del quiz según la fecha actual, sin
   * sobrescribir el estado guardado en base de datos.
   * @note Decisión: sin infraestructura de jobs/cron en el proyecto, el estado real
   * ("programado" → "abierto" → "cerrado") se deriva en cada consulta en vez de actualizarse
   * solo, igual que se decidió para CA-2.3.3 en HE-02 con el conteo de participación.
   * @param {import('../models/Quiz.js').Quiz} quiz - Quiz con al menos estado, fecha_apertura
   * y fecha_cierre.
   * @return {string} "programado" | "abierto" | "cerrado".
   */
  calcularEstadoEfectivo(quiz) {
    if (quiz.estado !== 'programado') {
      return quiz.estado;
    }
    const ahora = new Date();
    if (quiz.fecha_apertura && ahora < new Date(quiz.fecha_apertura)) {
      return 'programado';
    }
    if (quiz.fecha_cierre && ahora > new Date(quiz.fecha_cierre)) {
      return 'cerrado';
    }
    return 'abierto';
  },

  /**
   * @brief Adjunta `estado_efectivo` a un Quiz para exponerlo en las respuestas de la API, sin
   * modificar el objeto original.
   * @param {import('../models/Quiz.js').Quiz} quiz - Quiz a enriquecer.
   * @return {Object} Copia superficial del quiz con la propiedad `estado_efectivo` agregada.
   */
  conEstadoEfectivo(quiz) {
    return { ...quiz, estado_efectivo: this.calcularEstadoEfectivo(quiz) };
  },

  /**
   * @brief HU-3.1 (CA-3.1.1, CA-3.1.2, CA-3.1.3): genera un quiz acumulativo a partir de las
   * tarjetas "revisado_docente" de los mazos indicados.
   * @param {Object} datos
   * @param {number} datos.curso_id - Curso al que pertenece el quiz.
   * @param {string} datos.titulo - Título del quiz.
   * @param {number[]} datos.mazo_ids - Ids de los mazos cuyas tarjetas aprobadas forman el pool.
   * @param {string} datos.fecha_apertura - Fecha/hora desde la que el quiz acepta respuestas.
   * @param {string} datos.fecha_cierre - Fecha/hora hasta la que el quiz acepta respuestas.
   * @param {number} datos.tiempo_limite_min - Tiempo límite en minutos para responder.
   * @param {number} [datos.cantidad_preguntas] - Cantidad de preguntas a generar; si se omite,
   * se usan todas las tarjetas aprobadas del rango.
   * @return {Promise<{quiz:Object, preguntas:import('../models/PreguntaQuiz.js').PreguntaQuiz[]}>}
   * El quiz creado (con `estado_efectivo`) y las preguntas generadas.
   * @throws {Error} status 400 si faltan campos obligatorios, si fecha_cierre no es posterior a
   * fecha_apertura, o si hay menos de 2 tarjetas revisado_docente disponibles en los mazos
   * elegidos (CA-3.1.1); status 404 si algún mazo_id no existe.
   */
  async generar(datos) {
    const {
      curso_id,
      titulo,
      mazo_ids,
      fecha_apertura,
      fecha_cierre,
      tiempo_limite_min,
      cantidad_preguntas,
    } = datos;

    const camposFaltantes = [];
    if (!curso_id) camposFaltantes.push('curso_id');
    if (!titulo) camposFaltantes.push('titulo');
    if (!Array.isArray(mazo_ids) || mazo_ids.length === 0) camposFaltantes.push('mazo_ids');
    if (!fecha_apertura) camposFaltantes.push('fecha_apertura');
    if (!fecha_cierre) camposFaltantes.push('fecha_cierre');
    if (!tiempo_limite_min) camposFaltantes.push('tiempo_limite_min');
    if (camposFaltantes.length > 0) {
      throw error(400, `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`);
    }

    if (new Date(fecha_cierre) <= new Date(fecha_apertura)) {
      throw error(400, 'fecha_cierre debe ser posterior a fecha_apertura');
    }

    const mazos = await Promise.all(mazo_ids.map((id) => MazoRepository.obtenerPorId(id)));
    const mazoInexistente = mazo_ids.find((id, idx) => !mazos[idx]);
    if (mazoInexistente !== undefined) {
      throw error(404, `El mazo ${mazoInexistente} no existe`);
    }

    // CA-3.1.1: exclusivamente tarjetas revisado_docente de los mazos elegidos.
    const poolAprobadas = await TarjetaRepository.listarAprobadasPorMazos(mazo_ids);
    if (poolAprobadas.length < 2) {
      throw error(
        400,
        'Se necesitan al menos 2 tarjetas en estado revisado_docente en los mazos seleccionados para generar un quiz'
      );
    }

    // "Lógica: selección aleatoria de tarjetas" (HU-3.1) — si se pide una cantidad puntual de
    // preguntas, se toma una muestra aleatoria del pool; si no, se usan todas las aprobadas.
    const cantidad = cantidad_preguntas
      ? Math.min(Number(cantidad_preguntas), poolAprobadas.length)
      : poolAprobadas.length;
    const tarjetasSeleccionadas = barajar(poolAprobadas).slice(0, cantidad);

    const semana_corte = Math.max(...mazos.map((m) => m.semana));

    const quiz = await QuizRepository.crear({
      curso_id,
      titulo,
      semana_corte,
      fecha_creacion: new Date(),
      fecha_apertura,
      fecha_cierre,
      tiempo_limite_min,
      estado: 'programado',
    });

    await Promise.all(mazo_ids.map((mazo_id) => QuizMazoRepository.crear({ quiz_id: quiz.id_quiz, mazo_id })));

    const preguntasCreadas = [];
    let orden = 1;
    for (const tarjeta of tarjetasSeleccionadas) {
      const datosPregunta = construirPregunta(tarjeta, poolAprobadas, orden);
      const pregunta = await PreguntaQuizRepository.crear({ quiz_id: quiz.id_quiz, ...datosPregunta });
      preguntasCreadas.push(pregunta);
      orden += 1;
    }

    return { quiz: this.conEstadoEfectivo(quiz), preguntas: preguntasCreadas };
  },
};
