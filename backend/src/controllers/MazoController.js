// Controlador REST de Mazo: recibe la petición HTTP, aplica las validaciones de HU-1.1
// y llama directamente al repositorio (MazoRepository). Cuando exista lógica de negocio
// adicional en services/, se insertará entre el controlador y el repositorio sin cambiar esta firma.

import { MazoRepository } from '../repositories/MazoRepository.js';
import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';

export const MazoController = {
  /**
   * Crea un mazo nuevo. Valida que nombre_lectura y semana no estén vacíos (CA-1.1.2)
   * y fuerza el estado inicial a "abierto" sin importar lo que venga en el body (CA-1.1.1).
   * @param {import('express').Request} req - req.body debe traer al menos nombre_lectura y semana
   * (y el resto de columnas de "mazo" que exija la base de datos, ej. curso_id).
   * @param {import('express').Response} res - 201 con el mazo creado, 400 si faltan campos
   * obligatorios, 500 ante error inesperado.
   */
  // PENDIENTE DE CONFIRMAR CON EL EQUIPO: cuando se implemente auth (docente autenticado),
  // aquí habría que validar que el docente que crea el mazo sea dueño del curso (curso_id).
  // Se propuso guardar "id_docente" directo en mazo para esa validación, pero podría ser
  // redundante: mazo.curso_id -> curso.docente_id ya da esa información sin duplicarla.
  // No se implementa nada de esto todavía (ni el campo ni la validación) hasta confirmar.
  // Si se confirma que NO se necesita id_docente, borrar este comentario.
  async crear(req, res) {
    try {
      const { nombre_lectura, semana, autor, variante_regional_predeterminada } = req.body;

      // CA-1.1.2: nombre de la lectura y semana son obligatorios.
      // autor también es NOT NULL en el DER y el cliente debe enviarlo.
      const camposFaltantes = [];
      if (!nombre_lectura) camposFaltantes.push('nombre_lectura');
      if (semana === undefined || semana === null || semana === '') camposFaltantes.push('semana');
      if (!autor) camposFaltantes.push('autor');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      // Longitud máxima según el DER: nombre_lectura varchar(200), autor varchar(150),
      // variante_regional_predeterminada varchar(100). "estado" no se valida aquí porque
      // el controlador lo fuerza a 'abierto' más abajo, no lo recibe del cliente.
      const erroresLongitud = [];
      if (nombre_lectura.length > 200) {
        erroresLongitud.push(
          `El campo nombre_lectura no puede superar 200 caracteres (tiene ${nombre_lectura.length} caracteres).`
        );
      }
      if (autor.length > 150) {
        erroresLongitud.push(
          `El campo autor no puede superar 150 caracteres (tiene ${autor.length} caracteres).`
        );
      }
      if (variante_regional_predeterminada && variante_regional_predeterminada.length > 100) {
        erroresLongitud.push(
          `El campo variante_regional_predeterminada no puede superar 100 caracteres (tiene ${variante_regional_predeterminada.length} caracteres).`
        );
      }
      if (erroresLongitud.length > 0) {
        return res.status(400).json({ error: erroresLongitud.join(' ') });
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
   * HU-2.2 (CA-2.2.2) — La docente configura la variante regional a nivel del mazo; al guardar,
   * todas las tarjetas del mazo que NO tengan ya una variante dialectal propia la heredan como
   * valor predeterminado (las curadas individualmente en CA-2.2.1 se respetan).
   * Ruta: PATCH /api/v1/decks/:id/context.
   * @param {import('express').Request} req - req.params.id = id_mazo; req.body.variante_dialectal
   * (obligatorio).
   * @param {import('express').Response} res - 200 con { mazo, tarjetas_actualizadas }; 400 si
   * falta/está vacío variante_dialectal o supera varchar(100); 404 si el mazo no existe; 500
   * ante error inesperado.
   */
  async asignarContextoPredeterminado(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }

      const { variante_dialectal } = req.body;
      if (!variante_dialectal || !String(variante_dialectal).trim()) {
        return res.status(400).json({ error: 'El campo variante_dialectal es obligatorio' });
      }
      // mazo.variante_regional_predeterminada es varchar(100) en el DER.
      if (String(variante_dialectal).length > 100) {
        return res.status(400).json({
          error: `variante_dialectal no puede superar 100 caracteres (tiene ${String(variante_dialectal).length}).`,
        });
      }

      const mazo = await MazoRepository.obtenerPorId(id);
      if (!mazo) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }

      const valor = String(variante_dialectal).trim();
      const mazoActualizado = await MazoRepository.actualizarVariantePredeterminada(id, valor);

      // Propaga a las tarjetas del mazo que no tienen aún una etiqueta 'variante_dialectal'.
      const idsSinVariante = await TarjetaRepository.idsSinEtiquetaDeTipo(id, 'variante_dialectal');
      const tarjetasActualizadas = await EtiquetaContextoRepository.asignarPredeterminadaPorTarjetas(
        idsSinVariante,
        { tipo: 'variante_dialectal', valor, fecha_asignacion: new Date() }
      );

      res.status(200).json({ mazo: mazoActualizado, tarjetas_actualizadas: tarjetasActualizadas });
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
