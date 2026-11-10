/**
 * @file ReporteProgresoService.js
 * @brief HU-018: reúne los datos del reporte de progreso individual y aplica la regla de acceso.
 *
 * Endpoint relacionado: GET /api/v1/reports/students/:id/progress/export-pdf.
 * Reglas de acceso (CA-18.3; mismo criterio que HU-019, S5 y S6 aceptados por el equipo):
 *   - docente: puede pedir a cualquier estudiante inscrito en SUS cursos (curso.docente_id = su
 *     id_usuario). Si el estudiante no existe o no pertenece a sus cursos se responde 404
 *     (supuesto pendiente de validar, igual que en HU-019).
 *   - estudiante: solo su propio reporte. Con el id de otro usuario se responde 403 y no se
 *     consulta la BD ni se genera nada.
 *   - cualquier otro rol (Invitado, etc.): 403.
 *
 * Supuestos de esta HU (pendientes de validar con el equipo):
 *   - "Palabras aportadas" son los aportes tipo_aporte = 'creada'; se cuentan por el estado de su
 *     tarjeta (pendiente_revision, revisado_docente, rechazada). Hoy el rechazo no existe en el
 *     código (ver CLAUDE.md, HE-02), así que "rechazada" saldrá en 0 hasta que se implemente.
 *   - "Coautorías" son los aportes tipo_aporte IN ('coautoria', 'acepcion_nueva'), el mismo
 *     criterio de AnaliticaRepository (HU-2.3).
 *   - La nota promedio es el promedio simple de resultado_quiz.calificacion (escala 0-5,
 *     QuizService) de los quices enviados.
 */

import { ReporteProgresoRepository } from '../repositories/ReporteProgresoRepository.js';
import { authDeshabilitado } from '../middleware/autenticacionMiddleware.js';
import { errorApi } from '../utils/codigosError.js';

/** @brief Estados de tarjeta que el reporte desglosa (CA-18.1). */
const ESTADOS_PALABRA = ['pendiente_revision', 'revisado_docente', 'rechazada'];
/** @brief Tipos de aporte que cuentan como coautoría (mismo criterio que AnaliticaRepository). */
const TIPOS_COAUTORIA = ['coautoria', 'acepcion_nueva'];

/**
 * @brief Convierte el parámetro :id de la ruta en número.
 * @throws {Error} 400 INVALID_ID si no es un entero positivo.
 */
function leerIdEstudiante(valor) {
  const id = Number(valor);
  if (valor === undefined || valor === null || valor === '' || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw errorApi(400, 'INVALID_ID', 'id de estudiante inválido');
  }
  return id;
}

/** @brief Promedio simple redondeado a 2 decimales, o null si no hay valores. */
function promediar(valores) {
  if (valores.length === 0) return null;
  const suma = valores.reduce((total, valor) => total + valor, 0);
  return Number((suma / valores.length).toFixed(2));
}

export const ReporteProgresoService = {
  /**
   * @brief CA-18.1, CA-18.2 y CA-18.3: devuelve los datos del reporte según el rol del JWT.
   * @param {{ id_usuario: number, rol: string }} usuario - Payload del JWT (req.usuario).
   * @param {string|number} idEstudiante - Valor de :id en la ruta.
   * @return {Promise<Object>} { generado_en, estudiante, palabras, quices, repaso }. Los quices y
   * el repaso vacíos no son un error: el PDF los muestra como "Sin actividad registrada".
   * @throws {Error} 400 (id inválido), 403 (sin permiso), 404 (estudiante no visible).
   */
  async obtenerDatos(usuario, idEstudiante) {
    const estudianteId = leerIdEstudiante(idEstudiante);
    const idUsuario = Number(usuario.id_usuario);

    let docenteId;
    if (usuario.rol === 'docente') {
      // Con DISABLE_AUTH (solo desarrollo local) no hay usuario real: se omite el alcance por docente.
      docenteId = authDeshabilitado() ? null : idUsuario;
    } else if (usuario.rol === 'estudiante') {
      if (estudianteId !== idUsuario) {
        throw errorApi(403, 'REPORT_FORBIDDEN', 'No tiene permisos para ver el reporte de otro estudiante');
      }
      docenteId = null;
    } else {
      throw errorApi(403, 'REPORT_FORBIDDEN', 'No tiene permisos para descargar este reporte');
    }

    const filtros = { estudianteId, docenteId };
    const estudiante = await ReporteProgresoRepository.obtenerEstudiante(filtros);
    if (!estudiante) {
      throw errorApi(404, 'REPORT_STUDENT_NOT_FOUND', 'Estudiante no encontrado');
    }

    const [aportes, resultados, repaso] = await Promise.all([
      ReporteProgresoRepository.listarAportes(filtros),
      ReporteProgresoRepository.listarResultadosQuiz(filtros),
      ReporteProgresoRepository.resumenRepaso(filtros),
    ]);

    const creadas = aportes.filter((aporte) => aporte.tipo_aporte === 'creada');
    const porEstado = Object.fromEntries(
      ESTADOS_PALABRA.map((estado) => [estado, creadas.filter((a) => a.estado_tarjeta === estado).length])
    );

    const quices = resultados.map((fila) => ({
      id_quiz: fila.id_quiz,
      titulo: fila.titulo,
      fecha_envio: fila.fecha_envio,
      calificacion: Number(fila.calificacion),
      puntaje_obtenido: Number(fila.puntaje_obtenido),
      puntaje_maximo: Number(fila.puntaje_maximo),
    }));

    return {
      generado_en: new Date(),
      estudiante: {
        estudiante_id: estudiante.estudiante_id,
        nombre_completo: estudiante.nombre_completo,
        email: estudiante.email,
        codigo_estudiantil: estudiante.codigo_estudiantil,
        nivel_ingles: estudiante.nivel_ingles,
        cursos: estudiante.cursos,
      },
      palabras: {
        total: creadas.length,
        por_estado: porEstado,
        coautorias: aportes.filter((aporte) => TIPOS_COAUTORIA.includes(aporte.tipo_aporte)).length,
        listado: creadas.map((aporte) => ({
          palabra: aporte.palabra,
          traduccion: aporte.traduccion_aportada,
          estado: aporte.estado_tarjeta,
          semana: aporte.semana,
          fecha_aporte: aporte.fecha_aporte,
        })),
      },
      quices: {
        presentados: quices.length,
        promedio: promediar(quices.map((quiz) => quiz.calificacion)),
        listado: quices,
      },
      repaso: {
        tarjetas_repasadas: Number(repaso.tarjetas_repasadas),
        fecha_ultimo_repaso: repaso.fecha_ultimo_repaso,
      },
    };
  },
};
