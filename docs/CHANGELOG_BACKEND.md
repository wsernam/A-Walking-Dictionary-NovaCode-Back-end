# Changelog - Estructura Backend

## Fecha
2026-10-07 (última actualización — ver historial de sesiones más abajo)

## Cambios aplicados en esta sesión (2026-10-07) — HU-3.2: transacción, auth y preguntas para el estudiante

Correcciones a `POST /api/v1/quizzes/:id/submit` y un endpoint adicional aprobado por el equipo.

- Nuevo `ResultadoQuizRepository.crearConRespuestas`: `resultado_quiz` y `respuesta_quiz` se guardan en
  una sola transacción. Antes, un fallo a mitad dejaba un resultado sin desglose que bloqueaba al
  estudiante con un 409. `ResultadoQuizRepository.crear` y `RespuestaQuizRepository.crear` aceptan un
  segundo parámetro opcional con la conexión (por defecto `pool`).
- Dos envíos simultáneos: el segundo chocaba con el índice único `(quiz_id, estudiante_id)` y salía
  como 500; ahora se traduce a 409 con el resumen del primero (CA-3.2.3).
- `POST /quizzes/:id/submit` exige JWT con rol `estudiante`; el `estudiante_id` sale del token
  (`req.usuario.id_usuario`) y el del body se ignora. Responde 403 si el estudiante no está inscrito
  en el curso del quiz (`InscripcionRepository.obtenerPorCursoYEstudiante`). **Cambia el contrato con
  el frontend** (ver docs/CONTRATO_FRONTEND_HU-3.2.md).
- `POST /quizzes/generate` (HU-3.1) exige JWT con rol `docente`.
- Endpoint adicional (no listado en el backlog, aprobado por el equipo):
  `GET /api/v1/quizzes/:id/preguntas` — preguntas sin `respuesta_correcta` ni `tarjeta_id`, solo para
  estudiante inscrito y solo con el quiz abierto.
- Control de tiempo (CA-3.2.1): sigue dependiendo de `fecha_inicio`/`tiempo_empleado_seg` que envía el
  cliente. Limitación conocida aceptada por el equipo.
- Probado con repositorios simulados (sin Docker disponible): transacción con COMMIT/ROLLBACK, 409 por
  índice único, 403 por no inscrito, preguntas sin clave, 400 fuera de la ventana del quiz.
  Pendiente: probar contra Postgres.

## Cambios aplicados en esta sesión (2026-10-04) — HU-3.1: validaciones y transacción al generar quiz

Las pruebas de `POST /api/v1/quizzes/generate` contra Postgres mostraron que algunos datos
inválidos dejaban quices a medias o vacíos en la base. Los CA-3.1.1/3.1.2/3.1.3 ya se cumplían; esto
endurece la entrada sin cambiar el endpoint ni la forma de la respuesta.

- `QuizService.generar` responde 400 (antes 500 o 201 con un quiz vacío) cuando: `fecha_apertura` o
  `fecha_cierre` no son fechas válidas; `tiempo_limite_min` no es entero >= 1; `cantidad_preguntas`
  se envía y no es entero >= 1 (antes `"abc"` creaba un quiz con 0 preguntas); `mazo_ids` trae
  valores que no son ids.
- `mazo_ids` repetidos (ej. `[5,5,6]`) se cuentan una vez; antes fallaba con 500 por la pk de
  `quiz_mazo` y dejaba el quiz creado sin preguntas.
- Nuevo `QuizRepository.crearConMazosYPreguntas`: guarda `quiz`, `quiz_mazo` y `pregunta_quiz` en
  una sola transacción (BEGIN/COMMIT/ROLLBACK). Los `crear` de `QuizRepository`,
  `QuizMazoRepository` y `PreguntaQuizRepository` aceptan un segundo parámetro opcional con la
  conexión (por defecto `pool`, así que los demás llamadores no cambian).
- Probado contra Postgres: los casos inválidos responden 400 sin crear filas; `[5,5,6]` crea el quiz
  con mazos 5 y 6; un fallo forzado de llave foránea en `quiz_mazo` revierte el quiz insertado.
- Pendiente de decidir (no implementado): `POST /quizzes/generate` no exige sesión ni rol docente;
  HU-3.1 dice "como docente" pero el backlog no lo pide explícitamente para esta ruta.

## Cambios aplicados en esta sesión (2026-10-01) — HU-2.3: la analítica de participación ya no oculta estudiantes

`AnaliticaRepository.resumenParticipacionPorMazo` filtraba con
`AND (a.id_aporte IS NULL OR t.id_tarjeta IS NOT NULL)`, que sacaba de la tabla a todo estudiante
que había aportado en OTROS mazos pero no en el consultado: no aparecía ni como "Sin aportes"
(CA-2.3.2). En un mazo nuevo, sin palabras, la tabla salía vacía aunque el curso tuviera inscritos.

- Los aportes del mazo se unen como bloque
  (`LEFT JOIN (aporte a JOIN tarjeta t ON … AND t.mazo_id = $1) ON a.inscripcion_id = …`) y se
  quitó ese filtro. Todos los inscritos del curso aparecen siempre, con ceros si no aportaron.
- Mismo endpoint (`GET /api/v1/teacher/analytics/deck/:id`) y misma forma de respuesta.
- Probado: mazo sin palabras → los 3 inscritos con 0 (antes `[]`); estudiante que solo aportó en
  otro mazo → aparece con 0 (antes no aparecía); mazos con aportes → mismos números que antes;
  `?sinAportes=true` → solo los que tienen 0.
- Pendiente de decidir: la consulta incluye inscripciones inactivas (un estudiante retirado
  seguiría saliendo como "Sin aportes").

## Cambios aplicados en esta sesión (2026-09-30) — HU-1.2: solo aportan estudiantes inscritos (CA-1.2.1)

`POST /api/v1/decks/:id/cards` no cumplía el CA-1.2.1 ("dado que el estudiante está inscrito…
registra el aporte asociado al estudiante"): tomaba `inscripcion_id` del body sin validarlo, y
el front siempre mandaba la inscripción simulada del `.env` (1), así que cualquier usuario, incluso
sin curso, registraba palabras y todas quedaban a nombre de la misma inscripción.

- `TarjetaController.crear`: la inscripción se busca con el usuario del token y el curso del
  mazo (`InscripcionRepository.obtenerPorCursoYEstudiante`). Si no existe o no está `activa`
  → **403**. El `inscripcion_id` del body se ignora.
- Excepción solo para desarrollo: con `DISABLE_AUTH=true` no hay usuario real, así que se sigue
  usando el `inscripcion_id` del body (400 si falta), para no romper las pruebas con Postman.
- `autenticacionMiddleware.js`: se exporta `authDeshabilitado()` para reutilizarlo.
- Front (`RegistrarTarjetaForm.jsx`): ya no bloquea el formulario si falta
  `VITE_INSCRIPCION_ID_SIMULADA`; lo sigue mandando solo para el modo `DISABLE_AUTH`.
- Probado contra la API real: inscrito → 201 con su propia inscripción aunque el body diga otra;
  sin curso, docente o inscripción inactiva → 403; mazo cerrado → 409; campos vacíos → 400.
- `GET /api/v1/decks` (mismo endpoint, sigue público): nuevo middleware `autenticacionOpcional`.
  Sin token (Invitado, CA-5.4.3), con token inválido o como docente devuelve todos los mazos,
  igual que antes; con token de estudiante devuelve solo los de sus cursos con inscripción activa
  (`MazoRepository.listarPorEstudiante`). Así el estudiante sin curso no ve mazos al registrar
  palabras, y el front muestra un aviso para que se una a un curso con su código de acceso.
- Probado: invitado/docente → todos; estudiante inscrito → solo su curso (un mazo de otro curso
  no aparece y registrar en él da 403); sin curso o con inscripción inactiva → 0 mazos.

## Cambios aplicados en esta sesión (2026-09-30) — HU-4.1: el repaso ya no se queda sin tarjetas

Problema reportado por el equipo: al terminar una sesión de estudio no salían más tarjetas hasta
24 h después (SM-2 solo devolvía las vencidas), y al cerrar un mazo sus palabras desaparecían del
estudio, justo antes del quiz de ese mazo. Detalle completo, decisiones y pruebas en
`docs/CAMBIO_REPASO_SM2.md`. Acordado en el grupo (William Serna / Manuela Erazo):

- `EstudioRepository.listarTarjetasDisponibles`: se cambió `m.estado = 'abierto'` por
  `m.fecha_apertura <= CURRENT_DATE`. El repaso es acumulativo: incluye mazos cerrados (cerrar
  solo impide agregar palabras, CA-1.2.3) y excluye los mazos creados por adelantado que aún no
  llegan a su fecha de apertura.
- `EstudioService.iniciarSesion`: devuelve todas las tarjetas disponibles; SM-2 ya no filtra,
  solo ordena (vencidas → nuevas → resto por menor factor de facilidad).
- Sin cambios en `registrarValoracion` ni en `SM2Service`: cada valoración sigue recalculando
  SM-2 (CA-4.1.2), también si el estudiante repasa varias veces el mismo día — el equipo
  considera que estudiar repetidamente sí refleja dominio de la palabra.
- Sin cambios en el contrato del endpoint (`POST /api/v1/study/review-session`) ni en la BD.
- Supuesto pendiente de validar: `CURRENT_DATE` usa la zona horaria de PostgreSQL (UTC en
  Docker), así que un mazo puede verse desde las 7:00 p. m. (hora Colombia) del día anterior a
  su fecha_apertura.

## Cambios aplicados en esta sesión (2026-09-24) — HU-5.1: una sola versión del registro

La implementación de HU-5.1 (commit `0f2f31b`) es de thaliabernalepe; dejó dos versiones de
`POST /api/v1/auth/register` y Express solo ejecutaba la primera. Se dejó una sola:

- `authRoutes.js`: se quitó la segunda declaración de `/register`.
- `RegistroService.js`: conserva su estructura y suma lo que solo tenía la segunda versión:
  valida correo `@unicauca.edu.co` (CA-5.1.1, 400), guarda el email en minúsculas, usa la parte
  local del correo si Google no da nombre y devuelve `{ token, usuario }` para entrar directo.
  Un registro simultáneo del mismo correo (UNIQUE) responde 409 en vez de 500.
- `RegistroController.js`: la respuesta 201 ahora incluye `token`.
- `AuthService.js`: se extrajo `emitirSesion(usuario)` (firma del JWT), usada por login y
  registro; se eliminó `AuthService.registrarConGoogle` (segunda versión, nunca se ejecutaba).
- `AuthController.js`: se eliminó `registrarGoogle` (segunda versión).
- Probado contra la base real con Google simulado: registro nuevo, repetido (409), Gmail (400),
  correo no verificado (401), sin nombre, y login posterior del usuario registrado.
- Pendiente del equipo: rol al registrarse (hoy siempre `estudiante`, según CA-5.1.1) y si el
  front usa un botón aparte o el mismo botón del login.

## Cambios aplicados en esta sesión (2026-09-23) — PR #5 (coautorías): merge con develop y columna `aporte.estado`

La funcionalidad de la PR #5 es de ManuelaE08; aquí solo se hicieron los ajustes para poder
fusionarla. Detalle completo, autoría y preguntas abiertas en `docs/CAMBIO_APORTE_ESTADO.md`.

- Conflicto en `app.js` resuelto conservando todas las rutas de `develop` y sumando `/api/v1/aportes`.
- `init.sql` + `Aporte.js`: nueva columna `aporte.estado` (supuesto pendiente de validar).
- `aporteRoutes.js`: JWT en todas las rutas y rol `docente` en pending/approve/PUT/DELETE.
- `listarAprobadas`: nombre real del estudiante en vez de "Estudiante A/B/C", consultas en lote.
- No se probó contra una base de datos real.

## Cambios aplicados en la sesión anterior (2026-09-22) — Fix: rutas de perfil caídas tras el merge de HU-015

El merge de `feature/Sprint_2_HU_015` (login con Google) a `develop` pisó el montaje de las rutas
de HU-013 en `app.js`: se perdieron los `import` y `app.use` de `usuarioRoutes.js` y
`studentRoutes.js` (probablemente un conflicto de merge mal resuelto), aunque el comentario de
cabecera del archivo los seguía listando como activos y los archivos de rutas/controlador/servicio
seguían intactos. Efecto real: `PATCH /api/v1/users/profile`, `GET /api/v1/users/:id` y
`GET /api/v1/students/:id/context` devolvían 404 en `develop`.

- `backend/src/app.js`: se vuelven a importar y montar `usuarioRoutes` (`/api/v1/users`) y
  `studentRoutes` (`/api/v1/students`). Se unificó el comentario de cabecera (antes tenía dos
  bloques "HE-05" separados y un `@note` duplicado, resultado del mismo merge).
- No se agregó `authenticate` a estas rutas: el contrato con frontend (HU-013,
  `contrato-perfil.md`) se acordó sin login real, con `estudiante_id` en el body y sin header
  `Authorization`, y el frontend (`httpClient.js`) todavía no envía ese header. Agregar auth aquí
  ahora mismo rompería el contrato vigente; queda anotado en `app.js` como pendiente a coordinar
  con frontend, no como un descuido.
- No se probó contra la base real en esta sesión (Docker Desktop no estaba corriendo); se validó
  solo con `node --check`.

## Cambios aplicados en la sesión anterior (2026-09-19) — Documentación, contrato de frontend y seed de pruebas

- **Carpeta `docs/`**: se movieron aquí (con `git mv`) `CHANGELOG_BACKEND.md`,
  `FLUJO_AUTENTICACION.md` y `FLUJO_REVISION_TARJETAS.md`. `CLAUDE.md` y `README.md` se quedan en
  la raíz a propósito (Claude Code carga `CLAUDE.md` desde ahí; GitHub muestra `README.md`).
  Se actualizó la referencia a `docs/FLUJO_AUTENTICACION.md` en el comentario de `app.js`.
- **`docs/CONTRATO_AUTENTICACION_FRONTEND.md` (nuevo)**: contrato para quien implementa el login
  en el frontend (endpoint `POST /api/v1/auth/google`, errores, flujo, tabla de rutas por rol,
  configuración de Google/Docker, cuentas de prueba).
- **`seed.sql`**: se agregaron cuentas reales del equipo para probar el login con Google:
  `wserna@unicauca.edu.co` (docente) y `ksandoval@`, `manmeneses@`, `thaliabernal@unicauca.edu.co`
  (estudiantes). Los usuarios originales (ids 1-4) se mantienen porque la colección de Postman de
  Sprint 1 depende de esos ids. Los nombres de los estudiantes son un placeholder (solo se
  conocen los correos) y no tienen inscripciones.
- **`AuthService.js`**: el login ya no crea usuarios; un correo de Google sin cuenta recibe 403
  (ver la entrada siguiente y `docs/FLUJO_AUTENTICACION.md`).
- **Doxygen**: se documentaron con bloques `/** @file @brief @param @return @throws */` (misma
  convención que `TarjetaController`/`MazoRepository`) `AuthService.js`, `AuthController.js`,
  `authMiddleware.js` y `UsuarioRepository.js` (encabezado `@file` y `obtenerPorEmail`). Solo se
  tocaron comentarios, la lógica no cambió. El repo no tiene `Doxyfile`, así que no se genera HTML.

## Cambios aplicados en la sesión anterior (2026-09-18) — HU-5.4: login por bcrypt reemplazado por Google/OAuth

El profesor pidió, después de la primera entrega, reemplazar el login por email/password
(bcrypt) de HU-5.4 por OAuth usando Google como proveedor de identidad. Se eliminó el login por
contraseña y se implementó login con Google. El resto de HU-5.4 (JWT propio, `authenticate`,
`requireRole`, la tabla de qué ruta exige qué rol) **no cambió** — solo cambió cómo se emite el
JWT al inicio.

### Archivos modificados
- `backend/src/services/AuthService.js` — se reemplazó `login(email, password)` (bcrypt.compare)
  por `loginConGoogle(idToken)`: verifica el token con `google-auth-library`
  (`OAuth2Client.verifyIdToken`), busca el usuario por email y firma el mismo tipo de JWT que
  antes. Si el correo no existe en `usuario` responde 403: el login NO crea usuarios (eso le
  corresponde a otra HU).
- `backend/src/controllers/AuthController.js` — `login` → `loginGoogle`.
- `backend/src/routes/authRoutes.js` — `POST /login` → `POST /google`.
- `backend/src/app.js` — `@file` actualizado: endpoint nuevo, nota de que el login por
  contraseña se eliminó.
- `backend/package.json` — se agregó `google-auth-library`. `bcrypt` se mantiene en el
  `package.json` aunque el login ya no lo use (la HU de registro, en otra rama, probablemente
  lo necesite).
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
- **Creación de usuarios**: una primera versión auto-creaba al usuario como `estudiante` en su
  primer login; se eliminó por salirse del alcance de autenticación. Ahora un correo sin cuenta
  recibe 403 y la creación (con su rol) queda para la HU de registro.
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
2026-09-18 (última actualización — ver historial de sesiones más abajo)

## Cambios aplicados en esta sesión (2026-09-18) — HU-5.2: perfil académico (CA-5.2.1 + CA-5.2.2)

Se implementó HU-5.2 completa (configurar perfil académico: nivel MCER, código estudiantil,
avatar, e intereses), siguiendo el contrato exacto que dejó la compañera de frontend (rama
`feature/HU-013-configuracion-perfil`) para no tener que tocar nombres de campos del lado del
front. Detalle completo en `FLUJO_PERFIL_ACADEMICO.md`.

### Cambio de esquema (autorizado explícitamente por el usuario)
- `init.sql`: se agregaron `usuario.codigo_estudiantil VARCHAR(20)`, `usuario.avatar VARCHAR(500)`
  y `usuario.intereses TEXT` (las tres nullable). A diferencia de HE-02, aquí no se dejó como
  propuesta/migración aparte — se aplicó directo porque el usuario lo pidió así.
  `intereses` (CA-5.2.2) se agregó en una segunda vuelta de la misma sesión, después de que el
  usuario confirmara el nombre exacto del campo y que fuera texto libre (no lista de opciones).

### Ajustes para concordar con el frontend (2026-09-19)
- Nuevo `GET /api/v1/students/:id/context` (`studentRoutes.js`): `curso_asignado` y
  `semestre_activo` salen de la inscripción más reciente del estudiante (JOIN con `curso`), sin
  columnas nuevas. `departamento_universidad` se devuelve `null` (sin fuente en BD, pendiente de
  decidir). Sin inscripción responde 200 con nulls; usuario inexistente, 404.
- `PerfilService.mapearPerfil`: `nivel_ingles`/`codigo_estudiantil`/`avatar` vacíos se devuelven
  como `''` (no `null`) y `rol` capitalizado ("Estudiante"), como en el contrato del front.
- Validación 400: `codigo_estudiantil` > 20 caracteres; `avatar` en base64 (`data:`) o > 500
  caracteres (se guarda solo la URL/ruta de la imagen).

- `intereses` pasa de texto libre a selección (2026-09-19): `usuario.intereses` es `TEXT[]`, se
  valida que sea un arreglo de strings no vacíos (400 si no) y se devuelve `[]` si está vacío. La
  lista fija de géneros/temas la define el frontend; el back no la valida.

### Archivos nuevos
- `backend/src/services/PerfilService.js` — `obtenerPerfil`, `actualizarPerfil`, validación de
  nivel MCER (A1-C2), mapea la respuesta al shape acordado con frontend (`estudiante_id`, `correo`
  en vez de `id_usuario`/`email`, sin `password_hash`).
- `FLUJO_PERFIL_ACADEMICO.md`.
- `backend/.dockerignore` — ya existía en `feature/Sprint_2_HU_005`, se agregó también aquí
  (mismo motivo: evitar que un `npm install` en Windows pise el `node_modules` de Linux del
  contenedor al hacer `COPY . .`).

### Archivos modificados
- `backend/src/models/Usuario.js`, `backend/src/repositories/UsuarioRepository.js` — reflejan las
  columnas nuevas; se agregó `UsuarioRepository.actualizarPerfil` (update parcial).
- `backend/src/controllers/UsuarioController.js` — se agregaron `obtenerPerfil` y
  `actualizarPerfil`.
- `backend/src/routes/usuarioRoutes.js` — `GET /:id` ahora usa `obtenerPerfil` (shape de perfil)
  en vez del `obtenerPorId` genérico; se agregó `PATCH /profile`.
- `backend/src/app.js` — se montó `usuarioRoutes` en `/api/v1/users` (antes existía pero no
  estaba montado en ningún lado).

### Pendiente / no implementado en esta sesión
- **"Contexto Académico"** (`GET /students/:id/context` del mock de frontend): no viene de
  ningún CA del backlog, la compañera de frontend misma pidió repensarlo antes de construirlo. No
  se implementó nada de esto.
- Ver el resto de pendientes en `FLUJO_PERFIL_ACADEMICO.md`.

## Cambios aplicados en la sesión anterior (2026-08-31) — Cobertura completa para Curso e Inscripcion

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
