// Controlador REST de Mazo: recibe la petición HTTP, aplica las validaciones de HU-1.1
// y llama directamente al repositorio (MazoRepository). Cuando exista lógica de negocio
// adicional en services/, se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { MazoRepository } from '../repositories/MazoRepository.js';

export const MazoController = {
  /**
   * Crea un mazo nuevo. Valida que nombre_lectura y semana no estén vacíos (CA-1.1.2)
   * y fuerza el estado inicial a "abierto" sin importar lo que venga en el body (CA-1.1.1).
   * @param {import('express').Request} req - req.body debe traer al menos nombre_lectura y semana
   * (y el resto de columnas de "mazo" que exija la base de datos, ej. curso_id).
   * @param {import('express').Response} res - 201 con el mazo creado, 400 si faltan campos
   * obligatorios, 500 ante error inesperado.
   */
  async crear(req, res) {
    try {
      const { nombre_lectura, semana } = req.body;

      // CA-1.1.2: nombre de la lectura y semana son obligatorios
      const camposFaltantes = [];
      if (!nombre_lectura) camposFaltantes.push('nombre_lectura');
      if (semana === undefined || semana === null || semana === '') camposFaltantes.push('semana');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      // Se descarta explícitamente cualquier fecha_creacion que venga del body:
      // el backend siempre asigna la fecha real de inserción, nunca la del cliente.
      const { fecha_creacion, ...datosMazo } = req.body;

      // CA-1.1.1: el mazo siempre se crea en estado "abierto"
      const mazo = await MazoRepository.crear({ ...datosMazo, estado: 'abierto' });
      res.status(201).json(mazo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtiene un mazo por su id_mazo.
   * @param {import('express').Request} req - req.params.id es el id_mazo a buscar.
   * @param {import('express').Response} res - 200 con el mazo, 400 si el id no es numérico,
   * 404 si no existe, 500 ante error inesperado.
   */
  async obtenerPorId(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const mazo = await MazoRepository.obtenerPorId(id);
      if (!mazo) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      res.status(200).json(mazo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Lista todos los mazos existentes, sin filtros.
   * @param {import('express').Request} req - No se usa (sin filtros ni paginación implementados).
   * @param {import('express').Response} res - 200 con el arreglo de mazos, 500 ante error inesperado.
   */
  async listar(req, res) {
    try {
      const mazos = await MazoRepository.listar();
      res.status(200).json(mazos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Actualiza todos los campos de un mazo existente (reemplazo completo vía PUT).
   * @param {import('express').Request} req - req.params.id es el id_mazo; req.body trae las
   * columnas nuevas de "mazo" (curso_id, nombre_lectura, autor, semana, etc.).
   * @param {import('express').Response} res - 200 con el mazo actualizado, 400 si el id no es
   * numérico, 404 si no existe, 500 ante error inesperado.
   */
  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const mazo = await MazoRepository.actualizar(id, req.body);
      if (!mazo) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      res.status(200).json(mazo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Cambia únicamente el campo "estado" de un mazo (ej. de "abierto" a "cerrado"). CA-1.1.3:
   * cerrar el mazo inhabilita la recepción de nuevos aportes (esa verificación vive en
   * TarjetaController.crear, no aquí).
   * @param {import('express').Request} req - req.params.id es el id_mazo; req.body.estado es
   * el nuevo valor del estado.
   * @param {import('express').Response} res - 200 con el mazo actualizado, 400 si el id no es
   * numérico o si falta "estado", 404 si el mazo no existe, 500 ante error inesperado.
   */
  async actualizarEstado(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const { estado } = req.body;
      if (!estado) {
        return res.status(400).json({ error: 'El campo estado es obligatorio' });
      }
      const mazoActual = await MazoRepository.obtenerPorId(id);
      if (!mazoActual) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      const mazoActualizado = await MazoRepository.actualizar(id, { ...mazoActual, estado });
      res.status(200).json(mazoActualizado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Elimina un mazo por su id_mazo.
   * @param {import('express').Request} req - req.params.id es el id_mazo a eliminar.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 si el id no es
   * numérico, 404 si no existía, 500 ante error inesperado.
   */
  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const eliminado = await MazoRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
