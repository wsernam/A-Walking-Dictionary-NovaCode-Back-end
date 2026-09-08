// Configuración de la aplicación Express: middlewares globales y montaje de rutas.
// No arranca el servidor HTTP (eso ocurre en server.js).
//
// Endpoints expuestos hoy:
//   HE-01 (Tareas Técnicas de HU-1.1/1.2/1.3):
//     POST  /api/v1/decks
//     POST  /api/v1/decks/:id/cards
//     POST  /api/v1/cards/check-duplicate
//   HE-02 (Supervisión y Curaduría Pedagógica Docente, HU-2.1/2.2/2.3):
//     GET   /api/v1/decks/:id/cards            (CA-2.1.1, filtro ?estado=)
//     PATCH /api/v1/cards/:id/approve          (CA-2.1.2 / CA-2.1.3)
//     PUT   /api/v1/cards/:id/context          (CA-2.2.1)
//     PATCH /api/v1/decks/:id/context          (CA-2.2.2)
//     GET   /api/v1/cards/:id                  (CA-2.2.3, con etiquetas_contexto)
//     GET   /api/v1/teacher/analytics/deck/:id (CA-2.3.1 / CA-2.3.2)
//     GET   /api/v1/notifications              (CA-2.1.3, lado del estudiante)
//     PATCH /api/v1/notifications/:id/read
//
// HE-02 depende de la migración 002 (migrations/002_he02_correcciones_der.sql): agrega
// tarjeta.motivo_rechazo, el índice único etiqueta_contexto(tarjeta_id, tipo) y la tabla
// notificacion. Es una PROPUESTA de corrección al DER pendiente de aprobar en Slack.
//
// El resto de controladores/rutas de las otras entidades (usuario, curso, inscripcion,
// aporte, etiqueta_contexto, progreso_estudio, quiz, quiz_mazo, pregunta_quiz, resultado_quiz,
// respuesta_quiz) ya existen en src/controllers/ y src/routes/, pero NO se montan aquí todavía
// por pedido explícito del equipo — quedan disponibles para cuando se decida exponerlos.
//
// NOTA (HE-02): ninguna de estas rutas valida autenticación ni rol Docente todavía
// (authMiddleware.js sigue aplazado, igual que en el resto del proyecto). Ver
// CHANGELOG_BACKEND.md → "supuestos pendientes de validar".

import express from 'express';
import cors from 'cors';
import deckRoutes from './routes/deckRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/decks', deckRoutes);
app.use('/api/v1/cards', cardRoutes);
app.use('/api/v1/teacher', teacherRoutes);
app.use('/api/v1/notifications', notificationRoutes);

export default app;
