# Changelog - Estructura Backend

## Fecha
2026-09-18 (última actualización — ver historial de sesiones más abajo)

## Cambios aplicados en esta sesión (2026-09-18) — HU-5.4: login por bcrypt reemplazado por Google/OAuth

El profesor pidió, después de la primera entrega, reemplazar el login por email/password
(bcrypt) de HU-5.4 por OAuth usando Google como proveedor de identidad. Se eliminó el login por
contraseña y se implementó login con Google. El resto de HU-5.4 (JWT propio, `authenticate`,
`requireRole`, la tabla de qué ruta exige qué rol) **no cambió** — solo cambió cómo se emite el
JWT al inicio.

### Archivos modificados
- `backend/src/services/AuthService.js` — se reemplazó `login(email, password)` (bcrypt.compare)
  por `loginConGoogle(idToken)`: verifica el token con `google-auth-library`
  (`OAuth2Client.verifyIdToken`), busca el usuario por email, lo auto-crea con rol `estudiante`
  si no existía (decisión no especificada en ningún CA, ver `FLUJO_AUTENTICACION.md`), y firma
  el mismo tipo de JWT que antes.
- `backend/src/controllers/AuthController.js` — `login` → `loginGoogle`.
- `backend/src/routes/authRoutes.js` — `POST /login` → `POST /google`.
- `backend/src/app.js` — `@file` actualizado: endpoint nuevo, nota de que el login por
  contraseña se eliminó.
- `backend/package.json` — se agregó `google-auth-library`. `bcrypt` se mantiene (se sigue
  usando para generar un `password_hash` aleatorio/inutilizable, ya que la columna es `NOT NULL`
  en el DER y los usuarios de Google no tienen contraseña propia).
- `backend/.env.example` — se agregó `GOOGLE_CLIENT_ID` (Client ID de Google Cloud Console,
  necesario para verificar los tokens). `JWT_SECRET` sigue igual.
- `backend/.dockerignore` — **nuevo**, agregado en esta sesión: excluye `node_modules/` del
  build de Docker. Sin esto, un `npm install` corrido en el host (Windows) terminaba pisando el
  `node_modules` Linux del contenedor al hacer `COPY . .` en el Dockerfile, causando un crash de
  `bcrypt` (`Exec format error`) — bug real encontrado y corregido en esta sesión.

### Archivos eliminados
- `seed_auth_test.sql` — creaba usuarios con hash bcrypt real para probar el login por
  contraseña; ya no aplica, el login ya no valida contraseñas.

### Archivos reescritos (no eliminados)
- `HU-5.4 - Autenticacion y Roles.postman_collection.json` — ya no prueba el login de punta a
  punta (Postman no puede automatizar la pantalla de consentimiento de Google); solo prueba los
  errores de `/auth/google` que no requieren credenciales reales (falta `idToken`, `idToken`
  basura), más los checks de rol/invitado de antes, que ahora requieren pegar manualmente un
  token real obtenido logueándose de verdad desde el frontend.
- `FLUJO_AUTENTICACION.md` — reescrito para describir el flujo de Google en vez de bcrypt.

### Pendiente / decisión no tomada por cuenta propia
- **Rol por defecto al auto-crear un usuario nuevo por Google**: se decidió `"estudiante"` por
  no haber otra opción documentada (mismo criterio que el auto-registro de HU-5.1). Falta que el
  equipo/profe lo confirme. Las cuentas docente se siguen creando a mano.
- Ver el resto de decisiones/pendientes en `FLUJO_AUTENTICACION.md`.

## Cambios aplicados en la sesión anterior (2026-09-17) — HU-5.4: Login y control de roles (versión inicial, con email/password)

**Nota: esta versión del login fue reemplazada por Google/OAuth en la sesión del 2026-09-18 de
arriba.** Se deja el registro histórico de lo que se hizo primero, por continuidad.

Se implementó HU-5.4 (Iniciar sesión y control de roles) de HE-05. Alcance: solo login y
autorización por rol; el registro (HU-5.1) queda en otra rama, no se tocó aquí. No hubo cambios
de esquema: `usuario.password_hash` y `usuario.rol` ya existían en el DER (init.sql).

### Archivos creados
- `backend/src/controllers/AuthController.js` — `login` (CA-5.4.1), llama a `AuthService.login`.
- `backend/src/routes/authRoutes.js` — `POST /api/v1/auth/login`, montado en `app.js`.

### Archivos implementados (existían como stubs "pendiente")
- `backend/src/services/AuthService.js` — `login(email, password)`: busca el usuario por email,
  compara `password` contra `password_hash` con bcrypt, firma un JWT (`JWT_SECRET`, expira en 8h)
  con claims `{ id_usuario, email, rol }`. Mensaje de error genérico ("Credenciales inválidas")
  tanto si el email no existe como si la contraseña no coincide, para no revelar cuál falló.
- `backend/src/middleware/authMiddleware.js` — `authenticate` (CA-5.4.1: valida el JWT del header
  `Authorization: Bearer <token>`, adjunta `req.usuario`) y `requireRole(...roles)` (CA-5.4.2:
  403 si el rol de `req.usuario` no está permitido).

### Archivos modificados
- `backend/src/repositories/UsuarioRepository.js` — se agregó `obtenerPorEmail(email)`, necesario
  para el login (no existía ningún método de búsqueda por email).
- `backend/src/app.js` — se montó `authRoutes` en `/api/v1/auth` y se documentó en el encabezado
  qué rutas exigen `authenticate`/`requireRole('docente')`.
- `backend/src/routes/deckRoutes.js`, `cardRoutes.js`, `analyticsRoutes.js` — se aplicó
  `requireRole('docente')` a los endpoints que su propia HU ya describe como acción exclusiva de
  docente (crear/cerrar mazo, asignar variante por defecto, aprobar/editar/contextualizar
  tarjeta, listar pendientes/aprobadas, analíticas). El resto de POST/PUT/PATCH/DELETE (crear
  tarjeta, check-duplicate, eliminar mazo, crear curso, rechazar aporte) solo exige `authenticate`
  (sesión iniciada), sin restricción de rol, por no estar documentado como acción docente-only.
- `backend/src/routes/courseRoutes.js`, `contributionRoutes.js` — se aplicó `authenticate` a las
  rutas de escritura, mismo criterio anterior.

### Decisión de diseño (CA-5.4.3, sin endpoint definido en el backlog)
El backlog no define ningún endpoint de "diccionario demostrativo" para el modo Invitado. Se
interpretó (confirmado con el usuario) dejando las rutas `GET` de decks/cards/courses sin
`authenticate`, cubriendo así el acceso de solo lectura sin login. Queda documentado como
interpretación, no como CA formalmente cerrado — si el equipo define un endpoint específico para
Invitado más adelante, esto se ajusta.

### Pendiente / conocido
- `seed.sql` inserta usuarios con `password_hash = 'hash_temporal'` (no es un hash bcrypt real),
  por lo que el login fallará contra esos datos semilla hasta que se reemplacen por un hash bcrypt
  válido o se implemente HU-5.1 (registro) en la rama correspondiente.
- No se corrió la colección Postman/manual contra una BD real en esta sesión (se validó con un
  test funcional aislado mockeando `UsuarioRepository`, sin Docker/PostgreSQL disponible).

## Historial de sesiones anteriores

### Sesión 2026-08-31 — Cobertura completa para Curso e Inscripcion

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
