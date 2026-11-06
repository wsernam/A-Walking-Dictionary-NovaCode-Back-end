/**
 * @file inscripcionRoutes.js
 * @brief Rutas REST (CRUD genérico) del recurso Inscripcion: POST /, GET /, GET /:id,
 * PUT /:id, DELETE /:id.
 *
 * @warning Este router NO está montado en app.js (solo lo importa routes/index.js, que tampoco se
 * usa) y sus rutas no llevan authenticate ni requireRole. Si algún día se monta, hay que
 * protegerlas antes. Las rutas vigentes de inscripción (HU-5.3) están en cursoRoutes.js:
 * POST /courses/enroll, POST /courses/:id/assign y POST /courses/:id/access-code.
 */
import { Router } from 'express';
import { InscripcionController } from '../controllers/InscripcionController.js';

const router = Router();

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.post('/', InscripcionController.crear);

router.get('/', InscripcionController.listar);
router.get('/:id', InscripcionController.obtenerPorId);

// TODO: agregar validacionMiddleware aquí cuando esté implementado
router.put('/:id', InscripcionController.actualizar);

router.delete('/:id', InscripcionController.eliminar);

export default router;