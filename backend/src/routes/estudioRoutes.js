import { Router } from 'express';
import { EstudioController } from '../controllers/EstudioController.js';

const router = Router();

router.post('/review-session', EstudioController.iniciarSesion);

router.post('/review-session/review', EstudioController.registrarValoracion);

export default router;