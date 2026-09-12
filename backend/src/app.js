/**
 * @file app.js
 * @brief Configuración de la aplicación Express: middlewares globales y montaje de rutas.
 *
 * No arranca el servidor HTTP (eso ocurre en server.js). Endpoints expuestos actualmente:
 *
 *   HE-01 (Tareas Técnicas de HU-1.1/1.2/1.3):
 *   - POST /api/v1/decks
 *   - GET  /api/v1/decks
 *   - GET  /api/v1/decks/:id
 *   - PATCH /api/v1/decks/:id/estado
 *   - POST /api/v1/decks/:id/cards
 *   - DELETE /api/v1/decks/:id
 *   - POST /api/v1/cards/check-duplicate
 *
 *   HE-02 (HU-2.1 revisión/curaduría, HU-2.2 contexto, HU-2.3 analíticas):
 *   - GET  /api/v1/cards/pending                       (CA-2.1.1)
 *   - GET  /api/v1/cards/:id                            (incluye etiquetas de contexto)
 *   - PUT  /api/v1/cards/:id                            (CA-2.1.2, editar/corregir)
 *   - PATCH /api/v1/cards/:id/approve                   (CA-2.1.2, aprobar — SIN rechazo)
 *   - PUT  /api/v1/cards/:id/context                    (CA-2.2.1)
 *   - PATCH /api/v1/decks/:id/default-variant           (CA-2.2.2, asignación masiva)
 *   - GET  /api/v1/teacher/analytics/deck/:id           (CA-2.3.1/CA-2.3.2)
 *   - DELETE /api/v1/contributions/:id                  (rechazo de coautoría/acepción nueva,
 *     ÚNICO punto de rechazo del sistema — ver contributionRoutes.js)
 *
 *   Cursos, requeridos por el frontend:
 *   - POST /api/v1/courses
 *   - GET  /api/v1/courses
 *   - GET  /api/v1/courses/:id
 *
 * @note El resto de controladores/rutas de las entidades genéricas (usuario, inscripcion,
 * etiqueta_contexto vía CRUD directo, progreso_estudio, quiz, quiz_mazo, pregunta_quiz,
 * resultado_quiz, respuesta_quiz, y actualizar/eliminar curso/aporte) ya existen en
 * src/controllers/ y src/repositories/, pero NO se montan aquí todavía.
 */

import express from 'express';
import cors from 'cors';
import deckRoutes from './routes/deckRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import contributionRoutes from './routes/contributionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

/** @brief Instancia principal de la aplicación Express. */
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/decks', deckRoutes);
app.use('/api/v1/cards', cardRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/contributions', contributionRoutes);
app.use('/api/v1/teacher/analytics', analyticsRoutes);

export default app;
