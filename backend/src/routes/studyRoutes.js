import { Router } from 'express';
import { StudyController } from '../controllers/StudyController.js';

const router = Router();

router.post('/review-session', StudyController.iniciarSesion);

router.post('/review-session/review', StudyController.registrarValoracion);

export default router;