/**
 * @file ReporteEstudioService.js
 * @brief HU-019: reúne los datos del reporte del modo de estudio y aplica la regla de acceso.
 *
 * Endpoint relacionado: GET /api/v1/reports/study-mode/export-pdf (parámetro opcional student_id).
 * Reglas de acceso (CA-19.3, supuestos S5 y S6 aceptados por el equipo):
 *   - docente: ve a los estudiantes inscritos en SUS cursos (curso.docente_id = su id_usuario).
 *     Sin student_id recibe a todos; con student_id solo a ese estudiante, y si no pertenece a
 *     sus cursos se responde 404 como si no existiera (recomendación pendiente de validar).
 *   - estudiante: solo su propio repaso. Sin student_id recibe el suyo; con el student_id de otro
 *     usuario se responde 403 y no se genera nada.
 *   - cualquier otro rol (Invitado, etc.): 403.
 *
 * @note Limitación aceptada (S1): progreso_estudio solo guarda la ÚLTIMA valoración de cada
 * tarjeta, así que la "distribución de valoraciones" cuenta la última valoración por tarjeta, no
 * todos los repasos históricos.
 */

import { ReporteEstudioRepository } from '../repositories/ReporteEstudioRepository.js';
import { authDeshabilitado } from '../middleware/autenticacionMiddleware.js';
import { errorApi } from '../utils/codigosError.js';

/** @brief Cantidad de palabras difíciles por estudiante (S7/S8). */
const PALABRAS_DIFICILES_POR_ESTUDIANTE = 10;

/**
 * @brief Convierte el parámetro student_id de la query en número, o null si no vino.
 * @throws {Error} 400 INVALID_ID si viene pero no es un entero positivo.
 */
function leerStudentId(studentId) {
  if (studentId === undefined || studentId === null || studentId === '') return null;
  const id = Number(studentId);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorApi(400, 'INVALID_ID', 'student_id inválido');
  }
  return id;
}

export const ReporteEstudioService = {
  /**
   * @brief CA-19.1, CA-19.2 y CA-19.3: devuelve los datos del reporte según el rol del JWT.
   * @param {{ id_usuario: number, rol: string }} usuario - Payload del JWT (req.usuario).
   * @param {string|number|undefined} studentId - Valor opcional de ?student_id.
   * @return {Promise<{ generado_en: Date, estudiantes: Object[] }>} Una entrada por inscripción
   * activa, con sin_actividad = true cuando no tiene repasos.
   * @throws {Error} 400 (student_id inválido), 403 (sin permiso), 404 (estudiante no visible).
   */
  async obtenerDatos(usuario, studentId) {
    const estudianteSolicitado = leerStudentId(studentId);
    const idUsuario = Number(usuario.id_usuario);

    let filtros;
    if (usuario.rol === 'docente') {
      // Con DISABLE_AUTH (solo desarrollo local) no hay usuario real: se omite el alcance por docente.
      filtros = {
        docenteId: authDeshabilitado() ? null : idUsuario,
        estudianteId: estudianteSolicitado,
      };
    } else if (usuario.rol === 'estudiante') {
      if (estudianteSolicitado !== null && estudianteSolicitado !== idUsuario) {
        throw errorApi(403, 'REPORT_FORBIDDEN', 'No tiene permisos para ver el reporte de otro estudiante');
      }
      filtros = { docenteId: null, estudianteId: idUsuario };
    } else {
      throw errorApi(403, 'REPORT_FORBIDDEN', 'No tiene permisos para descargar este reporte');
    }

    const [resumen, dificiles] = await Promise.all([
      ReporteEstudioRepository.resumenPorInscripcion(filtros),
      ReporteEstudioRepository.palabrasDificiles({
        ...filtros,
        limite: PALABRAS_DIFICILES_POR_ESTUDIANTE,
      }),
    ]);

    if (usuario.rol === 'docente' && estudianteSolicitado !== null && resumen.length === 0) {
        throw errorApi(404, 'REPORT_STUDENT_NOT_FOUND', 'Estudiante no encontrado');
    }

    const dificilesPorInscripcion = new Map();
    for (const fila of dificiles) {
      const lista = dificilesPorInscripcion.get(fila.inscripcion_id) ?? [];
      lista.push({
        palabra: fila.palabra,
        factor_facilidad: Number(fila.factor_facilidad),
        ultima_valoracion: fila.ultima_valoracion,
        fecha_proximo_repaso: fila.fecha_proximo_repaso,
      });
      dificilesPorInscripcion.set(fila.inscripcion_id, lista);
    }

    return {
      generado_en: new Date(),
      estudiantes: resumen.map((fila) => ({
        id_inscripcion: fila.id_inscripcion,
        estudiante_id: fila.estudiante_id,
        nombre_completo: fila.nombre_completo,
        email: fila.email,
        curso_id: fila.id_curso,
        curso_nombre: fila.curso_nombre,
        tarjetas_repasadas: fila.tarjetas_repasadas,
        fecha_ultimo_repaso: fila.fecha_ultimo_repaso,
        valoraciones: {
          repetir: fila.repetir,
          dificil: fila.dificil,
          buena: fila.buena,
          facil: fila.facil,
        },
        vencidas: fila.vencidas,
        sin_actividad: fila.tarjetas_repasadas === 0,
        palabras_dificiles: dificilesPorInscripcion.get(fila.id_inscripcion) ?? [],
      })),
    };
  },
};