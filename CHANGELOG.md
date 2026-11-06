# Changelog

Todos los cambios relevantes del back-end se documentan aquí. El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Aún no se ha publicado ninguna versión (no hay etiquetas de git; `backend/package.json` está en 0.1.0), por eso todo está en «Sin publicar».

Notas:
- Fechas en formato AAAA-MM-DD. `#N` es el número del Pull Request.
- `HU-x.y` es la numeración del backlog; `HU-0xx` es la numeración de sprint del equipo.
- Este es un resumen. El detalle técnico por sesión está en [`docs/CHANGELOG_BACKEND.md`](docs/CHANGELOG_BACKEND.md).

## [Sin publicar]

### Agregado
- 2026-11-04 · HU-021: `GET /api/v1/reports/quizzes/:id/results/export-pdf`, PDF de resultados por quiz (solo docente). (#44)
- 2026-11-03 · HU-018: `GET /api/v1/reports/students/:id/progress/export-pdf`, PDF de progreso individual. (#41)
- 2026-10-30 · HU-019: `GET /api/v1/reports/study-mode/export-pdf`, PDF del modo de estudio. (#37)
- 2026-10-30 a 2026-11-04 · Herramienta HITL: SUPERPROMPT, trazabilidad y bitácora de PR con IA (`tools/hitl/`, `docs/ai/`). (#38, #42)
- 2026-10-22 · Plantilla de Pull Request. (#34)
- 2026-10-21 · Campo `code` fijo en inglés en toda respuesta de error (`docs/codigos-error.md`). (#32)
- 2026-10-18 · Suite OWASP y su workflow.
- 2026-10-17 · Suite de pruebas funcionales de la API con su workflow (#29) y resumen en CI (#30).
- 2026-10-11 · HU-3.2: `GET /api/v1/quizzes/mine` y `GET /api/v1/quizzes/:id/result`. (#26)
- 2026-10-10 · Pruebas unitarias con Vitest, SonarQube Cloud y CodeQL. (#26)
- 2026-10-10 · HU-016: diccionario global (`/api/v1/dictionary`).
- 2026-10-09 · HU-011: sugerencias léxicas con WordNet (`/api/v1/enrichment`).
- 2026-10-07 · HU-3.3: nuevo diseño de los PDF (#17) y `GET /api/v1/quizzes/:id/export-pdf` (solo docente, #16).
- 2026-10-05 · HU-1.1: edición de mazos con control de propiedad del docente. (#12)
- 2026-10-04 · HU-3.1 (generar quiz), HU-3.2 (responder quiz) y HU-3.3 (exportar PDF), primera implementación. (#13, #14, #16)
- 2026-09-13 a 2026-09-30 · Base del proyecto: quiz y exportación a PDF (09-13), login con Google/OAuth y control de roles (09-18), perfil académico (09-18), coautorías con columna `aporte.estado` (09-23) y registro de estudiantes (09-24).

### Cambiado
- 2026-10-11 · `POST`, `PUT` y `DELETE /quizzes` exigen rol docente; `GET /quizzes` y `GET /quizzes/:id` exigen token.
- 2026-10-08 · HU-3.1 alineada con el contrato del front: mínimo 4 traducciones distintas, ventana de apertura-cierre, validación de curso y mazos, título de máximo 200 caracteres.

### Corregido
- 2026-11-01 · Las tarjetas pendientes incluyen el nombre del estudiante. (#39)
- 2026-10-21 · `WordnetService` responde 400 (en vez de 500) ante una palabra vacía o de más de 150 caracteres. (#32)
- 2026-10-18 · Zona horaria: los `TIMESTAMP` de la BD se leen y escriben en UTC. (#27, #28)
- 2026-10-01 · HU-2.3: la analítica de participación ya no oculta estudiantes.
- 2026-09-30 · HU-1.2: solo aportan estudiantes inscritos. HU-4.1: el repaso ya no se queda sin tarjetas.

### Seguridad
Hallazgos de la [auditoría OWASP Top 10:2025](backend/Auditoria_OWASP_Top10_2025.md):
- 2026-10-30 · Límite de peticiones en los reportes PDF (CodeQL `js/missing-rate-limiting`). (#37)
- 2026-10-22 · H-11: barajado de preguntas del quiz con `node:crypto`. (#33)
- 2026-10-21 · H-11: código de acceso al curso con `node:crypto`. (#31)
- 2026-10-09 · H-07: cabeceras `helmet`, CORS restringido y límite de intentos en `/auth`. (#25)
- 2026-10-09 · H-02: control de acceso en cursos e inscripciones; H-05: RLS en las tablas de Supabase.
- 2026-10-08 · H-01: eliminado el CRUD público de `/users`; `GET /users/:id` exige JWT.
- 2026-10-08 · H-03: IDOR cerrado en estudio y perfil. (#24)
- 2026-10-08 · H-08: errores genéricos. (#21)
- 2026-10-08 · H-09: registro de eventos de seguridad (401/403/5xx).
- 2026-10-08 · H-13: el docente se toma del token. (#22)
- 2026-10-09 / 10-16 / 10-22 / 10-30 · H-10: actualizaciones de dependencias vulnerables.