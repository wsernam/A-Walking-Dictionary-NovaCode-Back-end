/**
 * @file app.js
 * @brief Configuración de la aplicación Express: middlewares globales y montaje de rutas.
 *
 * No arranca el servidor HTTP (eso ocurre en server.js). Solo se exponen los endpoints de
 * HE-01 (Tareas Técnicas de HU-1.1/1.2/1.3):
 *   - POST /api/v1/decks
 *   - GET  /api/v1/decks
 *   - GET  /api/v1/decks/:id
 *   - PATCH /api/v1/decks/:id/estado
 *   - POST /api/v1/decks/:id/cards
 *   - DELETE /api/v1/decks/:id
 *   - POST /api/v1/cards/check-duplicate
 *
 * @note El resto de controladores/rutas de las otras 12 entidades (usuario, curso,
 * inscripcion, aporte, etiqueta_contexto, progreso_estudio, quiz, quiz_mazo, pregunta_quiz,
 * resultado_quiz, respuesta_quiz) ya existen en src/controllers/ y src/routes/, pero NO se
 * montan aquí todavía por pedido explícito del equipo — quedan disponibles para cuando se
 * decida exponerlos.
 */

import express from 'express';
import cors from 'cors';
import deckRoutes from './routes/deckRoutes.js';
import cardRoutes from './routes/cardRoutes.js';

/** @brief Instancia principal de la aplicación Express. */
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/decks', deckRoutes);
app.use('/api/v1/cards', cardRoutes);

export default app;
