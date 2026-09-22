/**
 * @file courseRoutes.js
 * @brief Rutas REST de Curso, requeridas por el frontend. Montadas en app.js bajo el prefijo
 * /api/v1/courses.
 *
 * Nombre de URL en inglés ("courses") por consistencia con decks/cards; los campos del body y
 * de la respuesta siguen en español, alineados al DER (id_curso, nombre, periodo, docente_id, etc.).
 */

import { Router } from 'express';
import { CursoController } from '../controllers/CursoController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { InscripcionController } from '../controllers/InscripcionController.js';

const router = Router();

/**
 * @brief Crea un curso nuevo. POST /api/v1/courses
 * @note No hay CA que especifique un rol exclusivo para crear cursos; solo se exige sesión
 * iniciada (CA-5.4.2 no se aplica aquí porque no está documentado como acción docente-only).
 */
router.post('/', authenticate, CursoController.crear);

/** @brief Lista todos los cursos existentes, sin filtros. GET /api/v1/courses */
router.get('/', CursoController.listar);

router.post('/enroll', InscripcionController.inscribirsePorCodigo);

router.post('/:id/access-code', InscripcionController.generarCodigoAcceso);

router.post('/:id/assign', InscripcionController.asignarPorCorreo);

/** @brief Consulta un curso por su id_curso. GET /api/v1/courses/:id */
router.get('/:id', CursoController.obtenerPorId);

export default router;
