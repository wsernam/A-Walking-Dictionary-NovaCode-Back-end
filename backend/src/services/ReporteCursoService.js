/**
 * @file ReporteCursoService.js
 * @brief HU-020: reúne los datos del reporte de estudiantes del curso y aplica la regla de acceso.
 *
 * Endpoint relacionado: GET /api/v1/reports/students/export-pdf?curso_id=. El parámetro curso_id
 * es el que propone el contrato del front (docs/contrato-reporte-curso.md): la ruta del backlog no
 * dice de qué curso es el reporte y una docente puede tener varios.
 *
 * Reglas de acceso (CA-20.3):
 *   - solo el rol docente (la ruta ya lo exige con requireRole; aquí se vuelve a comprobar para
 *     que el servicio sea seguro aunque se use desde otro lugar). Cualquier otro rol: 403.
 *   - el curso debe ser de la docente del JWT (curso.docente_id = su id_usuario). Si es de otra
 *     docente se responde 403, como pide el contrato del front, y no se consulta nada más.
 *   - si el curso no existe: 404 COURSE_NOT_FOUND.
 *
 * Supuestos de esta HU (pendientes de validar con el equipo; los números 2 a 5 son los del
 * contrato del front):
 *   - "Palabras añadidas" son los aportes tipo_aporte = 'creada' del estudiante en el curso.
 *   - "Palabras aprobadas" son, de esas, las que tienen tarjeta.estado = 'revisado_docente'.
 *   - "Repetidas" (campo `coautorias`; con las coautorías desactivadas ya no son coautorías)
 *     son los aportes tipo_aporte IN ('coautoria', 'acepcion_nueva'), el mismo
 *     criterio de HU-018 y de AnaliticaRepository (el contrato del front proponía solo
 *     'coautoria' y dejaba la duda abierta).
 *   - Los quices que no presentó el estudiante se marcan "No presentó" y NO cuentan como 0 en su
 *     promedio; el promedio es simple sobre los quices presentados (calificación 0-5, QuizService).
 *   - Solo se listan los quices del curso que ya abrieron: uno programado a futuro no se puede
 *     presentar.
 */

import { ReporteCursoRepository } from '../repositories/ReporteCursoRepository.js';
import { errorApi } from '../utils/codigosError.js';

/**
 * @brief Mensaje del 403. Es el mismo que usa requireRole: el front reconoce el caso por el texto
 * (clasificarErrorExportacion), así que no debe cambiar.
 */
const MENSAJE_SIN_PERMISO = 'No tiene permisos para acceder a este recurso';

/**
 * @brief Convierte el parámetro curso_id de la query en número.
 * @throws {Error} 400 INVALID_ID si falta o no es un entero positivo.
 */
function leerCursoId(valor) {
  const id = Number(valor);
  if (valor === undefined || valor === null || valor === '' || !Number.isInteger(id) || id <= 0) {
    throw errorApi(400, 'INVALID_ID', 'id inválido');
  }
  return id;
}

/** @brief Promedio simple redondeado a 2 decimales, o null si no hay valores. */
function promediar(valores) {
  if (valores.length === 0) return null;
  const suma = valores.reduce((total, valor) => total + valor, 0);
  return Number((suma / valores.length).toFixed(2));
}

export const ReporteCursoService = {
  /**
   * @brief CA-20.1, CA-20.2 y CA-20.3: devuelve los datos del reporte del curso.
   * @param {{ id_usuario: number, rol: string }} usuario - Payload del JWT (req.usuario).
   * @param {string|number|undefined} cursoId - Valor de ?curso_id.
   * @return {Promise<Object>} { generado_en, curso, estudiantes, totales, quices }. Un curso sin
   * estudiantes o sin quices no es un error: el PDF lo indica con un aviso.
   * @throws {Error} 400 (curso_id inválido), 403 (sin permiso o curso de otra docente), 404
   * (el curso no existe).
   */
  async obtenerDatos(usuario, cursoId) {
    if (usuario.rol !== 'docente') {
      throw errorApi(403, 'REPORT_FORBIDDEN', MENSAJE_SIN_PERMISO);
    }
    const id = leerCursoId(cursoId);

    const curso = await ReporteCursoRepository.obtenerCurso(id);
    if (!curso) {
      throw errorApi(404, 'COURSE_NOT_FOUND', 'Curso no encontrado');
    }
    
    const [filasEstudiantes, filasQuices, filasCalificaciones] = await Promise.all([
      ReporteCursoRepository.listarEstudiantes(id),
      ReporteCursoRepository.listarQuices(id),
      ReporteCursoRepository.listarCalificaciones(id),
    ]);

    // Calificación de cada estudiante en cada quiz: "idQuiz:idEstudiante" -> número.
    const calificaciones = new Map(
      filasCalificaciones.map((fila) => [`${fila.quiz_id}:${fila.estudiante_id}`, Number(fila.calificacion)])
    );

    const estudiantes = filasEstudiantes.map((fila) => {
      // null significa "No presentó" (CA-20.2).
      const notas = filasQuices.map((quiz) => calificaciones.get(`${quiz.id_quiz}:${fila.estudiante_id}`) ?? null);
      return {
        estudiante_id: fila.estudiante_id,
        nombre_completo: fila.nombre_completo,
        codigo_estudiantil: fila.codigo_estudiantil,
        nivel_ingles: fila.nivel_ingles,
        palabras_anadidas: Number(fila.palabras_anadidas),
        palabras_aprobadas: Number(fila.palabras_aprobadas),
        coautorias: Number(fila.coautorias),
        notas,
        promedio: promediar(notas.filter((nota) => nota !== null)),
      };
    });

    return {
      generado_en: new Date(),
      curso: { id_curso: curso.id_curso, nombre: curso.nombre },
      estudiantes,
      totales: {
        estudiantes: estudiantes.length,
        palabras_anadidas: estudiantes.reduce((suma, e) => suma + e.palabras_anadidas, 0),
        palabras_aprobadas: estudiantes.reduce((suma, e) => suma + e.palabras_aprobadas, 0),
        coautorias: estudiantes.reduce((suma, e) => suma + e.coautorias, 0),
      },
      quices: filasQuices.map((quiz) => ({ id_quiz: quiz.id_quiz, titulo: quiz.titulo })),
    };
  },
};
