// Controlador REST de Tarjeta: recibe la petición HTTP, aplica las reglas de HU-1.2 y HU-1.3
// (mazo abierto, campos obligatorios, deduplicación) y llama a los repositorios correspondientes.
// Cuando exista lógica de negocio adicional en services/ para otras HU, se insertará sin cambiar
// esta firma.

import { TarjetaRepository } from '../repositories/TarjetaRepository.js';
import { MazoRepository } from '../repositories/MazoRepository.js';
import { AporteRepository } from '../repositories/AporteRepository.js';
import { DeduplicacionService } from '../services/DeduplicacionService.js';
import { CuraduriaService } from '../services/CuraduriaService.js';
import { ContextoService } from '../services/ContextoService.js';


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
   * Obtiene una tarjeta por su id_tarjeta.
   * @param {import('express').Request} req - req.params.id es el id_tarjeta a buscar.
   * @param {import('express').Response} res - 200 con la tarjeta, 400 si el id no es numérico,
   * 404 si no existe, 500 ante error inesperado.
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
      res.status(200).json(tarjeta);
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

  async editarRevision(req, res) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        error: 'id inválido',
      });
    }

    const tarjeta = await CuraduriaService.editarTarjeta(
      id,
      req.body
    );

    res.status(200).json({
      mensaje: 'Tarjeta actualizada correctamente',
      tarjeta,
    });
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.message,
      });
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

  async listarPendientes(req, res) {
  try {
    const tarjetas = await CuraduriaService.listarPendientes();

    res.status(200).json(tarjetas);
    } catch (error) {
    res.status(error.status || 500).json({
      error: error.message,
    });
    }
  },

  async aprobar(req, res) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        error: 'id inválido',
      });
    }

    const tarjeta = await CuraduriaService.aprobarTarjeta(id);

    res.status(200).json({
      mensaje: 'Tarjeta aprobada correctamente',
      tarjeta,
    });
    } catch (error) {
      res.status(error.status || 500).json({
        error: error.message,
      });
    }
  },


  async actualizarContexto(req, res) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        error: 'id inválido',
      });
    }

    const resultado = await ContextoService.actualizarContexto(
      id,
      req.body
    );

    res.status(200).json({
      mensaje: 'Contexto actualizado correctamente',
      etiquetas: resultado,
    });

  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message,
    });
    }
  }



};
