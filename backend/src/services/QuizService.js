/**
 * @file QuizService.js
 * @brief HU-3.1: generación automática de quices acumulativos a partir de las tarjetas
 * aprobadas ("revisado_docente") de un rango de mazos elegido por la docente. HU-3.2: envío y
 * calificación de las respuestas de un estudiante.
 *
 * Endpoints relacionados: POST /api/v1/quizzes/generate, POST /api/v1/quizzes/:id/submit,
 * GET /api/v1/quizzes/:id/preguntas (adicional, aprobado por el equipo)
 * Almacenamiento: tablas quiz, quiz_mazo, pregunta_quiz, resultado_quiz, respuesta_quiz
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
 * - El texto de "enunciado" y el número de opciones (1 correcta + 3 distractores) son una
 *   interpretación razonable de "quiz de opción múltiple", no vienen especificados literalmente
 *   en el backlog. Para garantizar siempre 4 opciones distintas se exigen al menos
 *   MIN_TRADUCCIONES_DISTINTAS traducciones distintas en el pool (contrato del front, P2).
 * - "calificacion" usa escala 0.0-5.0 (convención académica colombiana estándar) — el backlog
 *   no especifica ninguna escala. Supuesto pendiente de validar con la docente.
 */

import { CursoRepository } from '../repositories/CursoRepository.js';
import { InscripcionRepository } from '../repositories/InscripcionRepository.js';
import { MazoRepository } from '../repositories/MazoRepository.js';
import { QuizRepository } from '../repositories/QuizRepository.js';
import { PreguntaQuizRepository } from '../repositories/PreguntaQuizRepository.js';
import { ResultadoQuizRepository } from '../repositories/ResultadoQuizRepository.js';
import { RespuestaQuizRepository } from '../repositories/RespuestaQuizRepository.js';
import { TarjetaRepository } from '../repositories/TarjetaRepository.js';

/** @brief Margen (ms) que se tolera al recibir un envío tras vencer el tiempo/cierre (latencia). */
const MARGEN_ENVIO_MS = 30 * 1000;

/** @brief Máximo de caracteres de quiz.titulo (columna VARCHAR(200)). */
const MAX_TITULO = 200;

/** @brief Traducciones distintas mínimas para que toda pregunta tenga 1 correcta + 3 distractores. */
const MIN_TRADUCCIONES_DISTINTAS = 4;

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
 * @brief CA-3.2.3: construye el error 409 de reintento con el resumen del envío previo adjunto
 * (`err.resultado` y `err.respuestas`), que el controlador devuelve en el body.
 * @param {import('../models/ResultadoQuiz.js').ResultadoQuiz} resultadoPrevio - Resultado ya
 * registrado para ese quiz y estudiante.
 * @return {Promise<Error>} Error con status 409 y el resumen previo.
 */
async function errorReintento(resultadoPrevio) {
  const err = error(409, 'Ya enviaste este quiz. No se permite un nuevo intento.');
  err.resultado = resultadoPrevio;
  err.respuestas = await RespuestaQuizRepository.listarPorResultado(resultadoPrevio.id_resultado);
  return err;
}

/**
 * @brief Verifica que el estudiante esté inscrito en el curso del quiz.
 * @param {import('../models/Quiz.js').Quiz} quiz - Quiz que se quiere consultar o responder.
 * @param {number} estudiante_id - id_usuario del estudiante autenticado.
 * @return {Promise<void>}
 * @throws {Error} status 403 si no existe inscripción para (quiz.curso_id, estudiante_id).
 */
async function verificarInscripcion(quiz, estudiante_id) {
  const inscripcion = await InscripcionRepository.obtenerPorCursoYEstudiante(quiz.curso_id, estudiante_id);
  if (!inscripcion) {
    throw error(403, 'No estás inscrito en el curso de este quiz');
  }
}

/**
 * @brief Indica si un valor es un entero mayor o igual a 1 (acepta números o strings numéricos,
 * como llegan desde un formulario).
 * @param {*} valor - Valor a validar.
 * @return {boolean} true si `Number(valor)` es un entero >= 1.
 */
function esEnteroPositivo(valor) {
  const n = Number(valor);
  return valor !== '' && valor !== null && Number.isInteger(n) && n >= 1;
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
 * @brief Normaliza una traducción para compararla sin distinguir mayúsculas ni espacios sobrantes.
 * @param {string} texto - Traducción a normalizar.
 * @return {string} Texto en minúsculas y sin espacios al inicio ni al final.
 */
function normalizar(texto) {
  return String(texto).trim().toLowerCase();
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
   * @param {number} datos.tiempo_limite_min - Tiempo límite en minutos para responder (entero >= 1).
   * @param {number} [datos.cantidad_preguntas] - Cantidad de preguntas a generar (entero >= 1);
   * si se omite, se usan todas las tarjetas aprobadas del rango.
   * @return {Promise<{quiz:Object, preguntas:import('../models/PreguntaQuiz.js').PreguntaQuiz[]}>}
   * El quiz creado (con `estado_efectivo`) y las preguntas generadas.
   * @throws {Error} status 400 si faltan campos obligatorios, si las fechas no son válidas, si
   * mazo_ids/tiempo_limite_min/cantidad_preguntas no son enteros >= 1, si fecha_cierre no es
   * posterior a fecha_apertura, si la ventana entre apertura y cierre es menor que
   * tiempo_limite_min, si titulo supera 200 caracteres, o si hay menos de 4 traducciones distintas
   * entre las tarjetas revisado_docente de los mazos elegidos (CA-3.1.1, CA-3.1.2); status 404 si
   * el curso o algún mazo_id no existe, o si un mazo no pertenece al curso.
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

    if (!esEnteroPositivo(curso_id)) {
      throw error(400, 'curso_id debe ser un número entero mayor o igual a 1');
    }
    if (String(titulo).length > MAX_TITULO) {
      throw error(400, `titulo debe tener máximo ${MAX_TITULO} caracteres`);
    }
    if (Number.isNaN(new Date(fecha_apertura).getTime())) {
      throw error(400, 'fecha_apertura no es una fecha válida');
    }
    if (Number.isNaN(new Date(fecha_cierre).getTime())) {
      throw error(400, 'fecha_cierre no es una fecha válida');
    }
    if (new Date(fecha_cierre) <= new Date(fecha_apertura)) {
      throw error(400, 'fecha_cierre debe ser posterior a fecha_apertura');
    }
    if (!esEnteroPositivo(tiempo_limite_min)) {
      throw error(400, 'tiempo_limite_min debe ser un número entero mayor o igual a 1');
    }
    // La ventana se valida después de tiempo_limite_min para comparar contra un entero válido.
    const ventanaMin = (new Date(fecha_cierre) - new Date(fecha_apertura)) / 60000;
    if (ventanaMin < Number(tiempo_limite_min)) {
      throw error(
        400,
        `La ventana entre fecha_apertura y fecha_cierre (${Math.floor(ventanaMin)} min) debe ser mayor o igual a tiempo_limite_min (${tiempo_limite_min} min)`
      );
    }
    if (cantidad_preguntas !== undefined && cantidad_preguntas !== null && !esEnteroPositivo(cantidad_preguntas)) {
      throw error(400, 'cantidad_preguntas debe ser un número entero mayor o igual a 1');
    }
    if (!mazo_ids.every(esEnteroPositivo)) {
      throw error(400, 'mazo_ids debe contener solo ids de mazo (enteros mayores o iguales a 1)');
    }

    // Un mismo mazo repetido en mazo_ids se cuenta una sola vez (quiz_mazo tiene pk (quiz_id, mazo_id)).
    const mazoIdsUnicos = [...new Set(mazo_ids.map(Number))];

    const curso = await CursoRepository.obtenerPorId(Number(curso_id));
    if (!curso) {
      throw error(404, `El curso ${curso_id} no existe`);
    }

    const mazos = await Promise.all(mazoIdsUnicos.map((id) => MazoRepository.obtenerPorId(id)));
    const mazoInexistente = mazoIdsUnicos.find((id, idx) => !mazos[idx]);
    if (mazoInexistente !== undefined) {
      throw error(404, `El mazo ${mazoInexistente} no existe`);
    }
    const mazoAjeno = mazos.find((m) => Number(m.curso_id) !== Number(curso_id));
    if (mazoAjeno) {
      throw error(404, `El mazo ${mazoAjeno.id_mazo} no pertenece al curso ${curso_id}`);
    }

    // CA-3.1.1: exclusivamente tarjetas revisado_docente de los mazos elegidos.
    const poolAprobadas = await TarjetaRepository.listarAprobadasPorMazos(mazoIdsUnicos);
    // CA-3.1.2: con al menos 4 traducciones distintas toda tarjeta tiene 3 distractores posibles.
    const traduccionesDistintas = new Set(poolAprobadas.map((t) => normalizar(t.traduccion))).size;
    if (traduccionesDistintas < MIN_TRADUCCIONES_DISTINTAS) {
      throw error(
        400,
        `Se encontraron ${traduccionesDistintas} traducciones distintas entre las tarjetas revisado_docente de los mazos seleccionados; se requieren al menos ${MIN_TRADUCCIONES_DISTINTAS}.`
      );
    }

    // "Lógica: selección aleatoria de tarjetas" (HU-3.1) — si se pide una cantidad puntual de
    // preguntas, se toma una muestra aleatoria del pool; si no, se usan todas las aprobadas.
    const cantidad = cantidad_preguntas
      ? Math.min(Number(cantidad_preguntas), poolAprobadas.length)
      : poolAprobadas.length;
    const tarjetasSeleccionadas = barajar(poolAprobadas).slice(0, cantidad);

    const semana_corte = Math.max(...mazos.map((m) => m.semana));

    const datosPreguntas = tarjetasSeleccionadas.map((tarjeta, idx) =>
      construirPregunta(tarjeta, poolAprobadas, idx + 1)
    );

    // Quiz, quiz_mazo y pregunta_quiz se guardan en una sola transacción: si algo falla no queda
    // un quiz a medias en la base de datos.
    const { quiz, preguntas } = await QuizRepository.crearConMazosYPreguntas(
      {
        curso_id,
        titulo,
        semana_corte,
        fecha_creacion: new Date(),
        fecha_apertura,
        fecha_cierre,
        tiempo_limite_min,
        estado: 'programado',
      },
      mazoIdsUnicos,
      datosPreguntas
    );

    return { quiz: this.conEstadoEfectivo(quiz), preguntas };
  },

  /**
   * @brief HU-3.2 (CA-3.2.1, CA-3.2.2, CA-3.2.3): registra el envío de respuestas de un
   * estudiante para un quiz y calcula su calificación.
   * @param {number} quiz_id - Id del quiz que se está respondiendo.
   * @param {number} estudiante_id - id_usuario del estudiante autenticado (sale del JWT, no del
   * body).
   * @param {Object} datos
   * @param {Array<{pregunta_id:number, respuesta_estudiante:?string}>} datos.respuestas -
   * Respuestas marcadas por el estudiante; las preguntas ausentes del arreglo (o con valor
   * null, ej. por agotarse el tiempo — CA-3.2.1) se califican como incorrectas.
   * @param {number} [datos.tiempo_empleado_seg] - Segundos que tardó el estudiante.
   * @param {string} [datos.fecha_inicio] - Momento en que empezó a responder; si se omite, se
   * calcula restando tiempo_empleado_seg a la fecha de envío.
   * @return {Promise<{resultado:import('../models/ResultadoQuiz.js').ResultadoQuiz,
   * respuestas:import('../models/RespuestaQuiz.js').RespuestaQuiz[]}>} El resultado calculado
   * y el desglose de respuestas guardadas (CA-3.2.2).
   * @throws {Error} status 400 si falta respuestas, si el quiz todavía no abre o ya cerró
   * (según `calcularEstadoEfectivo`); status 403 si el estudiante no está inscrito en el curso
   * del quiz; status 404 si el quiz no existe o no tiene preguntas generadas; status 409 —con
   * `err.resultado` y `err.respuestas` adjuntos, el resumen del intento previo— si el
   * estudiante ya había enviado este quiz (CA-3.2.3).
   */
  async enviarRespuestas(quiz_id, estudiante_id, datos) {
    const { respuestas, tiempo_empleado_seg, fecha_inicio } = datos;

    if (!Array.isArray(respuestas)) {
      throw error(400, 'respuestas debe ser un arreglo de { pregunta_id, respuesta_estudiante }');
    }

    const quiz = await QuizRepository.obtenerPorId(quiz_id);
    if (!quiz) {
      throw error(404, 'Quiz no encontrado');
    }
    await verificarInscripcion(quiz, estudiante_id);

    const ahora = new Date();
    const estadoEfectivo = this.calcularEstadoEfectivo(quiz);
    if (estadoEfectivo === 'programado') {
      throw error(400, 'El quiz aún no está abierto (fecha_apertura no ha llegado)');
    }
    // CA-3.2.1: el autoenvío por fin de tiempo puede llegar unos segundos después de
    // fecha_cierre (latencia de red); se tolera un margen solo si el cierre es el derivado de la
    // fecha, no si alguien cerró el quiz manualmente.
    const dentroDeGraciaDeCierre =
      quiz.estado === 'programado' &&
      quiz.fecha_cierre &&
      ahora.getTime() <= new Date(quiz.fecha_cierre).getTime() + MARGEN_ENVIO_MS;
    if (estadoEfectivo === 'cerrado' && !dentroDeGraciaDeCierre) {
      throw error(400, 'El quiz ya cerró y no acepta más respuestas');
    }

    // CA-3.2.3: si ya finalizó y envió, se deniega el reintento y se muestra el resumen previo.
    const resultadoExistente = await ResultadoQuizRepository.obtenerPorQuizYEstudiante(quiz_id, estudiante_id);
    if (resultadoExistente) {
      throw await errorReintento(resultadoExistente);
    }

    const preguntas = await PreguntaQuizRepository.listarPorQuiz(quiz_id);
    if (preguntas.length === 0) {
      throw error(404, 'El quiz no tiene preguntas generadas todavía');
    }

    // CA-3.2.1: el temporizador vive en el frontend; aquí simplemente se califica lo que haya
    // llegado (las preguntas sin respuesta contestada a tiempo cuentan como incorrectas).
    let aciertos = 0;
    const detalle = preguntas.map((pregunta) => {
      const respuestaCliente = respuestas.find((r) => Number(r.pregunta_id) === pregunta.id_pregunta);
      const respuesta_estudiante = respuestaCliente?.respuesta_estudiante ?? null;
      const es_correcta = respuesta_estudiante !== null && respuesta_estudiante === pregunta.respuesta_correcta;
      if (es_correcta) aciertos += 1;
      return { pregunta_id: pregunta.id_pregunta, respuesta_estudiante, es_correcta };
    });

    const puntaje_maximo = preguntas.length;
    const puntaje_obtenido = aciertos;
    // NOTA (supuesto pendiente de validar con la docente): el backlog no especifica la escala
    // de "calificacion". Se usa 0.0-5.0 (convención académica colombiana estándar) hasta que se
    // confirme otra escala.
    const calificacion = Number(((puntaje_obtenido / puntaje_maximo) * 5).toFixed(2));

    const fecha_envio = ahora;
    const fecha_inicio_final = fecha_inicio
      ? new Date(fecha_inicio)
      : new Date(fecha_envio.getTime() - (Number(tiempo_empleado_seg) || 0) * 1000);

    // CA-3.2.1: control de tiempo del lado del servidor. Si el quiz tiene tiempo límite y el
    // cliente informa cuándo empezó (fecha_inicio) o cuánto tardó (tiempo_empleado_seg), se
    // rechaza el envío que exceda el límite más el margen de red. Un envío dentro del margen
    // (el autoenvío al agotarse el tiempo) se califica con lo contestado hasta el momento.
    // Limitación: fecha_inicio / tiempo_empleado_seg los informa el cliente; sin un registro de
    // inicio en servidor (el backlog solo documenta POST /quizzes/:id/submit) no se pueden
    // verificar de forma inviolable. Supuesto pendiente de validar con el equipo.
    let tiempoEmpleadoFinal = tiempo_empleado_seg ?? null;
    if (quiz.tiempo_limite_min && (fecha_inicio || tiempo_empleado_seg != null)) {
      const limiteMs = quiz.tiempo_limite_min * 60 * 1000;
      const transcurridoMs = fecha_envio.getTime() - fecha_inicio_final.getTime();
      if (transcurridoMs > limiteMs + MARGEN_ENVIO_MS) {
        throw error(400, `Se agotó el tiempo límite de ${quiz.tiempo_limite_min} minutos; el envío fue rechazado`);
      }
      tiempoEmpleadoFinal = Math.min(Math.round(transcurridoMs / 1000), quiz.tiempo_limite_min * 60);
    }

    // resultado_quiz y respuesta_quiz se guardan en una sola transacción: si algo falla no queda
    // un resultado sin desglose que bloquee al estudiante con un 409 (CA-3.2.3).
    try {
      return await ResultadoQuizRepository.crearConRespuestas(
        {
          quiz_id,
          estudiante_id,
          fecha_inicio: fecha_inicio_final,
          fecha_envio,
          puntaje_obtenido,
          puntaje_maximo,
          calificacion,
          tiempo_empleado_seg: tiempoEmpleadoFinal,
        },
        detalle.map((item) => ({ ...item, puntaje_obtenido: item.es_correcta ? 1 : 0 }))
      );
    } catch (err) {
      // CA-3.2.3: dos envíos simultáneos pasan ambos la verificación de arriba; el segundo choca
      // con el índice único (quiz_id, estudiante_id) del DER (23505) y se responde 409 con el
      // resumen del primero, igual que un reintento normal.
      if (err.code === '23505') {
        const resultadoPrevio = await ResultadoQuizRepository.obtenerPorQuizYEstudiante(quiz_id, estudiante_id);
        if (resultadoPrevio) {
          throw await errorReintento(resultadoPrevio);
        }
      }
      throw err;
    }
  },

  /**
   * @brief HU-3.2: devuelve las preguntas de un quiz para que el estudiante lo responda, SIN
   * `respuesta_correcta` ni `tarjeta_id` (con la tarjeta se podría consultar la traducción).
   * @note Endpoint adicional aprobado por el equipo (GET /api/v1/quizzes/:id/preguntas): el
   * backlog solo lista POST /quizzes/:id/submit, pero sin este no hay forma de pintar el
   * formulario sin exponer la clave de respuestas.
   * @param {number} quiz_id - Id del quiz.
   * @param {number} estudiante_id - id_usuario del estudiante autenticado (sale del JWT).
   * @return {Promise<{quiz:Object, preguntas:Object[]}>} El quiz (con `estado_efectivo`) y sus
   * preguntas: { id_pregunta, tipo_pregunta, enunciado, opcion_a..d, orden }.
   * @throws {Error} status 404 si el quiz no existe o no tiene preguntas; status 403 si el
   * estudiante no está inscrito en el curso del quiz; status 400 si el quiz no está abierto
   * (para no revelar las preguntas antes de fecha_apertura ni después de fecha_cierre).
   */
  async obtenerPreguntasParaEstudiante(quiz_id, estudiante_id) {
    const quiz = await QuizRepository.obtenerPorId(quiz_id);
    if (!quiz) {
      throw error(404, 'Quiz no encontrado');
    }
    await verificarInscripcion(quiz, estudiante_id);

    const estadoEfectivo = this.calcularEstadoEfectivo(quiz);
    if (estadoEfectivo === 'programado') {
      throw error(400, 'El quiz aún no está abierto (fecha_apertura no ha llegado)');
    }
    if (estadoEfectivo === 'cerrado') {
      throw error(400, 'El quiz ya cerró y no acepta más respuestas');
    }

    const preguntas = await PreguntaQuizRepository.listarPorQuiz(quiz_id);
    if (preguntas.length === 0) {
      throw error(404, 'El quiz no tiene preguntas generadas todavía');
    }

    return {
      quiz: this.conEstadoEfectivo(quiz),
      preguntas: preguntas.map(
        ({ id_pregunta, tipo_pregunta, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, orden }) => ({
          id_pregunta,
          tipo_pregunta,
          enunciado,
          opcion_a,
          opcion_b,
          opcion_c,
          opcion_d,
          orden,
        })
      ),
    };
  },
};
