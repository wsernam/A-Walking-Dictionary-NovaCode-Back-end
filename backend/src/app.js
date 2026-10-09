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
 *   - GET  /api/v1/cards/approved                       (sin CA explícito; agregado por pedido del equipo)
 *   - GET  /api/v1/cards/:id                            (incluye etiquetas de contexto)
 *   - PUT  /api/v1/cards/:id                            (CA-2.1.2, editar/corregir)
 *   - PATCH /api/v1/cards/:id/approve                   (CA-2.1.2, aprobar — SIN rechazo)
 *   - PUT  /api/v1/cards/:id/context                    (CA-2.2.1)
 *   - PATCH /api/v1/decks/:id/default-variant           (CA-2.2.2, asignación masiva)
 *   - GET  /api/v1/teacher/analytics/deck/:id           (CA-2.3.1/CA-2.3.2)
 *
 *   Cursos, requeridos por el frontend:
 *   - POST /api/v1/courses
 *   - GET  /api/v1/courses
 *   - GET  /api/v1/courses/:id
 *
 *   HE-03 (HU-3.1 generación de quiz, HU-3.2 envío de respuestas, HU-3.3 exportación a PDF):
 *   - POST /api/v1/quizzes/generate              (CA-3.1.1, CA-3.1.2, CA-3.1.3)
 *   - GET  /api/v1/quizzes                        (estado_efectivo calculado en cada consulta)
 *   - GET  /api/v1/quizzes/:id                    (idem)
 *   - POST /api/v1/quizzes/:id/submit             (CA-3.2.1, CA-3.2.2, CA-3.2.3)
 *   - GET  /api/v1/quizzes/:id/export-pdf         (CA-3.3.2, endpoint adicional — el backlog
 *     solo documenta export-pdf para mazos, no para quizzes; ver docs/CHANGELOG_BACKEND.md)
 *   - GET  /api/v1/decks/:id/export-pdf           (CA-3.3.1, CA-3.3.3)
 *
 *   HE-05 (HU-5.4 — login con Google/OAuth y control de roles; HU-5.2 — configurar perfil
 *   académico; HU-5.1/5.3 quedan fuera de esta rama):
 *   - POST /api/v1/auth/google                          (CA-5.4.1, login vía Google/OAuth)
 *   - PATCH /api/v1/users/profile                       (CA-5.2.1 + CA-5.2.2, campo "intereses")
 *   - GET  /api/v1/users/:id                             (shape de perfil, ver PerfilService.js)
 *   - GET  /api/v1/students/:id/context                  (contexto académico, desde la inscripción)
 *
 *   Control de acceso (CA-5.4.2): las rutas de creación/edición exigen JWT propio válido
 *   (middleware authenticate, emitido por AutenticacionService tras validar el token de Google); las de
 *   curaduría/analítica docente (HE-02) exigen además rol "docente" (middleware requireRole).
 *   Las rutas GET de decks/cards/courses quedan sin autenticación para cubrir el acceso de solo
 *   lectura de Invitado (CA-5.4.3) — no hay endpoint de "diccionario demostrativo" definido en
 *   el backlog, se interpretó así.
 *
 *   @note Perfil (auditoría OWASP H-01): /users/profile y /users/:id exigen JWT; en /users/:id el
 *   estudiante solo ve su propio perfil y la docente cualquiera. Se eliminaron POST/GET/PUT/DELETE
 *   genéricos de /users (públicos y sin uso). /students/:id/context sigue sin authenticate:
 *   pendiente de H-03.
 *
 *   @note El login por email/password con bcrypt (POST /api/v1/auth/login) que existía antes en
 *   esta rama se ELIMINÓ: el profesor pidió reemplazarlo por OAuth (Google) después de la
 *   primera entrega. Ver docs/FLUJO_AUTENTICACION.md para el detalle completo del cambio.
 *
 * @note El resto de controladores/rutas de las entidades genéricas (inscripcion,
 * etiqueta_contexto vía CRUD directo, progreso_estudio, quiz_mazo, pregunta_quiz,
 * respuesta_quiz, y actualizar/eliminar curso/aporte) ya existen en
 * src/controllers/ y src/repositories/, pero NO se montan aquí todavía.
 */

import express from 'express';
import cors from 'cors';
import mazoRoutes from './routes/mazoRoutes.js';
import tarjetaRoutes from './routes/tarjetaRoutes.js';
import cursoRoutes from './routes/cursoRoutes.js';
import analiticaRoutes from './routes/analiticaRoutes.js';
import autenticacionRoutes from './routes/autenticacionRoutes.js';
import estudioRoutes from './routes/estudioRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import estudianteRoutes from './routes/estudianteRoutes.js';
import aporteRoutes from './routes/aporteRoutes.js';
import quizRoutes from './routes/quizRoutes.js';

/** @brief Instancia principal de la aplicación Express. */
const app = express();

//para comprobar que el backend esta funcionando
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'a-walking-dictionary-backend'
  });
});



app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', autenticacionRoutes);
app.use('/api/v1/decks', mazoRoutes);
app.use('/api/v1/cards', tarjetaRoutes);
app.use('/api/v1/courses', cursoRoutes);
app.use('/api/v1/teacher/analytics', analiticaRoutes);
app.use('/api/v1/study', estudioRoutes);
app.use('/api/v1/users', usuarioRoutes);
app.use('/api/v1/students', estudianteRoutes);
app.use('/api/v1/aportes', aporteRoutes);
app.use('/api/v1/quizzes', quizRoutes);

export default app;
