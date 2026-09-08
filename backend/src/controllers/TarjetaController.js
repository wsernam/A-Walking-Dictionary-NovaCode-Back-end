// Controlador REST de Tarjeta: recibe la petición HTTP, aplica las reglas de HU-1.2 y HU-1.3
// (mazo abierto, campos obligatorios, deduplicación) y llama a los repositorios correspondientes.
// Cuando exista lógica de negocio adicional en services/ para otras HU, se insertará sin cambiar
// esta firma.

import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { MazoRepository } from '../repositories/MazoRepository.js';
import { AporteRepository } from '../repositories/AporteRepository.js';
import { EtiquetaContextoRepository } from '../repositories/EtiquetaContextoRepository.js';
import { NotificacionRepository } from '../repositories/NotificacionRepository.js';
import { DeduplicacionService } from '../services/DeduplicacionService.js';
import { CuraduriaService } from '../services/CuraduriaService.js';

export const TarjetaController = {
  /**
   * Registra una palabra nueva propuesta por un estudiante (HU-1.2) y aplica la detección de
   * duplicados (HU-1.3). Según el resultado, crea una tarjeta nueva, o solo un aporte adicional
   * (coautoría o acepción) sobre una tarjeta ya existente en el mazo.
   * Ruta anidada: POST /api/v1/decks/:id/cards — el id del mazo (deck) viene de req.params.id,
   * no del body.
   * @param {import('express').Request} req - req.params.id es el id_mazo (deck); req.body debe
   * traer: palabra, traduccion, definicion (obligatorios), ejemplo (opcional, máx. 150 caracteres)
   * e inscripcion_id (quién hace el aporte).
   * @param {import('express').Response} res - 201 con { resultado, tarjeta, aporte } donde
   * resultado es 'creada' | 'coautoria' | 'acepcion_nueva'; 400 si faltan campos o el ejemplo
   * es muy largo; 404 si el mazo no existe; 409 si el mazo está cerrado; 500 ante error inesperado.
   */
  async crear(req, res) {
    try {
      const { palabra, traduccion, definicion, ejemplo, inscripcion_id } = req.body;

      // a) el mazo debe existir y estar "abierto" (CA-1.2.3). El id del mazo viene de la URL
      // (ruta anidada /decks/:id/cards), no del body.
      const mazoId = Number(req.params.id);
      if (Number.isNaN(mazoId)) {
        return res.status(400).json({ error: 'El id del mazo en la URL no es válido' });
      }
      const mazo = await MazoRepository.obtenerPorId(mazoId);
      if (!mazo) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      if (mazo.estado !== 'abierto') {
        return res.status(409).json({ error: 'El mazo no acepta más palabras' });
      }

      // b) palabra/traduccion/definicion obligatorios, ejemplo máx. 150 caracteres (CA-1.2.2)
      const camposFaltantes = [];
      if (!palabra) camposFaltantes.push('palabra');
      if (!traduccion) camposFaltantes.push('traduccion');
      if (!definicion) camposFaltantes.push('definicion');
      if (camposFaltantes.length > 0) {
        return res.status(400).json({
          error: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`,
        });
      }
      if (ejemplo && ejemplo.length > 150) {
        return res.status(400).json({ error: 'El ejemplo no puede superar los 150 caracteres' });
      }
      if (!inscripcion_id) {
        return res.status(400).json({ error: 'inscripcion_id es obligatorio' });
      }

      // Longitud máxima según el DER: palabra varchar(150), traduccion varchar(255).
      // "definicion" es text (sin límite en el DER) y "estado" lo fuerza el controlador
      // más abajo, así que ninguna de las dos se valida aquí.
      const erroresLongitud = [];
      if (palabra.length > 150) {
        erroresLongitud.push(
          `El campo palabra no puede superar 150 caracteres (tiene ${palabra.length} caracteres).`
        );
      }
      if (traduccion.length > 255) {
        erroresLongitud.push(
          `El campo traduccion no puede superar 255 caracteres (tiene ${traduccion.length} caracteres).`
        );
      }
      if (erroresLongitud.length > 0) {
        return res.status(400).json({ error: erroresLongitud.join(' ') });
      }

      const fechaAporte = new Date();

      // c) buscar duplicado en el mazo (HU-1.3)
      const tarjetaExistente = await DeduplicacionService.buscarDuplicado(mazoId, palabra);

      if (!tarjetaExistente) {
        // d) sin duplicado: crea tarjeta nueva "pendiente_revision" + aporte (CA-1.2.1)
        const tarjetaNueva = await TarjetaRepository.crear({
          mazo_id: mazoId,
          palabra: DeduplicacionService.normalizarPalabra(palabra),
          traduccion,
          definicion,
          ejemplo: ejemplo ?? null,
          estado: 'pendiente_revision',
          fecha_creacion: fechaAporte,
          fecha_revision: null,
        });
        const aporte = await AporteRepository.crear({
          tarjeta_id: tarjetaNueva.id_tarjeta,
          inscripcion_id,
          traduccion_aportada: traduccion,
          definicion_aportada: definicion,
          ejemplo_aportado: ejemplo ?? null,
          tipo_aporte: 'creada',
          fecha_aporte: fechaAporte,
        });
        return res.status(201).json({ resultado: 'creada', tarjeta: tarjetaNueva, aporte });
      }

      // e)/f) hay duplicado: resolver coautoría (CA-1.3.1) vs. acepción adicional (CA-1.3.2).
      // En ambos casos NO se crea una tarjeta nueva -el índice único (mazo_id, palabra) del DER
      // lo impide-; se registra un aporte adicional sobre la tarjeta existente, sin sobrescribirla.
      const resolucion = DeduplicacionService.resolverAporte(tarjetaExistente, definicion, ejemplo ?? null);

      const aporte = await AporteRepository.crear({
        tarjeta_id: tarjetaExistente.id_tarjeta,
        inscripcion_id,
        traduccion_aportada: traduccion,
        definicion_aportada: definicion,
        ejemplo_aportado: ejemplo ?? null,
        tipo_aporte: resolucion.tipo,
        fecha_aporte: fechaAporte,
      });

      // g) "resultado" le indica al frontend qué aviso mostrar (CA-1.3.4)
      return res.status(201).json({ resultado: resolucion.tipo, tarjeta: tarjetaExistente, aporte });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Revisa si una palabra ya existe en un mazo, SIN crear ni modificar nada — es la
   * verificación previa que el frontend llama antes de que el estudiante confirme el
   * formulario, para mostrarle el aviso de coautoría/acepción nueva (CA-1.3.4).
   * La creación real sigue ocurriendo en crear() (POST /api/v1/decks/:id/cards), que vuelve
   * a correr esta misma comprobación en el servidor (nunca confía en que el frontend ya haya
   * llamado a este endpoint).
   * @param {import('express').Request} req - req.body debe traer: mazo_id, palabra
   * (obligatorios), definicion y ejemplo (para poder distinguir coautoría de acepción nueva).
   * @param {import('express').Response} res - 200 con { duplicado, resultado, tarjeta? } donde
   * resultado es 'creada' | 'coautoria' | 'acepcion_nueva'; 400 si faltan mazo_id o palabra;
   * 500 ante error inesperado.
   */
  async checkDuplicate(req, res) {
    try {
      const { mazo_id, palabra, definicion, ejemplo } = req.body;

      const mazoId = Number(mazo_id);
      if (Number.isNaN(mazoId)) {
        return res.status(400).json({ error: 'mazo_id inválido' });
      }
      if (!palabra) {
        return res.status(400).json({ error: 'El campo palabra es obligatorio' });
      }

      const tarjetaExistente = await DeduplicacionService.buscarDuplicado(mazoId, palabra);

      if (!tarjetaExistente) {
        return res.status(200).json({ duplicado: false, resultado: 'creada' });
      }

      const resolucion = DeduplicacionService.resolverAporte(tarjetaExistente, definicion, ejemplo ?? null);
      return res.status(200).json({
        duplicado: true,
        resultado: resolucion.tipo, // 'coautoria' | 'acepcion_nueva'
        tarjeta: tarjetaExistente,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtiene una tarjeta por su id_tarjeta, incluyendo sus etiquetas de contexto.
   * HU-2.2 (CA-2.2.3): "cuando el estudiante abre el detalle de la palabra, el sistema despliega
   * destacadamente las etiquetas de registro y variante regional asignadas por la docente".
   * @param {import('express').Request} req - req.params.id es el id_tarjeta a buscar.
   * @param {import('express').Response} res - 200 con { ...tarjeta, etiquetas_contexto }, 400 si
   * el id no es numérico, 404 si no existe, 500 ante error inesperado.
   */
  async obtenerPorId(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const tarjeta = await TarjetaRepository.obtenerPorId(id);
      if (!tarjeta) {
        return res.status(404).json({ error: 'Tarjeta no encontrada' });
      }
      const etiquetas = await EtiquetaContextoRepository.listarPorTarjeta(id);
      res.status(200).json({ ...tarjeta, etiquetas_contexto: etiquetas });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * HU-2.1 (CA-2.1.1) — Lista las tarjetas de un mazo, con filtro opcional por estado.
   * Ruta: GET /api/v1/decks/:id/cards?estado=pendiente_revision (panel de curaduría de la docente).
   * @param {import('express').Request} req - req.params.id = id_mazo; req.query.estado opcional.
   * @param {import('express').Response} res - 200 con el arreglo de tarjetas; 400 si el id no es
   * numérico; 404 si el mazo no existe; 500 ante error inesperado.
   */
  async listarPorMazo(req, res) {
    try {
      const mazoId = Number(req.params.id);
      if (Number.isNaN(mazoId)) {
        return res.status(400).json({ error: 'El id del mazo en la URL no es válido' });
      }
      const mazo = await MazoRepository.obtenerPorId(mazoId);
      if (!mazo) {
        return res.status(404).json({ error: 'Mazo no encontrado' });
      }
      const estado = typeof req.query.estado === 'string' ? req.query.estado : null;
      const tarjetas = await TarjetaRepository.listarPorMazo(mazoId, estado);
      res.status(200).json(tarjetas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Lista todas las tarjetas existentes, sin filtros.
   * @param {import('express').Request} req - No se usa (sin filtros ni paginación implementados).
   * @param {import('express').Response} res - 200 con el arreglo de tarjetas, 500 ante error inesperado.
   */
  async listar(req, res) {
    try {
      const tarjetas = await TarjetaRepository.listar();
      res.status(200).json(tarjetas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Actualiza todos los campos de una tarjeta existente (reemplazo completo vía PUT). No aplica
   * ninguna regla de HU-1.2/HU-1.3 (esas solo rigen la creación); es la edición genérica.
   * @param {import('express').Request} req - req.params.id es el id_tarjeta; req.body trae las
   * columnas nuevas de "tarjeta" (mazo_id, palabra, traduccion, definicion, ejemplo, estado, etc.).
   * @param {import('express').Response} res - 200 con la tarjeta actualizada, 400 si el id no es
   * numérico, 404 si no existe, 500 ante error inesperado.
   */
  async actualizar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const tarjeta = await TarjetaRepository.actualizar(id, req.body);
      if (!tarjeta) {
        return res.status(404).json({ error: 'Tarjeta no encontrada' });
      }
      res.status(200).json(tarjeta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Elimina una tarjeta por su id_tarjeta.
   * @param {import('express').Request} req - req.params.id es el id_tarjeta a eliminar.
   * @param {import('express').Response} res - 200 con { eliminado: true }, 400 si el id no es
   * numérico, 404 si no existía, 500 ante error inesperado.
   */
  async eliminar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }
      const eliminado = await TarjetaRepository.eliminar(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Tarjeta no encontrada' });
      }
      res.status(200).json({ eliminado: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * HU-2.1 — La docente revisa una tarjeta que dejó un estudiante y la aprueba (con correcciones
   * opcionales) o la rechaza. Ruta: PATCH /api/v1/cards/:id/approve.
   *
   * CA-2.1.2 (aprobar): con accion="aprobar" se aplican las correcciones enviadas (palabra,
   * traduccion, definicion, ejemplo — todas opcionales), la tarjeta pasa a "revisado_docente"
   * y queda habilitada para quices.
   * CA-2.1.3 (rechazar): con accion="rechazar" e "observacion" (obligatoria) la tarjeta pasa a
   * "rechazada". La observación NO se persiste y NO se notifica al estudiante — ver "supuestos
   * pendientes de validar" en CHANGELOG_BACKEND.md (el DER no tiene dónde guardarla).
   *
   * @param {import('express').Request} req - req.params.id = id_tarjeta; req.body = { accion,
   * palabra?, traduccion?, definicion?, ejemplo?, observacion? }.
   * @param {import('express').Response} res - 200 con { resultado, tarjeta }; 400 si accion es
   * inválida, faltan datos del rechazo o las correcciones violan longitudes/no-vacío del DER;
   * 404 si la tarjeta no existe; 409 si la tarjeta no está en "pendiente_revision"; 500 ante
   * error inesperado.
   */
  async aprobar(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }

      const { accion, palabra, traduccion, definicion, ejemplo, observacion } = req.body;

      if (!CuraduriaService.ACCIONES_VALIDAS.includes(accion)) {
        return res.status(400).json({
          error: `El campo accion es obligatorio y debe ser uno de: ${CuraduriaService.ACCIONES_VALIDAS.join(', ')}`,
        });
      }

      // CA-2.1.3: la docente "ingresa una observación" al rechazar.
      if (accion === 'rechazar' && (typeof observacion !== 'string' || !observacion.trim())) {
        return res.status(400).json({ error: 'Al rechazar una tarjeta, el campo observacion es obligatorio' });
      }

      const tarjeta = await TarjetaRepository.obtenerPorId(id);
      if (!tarjeta) {
        return res.status(404).json({ error: 'Tarjeta no encontrada' });
      }

      // CA-2.1.2 y CA-2.1.3 parten ambas de "una tarjeta en estado pendiente_revision".
      if (tarjeta.estado !== CuraduriaService.ESTADO_REVISABLE) {
        return res.status(409).json({
          error: `Solo se puede revisar una tarjeta en estado "${CuraduriaService.ESTADO_REVISABLE}" (estado actual: "${tarjeta.estado}")`,
        });
      }

      // Al aprobar con correcciones, se validan contra los mismos límites del DER que usa HU-1.2:
      // palabra varchar(150), traduccion varchar(255), ejemplo varchar(150). definicion es TEXT
      // (sin límite). palabra/traduccion/definicion son NOT NULL: si se envían, no pueden vaciarse.
      if (accion === 'aprobar') {
        const erroresLongitud = [];
        if (palabra !== undefined && String(palabra).length > 150) {
          erroresLongitud.push(`palabra no puede superar 150 caracteres (tiene ${String(palabra).length}).`);
        }
        if (traduccion !== undefined && String(traduccion).length > 255) {
          erroresLongitud.push(`traduccion no puede superar 255 caracteres (tiene ${String(traduccion).length}).`);
        }
        if (ejemplo !== undefined && ejemplo !== null && String(ejemplo).length > 150) {
          erroresLongitud.push(`ejemplo no puede superar 150 caracteres (tiene ${String(ejemplo).length}).`);
        }
        if (erroresLongitud.length > 0) {
          return res.status(400).json({ error: erroresLongitud.join(' ') });
        }

        const vacios = [];
        if (palabra !== undefined && !String(palabra).trim()) vacios.push('palabra');
        if (traduccion !== undefined && !String(traduccion).trim()) vacios.push('traduccion');
        if (definicion !== undefined && !String(definicion).trim()) vacios.push('definicion');
        if (vacios.length > 0) {
          return res.status(400).json({
            error: `Estos campos no pueden quedar vacíos: ${vacios.join(', ')}`,
          });
        }
      }

      const datosRevisados = CuraduriaService.construirTarjetaRevisada(
        tarjeta,
        { accion, palabra, traduccion, definicion, ejemplo, observacion },
        new Date()
      );
      const actualizada = await TarjetaRepository.actualizar(id, datosRevisados);

      const respuesta = {
        resultado: actualizada.estado, // 'revisado_docente' | 'rechazada'
        tarjeta: actualizada,
      };

      // CA-2.1.3: al rechazar, notificar al estudiante que originó la tarjeta.
      if (accion === 'rechazar') {
        const aportante = await AporteRepository.obtenerAportanteCreador(id);
        if (aportante) {
          respuesta.notificacion = await NotificacionRepository.crear({
            usuario_id: aportante.estudiante_id,
            tarjeta_id: id,
            tipo: 'tarjeta_rechazada',
            mensaje: CuraduriaService.mensajeRechazo(actualizada, observacion),
          });
        } else {
          // No se halló el aporte 'creada' (datos inconsistentes): la tarjeta igual queda
          // rechazada y con motivo, pero no hay a quién notificar.
          respuesta.notificacion = null;
          respuesta.aviso = 'Tarjeta rechazada, pero no se encontró el aporte de creación para notificar al estudiante.';
        }
      }
      return res.status(200).json(respuesta);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * HU-2.2 (CA-2.2.1) — La docente asigna a una tarjeta el registro y/o la variante dialectal.
   * Ruta: PUT /api/v1/cards/:id/context. Semántica PUT = reemplazo: por cada tipo que venga en
   * el body se hace UPSERT en "etiqueta_contexto" (índice único (tarjeta_id, tipo) de la
   * migración 002), dejando una sola fila por tipo.
   *
   * Convención de valores de la columna "tipo": "registro" y "variante_dialectal".
   *
   * @param {import('express').Request} req - req.params.id = id_tarjeta; req.body = { registro?,
   * variante_dialectal? } (al menos uno).
   * @param {import('express').Response} res - 200 con { tarjeta_id, etiquetas }; 400 si no se
   * envía ninguno de los dos o violan el límite varchar(150)/no-vacío del DER; 404 si la tarjeta
   * no existe; 500 ante error inesperado.
   */
  async asignarContexto(req, res) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'id inválido' });
      }

      const { registro, variante_dialectal } = req.body;

      if (registro === undefined && variante_dialectal === undefined) {
        return res.status(400).json({
          error: 'Debe enviar al menos uno de: registro, variante_dialectal',
        });
      }

      // "valor" es varchar(150) NOT NULL en el DER.
      const errores = [];
      if (registro !== undefined) {
        if (!String(registro).trim()) errores.push('registro no puede quedar vacío');
        else if (String(registro).length > 150) errores.push('registro no puede superar 150 caracteres');
      }
      if (variante_dialectal !== undefined) {
        if (!String(variante_dialectal).trim()) errores.push('variante_dialectal no puede quedar vacío');
        else if (String(variante_dialectal).length > 150) errores.push('variante_dialectal no puede superar 150 caracteres');
      }
      if (errores.length > 0) {
        return res.status(400).json({ error: errores.join('. ') });
      }

      const tarjeta = await TarjetaRepository.obtenerPorId(id);
      if (!tarjeta) {
        return res.status(404).json({ error: 'Tarjeta no encontrada' });
      }

      const ahora = new Date();
      if (registro !== undefined) {
        await EtiquetaContextoRepository.upsert({
          tarjeta_id: id,
          tipo: 'registro',
          valor: String(registro).trim(),
          fecha_asignacion: ahora,
        });
      }
      if (variante_dialectal !== undefined) {
        await EtiquetaContextoRepository.upsert({
          tarjeta_id: id,
          tipo: 'variante_dialectal',
          valor: String(variante_dialectal).trim(),
          fecha_asignacion: ahora,
        });
      }

      const etiquetas = await EtiquetaContextoRepository.listarPorTarjeta(id);
      return res.status(200).json({ tarjeta_id: id, etiquetas });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
