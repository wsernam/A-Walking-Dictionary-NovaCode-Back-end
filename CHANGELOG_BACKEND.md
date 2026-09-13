# Changelog - Estructura Backend

## Fecha
2026-09-13 (última actualización — ver historial de sesiones más abajo)

## Cambios aplicados en esta sesión (2026-09-13) — HE-03: quiz acumulativo, envío de respuestas y exportación a PDF

Implementación de HU-3.1 (generar quiz), HU-3.2 (responder y calificar) y HU-3.3 (exportar a PDF).
Las tablas `quiz`, `quiz_mazo`, `pregunta_quiz`, `resultado_quiz` y `respuesta_quiz` ya existían en
el DER oficial (`init.sql`) y ya tenían CRUD genérico (modelo/repositorio/controlador/rutas) de una
sesión anterior — **corrección al "Pendiente" de la sección de abajo**: esas 3 tablas SÍ tienen las
4 capas desde antes de esta sesión, solo que sin lógica de negocio y sin montar en `app.js`. Esta
sesión extendió esas capas existentes en vez de crear archivos nuevos, siguiendo el mismo patrón de
"controlador genérico + service con la lógica de negocio" que ya usa `MazoController`/`ContextoService`.

### Archivos modificados
- `backend/src/repositories/TarjetaRepository.js` — nuevo método `listarAprobadasPorMazos(mazoIds)` (CA-3.1.1: pool exclusivo de tarjetas `revisado_docente` de los mazos elegidos).
- `backend/src/repositories/PreguntaQuizRepository.js` — nuevo método `listarPorQuiz(quiz_id)`.
- `backend/src/repositories/QuizMazoRepository.js` — nuevo método `listarPorQuiz(quiz_id)`.
- `backend/src/repositories/RespuestaQuizRepository.js` — nuevo método `listarPorResultado(resultado_id)`.
- `backend/src/services/QuizService.js` — antes vacío/stub; ahora implementa `generar()` (HU-3.1), `calcularEstadoEfectivo()`/`conEstadoEfectivo()` (CA-3.1.3, estado programado→abierto→cerrado calculado en cada consulta, sin cron) y `enviarRespuestas()` (HU-3.2, incluye CA-3.2.3 de bloqueo de reintento).
- `backend/src/services/ExportPDFService.js` — antes vacío/stub; ahora implementa `generarPdfMazo()` y `generarPdfQuiz()` con `pdf-lib` (CA-3.3.1, CA-3.3.2, CA-3.3.3).
- `backend/src/controllers/QuizController.js` — nuevos métodos `generar` (`POST /generate`) y `exportarPdf` (`GET /:id/export-pdf`); `obtenerPorId`/`listar` ahora devuelven `estado_efectivo`.
- `backend/src/controllers/ResultadoQuizController.js` — nuevo método `submit` (`POST /api/v1/quizzes/:id/submit`).
- `backend/src/controllers/MazoController.js` — nuevo método `exportarPdf` (`GET /api/v1/decks/:id/export-pdf`).
- `backend/src/routes/quizRoutes.js` — se montaron `/generate`, `/:id/submit`, `/:id/export-pdf`.
- `backend/src/routes/deckRoutes.js` — se montó `/:id/export-pdf`.
- `backend/src/app.js` — **se montó `quizRoutes.js` en `/api/v1/quizzes`, que hasta ahora no estaba expuesto en absoluto** (existía el archivo de rutas, pero `app.js` nunca lo importaba).
- `backend/package.json` — se agregó la dependencia `pdf-lib` (la pedía el backlog para HU-3.3 y no estaba instalada).

### Decisiones / supuestos que no estaban documentados literalmente en el backlog (confirmados con la docente o marcados explícitamente en el código)
- El endpoint de generación es `POST /api/v1/quizzes/generate` (confirmado; el código previo tenía un comentario con `POST /api/v1/quizzes`, de una nomenclatura vieja HU-007/HU-008, ya no vigente).
- Se agregó `GET /api/v1/quizzes/:id/export-pdf` (confirmado como endpoint adicional; el backlog solo documenta `export-pdf` para mazos, no para quizzes, pero CA-3.3.2 lo pide explícitamente).
- El estado `programado → abierto → cerrado` del quiz se calcula dinámicamente en cada `GET` comparando `fecha_apertura`/`fecha_cierre` con la fecha actual (confirmado; no hay infraestructura de cron en el proyecto, igual limitación que llevó a la decisión de CA-2.3.3 en HE-02).
- `POST /generate` recibe `mazo_ids` (array explícito) en vez de resolver un "rango de semanas" automáticamente — no hay una regla documentada para esa traducción semana→mazos, así que se deja la selección al cliente.
- `cantidad_preguntas` es opcional en `/generate`; si se envía, se toma una muestra aleatoria de ese tamaño del pool de tarjetas aprobadas (así se interpretó "Lógica: selección aleatoria de tarjetas" de HU-3.1); si no se envía, se usan todas las aprobadas del rango.
- `semana_corte` (columna NOT NULL de `quiz`, no mencionada en las CA) se calcula como la semana más alta entre los mazos incluidos.
- **`calificacion` usa escala 0.0–5.0** (convención académica colombiana estándar) — el backlog no especifica ninguna escala. **Supuesto pendiente de validar con la docente.**
- El PDF de mazo (`GET /decks/:id/export-pdf`) exporta únicamente tarjetas `revisado_docente`, no todas — el backlog no lo aclara explícitamente, pero es consistente con que solo esas tarjetas se usan también para generar el quiz.

### Hallazgo de infraestructura (no relacionado con HE-03, reportado, no corregido sin confirmar)
- `docker-compose.yml` monta el código en `/app`, pero el `Dockerfile` del backend usa `WORKDIR /usr/src/app` y copia el código ahí en el build — el bind mount para hot-reload no estaba surtiendo efecto realmente (el contenedor corría el código de la última imagen construida, no el del host en vivo). No se tocó `docker-compose.yml` porque no fue parte de este pedido; queda para que el equipo decida si corrige la ruta del volumen.
- No existe `backend/.env` ni `.env` en la raíz (están en `.gitignore`, como es correcto) — sin ese archivo, `docker compose` no tiene credenciales de Postgres/JWT. El usuario indicó que ya tiene el archivo y lo restaurará.

### Smoke test end-to-end (contra la base de datos real, vía Docker)
Se corrió el flujo completo una vez restaurado `.env`: crear mazo → registrar 4 tarjetas → aprobarlas
→ `POST /generate` (4 preguntas con distractores sin repetir) → `POST /:id/submit` (calificó 2/4 →
2.5, calculado correctamente) → segundo intento al mismo quiz devolvió 409 con el resumen previo
(CA-3.2.3) → `GET /decks/:id/export-pdf` y `GET /quizzes/:id/export-pdf` devolvieron PDFs válidos
(inspeccionados visualmente, maquetado correcto, hoja de respuestas en página separada).

- **Limitación encontrada y documentada (no corregida, fuera de alcance de esta sesión)**: `pdf-lib`
  con `StandardFonts.Helvetica` usa codificación WinAnsi (Windows-1252). Cubre español/inglés
  normal (incluye ñ, tildes, ¿, ¡), pero si una tarjeta o pregunta llegara a tener un carácter fuera
  de ese rango (emoji, alfabetos no latinos, o texto corrupto), la exportación a PDF responde 500.
  Corregirlo requeriría incrustar una fuente TrueType propia (con `fontkit`), una dependencia nueva
  no pedida — se deja como mejora futura, no implementada.

### Colección Postman
Se creó `Sprint 2 (HE3).postman_collection.json` (raíz del repo), con el mismo estilo que
`Sprint 1 (HE1 y HE2).postman_collection.json`: carpetas "Setup", "HU-3.1", "HU-3.2", "HU-3.3",
29 requests con `pm.test` cubriendo cada CA (incluye casos de error: campos faltantes, mazo/quiz
inexistente, fechas invertidas, quiz aún no abierto, reintento bloqueado, PDF de recurso sin
datos). Las fechas se calculan en un script de pre-request a nivel de colección (no hay fechas
fijas hardcodeadas, así que no se vence con el tiempo). Se corrió con `npx newman run` contra el
backend real: **29/29 requests, 58/58 assertions, 0 fallos**.

### Pendiente
- Falta el frontend de HE-03 (pantalla de configuración del quiz, interfaz con temporizador, botón de descarga de PDF) — no fue parte de este pedido.
- Se creó data de prueba real en la base de datos del contenedor (2 mazos, 8 tarjetas, 5 quizzes, 2 resultados — la primera tanda del smoke test manual más la corrida de Newman) para las pruebas; se dejó intacta por si sirve de referencia — avisar si se prefiere limpiarla.

## Cambios aplicados en esta sesión (2026-08-31) — Cobertura completa para Curso e Inscripcion

Las tablas `curso` e `inscripcion` existen en el DER oficial (DBML) pero habían quedado fuera del
diagrama de paquetes original, así que no tenían ninguna capa implementada. Se agregó su cobertura
completa (modelo, repositorio, controlador, rutas) siguiendo el mismo patrón que `Mazo.js` /
`MazoRepository.js` / `MazoController.js` / `mazoRoutes.js`.

### Archivos creados
- `backend/src/models/Curso.js` — modelo de dominio con `id_curso, nombre, periodo, fecha_inicio, fecha_fin, docente_id, estado`, reflejo 1:1 de la tabla `curso` del DER.
- `backend/src/models/Inscripcion.js` — modelo de dominio con `id_inscripcion, curso_id, estudiante_id, fecha_inscripcion, estado`, reflejo 1:1 de la tabla `inscripcion` del DER.
- `backend/src/repositories/CursoRepository.js` — driver `pg` sin ORM; expone `crear(curso)`, `obtenerPorId(id)`, `listarPorDocente(docenteId)` y `actualizarEstado(id, estado)`.
- `backend/src/repositories/InscripcionRepository.js` — driver `pg` sin ORM; expone `crear(inscripcion)`, `obtenerPorCursoYEstudiante(cursoId, estudianteId)` (respeta el índice único `(curso_id, estudiante_id)` del DER), `listarPorCurso(cursoId)` y `listarPorEstudiante(estudianteId)`.
- `backend/src/controllers/CursoController.js` — mismo patrón que `MazoController.js`; métodos `crear`, `obtener`, `listarPorDocente`, `actualizarEstado` (todos con `// TODO`, sin lógica de negocio).
- `backend/src/controllers/InscripcionController.js` — mismo patrón; métodos `crear`, `obtenerPorCursoYEstudiante`, `listarPorCurso`, `listarPorEstudiante`.
- `backend/src/routes/cursoRoutes.js` — `GET /:id`, `GET /docente/:docenteId`, `POST /`, `PATCH /:id/estado`.
- `backend/src/routes/inscripcionRoutes.js` — `GET /curso/:cursoId/estudiante/:estudianteId`, `GET /curso/:cursoId`, `GET /estudiante/:estudianteId`, `POST /`.

### Archivos modificados
- `backend/src/routes/index.js` — se agregaron los imports de `cursoRoutes.js` e `inscripcionRoutes.js` y se registraron como `router.use('/cursos', cursoRoutes)` y `router.use('/inscripciones', inscripcionRoutes)`.

### Archivos verificados (sin cambios, usados como patrón de referencia)
- `backend/src/controllers/MazoController.js`, `backend/src/repositories/MazoRepository.js`, `backend/src/models/Mazo.js`, `backend/src/routes/mazoRoutes.js` — confirmados correctos y usados como plantilla exacta para las 4 capas de Curso e Inscripcion.

## Historial de sesiones anteriores

### Sesión 2026-08-30 (parte 1) — Corrección de huérfanos entre models/ y repositories/
- Se recreó `AporteRepository.js` (había sido eliminado por error al alinear con el diagrama de paquetes).
- Se crearon `Reporte.js` y `WordNetCache.js` (sus repositorios ya existían pero no tenían modelo).

### Sesión 2026-08-30 (parte 2) — Alineación total con el DER oficial (DBML)
- Se reescribieron en snake_case exacto, campo por campo según el DER: `Usuario.js`, `Mazo.js`, `Tarjeta.js`, `Aporte.js`, `EtiquetaContexto.js`, `ProgresoEstudio.js`, `Quiz.js`, `ResultadoQuiz.js`, y se corrigieron sus repositorios correspondientes (nombres de tabla de plural a singular: `usuarios`→`usuario`, `mazos`→`mazo`, `tarjetas`→`tarjeta`, `aportes`→`aporte`, `etiquetas_contexto`→`etiqueta_contexto`, `quizzes`→`quiz`, `resultados_quiz`→`resultado_quiz`).
- `Reporte.js`, `WordNetCache.js` y sus repositorios se marcaron con `// TODO: Tabla no definida en el DER oficial` (sin modificar sus campos, ya que no hay DER contra el cual validarlos).
- Se renombró `ProgresoEstudioRepository.buscarPorEstudianteYTarjeta` → `buscarPorInscripcionYTarjeta` (la tabla `progreso_estudio` se relaciona por `inscripcion_id`, no por `estudiante_id` directo).

## Tabla de correspondencia Modelo ↔ Repositorio (estado actual)

| Modelo (src/models/) | Repositorio (src/repositories/) | Estado |
|---|---|---|
| Usuario.js | UsuarioRepository.js | OK — alineado al DER |
| Curso.js | CursoRepository.js | Nuevo |
| Inscripcion.js | InscripcionRepository.js | Nuevo |
| Mazo.js | MazoRepository.js | OK — alineado al DER |
| Tarjeta.js | TarjetaRepository.js | OK — alineado al DER |
| Aporte.js | AporteRepository.js | OK — alineado al DER |
| EtiquetaContexto.js | EtiquetaContextoRepository.js | OK — alineado al DER |
| ProgresoEstudio.js | ProgresoEstudioRepository.js | OK — alineado al DER |
| Quiz.js | QuizRepository.js | OK — alineado al DER |
| ResultadoQuiz.js | ResultadoQuizRepository.js | OK — alineado al DER |
| Reporte.js | ReporteRepository.js | Pendiente — tabla no está en el DER oficial |
| WordNetCache.js | WordNetCacheRepository.js | Pendiente — tabla no está en el DER oficial |

Sin huérfanos: 12 modelos y 12 repositorios, todos emparejados 1 a 1.

## Estructura final de carpetas

```
src/Readme.txt
src/app.js
src/config/auth.js
src/config/db.js
src/controllers/AnalyticsController.js
src/controllers/AuthController.js
src/controllers/ContextoController.js
src/controllers/CursoController.js
src/controllers/ExportController.js
src/controllers/InscripcionController.js
src/controllers/MazoController.js
src/controllers/QuizController.js
src/controllers/ReporteController.js
src/controllers/TarjetaController.js
src/middleware/authMiddleware.js
src/middleware/validationMiddleware.js
src/models/Aporte.js
src/models/Curso.js
src/models/EtiquetaContexto.js
src/models/Inscripcion.js
src/models/Mazo.js
src/models/ProgresoEstudio.js
src/models/Quiz.js
src/models/Reporte.js
src/models/ResultadoQuiz.js
src/models/Tarjeta.js
src/models/Usuario.js
src/models/WordNetCache.js
src/repositories/AporteRepository.js
src/repositories/CursoRepository.js
src/repositories/EtiquetaContextoRepository.js
src/repositories/InscripcionRepository.js
src/repositories/MazoRepository.js
src/repositories/ProgresoEstudioRepository.js
src/repositories/QuizRepository.js
src/repositories/ReporteRepository.js
src/repositories/ResultadoQuizRepository.js
src/repositories/TarjetaRepository.js
src/repositories/UsuarioRepository.js
src/repositories/WordNetCacheRepository.js
src/routes/analyticsRoutes.js
src/routes/authRoutes.js
src/routes/contextoRoutes.js
src/routes/cursoRoutes.js
src/routes/exportRoutes.js
src/routes/index.js
src/routes/inscripcionRoutes.js
src/routes/mazoRoutes.js
src/routes/quizRoutes.js
src/routes/reporteRoutes.js
src/routes/tarjetaRoutes.js
src/services/AuthService.js
src/services/CuraduriaService.js
src/services/DeduplicacionService.js
src/services/EnriquecimientoLexicoService.js
src/services/ExportPDFService.js
src/services/LimiteSemanalService.js
src/services/ModeracionService.js
src/services/QuizService.js
src/services/SM2Service.js
```

## Pendientes o decisiones que requieren validación externa

- **Tablas del DER sin ninguna capa implementada**: `quiz_mazo` (tabla puente `quiz_id`+`mazo_id`), `pregunta_quiz` y `respuesta_quiz` existen en el DER oficial pero todavía no tienen modelo, repositorio, controlador ni rutas. No se crearon en esta sesión porque el pedido fue específicamente Curso e Inscripcion; quedan pendientes para una futura sesión.
- **`Reporte.js` / `WordNetCache.js`**: sus tablas (`reportes_tarjeta`, `wordnet_cache`) siguen sin existir en el DER oficial. Los campos actuales son tentativos y no se han tocado desde la sesión anterior; el equipo debe decidir si se agregan formalmente al DER o si esas funcionalidades (moderación de reportes, caché léxico) se descartan/rediseñan.
- **Campos sugeridos para `Curso`/`Inscripcion`, NO implementados** (el DER no los tiene, así que no se agregaron a los modelos):
  - `curso`: no tiene columna de auditoría tipo `fecha_creacion`/`fecha_actualizacion`, a diferencia de `mazo`, `tarjeta` o `quiz` que sí la tienen. Podría ser útil para trazabilidad, pero es solo una sugerencia para que el equipo la evalúe y, si aplica, la agregue primero al DER.
  - `curso`: un código de invitación para que estudiantes se autoinscriban (ej. `codigo_invitacion`) no existe en el DER. Es solo una idea a validar con el equipo, no se implementó.
  - `inscripcion`: no hay un campo para registrar motivo de baja/cancelación cuando `estado` cambia a algo como "retirado". También es solo una sugerencia, no implementada.
- **Sin middleware de autenticación/rol en las rutas nuevas**: `cursoRoutes.js` e `inscripcionRoutes.js` no tienen `authenticate`/`authorize` aplicado todavía — igual que el resto de las rutas existentes en el proyecto, ninguna los tiene aún. No es una regresión de esta sesión, pero queda como trabajo pendiente general antes de exponer la API.
- **`src/Readme.txt`**: sigue sin reflejar la estructura real de `services/` (aplanada) ni las capas de `Curso`/`Inscripcion`. No se actualizó porque no fue parte del pedido explícito de ninguna sesión hasta ahora.
