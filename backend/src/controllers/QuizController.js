/**
 * @file QuizController.js
 * @brief Controlador REST de Quiz. Los métodos `generar` y `exportarPdf` implementan la lógica
 * de negocio de HE-03 (HU-3.1, HU-3.3) delegando en QuizService/ExportPDFService; el resto
 * (`crear`, `obtenerPorId`, `listar`, `actualizar`, `eliminar`) es CRUD genérico que llama
 * directamente al repositorio (QuizRepository), en el mismo patrón que el resto de
 * controladores del proyecto.
 */

import { QuizRepository } from '../repositories/QuizRepository.js';
import { QuizService } from '../services/QuizService.js';
import { ExportPDFService } from '../services/ExportPDFService.js';

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
      res.status(err.status || 500).json({ error: err.message });
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
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const pdfBytes = await ExportPDFService.generarPdfQuiz(id);
      res.status(200);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quiz-${id}.pdf"`,
      });
      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  /**
   * @brief Crea un quiz nuevo (CRUD genérico, sin la lógica de negocio de HU-3.1 — para eso
   * ver `generar`). POST /api/v1/quizzes
   * @param {import('express').Request} req - req.body con las columnas de "quiz"; requiere al
   * menos `titulo` y `estado`.
   * @param {import('express').Response} res - 201 con el quiz creado, 400 si faltan
   * titulo/estado o exceden su longitud máxima (varchar 200 / varchar 30 del DER), 500 ante
   * error inesperado.
   */
  async crear(req, res) {
    try {
      const { titulo, estado } = req.body;

      // titulo y estado son varchar NOT NULL en el DER.
      const camposFaltantes = [];
      if (!titulo) camposFaltantes.push('titulo');
      if (!estado) camposFaltantes.push('estado');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      // Longitud máxima según el DER: titulo varchar(200), estado varchar(30).
      const erroresLongitud = [];
      if (titulo.length > 200) {
        erroresLongitud.push(
          `El campo titulo no puede superar 200 caracteres (tiene ${titulo.length} caracteres).`
        );
      }
      if (estado.length > 30) {
        erroresLongitud.push(
          `El campo estado no puede superar 30 caracteres (tiene ${estado.length} caracteres).`
        );
      }
      if (erroresLongitud.length > 0) {
        return res.status(400).json({ error: erroresLongitud.join(' ') });
      }

      const quiz = await QuizRepository.crear(req.body);
      res.status(201).json(quiz);
    } catch (error) {
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
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const quiz = await QuizRepository.obtenerPorId(id);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz no encontrado' });
      }
      // CA-3.1.3: el estado real ("programado"/"abierto"/"cerrado") se calcula al consultar,
      // sin infraestructura de jobs/cron en el proyecto (ver QuizService.calcularEstadoEfectivo).
      res.status(200).json(QuizService.conEstadoEfectivo(quiz));
    } catch (error) {
      res.status(500).json({ error: error.message });
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
   * numérico, 404 si no existe, 500 ante error inesperado.
   */
  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const quiz = await QuizRepository.actualizar(id, req.body);
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz no encontrado' });
      }
      res.status(200).json(quiz);
    } catch (error) {
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
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const eliminado = await QuizRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Quiz no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
