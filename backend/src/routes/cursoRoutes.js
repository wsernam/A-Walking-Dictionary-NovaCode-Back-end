/**
 * @file cursoRoutes.js
 * @brief Rutas REST de Curso, requeridas por el frontend. Montadas en app.js bajo el prefijo
 * /api/v1/courses.
 *
 * Nombre de URL en inglés ("courses") por consistencia con decks/cards; los campos del body y
 * de la respuesta siguen en español, alineados al DER (id_curso, nombre, periodo, docente_id, etc.).
 */

import { Router } from 'express';
import { CursoController } from '../controllers/CursoController.js';
import { authenticate, requireRole, autenticacionOpcional } from '../middleware/autenticacionMiddleware.js';
import { InscripcionController } from '../controllers/InscripcionController.js';

const router = Router();

/**
 * @brief Crea un curso nuevo. POST /api/v1/courses
 * @note Solo docente (OWASP H-13): docente_id se toma del token, no del body.
 */
router.post('/', authenticate, requireRole('docente'), CursoController.crear);

/** @brief Lista todos los cursos existentes, sin filtros. GET /api/v1/courses */
router.get('/',  autenticacionOpcional, CursoController.listar);

// HU-014: inscripción mediante código de acceso
router.post('/enroll',   authenticate,  requireRole('estudiante'),InscripcionController.inscribirsePorCodigo);

// HU-014: generar código de acceso para un curso
router.post('/:id/access-code', authenticate,  requireRole('docente'), InscripcionController.generarCodigoAcceso);

// HU-014: asignar directamente un estudiante por correo
router.post('/:id/assign', authenticate,  requireRole('docente'), InscripcionController.asignarPorCorreo);

// HU-014: listar estudiantes inscritos en un curso. Solo disponible para docentes.
router.get(
  '/:id/students',
  authenticate,
  requireRole('docente'),
  InscripcionController.listarEstudiantesPorCurso
);

/** @brief Consulta un curso por su id_curso. GET /api/v1/courses/:id */
router.get('/:id',   autenticacionOpcional, CursoController.obtenerPorId);

export default router;
