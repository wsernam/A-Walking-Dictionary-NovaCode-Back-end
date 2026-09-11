// Controlador REST de PreguntaQuiz: recibe la petición HTTP, llama directamente al repositorio
// (PreguntaQuizRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { PreguntaQuizRepository } from '../repositories/PreguntaQuizRepository.js';

export const PreguntaQuizController = {
  async crear(req, res) {
    try {
      const { tipo_pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta } = req.body;

      // tipo_pregunta y respuesta_correcta son varchar NOT NULL en el DER.
      // enunciado es "text" (sin límite definido en el DER), queda fuera de este alcance.
      const camposFaltantes = [];
      if (!tipo_pregunta) camposFaltantes.push('tipo_pregunta');
      if (!respuesta_correcta) camposFaltantes.push('respuesta_correcta');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      // Longitud máxima según el DER: tipo_pregunta varchar(50), respuesta_correcta varchar(255),
      // opcion_a/opcion_b/opcion_c/opcion_d varchar(255) (nullable).
      const erroresLongitud = [];
      if (tipo_pregunta.length > 50) {
        erroresLongitud.push(
          `El campo tipo_pregunta no puede superar 50 caracteres (tiene ${tipo_pregunta.length} caracteres).`
        );
      }
      if (respuesta_correcta.length > 255) {
        erroresLongitud.push(
          `El campo respuesta_correcta no puede superar 255 caracteres (tiene ${respuesta_correcta.length} caracteres).`
        );
      }
      if (opcion_a && opcion_a.length > 255) {
        erroresLongitud.push(
          `El campo opcion_a no puede superar 255 caracteres (tiene ${opcion_a.length} caracteres).`
        );
      }
      if (opcion_b && opcion_b.length > 255) {
        erroresLongitud.push(
          `El campo opcion_b no puede superar 255 caracteres (tiene ${opcion_b.length} caracteres).`
        );
      }
      if (opcion_c && opcion_c.length > 255) {
        erroresLongitud.push(
          `El campo opcion_c no puede superar 255 caracteres (tiene ${opcion_c.length} caracteres).`
        );
      }
      if (opcion_d && opcion_d.length > 255) {
        erroresLongitud.push(
          `El campo opcion_d no puede superar 255 caracteres (tiene ${opcion_d.length} caracteres).`
        );
      }
      if (erroresLongitud.length > 0) {
        return res.status(400).json({ error: erroresLongitud.join(' ') });
      }

      const pregunta = await PreguntaQuizRepository.crear(req.body);
      res.status(201).json(pregunta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerPorId(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const pregunta = await PreguntaQuizRepository.obtenerPorId(id);
      if (!pregunta) {
        return res.status(404).json({ error: 'PreguntaQuiz no encontrada' });
      }
      res.status(200).json(pregunta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const preguntas = await PreguntaQuizRepository.listar();
      res.status(200).json(preguntas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const pregunta = await PreguntaQuizRepository.actualizar(id, req.body);
      if (!pregunta) {
        return res.status(404).json({ error: 'PreguntaQuiz no encontrada' });
      }
      res.status(200).json(pregunta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const eliminado = await PreguntaQuizRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'PreguntaQuiz no encontrada' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
