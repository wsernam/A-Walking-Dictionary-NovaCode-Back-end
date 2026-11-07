/**
 * @file Controlador REST (CRUD genérico) de RespuestaQuiz: recibe la petición HTTP, llama
 * directamente al repositorio (RespuestaQuizRepository) y devuelve la respuesta. Cuando exista
 * lógica de negocio en services/, se insertará entre el controlador y el repositorio sin cambiar
 * esta firma.
 *
 * @note Ninguna ruta montada en app.js usa este controlador; las respuestas se registran al
 * enviar el quiz (POST /api/v1/quizzes/:id/submit). Sus errores no llevan el campo "code"
 * (decisión del 2026-10-22).
 */

import { RespuestaQuizRepository } from '../repositories/RespuestaQuizRepository.js';

/**
 * Controlador REST: cada método recibe una petición HTTP y responde.
 * @namespace
 */
export const RespuestaQuizController = {
  /**
   * Crea una respuesta de quiz (CRUD genérico, sin ruta montada).
   * @param {import('express').Request} req - req.body trae las columnas de "respuesta_quiz".
   * @param {import('express').Response} res - 201 con la respuesta creada, 400 si
   * respuesta_estudiante supera 255 caracteres, 500 ante error inesperado.
   */
  async crear(req, res) {
    try {
      const { respuesta_estudiante } = req.body;

      // respuesta_estudiante es el único varchar de "respuesta_quiz" y es nullable en el DER
      // (es_correcta es boolean, puntaje_obtenido es decimal), por eso no se exige como
      // obligatorio, solo se limita su longitud si viene.
      if (respuesta_estudiante && respuesta_estudiante.length > 255) {
        return res.status(400).json({
          error: `El campo respuesta_estudiante no puede superar 255 caracteres (tiene ${respuesta_estudiante.length} caracteres).`,
        });
      }

      const respuesta = await RespuestaQuizRepository.crear(req.body);
      res.status(201).json(respuesta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Consulta una respuesta por su id_respuesta (CRUD genérico, sin ruta montada).
   * @param {import('express').Request} req - req.params.id es el id_respuesta.
   * @param {import('express').Response} res - 200 con la respuesta, 400 si el id no es numérico,
   * 404 si no existe, 500 ante error inesperado.
   */
  async obtenerPorId(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const respuesta = await RespuestaQuizRepository.obtenerPorId(id);
      if (!respuesta) {
        return res.status(404).json({ error: 'RespuestaQuiz no encontrada' });
      }
      res.status(200).json(respuesta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Lista todas las respuestas de quiz (CRUD genérico, sin ruta montada).
   * @param {import('express').Request} req - No se usa (sin filtros).
   * @param {import('express').Response} res - 200 con el arreglo, 500 ante error inesperado.
   */
  async listar(req, res) {
    try {
      const respuestas = await RespuestaQuizRepository.listar();
      res.status(200).json(respuestas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Reemplaza los campos de una respuesta (CRUD genérico, sin ruta montada).
   * @param {import('express').Request} req - req.params.id es el id_respuesta; req.body trae las
   * columnas de "respuesta_quiz".
   * @param {import('express').Response} res - 200 con la respuesta actualizada, 400 si el id no
   * es numérico, 404 si no existe, 500 ante error inesperado.
   */
  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const respuesta = await RespuestaQuizRepository.actualizar(id, req.body);
      if (!respuesta) {
        return res.status(404).json({ error: 'RespuestaQuiz no encontrada' });
      }
      res.status(200).json(respuesta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Elimina una respuesta por su id_respuesta (CRUD genérico, sin ruta montada).
   * @param {import('express').Request} req - req.params.id es el id_respuesta.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 si el id no es
   * numérico, 404 si no existe, 500 ante error inesperado.
   */
  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const eliminado = await RespuestaQuizRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'RespuestaQuiz no encontrada' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
