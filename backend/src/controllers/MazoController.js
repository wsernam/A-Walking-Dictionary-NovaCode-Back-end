/**
 * @file MazoController.js
 * @brief Controlador REST de Mazo: recibe la petición HTTP, aplica las validaciones de HU-1.1
 * y llama directamente al repositorio (MazoRepository).
 *
 * Cuando exista lógica de negocio adicional en src/services/, se insertará entre el
 * controlador y el repositorio sin cambiar la firma de estas funciones.
 */

import { MazoRepository } from '../repositories/MazoRepository.js';
import { ContextoService } from '../services/ContextoService.js';
import { ExportarPDFService } from '../services/ExportarPDFService.js';
import { authDeshabilitado } from '../middleware/autenticacionMiddleware.js';

const ESTADOS_VALIDOS = ['abierto', 'cerrado'];

/**
 * @brief Indica si el usuario autenticado es el docente dueño del mazo.
 * Con DISABLE_AUTH=true (solo desarrollo) siempre devuelve true.
 * @param {import('express').Request} req - req.usuario viene de authenticate.
 * @param {Object} mazo - Mazo ya cargado (con docente_id).
 * @return {boolean}
 */
function esDuenoDelMazo(req, mazo) {
  if (authDeshabilitado()) return true;
  return Number(mazo.docente_id) === Number(req.usuario?.id_usuario);
}

export const MazoController = {
  /**
   * @brief Crea un mazo nuevo.
   *
   * Valida que nombre_lectura, semana, autor, docente_id, fecha_apertura y fecha_cierre no
   * estén vacíos (CA-1.1.2 + los demás campos NOT NULL del DER que el cliente debe enviar),
   * valida longitud máxima de los campos varchar según el DER, y fuerza el estado inicial a
   * "abierto" sin importar lo que venga en el body (CA-1.1.1). Descarta cualquier
   * fecha_creacion que venga del cliente (la asigna el repositorio con NOW()).
   *
   * @note docente_id es redundante con curso.docente_id (mazo.curso_id -> curso.docente_id ya
   * da esa información), pero el equipo confirmó mantenerlo duplicado en "mazo". Como todavía
   * no hay auth (docente autenticado), el cliente debe enviarlo explícitamente en el body —
   * cuando se implemente auth, se podría derivar de la sesión en vez de recibirlo así, y ahí
   * también se validaría que el docente autenticado sea dueño del curso.
   *
   * @param {import('express').Request} req - req.body debe traer al menos nombre_lectura,
   * semana, autor, docente_id, fecha_apertura y fecha_cierre (y el resto de columnas de "mazo"
   * que exija la base de datos, ej. curso_id).
   * @param {import('express').Response} res - 201 con el mazo creado, 400 si faltan campos
   * obligatorios o alguno supera su longitud máxima, 500 ante error inesperado.
   */
  // PENDIENTE DE CONFIRMAR CON EL EQUIPO: cuando se implemente auth (docente autenticado),
  // aquí habría que validar que el docente que crea el mazo sea dueño del curso (curso_id).
  // Se propuso guardar "id_docente" directo en mazo para esa validación, pero podría ser
  // redundante: mazo.curso_id -> curso.docente_id ya da esa información sin duplicarla.
  // No se implementa nada de esto todavía (ni el campo ni la validación) hasta confirmar.
  // Si se confirma que NO se necesita id_docente, borrar este comentario.
  async crear(req, res) {
    try {
      const {
        nombre_lectura,
        semana,
        autor,
        variante_regional_predeterminada,
        docente_id,
        fecha_apertura,
        fecha_cierre,
      } = req.body;

      // CA-1.1.2: nombre de la lectura y semana son obligatorios.
      // autor, docente_id, fecha_apertura y fecha_cierre también son NOT NULL en el DER
      // (init.sql) y el cliente debe enviarlos, si no el INSERT fallaría con 500.
      const camposFaltantes = [];
      if (!nombre_lectura) camposFaltantes.push('nombre_lectura');
      if (semana === undefined || semana === null || semana === '') camposFaltantes.push('semana');
      if (!autor) camposFaltantes.push('autor');
      if (docente_id === undefined || docente_id === null || docente_id === '') camposFaltantes.push('docente_id');
      if (!fecha_apertura) camposFaltantes.push('fecha_apertura');
      if (!fecha_cierre) camposFaltantes.push('fecha_cierre');
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
   * @brief Obtiene un mazo por su id_mazo.
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
   * @brief Lista los mazos. Para un estudiante con sesión, solo los de sus cursos con
   * inscripción activa (CA-1.2.1); para Invitado (sin token) o docente, todos.
   * @param {import('express').Request} req - req.usuario viene de autenticacionOpcional (puede
   * no existir).
   * @param {import('express').Response} res - 200 con el arreglo de mazos, 500 ante error inesperado.
   */
  async listar(req, res) {
    try {
      const mazos =
        req.usuario?.rol === 'estudiante'
          ? await MazoRepository.listarPorEstudiante(req.usuario.id_usuario)
          : await MazoRepository.listar();
      res.status(200).json(mazos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Edita los datos de un mazo existente (PUT /decks/:id).
   *
   * Solo el docente dueño del mazo puede editarlo (403 si no). Se mezclan los campos recibidos
   * con el mazo actual, así un body incompleto no deja columnas en null. Solo se pueden cambiar
   * nombre_lectura, autor, semana, variante_regional_predeterminada, fecha_apertura y
   * fecha_cierre; curso_id, docente_id, estado y fecha_creacion se conservan. El estado se
   * cambia con actualizarEstado. Se aplican las mismas validaciones que en crear (CA-1.1.2 y
   * longitudes del DER).
   *
   * @note Cambiar variante_regional_predeterminada aquí NO propaga a las tarjetas del mazo;
   * para eso está actualizarVarianteRegional (CA-2.2.2).
   *
   * @param {import('express').Request} req - req.params.id es el id_mazo; req.body trae los
   * campos a cambiar.
   * @param {import('express').Response} res - 200 con el mazo actualizado, 400 si el id es
   * inválido o falla una validación, 403 si no es el dueño, 404 si no existe, 500 ante error
   * inesperado.
   */
  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }

      const mazoActual = await MazoRepository.obtenerPorId(id);
      if (!mazoActual) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      if (!esDuenoDelMazo(req, mazoActual)) {
        return res.status(403).json({ error: 'Solo el docente dueño puede editar este mazo' });
      }

      const CAMPOS_EDITABLES = [
        'nombre_lectura',
        'autor',
        'semana',
        'variante_regional_predeterminada',
        'fecha_apertura',
        'fecha_cierre',
      ];
      const datos = { ...mazoActual };
      for (const campo of CAMPOS_EDITABLES) {
        if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
      }

      // CA-1.1.2: nombre de la lectura y semana (y autor, NOT NULL en el DER) obligatorios.
      const camposFaltantes = [];
      if (!datos.nombre_lectura) camposFaltantes.push('nombre_lectura');
      if (datos.semana === undefined || datos.semana === null || datos.semana === '') camposFaltantes.push('semana');
      if (!datos.autor) camposFaltantes.push('autor');
      if (!datos.fecha_apertura) camposFaltantes.push('fecha_apertura');
      if (!datos.fecha_cierre) camposFaltantes.push('fecha_cierre');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }

      const erroresLongitud = [];
      if (String(datos.nombre_lectura).length > 200) {
        erroresLongitud.push('El campo nombre_lectura no puede superar 200 caracteres.');
      }
      if (String(datos.autor).length > 150) {
        erroresLongitud.push('El campo autor no puede superar 150 caracteres.');
      }
      if (
        datos.variante_regional_predeterminada &&
        String(datos.variante_regional_predeterminada).length > 100
      ) {
        erroresLongitud.push('El campo variante_regional_predeterminada no puede superar 100 caracteres.');
      }
      if (erroresLongitud.length > 0) {
        return res.status(400).json({ error: erroresLongitud.join(' ') });
      }

      const mazo = await MazoRepository.actualizar(id, datos);
      res.status(200).json(mazo);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief Cambia únicamente el campo "estado" de un mazo (ej. de "abierto" a "cerrado").
   *
   * CA-1.1.3: cerrar el mazo inhabilita la recepción de nuevos aportes; esa verificación vive
   * en TarjetaController.crear, no aquí. Solo el docente dueño del mazo puede cambiarlo.
   *
   * @param {import('express').Request} req - req.params.id es el id_mazo; req.body.estado es
   * el nuevo valor del estado ("abierto" o "cerrado").
   * @param {import('express').Response} res - 200 con el mazo actualizado, 400 si el id no es
   * numérico, falta "estado" o no es un valor válido, 403 si no es el dueño, 404 si el mazo no
   * existe, 500 ante error inesperado.
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
      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({
          error: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`,
        });
      }
      const mazoActual = await MazoRepository.obtenerPorId(id);
      if (!mazoActual) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      if (!esDuenoDelMazo(req, mazoActual)) {
        return res.status(403).json({ error: 'Solo el docente dueño puede abrir o cerrar este mazo' });
      }
      const mazoActualizado = await MazoRepository.actualizar(id, { ...mazoActual, estado });
      res.status(200).json(mazoActualizado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @brief CA-2.2.2: actualiza la variante regional predeterminada del mazo y la propaga
   * automáticamente a todas sus tarjetas (sobrescribiendo la etiqueta 'variante_regional' de
   * cada una). Ver ContextoService.aplicarVarianteRegionalPorMazo para el detalle de la
   * decisión de "sobrescribir siempre" vs. "solo si no tenía". Solo el docente dueño del mazo.
   * @param {import('express').Request} req - req.params.id es el id_mazo; req.body.variante_regional
   * es el nuevo valor por defecto (obligatorio, debe ser una variante permitida).
   * @param {import('express').Response} res - 200 con { mazo, tarjetas_actualizadas }, 400 si
   * falta variante_regional o no es válida, 403 si no es el dueño, 404 si el mazo no existe,
   * 500 ante error inesperado.
   */
  async actualizarVarianteRegional(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const { variante_regional } = req.body;
      if (!variante_regional) {
        return res.status(400).json({ error: 'El campo variante_regional es obligatorio' });
      }
      const mazoExistente = await MazoRepository.obtenerPorId(id);
      if (!mazoExistente) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      if (!esDuenoDelMazo(req, mazoExistente)) {
        return res.status(403).json({ error: 'Solo el docente dueño puede modificar este mazo' });
      }
      const tarjetasActualizadas = await ContextoService.aplicarVarianteRegionalPorMazo(id, variante_regional);
      const mazo = await MazoRepository.actualizarVarianteRegional(id, variante_regional);
      res.status(200).json({ mazo, tarjetas_actualizadas: tarjetasActualizadas });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  /**
   * @brief HU-3.3 (CA-3.3.1, CA-3.3.3): exporta el mazo (tarjetas revisado_docente) a PDF, listo
   * para fotocopiar. GET /api/v1/decks/:id/export-pdf
   * @param {import('express').Request} req - req.params.id es el id_mazo.
   * @param {import('express').Response} res - 200 con el PDF como application/pdf, 400 si el id
   * no es numérico, 404 si el mazo no existe, 500 ante error inesperado.
   */
  async exportarPdf(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const pdfBytes = await ExportarPDFService.generarPdfMazo(id);
      res.status(200);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mazo-${id}.pdf"`,
      });
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  /**
   * @brief Elimina un mazo por su id_mazo. Solo el docente dueño del mazo.
   * @param {import('express').Request} req - req.params.id es el id_mazo a eliminar.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 si el id no es
   * numérico, 403 si no es el dueño, 404 si no existía, 500 ante error inesperado (ej. si el
   * mazo todavía tiene tarjetas asociadas, por la foreign key).
   */
  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const mazoActual = await MazoRepository.obtenerPorId(id);
      if (!mazoActual) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      if (!esDuenoDelMazo(req, mazoActual)) {
        return res.status(403).json({ error: 'Solo el docente dueño puede eliminar este mazo' });
      }
      await MazoRepository.eliminar(id);
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};