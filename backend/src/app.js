/**
 * @file app.js
 * @brief Configuración de la aplicación Express: middlewares globales y montaje de rutas.
 *
 * No arranca el servidor HTTP (eso ocurre en server.js). Endpoints expuestos actualmente:
 *   HE-01 (Tareas Técnicas de HU-1.1/1.2/1.3):
 *   - POST /api/v1/decks
 *   - GET  /api/v1/decks
 *   - GET  /api/v1/decks/:id
 *   - PATCH /api/v1/decks/:id/estado
 *   - POST /api/v1/decks/:id/cards
 *   - DELETE /api/v1/decks/:id
 *   - POST /api/v1/cards/check-duplicate
 *   - GET  /api/v1/cards/:id
 *   - PUT  /api/v1/cards/:id
 *   - PATCH /api/v1/cards/:id/approve (flujo de revisión individual, SIN rechazo)
 *   - DELETE /api/v1/contributions/:id (flujo de coautoría/acepción nueva, ÚNICO rechazo)
 *   Cursos, requeridos por el frontend:
 *   - POST /api/v1/courses
 *   - GET  /api/v1/courses
 *   - GET  /api/v1/courses/:id
 *
 * @note El resto de controladores/rutas de las entidades genéricas (usuario, inscripcion,
 * etiqueta_contexto, progreso_estudio, quiz, quiz_mazo, pregunta_quiz, resultado_quiz,
 * respuesta_quiz, y actualizar/eliminar curso/aporte) ya existen en src/controllers/ y
 * src/repositories/, pero NO se montan aquí todavía — quedan disponibles para cuando se
 * decida exponerlos.
 */

import express from 'express';
import cors from 'cors';
import deckRoutes from './routes/deckRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import contributionRoutes from './routes/contributionRoutes.js';

/** @brief Instancia principal de la aplicación Express. */
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/decks', deckRoutes);
app.use('/api/v1/cards', cardRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/contributions', contributionRoutes);

export default app;
