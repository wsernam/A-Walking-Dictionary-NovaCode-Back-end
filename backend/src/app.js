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
 *   - GET  /api/v1/cards/pending
 *   - GET  /api/v1/cards/approved
 *   - GET  /api/v1/cards/:id
 *   - PUT  /api/v1/cards/:id
 *   - PATCH /api/v1/cards/:id/approve
 *   - PUT  /api/v1/cards/:id/context
 *   - PATCH /api/v1/decks/:id/default-variant
 *   - GET  /api/v1/teacher/analytics/deck/:id
 *   - DELETE /api/v1/contributions/:id
 *
 *   Cursos:
 *   - POST /api/v1/courses
 *   - GET  /api/v1/courses
 *   - GET  /api/v1/courses/:id
 *
 *   HE-05:
 *   - POST /api/v1/auth/google
 *   - PATCH /api/v1/users/profile
 *   - GET  /api/v1/users/:id
 *   - GET  /api/v1/students/:id/context
 */

import express from 'express';
import cors from 'cors';
import deckRoutes from './routes/deckRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import contributionRoutes from './routes/contributionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import studyRoutes from './routes/studyRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import aporteRoutes from './routes/aporteRoutes.js';

/** @brief Instancia principal de la aplicación Express. */
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/decks', deckRoutes);
app.use('/api/v1/cards', cardRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/contributions', contributionRoutes);
app.use('/api/v1/teacher/analytics', analyticsRoutes);
app.use('/api/v1/study', studyRoutes);
app.use('/api/v1/users', usuarioRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/aportes', aporteRoutes);

export default app;