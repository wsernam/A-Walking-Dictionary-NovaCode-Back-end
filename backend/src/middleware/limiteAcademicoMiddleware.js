import rateLimit from 'express-rate-limit';

// Cada instancia mantiene su propio contador por IP.
export function crearLimiteAcademico() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
      code: 'RATE_LIMITED',
    },
  });
}