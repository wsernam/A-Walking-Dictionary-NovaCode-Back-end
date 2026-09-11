/**
 * @file CursoController.js
 * @brief Controlador REST de Curso: recibe la petición HTTP, llama directamente al repositorio
 * (CursoRepository) y devuelve la respuesta.
 *
 * @note Expuestos hoy: crear(), listar() y obtenerPorId() (POST/GET /api/v1/courses,
 * GET /api/v1/courses/:id), requeridos por el frontend. actualizar() y eliminar() existen
 * pero no tienen ruta montada todavía.
 */

import { CursoRepository } from '../repositories/CursoRepository.js';

export const CursoController = {
  /**
   * @brief Crea un curso nuevo. POST /api/v1/courses
   *
   * Valida que nombre, periodo, estado, fecha_inicio, fecha_fin y docente_id no estén vacíos
   * (todos son NOT NULL en el DER), y que nombre/periodo/estado no superen su longitud máxima.
   *
   * @param {import('express').Request} req - req.body debe traer nombre, periodo, estado,
   * fecha_inicio, fecha_fin y docente_id (docente_id debe ser un id_usuario existente, por la
   * foreign key).
   * @param {import('express').Response} res - 201 con el curso creado, 400 si faltan campos
   * obligatorios o alguno supera su longitud máxima, 500 ante error inesperado (ej. si
   * docente_id no corresponde a un usuario existente).
   */
  async crear(req, res) {
    try {
      const { nombre, periodo, estado, fecha_inicio, fecha_fin, docente_id } = req.body;

      // nombre, periodo y estado son varchar NOT NULL en el DER.
      // fecha_inicio, fecha_fin y docente_id también son NOT NULL y el cliente debe enviarlos
      // (todavía no hay auth para derivar docente_id de una sesión).
      const camposFaltantes = [];
      if (!nombre) camposFaltantes.push('nombre');
      if (!periodo) camposFaltantes.push('periodo');
      if (!estado) camposFaltantes.push('estado');
      if (!fecha_inicio) camposFaltantes.push('fecha_inicio');
      if (!fecha_fin) camposFaltantes.push('fecha_fin');
      if (docente_id === undefined || docente_id === null || docente_id === '') camposFaltantes.push('docente_id');
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

  /**
   * @brief Consulta un curso por su id_curso. GET /api/v1/courses/:id
   * @param {import('express').Request} req - req.params.id es el id_curso a buscar.
   * @param {import('express').Response} res - 200 con el curso, 400 si el id no es numérico,
   * 404 si no existe, 500 ante error inesperado.
   */
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

  /**
   * @brief Lista todos los cursos existentes, sin filtros. GET /api/v1/courses
   * @param {import('express').Request} req - No se usa (sin filtros ni paginación implementados).
   * @param {import('express').Response} res - 200 con el arreglo de cursos, 500 ante error inesperado.
   */
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
