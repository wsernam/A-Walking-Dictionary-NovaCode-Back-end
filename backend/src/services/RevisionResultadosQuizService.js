import { ResultadoQuizRepository } from '../repositories/ResultadoQuizRepository.js';
import { RespuestaQuizRepository } from '../repositories/RespuestaQuizRepository.js';
import { PreguntaQuizRepository } from '../repositories/PreguntaQuizRepository.js';
import { RevisionResultadosQuizRepository as Repository }
  from '../repositories/RevisionResultadosQuizRepository.js';
import { errorApi } from '../utils/codigosError.js';

/**
 * @file RevisionResultadosQuizService.js
 * @brief HU-022: lógica de resultados y estadísticas docentes.
 */



export const RevisionResultadosQuizService = {
  async consultarResumen(quizId) {
    const quiz = await Repository.obtenerQuiz(quizId);

    if (!quiz) {
      throw errorApi(
        404,
        'QUIZ_NOT_FOUND',
        'Quiz no encontrado'
      );
    }

 

    const [filas, preguntas] = await Promise.all([
      Repository.listarResultados(quizId, quiz.curso_id),
      Repository.obtenerDificultadPreguntas(quizId),
    ]);

    const presentados = filas.filter(
      (fila) => fila.id_resultado !== null
    );

    const notas = presentados.map(
      (fila) => Number(fila.calificacion)
    );

    const promedio = notas.length
      ? Number((
          notas.reduce((suma, nota) => suma + nota, 0)
          / notas.length
        ).toFixed(2))
      : null;

    const totalInscritos = filas.length;

    const estadisticas = {
      total_inscritos: totalInscritos,
      participantes: presentados.length,
      no_presentaron: totalInscritos - presentados.length,
      porcentaje_participacion: totalInscritos
        ? Number((
            presentados.length / totalInscritos * 100
          ).toFixed(2))
        : 0,
      promedio,
      nota_maxima: notas.length ? Math.max(...notas) : null,
      nota_minima: notas.length ? Math.min(...notas) : null,
    };

    const resultados = filas.map((fila) => ({
      ...fila,
      presento: fila.id_resultado !== null,
      respuestas_correctas: fila.id_resultado !== null
        ? Number(fila.puntaje_obtenido)
        : null,
      respuestas_incorrectas: fila.id_resultado !== null
        ? Number(fila.puntaje_maximo)
          - Number(fila.puntaje_obtenido)
        : null,
    }));

    const dificultad_preguntas = preguntas
      .map((pregunta) => ({
        ...pregunta,
        porcentaje_error: pregunta.total_respuestas
          ? Number((
              pregunta.respuestas_incorrectas
              / pregunta.total_respuestas * 100
            ).toFixed(2))
          : null,
      }))
      .sort((a, b) =>
        (b.porcentaje_error ?? -1)
        - (a.porcentaje_error ?? -1)
      );

    return {
      quiz: {
        id_quiz: quiz.id_quiz,
        titulo: quiz.titulo,
        nombre_curso: quiz.nombre_curso,
      },
      estadisticas,
      resultados,
      dificultad_preguntas,
    };
  },


/**
 * @brief HU-022 (CA-22.3): consulta las respuestas de un
 * estudiante para un quiz determinado.
 *
 * Solo lectura. La autorización docente se realiza
 * en la ruta mediante authenticate y requireRole.
 */
async consultarRespuestas(quizId, resultadoId) {
  // 1. Comprobar que el quiz exista.
  const quiz = await Repository.obtenerQuiz(quizId);

  if (!quiz) {
    throw errorApi(
      404,
      'QUIZ_NOT_FOUND',
      'Quiz no encontrado'
    );
  }

  // 2. Consultar el resultado registrado.
  const resultado =
    await ResultadoQuizRepository.obtenerPorId(resultadoId);

  // 3. Verificar que el resultado pertenezca al quiz.
  if (
    !resultado ||
    Number(resultado.quiz_id) !== Number(quizId)
  ) {
    throw errorApi(
      404,
      'QUIZ_RESULT_NOT_FOUND',
      'Resultado no encontrado para este quiz'
    );
  }

  // 4. Obtener respuestas y preguntas existentes.
  const [respuestas, preguntas] = await Promise.all([
    RespuestaQuizRepository.listarPorResultado(resultadoId),
    PreguntaQuizRepository.listarPorQuiz(quizId),
  ]);

  // 5. Asociar cada pregunta con la respuesta del estudiante.
  const detalle = preguntas.map((pregunta) => {
    const respuesta = respuestas.find(
      (item) =>
        Number(item.pregunta_id) ===
        Number(pregunta.id_pregunta)
    );

    return {
      id_pregunta: pregunta.id_pregunta,
      orden: pregunta.orden,
      enunciado: pregunta.enunciado,
      opciones: {
        a: pregunta.opcion_a,
        b: pregunta.opcion_b,
        c: pregunta.opcion_c,
        d: pregunta.opcion_d,
      },
      respuesta_estudiante:
        respuesta?.respuesta_estudiante ?? null,
      respuesta_correcta: pregunta.respuesta_correcta,
      es_correcta: respuesta?.es_correcta ?? false,
      puntaje_obtenido: respuesta?.puntaje_obtenido ?? 0,
    };
  });

  // 6. Ordenar las preguntas.
  detalle.sort(
    (a, b) => Number(a.orden) - Number(b.orden)
  );

  // 7. Devolver los datos sin modificarlos.
  return {
    quiz: {
      id_quiz: quiz.id_quiz,
      titulo: quiz.titulo,
    },
    resultado: {
      id_resultado: resultado.id_resultado,
      estudiante_id: resultado.estudiante_id,
      puntaje_obtenido: resultado.puntaje_obtenido,
      puntaje_maximo: resultado.puntaje_maximo,
      calificacion: resultado.calificacion,
      tiempo_empleado_seg: resultado.tiempo_empleado_seg,
      fecha_envio: resultado.fecha_envio,
    },
    preguntas: detalle,
  };
},

};
