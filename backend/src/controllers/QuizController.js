/**
 * @file QuizController.js
 * @brief Controlador REST de Quiz. Los métodos `generar` y `exportarPdf` implementan la lógica
 * de negocio de HE-03 (HU-3.1, HU-3.3) delegando en QuizService/ExportarPDFService; el resto
 * (`crear`, `obtenerPorId`, `listar`, `actualizar`, `eliminar`) es CRUD genérico que llama
 * directamente al repositorio (QuizRepository), en el mismo patrón que el resto de
 * controladores del proyecto.
 */

import { QuizRepository } from '../repositories/QuizRepository.js';
import { QuizService } from '../services/QuizService.js';
import { ExportarPDFService } from '../services/ExportarPDFService.js';
import { esEnteroEnRango, esFechaValida, esIdValido, leerIdRuta } from '../utils/validacion.js';

/** @brief SQLSTATE de PostgreSQL para una foreign key violada (foreign_key_violation). */
const PG_FOREIGN_KEY_VIOLATION = '23503';

/**
 * @brief Valida el body de POST y PUT /quizzes (CRUD genérico) contra las columnas de "quiz" del
 * DER, para que un dato inválido responda 400 en vez de llegar a PostgreSQL y salir como 500.
 *
 * Obligatorios (NOT NULL): curso_id, titulo (varchar 200), semana_corte, estado (varchar 30).
 * Opcionales (nullable): fecha_apertura, fecha_cierre (fecha ISO 8601) y tiempo_limite_min
 * (entero positivo).
 * @param {Object} body - req.body.
 * @return {{ status: number, error: string, code: string } | null} El error a responder, o null
 * si el body es válido.
 */
function validarDatosQuiz(body) {
  const { curso_id, titulo, semana_corte, estado, fecha_apertura, fecha_cierre, tiempo_limite_min } = body;
  const vacio = (valor) => valor === undefined || valor === null || valor === '';
  // Opcionales: null u omitido = sin valor. "" NO es una fecha ni un entero (el contrato pide
  // date-time/integer o null), así que responde 400 en vez de guardarse como null.
  const ausente = (valor) => valor === undefined || valor === null;

  const camposFaltantes = ['curso_id', 'titulo', 'semana_corte', 'estado'].filter((campo) => vacio(body[campo]));
  if (camposFaltantes.length > 0) {
    return {
      status: 400,
      error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
      code: 'REQUIRED_FIELDS_MISSING',
    };
  }
  if (typeof titulo !== 'string' || typeof estado !== 'string') {
    return { status: 400, error: 'titulo y estado deben ser cadenas de texto', code: 'INVALID_FIELD_TYPE' };
  }

  // Longitud máxima según el DER: titulo varchar(200), estado varchar(30).
  const erroresLongitud = [];
  if (titulo.length > 200) {
    erroresLongitud.push(`El campo titulo no puede superar 200 caracteres (tiene ${titulo.length} caracteres).`);
  }
  if (estado.length > 30) {
    erroresLongitud.push(`El campo estado no puede superar 30 caracteres (tiene ${estado.length} caracteres).`);
  }
  if (erroresLongitud.length > 0) {
    return { status: 400, error: erroresLongitud.join(' '), code: 'FIELD_TOO_LONG' };
  }

  if (!esIdValido(curso_id)) {
    return { status: 400, error: 'curso_id debe ser un entero positivo valido', code: 'INVALID_ID' };
  }
  if (!esEnteroEnRango(semana_corte)) {
    return { status: 400, error: 'semana_corte debe ser un entero positivo valido', code: 'INVALID_FIELD_TYPE' };
  }
  if (!ausente(tiempo_limite_min) && !esEnteroEnRango(tiempo_limite_min)) {
    return { status: 400, error: 'tiempo_limite_min debe ser un entero positivo valido', code: 'INVALID_FIELD_TYPE' };
  }
  if ((!ausente(fecha_apertura) && !esFechaValida(fecha_apertura)) || (!ausente(fecha_cierre) && !esFechaValida(fecha_cierre))) {
    return {
      status: 400,
      error: 'fecha_apertura y fecha_cierre deben ser fechas ISO 8601 validas',
      code: 'INVALID_FIELD_TYPE',
    };
  }
  return null;
}

/**
 * @brief Arma los datos que se guardan: descarta fecha_creacion del cliente (la asigna la base de
 * datos) y deja en null las fechas y el tiempo límite que no llegaron.
 * @param {Object} body - req.body ya validado.
 * @return {Object}
 */
function datosQuizParaGuardar(body) {
  const { fecha_creacion, ...datos } = body;
  for (const campo of ['fecha_apertura', 'fecha_cierre', 'tiempo_limite_min']) {
    if (datos[campo] === undefined) datos[campo] = null;
  }
  return datos;
}

export const QuizController = {
  /**
   * @brief HU-3.1 (CA-3.1.1, CA-3.1.2, CA-3.1.3): genera un quiz acumulativo a partir de las
   * tarjetas revisado_docente de los mazos elegidos. POST /api/v1/quizzes/generate
   * @param {import('express').Request} req - req.body: { curso_id, titulo, mazo_ids,
   * fecha_apertura, fecha_cierre, tiempo_limite_min, cantidad_preguntas? } (ver
   * QuizService.generar para el detalle de cada campo).
   * @param {import('express').Response} res - 201 con { quiz, preguntas }, 400 si faltan
   * campos o no hay suficientes tarjetas aprobadas, 404 si algún mazo no existe, 500 ante error
   * inesperado.
   */
  async generar(req, res) {
    try {
      const resultado = await QuizService.generar(req.body);
      res.status(201).json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  /**
   * @brief HU-3.3 (CA-3.3.2): exporta el quiz a PDF con hoja de preguntas y hoja de respuestas
   * separada. GET /api/v1/quizzes/:id/export-pdf
   * @param {import('express').Request} req - req.params.id es el id_quiz.
   * @param {import('express').Response} res - 200 con el PDF como `application/pdf`
   * (`Content-Disposition: attachment`), 400 si el id no es numérico, 404 si el quiz no existe
   * o no tiene preguntas generadas, 500 ante error inesperado.
   */
  async exportarPdf(req, res) {
    try {
      const id = leerIdRuta(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }
      const pdfBytes = await ExportarPDFService.generarPdfQuiz(id);
      res.status(200);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quiz-${id}.pdf"`,
      });
      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  /**
   * @brief Crea un quiz nuevo (CRUD genérico, sin la lógica de negocio de HU-3.1 — para eso
   * ver `generar`). POST /api/v1/quizzes
   * @param {import('express').Request} req - req.body con las columnas de "quiz" (ver
   * validarDatosQuiz).
   * @param {import('express').Response} res - 201 con el quiz creado, 400 si falta un campo NOT
   * NULL o alguno es inválido, 404 si el curso no existe, 500 ante error inesperado.
   */
  async crear(req, res) {
    try {
      const invalido = validarDatosQuiz(req.body);
      if (invalido) {
        return res.status(invalido.status).json({ error: invalido.error, code: invalido.code });
      }
      const quiz = await QuizRepository.crear(datosQuizParaGuardar(req.body));
      res.status(201).json(quiz);
    } catch (error) {
      if (error.code === PG_FOREIGN_KEY_VIOLATION) {
        return res.status(404).json({ error: `El curso ${req.body.curso_id} no existe`, code: 'COURSE_NOT_FOUND' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Obtiene un quiz por su id_quiz, con `estado_efectivo` calculado (CA-3.1.3).
   * GET /api/v1/quizzes/:id
   * @param {import('express').Request} req - req.params.id es el id_quiz a buscar.
   * @param {import('express').Response} res - 200 con el quiz (incluye `estado_efectivo`), 400
   * si el id no es numérico, 404 si no existe, 500 ante error inesperado.
   */
  async obtenerPorId(req, res) {
    try {
      const id = leerIdRuta(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }
      const quiz = await QuizRepository.obtenerPorId(id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz no encontrado', code: 'QUIZ_NOT_FOUND' });
      }
      // CA-3.1.3: el estado real ("programado"/"abierto"/"cerrado") se calcula al consultar,
      // sin infraestructura de jobs/cron en el proyecto (ver QuizService.calcularEstadoEfectivo).
      res.status(200).json(QuizService.conEstadoEfectivo(quiz));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief HU-3.2: preguntas de un quiz para que el estudiante lo responda, sin
   * `respuesta_correcta`. GET /api/v1/quizzes/:id/preguntas (endpoint adicional aprobado por el
   * equipo, ver QuizService.obtenerPreguntasParaEstudiante).
   * @param {import('express').Request} req - req.params.id es el id_quiz; req.usuario (del
   * JWT) identifica al estudiante.
   * @param {import('express').Response} res - 200 con { quiz, preguntas }, 400 si el id no es
   * numérico o el quiz no está abierto, 403 si no está inscrito en el curso del quiz, 404 si el
   * quiz no existe o no tiene preguntas, 500 ante error inesperado.
   */
  async obtenerPreguntas(req, res) {
    try {
      const id = leerIdRuta(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }
      const resultado = await QuizService.obtenerPreguntasParaEstudiante(id, req.usuario.id_usuario);
      res.status(200).json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  /**
   * @brief HU-3.2: quices de los cursos del estudiante con su resultado si ya los envió.
   * GET /api/v1/quizzes/mine (endpoint adicional, ver QuizService.listarDelEstudiante).
   * @param {import('express').Request} req - req.usuario (del JWT) identifica al estudiante.
   * @param {import('express').Response} res - 200 con el arreglo de quices, 500 ante error
   * inesperado.
   */
  async listarMios(req, res) {
    try {
      const quizzes = await QuizService.listarDelEstudiante(req.usuario.id_usuario);
      res.status(200).json(quizzes);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  /**
   * @brief CA-3.2.3: resultado previo del estudiante, aunque el quiz esté cerrado.
   * GET /api/v1/quizzes/:id/result (endpoint adicional, ver
   * QuizService.obtenerResultadoEstudiante).
   * @param {import('express').Request} req - req.params.id es el id_quiz; req.usuario (del
   * JWT) identifica al estudiante.
   * @param {import('express').Response} res - 200 con { resultado, respuestas, preguntas }, 400
   * si el id no es numérico, 403 si no está inscrito en el curso del quiz, 404 si el quiz no
   * existe o el estudiante aún no lo envió, 500 ante error inesperado.
   */
  async obtenerResultado(req, res) {
    try {
      const id = leerIdRuta(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }
      const resultado = await QuizService.obtenerResultadoEstudiante(id, req.usuario.id_usuario);
      res.status(200).json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  /**
   * @brief Lista todos los quices existentes, sin filtros, cada uno con `estado_efectivo`
   * calculado (CA-3.1.3). GET /api/v1/quizzes
   * @param {import('express').Request} req - No se usa (sin filtros ni paginación implementados).
   * @param {import('express').Response} res - 200 con el arreglo de quices, 500 ante error
   * inesperado.
   */
  async listar(req, res) {
    try {
      const quizzes = await QuizRepository.listar();
      res.status(200).json(quizzes.map((quiz) => QuizService.conEstadoEfectivo(quiz)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Reemplaza todos los campos de un quiz existente (UPDATE completo vía PUT).
   * PUT /api/v1/quizzes/:id
   * @param {import('express').Request} req - req.params.id es el id_quiz; req.body trae las
   * columnas nuevas de "quiz".
   * @param {import('express').Response} res - 200 con el quiz actualizado, 400 si el id no es
   * numérico o el body es inválido (ver validarDatosQuiz), 404 si el quiz o el curso no existen,
   * 500 ante error inesperado.
   */
  async actualizar(req, res) {
    try {
      const id = leerIdRuta(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }
      const invalido = validarDatosQuiz(req.body);
      if (invalido) {
        return res.status(invalido.status).json({ error: invalido.error, code: invalido.code });
      }
      const quiz = await QuizRepository.actualizar(id, datosQuizParaGuardar(req.body));
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz no encontrado', code: 'QUIZ_NOT_FOUND' });
      }
      res.status(200).json(quiz);
    } catch (error) {
      if (error.code === PG_FOREIGN_KEY_VIOLATION) {
        return res.status(404).json({ error: `El curso ${req.body.curso_id} no existe`, code: 'COURSE_NOT_FOUND' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Elimina un quiz por su id_quiz. DELETE /api/v1/quizzes/:id
   * @param {import('express').Request} req - req.params.id es el id_quiz a eliminar.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 si el id no es
   * numérico, 404 si no existía, 500 ante error inesperado (ej. si el quiz todavía tiene filas
   * asociadas en quiz_mazo/pregunta_quiz/resultado_quiz, por las foreign key).
   */
  async eliminar(req, res) {
    try {
      const id = leerIdRuta(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        return res.status(400).json({ error: 'id inválido', code: 'INVALID_ID' });
      }
      const eliminado = await QuizRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Quiz no encontrado', code: 'QUIZ_NOT_FOUND' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
