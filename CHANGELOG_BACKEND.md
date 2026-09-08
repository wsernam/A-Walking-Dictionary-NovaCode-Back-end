# Changelog - Estructura Backend

## Fecha
2026-09-07 (última actualización — ver historial de sesiones más abajo)

## Cambios aplicados en esta sesión (2026-09-07) — HE-02: Supervisión y Curaduría Pedagógica Docente

Se implementó el backend **completo** de la Épica HE-02 (HU-2.1, HU-2.2, HU-2.3), cubriendo
**todos** los criterios de aceptación. **Solo backend**: este repo no contiene la app React, el
entregable de frontend queda fuera de alcance. Tablas con los nombres del DER oficial / `init.sql`
(singular: `tarjeta`, `etiqueta_contexto`, `aporte`), no los del enunciado (`tarjetas`, etc.).

### ⚠️ Depende de la migración 002 (corrección al DER — PROPUESTA, pendiente de Slack)
`migrations/002_he02_correcciones_der.sql` — ver `HE-02_PROPUESTA_correccion_DER.md` (doc para Slack).
No se fusionó en `init.sql`. Agrega:
1. `tarjeta.motivo_rechazo TEXT` — guarda la observación del rechazo (CA-2.1.3).
2. Índice único `etiqueta_contexto (tarjeta_id, tipo)` — una etiqueta por tipo, habilita UPSERT (CA-2.2.1 / CA-2.2.2).
3. Tabla `notificacion` — el estudiante aportante recibe el aviso de rechazo (CA-2.1.3).

Sin la migración, los endpoints de HE-02 devuelven 500.

### Endpoints nuevos (montados en `app.js`)
| Método | Ruta | CA | Notas |
|---|---|---|---|
| GET | `/api/v1/decks/:id/cards?estado=` | CA-2.1.1 | Panel de curaduría: tarjetas del mazo, filtro opcional por estado. |
| PATCH | `/api/v1/cards/:id/approve` | CA-2.1.2 / CA-2.1.3 | Body `{ accion:"aprobar"\|"rechazar", palabra?, traduccion?, definicion?, ejemplo?, observacion? }`. Aprobar → `revisado_docente` + correcciones + `fecha_revision`. Rechazar → `rechazada` + `motivo_rechazo` + `notificacion` al aportante. 409 si no está en `pendiente_revision`. |
| PUT | `/api/v1/cards/:id/context` | CA-2.2.1 | Body `{ registro?, variante_dialectal? }`. UPSERT por tipo (`registro` / `variante_dialectal`). |
| PATCH | `/api/v1/decks/:id/context` | CA-2.2.2 | Body `{ variante_dialectal }`. Fija `mazo.variante_regional_predeterminada` y la propaga a las tarjetas del mazo que **no** tengan ya una variante propia (respeta la curaduría individual). |
| GET | `/api/v1/cards/:id` | CA-2.2.3 | Detalle de tarjeta + `etiquetas_contexto` (vista del estudiante). |
| GET | `/api/v1/teacher/analytics/deck/:id` | CA-2.3.1 / CA-2.3.2 | `COUNT` sobre `aporte` agrupado por `usuario` (join `aporte→inscripcion→usuario`), 1 fila por estudiante inscrito (LEFT JOIN, incluye los de 0 aportes). `?filtro=sin_aportes` → solo pendientes. |
| GET | `/api/v1/notifications?usuario_id=` | CA-2.1.3 | Notificaciones del estudiante (lado receptor). |
| PATCH | `/api/v1/notifications/:id/read` | CA-2.1.3 | Marca leída. |

### Archivos creados
- `migrations/002_he02_correcciones_der.sql` — corrección al DER (propuesta).
- `HE-02_PROPUESTA_correccion_DER.md` (raíz) — doc para Slack con los 3 cambios en DBML.
- `backend/src/models/Notificacion.js`, `backend/src/repositories/NotificacionRepository.js`, `backend/src/controllers/NotificacionController.js`, `backend/src/routes/notificationRoutes.js`.
- `backend/src/controllers/AnalyticsController.js` — `analiticasPorMazo` (HU-2.3).
- `backend/src/routes/teacherRoutes.js` — montado en `/api/v1/teacher`.
- `HE-02 - Supervisión y Curaduría Pedagógica Docente.postman_collection.json` (raíz) — 21 requests, asserts 1:1 con los CA.

### Archivos modificados
- `backend/src/services/CuraduriaService.js` — stub → lógica de HU-2.1 (`construirTarjetaRevisada`, `mensajeRechazo`, constantes). Puro, sin BD.
- `backend/src/controllers/TarjetaController.js` — `aprobar` (persiste `motivo_rechazo` + crea `notificacion` al rechazar), `asignarContexto` (UPSERT), `listarPorMazo` (CA-2.1.1), `obtenerPorId` ahora incluye `etiquetas_contexto` (CA-2.2.3).
- `backend/src/controllers/MazoController.js` — `asignarContextoPredeterminado` (CA-2.2.2).
- `backend/src/models/Tarjeta.js` — campo `motivo_rechazo`.
- `backend/src/repositories/TarjetaRepository.js` — `motivo_rechazo` en `crear`/`actualizar`; métodos `listarPorMazo`, `idsSinEtiquetaDeTipo`, `resumenEstadosPorMazo`.
- `backend/src/repositories/AporteRepository.js` — `analiticasPorMazo`, `obtenerAportanteCreador`.
- `backend/src/repositories/EtiquetaContextoRepository.js` — `listarPorTarjeta`, `eliminarPorTarjetaYTipo`, `upsert`, `asignarPredeterminadaPorTarjetas`.
- `backend/src/repositories/MazoRepository.js` — `actualizarVariantePredeterminada`.
- `backend/src/routes/cardRoutes.js`, `deckRoutes.js`, `app.js` — rutas nuevas.

### Verificación
- `npm install` + `node -e "import('./src/app.js')"` OK (grafo completo de dependencias carga).
- `npx eslint src/` limpio.
- Test unitario de `CuraduriaService` (lógica pura) 3/3 OK.
- **Pendiente**: correr la colección de Postman contra una BD con la migración 002 aplicada (no hay Docker en el entorno de esta sesión).

### Supuestos aún abiertos (menores)
- **Nombres de tabla**: enunciado (`tarjetas`/`etiquetas_contexto`/`aporta`) vs. DER (`tarjeta`/`etiqueta_contexto`/`aporte`). Se usó el DER.
- **CA-2.2.2 — "valor predeterminado"**: se interpretó como *rellenar huecos* (solo tarjetas sin variante propia), no *sobrescribir todas*. Confirmar.
- **CA-2.3.1 — métricas**: "palabras aportadas" = `tipo_aporte='creada'`; "coautorías" = `tipo_aporte='coautoria'`; "estado de revisión" = conteo de aportes del estudiante por estado de su tarjeta + `resumen_revision` a nivel de mazo.
- **CA-2.3.3 — "tiempo real"**: recálculo en cada `GET`, sin push por WebSocket/SSE.
- **Sin auth / rol Docente**: `authMiddleware.js` sigue aplazado; ninguna ruta del proyecto valida token/rol. Pendiente general.
- **`fecha_revision` en el rechazo**: se sella también al rechazar. Confirmar si debe quedar `NULL`.

## Cambios aplicados en la sesión 2026-08-31 — Cobertura completa para Curso e Inscripcion

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
