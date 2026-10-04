import { Router } from 'express';
import { CursoController } from '../controllers/CursoController.js';
import {
  authenticate,
  requireRole,
} from '../middleware/autenticacionMiddleware.js';
import { InscripcionController } from '../controllers/InscripcionController.js';

const router = Router();

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.post('/', CursoController.crear);

router.get('/', CursoController.listar);

// HU-014: inscripción mediante código de acceso
router.post(
  '/enroll',
  InscripcionController.inscribirsePorCodigo
);

// HU-014: generar código de acceso para un curso
router.post(
  '/:id/access-code',
  InscripcionController.generarCodigoAcceso
);

// HU-014: asignar directamente un estudiante por correo
router.post(
  '/:id/assign',
  InscripcionController.asignarPorCorreo
);

// HU-014: listar estudiantes inscritos en un curso
// Solo disponible para docentes.
router.get(
  '/:id/students',
  authenticate,
  requireRole('docente'),
  InscripcionController.listarEstudiantesPorCurso
);

router.get('/:id', CursoController.obtenerPorId);

// TODO: agregar validationMiddleware aquí cuando esté implementado
router.put('/:id', CursoController.actualizar);

router.delete('/:id', CursoController.eliminar);

export default router;