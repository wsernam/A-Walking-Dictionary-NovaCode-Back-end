/**
 * @file ReporteResultadosQuizService.js
 * @brief HU-021: reúne los datos del reporte de resultados de un quiz y aplica el control de acceso.
 *
 * Endpoint relacionado: GET /api/v1/reports/quizzes/:id/results/export-pdf
 * Supuestos aceptados por el equipo (ver CLAUDE.md, "Decisiones del equipo"):
 *   - S1: el quiz debe ser de un curso de la docente que inicia sesión (403 si no).
 *   - S2: cuentan los inscritos 'activa' y los no activos que tengan resultado.
 *   - S3: la calificación se muestra tal cual (0-5), convertida con Number() (pg entrega DECIMAL como string).
 *   - S4: se muestran las 5 preguntas con mayor % de error, desempate por pregunta_quiz.orden.
 *   - S5: una pregunta sin fila en respuesta_quiz no cuenta como error.
 *   - S6: el % que presentó se calcula sobre todas las filas listadas.
 */

import { ReporteResultadosQuizRepository } from '../repositories/ReporteResultadosQuizRepository.js';
import { authDeshabilitado } from '../middleware/autenticacionMiddleware.js';
import { errorApi } from '../utils/codigosError.js';

/** @brief Cantidad de preguntas con mayor porcentaje de error que se muestran (S4). */
const PREGUNTAS_CON_MAS_ERROR = 5;

/** @brief Convierte un DECIMAL/INT de pg (string) en número, respetando null. */
const aNumero = (valor) => (valor === null || valor === undefined ? null : Number(valor));

/**
 * @brief Convierte el parámetro :id en número.
 * @throws {Error} 400 INVALID_ID si no es un entero positivo.
 */
function leerIdQuiz(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorApi(400, 'INVALID_ID', 'id inválido');
  }
  return id;
}

export const ReporteResultadosQuizService = {
  /**
   * @brief CA-21.1, CA-21.2 y CA-21.3: devuelve los datos del reporte de un quiz.
   * @param {{ id_usuario: number, rol: string }} usuario - Payload del JWT (req.usuario).
   * @param {string|number} idQuiz - Valor de :id.
   * @return {Promise<Object>} { generado_en, quiz, estudiantes, estadisticas, preguntas_con_error }.
   * estadisticas es null si nadie presentó el quiz (no es error, CA-21.2).
   * @throws {Error} 400 INVALID_ID, 403 AUTH_FORBIDDEN (CA-21.3), 404 QUIZ_NOT_FOUND.
   */
  async obtenerDatos(usuario, idQuiz) {
    // CA-21.3: defensa en profundidad (la ruta ya exige requireRole('docente')).
    if (usuario.rol !== 'docente') {
      throw errorApi(403, 'AUTH_FORBIDDEN', 'No tiene permisos para acceder a este recurso');
    }
    const id = leerIdQuiz(idQuiz);

    const quiz = await ReporteResultadosQuizRepository.obtenerQuiz(id);
    if (!quiz) {
      throw errorApi(404, 'QUIZ_NOT_FOUND', 'Quiz no encontrado');
    }

    // S1. Con DISABLE_AUTH (solo desarrollo local) no hay usuario real: se omite, como en HU-019.
    if (!authDeshabilitado() && Number(quiz.docente_id) !== Number(usuario.id_usuario)) {
      throw errorApi(403, 'AUTH_FORBIDDEN', 'No tiene permisos para acceder a este recurso');
    }

    const [filas, preguntas] = await Promise.all([
      ReporteResultadosQuizRepository.resultadosPorEstudiante(id, quiz.curso_id),
      ReporteResultadosQuizRepository.preguntasConMasError(id, PREGUNTAS_CON_MAS_ERROR),
    ]);

    // CA-21.1: sin fila en resultado_quiz (id_resultado = null) => "No presentó".
    const estudiantes = filas.map((f) => {
      const presento = f.id_resultado !== null;
      return {
        estudiante_id: f.estudiante_id,
        nombre_completo: f.nombre_completo,
        presento,
        calificacion: presento ? aNumero(f.calificacion) : null,
        puntaje_obtenido: presento ? aNumero(f.puntaje_obtenido) : null,
        puntaje_maximo: presento ? aNumero(f.puntaje_maximo) : null,
        tiempo_empleado_seg: presento ? aNumero(f.tiempo_empleado_seg) : null,
        fecha_envio: presento ? f.fecha_envio : null,
      };
    });

    // CA-21.2: las estadísticas usan solo a quienes presentaron.
    const presentaron = estudiantes.filter((e) => e.presento).length;
    let estadisticas = null;
    if (presentaron > 0) {
      const notas = estudiantes.map((e) => e.calificacion).filter((n) => n !== null);
      estadisticas = {
        promedio: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
        maxima: notas.length ? Math.max(...notas) : null,
        minima: notas.length ? Math.min(...notas) : null,
        presentaron,
        total: estudiantes.length,
        porcentaje_presentaron: (presentaron / estudiantes.length) * 100, // S6
      };
    }

    return {
      generado_en: new Date(),
      quiz: {
        id_quiz: quiz.id_quiz,
        titulo: quiz.titulo,
        semana_corte: quiz.semana_corte,
        fecha_apertura: quiz.fecha_apertura,
        fecha_cierre: quiz.fecha_cierre,
        curso_nombre: quiz.curso_nombre,
      },
      estudiantes,
      estadisticas,
      preguntas_con_error: preguntas.map((p) => ({
        enunciado: p.enunciado,
        incorrectas: p.incorrectas,
        total_respuestas: p.total_respuestas,
        porcentaje_error: (p.incorrectas / p.total_respuestas) * 100,
      })),
    };
  },
};