import { Router } from 'express';
import { AporteController } from '../controllers/AporteController.js';

const router = Router();

router.get('/pending', AporteController.listarPendientes);

router.post('/', AporteController.crear);
router.get('/', AporteController.listar);
router.get('/:id', AporteController.obtenerPorId);
router.put('/:id', AporteController.actualizar);
router.patch('/:id/approve', AporteController.aprobar);
router.delete('/:id', AporteController.eliminar);

export default router;