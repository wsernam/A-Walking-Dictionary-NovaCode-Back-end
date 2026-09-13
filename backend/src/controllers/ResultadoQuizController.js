/**
 * @file ResultadoQuizController.js
 * @brief Controlador REST de ResultadoQuiz. El método `submit` implementa la lógica de negocio
 * de HE-03 (HU-3.2) delegando en QuizService; el resto (`crear`, `obtenerPorId`, `listar`,
 * `actualizar`, `eliminar`) es CRUD genérico que llama directamente al repositorio
 * (ResultadoQuizRepository), en el mismo patrón que el resto de controladores del proyecto.
 */

import { ResultadoQuizRepository } from '../repositories/ResultadoQuizRepository.js';
import { QuizService } from '../services/QuizService.js';

export const ResultadoQuizController = {
  /**
   * @brief HU-3.2 (CA-3.2.1, CA-3.2.2, CA-3.2.3): recibe las respuestas de un estudiante para
   * un quiz, calcula la calificación y la registra. POST /api/v1/quizzes/:id/submit
   * @param {import('express').Request} req - req.params.id es el id_quiz; req.body: {
   * estudiante_id, respuestas: [{pregunta_id, respuesta_estudiante}], tiempo_empleado_seg? }
   * (ver QuizService.enviarRespuestas para el detalle de cada campo).
   * @param {import('express').Response} res - 201 con { resultado, respuestas } si es la
   * primera vez que el estudiante envía; 409 con { error, resultado, respuestas } del intento
   * previo si ya lo había enviado (CA-3.2.3); 400 si faltan datos o el quiz no está abierto;
   * 404 si el quiz no existe o no tiene preguntas; 500 ante error inesperado.
   */
  async submit(req, res) {
    try {
      const quiz_id = Number(req.params.id);
      if (Number.isNaN(quiz_id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const resultado = await QuizService.enviarRespuestas(quiz_id, req.body);
      res.status(201).json(resultado);
    } catch (err) {
      if (err.status === 409) {
        return res.status(409).json({
          error: err.message,
          resultado: err.resultado,
          respuestas: err.respuestas,
        });
      }
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  /**
   * @brief Crea un resultado_quiz nuevo (CRUD genérico, sin la lógica de negocio de HU-3.2 —
   * para eso ver `submit`). POST /api/v1/resultados-quiz
   * @param {import('express').Request} req - req.body con las columnas de "resultado_quiz".
   * @param {import('express').Response} res - 201 con el resultado creado, 500 ante error
   * inesperado (incluye violar el índice único (quiz_id, estudiante_id) del DER).
   */
  async crear(req, res) {
    try {
      const resultado = await ResultadoQuizRepository.crear(req.body);
      res.status(201).json(resultado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Obtiene un resultado_quiz por su id_resultado. GET /api/v1/resultados-quiz/:id
   * @param {import('express').Request} req - req.params.id es el id_resultado a buscar.
   * @param {import('express').Response} res - 200 con el resultado, 400 si el id no es
   * numérico, 404 si no existe, 500 ante error inesperado.
   */
  async obtenerPorId(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const resultado = await ResultadoQuizRepository.obtenerPorId(id);
      if (!resultado) {
        return res.status(404).json({ error: 'ResultadoQuiz no encontrado' });
      }
      res.status(200).json(resultado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Lista todos los resultados existentes, sin filtros. GET /api/v1/resultados-quiz
   * @param {import('express').Request} req - No se usa (sin filtros ni paginación implementados).
   * @param {import('express').Response} res - 200 con el arreglo de resultados, 500 ante error
   * inesperado.
   */
  async listar(req, res) {
    try {
      const resultados = await ResultadoQuizRepository.listar();
      res.status(200).json(resultados);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Reemplaza todos los campos de un resultado existente (UPDATE completo vía PUT).
   * PUT /api/v1/resultados-quiz/:id
   * @param {import('express').Request} req - req.params.id es el id_resultado; req.body trae
   * las columnas nuevas de "resultado_quiz".
   * @param {import('express').Response} res - 200 con el resultado actualizado, 400 si el id
   * no es numérico, 404 si no existe, 500 ante error inesperado.
   */
  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const resultado = await ResultadoQuizRepository.actualizar(id, req.body);
      if (!resultado) {
        return res.status(404).json({ error: 'ResultadoQuiz no encontrado' });
      }
      res.status(200).json(resultado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Elimina un resultado por su id_resultado. DELETE /api/v1/resultados-quiz/:id
   * @param {import('express').Request} req - req.params.id es el id_resultado a eliminar.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 si el id no es
   * numérico, 404 si no existía, 500 ante error inesperado (ej. si el resultado todavía tiene
   * respuestas asociadas en respuesta_quiz, por la foreign key).
   */
  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const eliminado = await ResultadoQuizRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'ResultadoQuiz no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
