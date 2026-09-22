// Controlador REST de Inscripcion: recibe la petición HTTP, llama directamente al repositorio
// (InscripcionRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { InscripcionRepository } from '../repositories/InscripcionRepository.js';
import { InscripcionService } from '../services/InscripcionService.js';

export const InscripcionController = {
  async crear(req, res) {
    try {
      const { estado } = req.body;

      // estado es el único varchar de "inscripcion" y es NOT NULL en el DER
      // (curso_id, estudiante_id son int; fecha_inscripcion es date).
      if (!estado) {
        return res.status(400).json({ error: 'El campo estado es obligatorio' });
      }

      // Longitud máxima según el DER: estado varchar(30).
      if (estado.length > 30) {
        return res.status(400).json({
          error: `El campo estado no puede superar 30 caracteres (tiene ${estado.length} caracteres).`,
        });
      }

      const inscripcion = await InscripcionRepository.crear(req.body);
      res.status(201).json(inscripcion);
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
      const inscripcion = await InscripcionRepository.obtenerPorId(id);
      if (!inscripcion) {
        return res.status(404).json({ error: 'Inscripcion no encontrada' });
      }
      res.status(200).json(inscripcion);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const inscripciones = await InscripcionRepository.listar();
      res.status(200).json(inscripciones);
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
      const inscripcion = await InscripcionRepository.actualizar(id, req.body);
      if (!inscripcion) {
        return res.status(404).json({ error: 'Inscripcion no encontrada' });
      }
      res.status(200).json(inscripcion);
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
      const eliminado = await InscripcionRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Inscripcion no encontrada' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },


  async generarCodigoAcceso(req, res) {
    try {
      const id_curso = Number(req.params.id);

      if (Number.isNaN(id_curso)) {
        return res.status(400).json({
          error: 'id de curso inválido',
        });
      }

      const resultado =
        await InscripcionService.generarCodigoAcceso(id_curso);

      res.status(200).json(resultado);
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.message,
      });
    }
  },


  async inscribirsePorCodigo(req, res) {
    try {
      const { estudiante_id, codigo_acceso } = req.body;

      if (
        estudiante_id === undefined ||
        estudiante_id === null ||
        !codigo_acceso
      ) {
        return res.status(400).json({
          error: 'estudiante_id y codigo_acceso son obligatorios',
        });
      }

      const inscripcion =
        await InscripcionService.inscribirsePorCodigo(
          estudiante_id,
          codigo_acceso.trim().toUpperCase()
        );

      res.status(201).json(inscripcion);
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.message,
      });
    }
  },



  async asignarPorCorreo(req, res) {
    try {
      const id_curso = Number(req.params.id);

      if (Number.isNaN(id_curso)) {
        return res.status(400).json({
          error: 'id de curso inválido',
        });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'El correo electrónico es obligatorio',
        });
      }

      const inscripcion =
        await InscripcionService.asignarPorCorreo(
          id_curso,
          email.trim()
        );

      res.status(201).json(inscripcion);
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.message,
      });
    }
  },


};
