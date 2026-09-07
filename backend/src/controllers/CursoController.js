// Controlador REST de Curso: recibe la petición HTTP, llama directamente al repositorio
// (CursoRepository) y devuelve la respuesta. Cuando exista lógica de negocio en services/,
// se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { CursoRepository } from '../repositories/CursoRepository.js';

export const CursoController = {
  async crear(req, res) {
    try {
      const { nombre, periodo, estado } = req.body;

      // nombre, periodo y estado son varchar NOT NULL en el DER.
      const camposFaltantes = [];
      if (!nombre) camposFaltantes.push('nombre');
      if (!periodo) camposFaltantes.push('periodo');
      if (!estado) camposFaltantes.push('estado');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      // Longitud máxima según el DER: nombre varchar(150), periodo varchar(20), estado varchar(30).
      const erroresLongitud = [];
      if (nombre.length > 150) {
        erroresLongitud.push(
          `El campo nombre no puede superar 150 caracteres (tiene ${nombre.length} caracteres).`
        );
      }
      if (periodo.length > 20) {
        erroresLongitud.push(
          `El campo periodo no puede superar 20 caracteres (tiene ${periodo.length} caracteres).`
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

      const curso = await CursoRepository.crear(req.body);
      res.status(201).json(curso);
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
      const curso = await CursoRepository.obtenerPorId(id);
      if (!curso) {
        return res.status(404).json({ error: 'Curso no encontrado' });
      }
      res.status(200).json(curso);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async listar(req, res) {
    try {
      const cursos = await CursoRepository.listar();
      res.status(200).json(cursos);
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
      const curso = await CursoRepository.actualizar(id, req.body);
      if (!curso) {
        return res.status(404).json({ error: 'Curso no encontrado' });
      }
      res.status(200).json(curso);
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
      const eliminado = await CursoRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Curso no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
