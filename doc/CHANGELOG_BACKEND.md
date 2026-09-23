# Changelog - Estructura Backend

## Fecha
2026-08-31 (última actualización — ver historial de sesiones más abajo)

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
