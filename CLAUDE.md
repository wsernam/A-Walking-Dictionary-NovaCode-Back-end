# CLAUDE.md — Contexto del proyecto

Este archivo se carga automáticamente por Claude Code al inicio de cada sesión. Contiene el contexto estable del proyecto para no tener que reexplicarlo cada vez.

Última sincronización con `Backlog_HU.xlsx` y con el DER (`Diagrama_entidad_relacion`): 2026-10-04.

## Sobre el proyecto

Plataforma educativa de vocabulario colaborativo para un curso de literatura anglófona. Los estudiantes aportan tarjetas de vocabulario; la docente las supervisa, cura y hace seguimiento. Stack: Node.js + Express (backend), PostgreSQL, React (frontend).

## Regla de trabajo más importante

No inventar campos, tablas, endpoints, roles ni reglas de negocio que no estén documentados aquí o en el DER oficial (init.sql). Usar exactamente los endpoints, verbos HTTP y nombres de tabla indicados en cada HU — no cambiarlos ni "mejorarlos" sin pedirlo. Si falta un dato, preguntar o marcarlo como "supuesto pendiente de validar" en vez de asumirlo. Toda funcionalidad nueva debe mapear a un criterio de aceptación (CA) explícito de este backlog.

## Protocolo Human-in-the-Loop (obligatorio)

Claude propone y ejecuta; el equipo valida y decide en los puntos críticos.

**Antes de actuar**
- Para cada HU, presentar primero un plan breve (archivos a tocar, endpoints, tablas del DER, CA que cubre cada cambio) y ESPERAR aprobación del equipo antes de escribir código.
- Antes de empezar, revisar la sección "Discrepancias pendientes de decisión humana". Si la HU depende de una de ellas, preguntar cuál opción usar.

**Requiere confirmación humana explícita (nunca ejecutar sin un "sí")**
- Crear o ejecutar migraciones, o modificar init.sql.
- Agregar endpoints, tablas, columnas o estados no listados en el backlog o el DER.
- Borrar o renombrar archivos existentes.
- `git commit` / `git push`, instalar o actualizar dependencias.
- Cambiar el estado de una HU o CA en este archivo o en el backlog.

**Ante ambigüedad o contradicción** (backlog vs. DER vs. código vs. este archivo)
- Detenerse, señalar la contradicción citando archivo/línea y preguntar. No elegir una opción por cuenta propia.

**Después de implementar**
- Entregar un resumen: CA cubiertos, CA no cubiertos, supuestos pendientes de validar y cómo probarlo (requests de Postman o pasos manuales).
- Una HU solo se marca "Completado" cuando un integrante del equipo la valide.

**Retroalimentación**
- Cuando el equipo corrija algo o tome una decisión, registrarla en "Decisiones del equipo" (al final) para que no se repita en sesiones futuras.

## Estado actual del backlog (según Backlog_HU.xlsx)

Todas las épicas tienen prioridad **Alta** y riesgo **Alto**. Sprint, valor y esfuerzo aún no están estimados en el backlog (HU-2.1 tiene talla "S").

| HU | Nombre | Estado |
|---|---|---|
| HU-1.1 | Crear mazos precargados por semana | Completado |
| HU-1.2 | Registrar palabra en mazo compartido | Completado |
| HU-1.3 | Detectar aportes duplicados | Completado |
| HU-2.1 | Revisar y aprobar tarjetas | Completado |
| HU-2.2 | Asignar etiquetas de contexto cultural | Completado |
| HU-2.3 | Visualizar resumen de participación | Completado |
| HU-3.1 | Generar quices acumulativos | En progreso |
| HU-3.2 | Responder quiz y recibir nota | En progreso |
| HU-3.3 | Exportar mazos y quices a PDF | En progreso |
| HU-4.1 | Estudiar con repetición espaciada | Pendiente |
| HU-4.2 | Sugerir familias de palabras | Pendiente |
| HU-5.1 | Registrar estudiante autónomamente | Completado |
| HU-5.2 | Configurar perfil académico | Completado |
| HU-5.3 | Inscribir o asignar a cursos | En progreso |
| HU-5.4 | Iniciar sesión y control de roles | Completado |

Nota: en la hoja "Criterios de aceptación" del Excel TODOS los CA siguen en estado "Pendiente", incluso los de HU marcadas como Completado. Ver discrepancia D-01.

## Backlog completo — Épicas, Historias de Usuario, Criterios de Aceptación y Specs Técnicas

### HE-01 — Gestión Curricular de Mazos y Vocabulario

**HU-1.1 — Crear mazos precargados por semana · Estado: Completado**

Como docente del curso, quiero crear la estructura de mazos por semana/libro al inicio del semestre, para organizar el vocabulario según el cronograma lectivo.

- Endpoint: POST /api/v1/decks (Node.js)
- Frontend: formulario de creación de mazos en React
- Persistencia: PostgreSQL (tabla DER: `mazo`)
- CA-1.1.1 (Creación exitosa): Dado que el docente está en el formulario de creación de mazos, cuando ingresa nombre de la lectura, semana, autor y variante regional válida, entonces el sistema crea el mazo precargado en estado "abierto" y lo asocia al cronograma.
- CA-1.1.2 (Validación de datos obligatorios): Dado que el docente intenta crear un mazo, cuando deja el nombre del libro o la semana vacíos, entonces el sistema impide la creación y muestra un mensaje de validación.
- CA-1.1.3 (Control de estado de mazo): Dado que el docente visualiza los mazos creados, cuando cambia el estado de un mazo a "Cerrado", entonces el sistema inhabilita la recepción de nuevos aportes para ese mazo.

**HU-1.2 — Registrar palabra en mazo compartido · Estado: Completado**

Como estudiante del curso, quiero registrar una palabra nueva en el mazo compartido ingresando traducción, definición y ejemplo corto, para contribuir al mazo grupal.

- Endpoint: POST /api/v1/decks/{id}/cards (Node.js)
- Frontend: validación de 150 caracteres en React
- Tablas: tarjetas, aportes (DER: `tarjeta`, `aporte`)
- CA-1.2.1 (Registro exitoso): Dado que el estudiante está inscrito y el mazo de la semana está "abierto", cuando ingresa palabra, traducción y definición (obligatorios) con ejemplo opcional (máx. 150 caracteres), entonces el sistema crea la tarjeta en estado "pendiente_revision" y registra el aporte asociado al estudiante.
- CA-1.2.2 (Validación de campos obligatorios): Dado que el estudiante deja vacío algún campo obligatorio (palabra, traducción o definición), entonces el sistema impide el registro y muestra qué campo falta.
- CA-1.2.3 (Bloqueo por mazo cerrado): Dado que el mazo de esa semana ya está "cerrado", cuando el estudiante intenta registrar una palabra, entonces el sistema rechaza el aporte y notifica que el mazo no acepta nuevas palabras.

**HU-1.3 — Detectar aportes duplicados · Estado: Completado**

Como estudiante, quiero que el sistema me alerte si una palabra ya fue aportada en el mazo, para evitar duplicados exactos o anexar una acepción adicional.

- Endpoint: POST /api/v1/cards/check-duplicate (Node.js)
- Frontend: modal de advertencia/coautoría en React
- CA-1.3.1 (Duplicado exacto): Cuando la palabra ya existe en el mazo con exactamente la misma definición, el sistema no crea tarjeta nueva sino que suma al estudiante como coautor del aporte existente.
- CA-1.3.2 (Duplicado parcial): Cuando la palabra ya existe pero con definición o ejemplo diferente, el sistema permite guardarla como acepción adicional, sin sobrescribir la existente.
- CA-1.3.3 (Insensibilidad a mayúsculas/minúsculas): La comparación de palabras ignora mayúsculas/minúsculas (ej. "Cooking" vs "cooking").
- CA-1.3.4 (Notificación al estudiante): Al detectar coincidencia (exacta o parcial), cuando el estudiante envía el formulario, el sistema muestra una alerta antes de confirmar, explicando si será coautoría o acepción nueva.

### HE-02 — Supervisión y Curaduría Pedagógica Docente

**HU-2.1 — Revisar y aprobar tarjetas · Estado: Completado**

Como docente del curso, quiero revisar, editar y aprobar las tarjetas ingresadas por los estudiantes, para garantizar que el vocabulario sea correcto.

- Endpoint: PATCH /api/v1/cards/{id}/approve (Node.js)
- Frontend: panel de curaduría con filtros en React
- CA-2.1.1 (Filtrado de tarjetas pendientes): la docente selecciona el mazo de la semana o aplica el filtro "pendiente_revision" → listado exclusivo de tarjetas que requieren revisión.
- CA-2.1.2 (Edición y aprobación): corrige ortografía, ajusta definición, presiona "Aprobar" → estado pasa a "revisado_docente", habilitada para quices.
- CA-2.1.3 (Rechazo o solicitud de corrección): selecciona "Rechazar" + observación → estado "rechazada", se notifica al estudiante aportante para su corrección.

**HU-2.2 — Asignar etiquetas de contexto cultural · Estado: Completado**

Como docente del curso, quiero asignar etiquetas de contexto cultural, registro y variante regional, para enriquecer el matiz pedagógico durante la clase.

- Endpoint: PUT /api/v1/cards/{id}/context (Node.js)
- Frontend: selector de etiquetas en React
- Tabla: etiquetas_contexto (DER: `etiqueta_contexto`)
- CA-2.2.1 (Selección de variante regional y registro): desde el panel de curaduría o durante la discusión en clase, registro (Formal/Informal/Slang) + variante dialectal (ej. Inglés Ghanés, Jamaicano) → etiquetas guardadas y visibles en el mazo.
- CA-2.2.2 (Asignación masiva por mazo): variante regional a nivel de mazo → al guardar, todas las tarjetas del mazo heredan esa etiqueta como valor predeterminado.
- CA-2.2.3 (Visualización de contexto por estudiante): al abrir el detalle de una tarjeta aprobada (biblioteca o sesión de estudio), se despliegan destacadamente registro y variante regional.

**HU-2.3 — Visualizar resumen de participación · Estado: Completado**

Como docente del curso, quiero visualizar un resumen de la participación individual por mazo y semana, para realizar el seguimiento formativo.

- Endpoint: GET /api/v1/teacher/analytics/deck/{id} (Node.js)
- Frontend: tabla analítica de seguimiento en React
- CA-2.3.1 (Métricas por mazo): selecciona un mazo semanal → tabla de estudiantes, palabras aportadas, coautorías y estado de revisión.
- CA-2.3.2 (Informe de cumplimiento): filtro "Sin aportes" → resalta estudiantes pendientes dentro del cronograma activo.
- CA-2.3.3 (Actualización en tiempo real de conteos): al completarse un nuevo aporte, el contador de participación se incrementa automáticamente en el panel docente.

Detalle de implementación real de HE-02: ver sección "Implementación técnica — HE-02" más abajo.

### HE-03 — Evaluación Automatizada y Exportación

**HU-3.1 — Generar quices acumulativos · Estado: En progreso**

Como docente del curso, quiero generar un quiz automático acumulativo a partir de todas las tarjetas aprobadas hasta la fecha, para evaluar el aprendizaje continuo.

- Endpoint: POST /api/v1/quizzes/generate (Node.js)
- Lógica: selección aleatoria de tarjetas
- Frontend: pantalla de configuración en React (botón "Generar Quiz")
- Tablas DER: `quiz`, `quiz_mazo`, `pregunta_quiz`
- CA-3.1.1 (Selección de tarjetas aprobadas): al configurar un quiz acumulativo quincenal y elegir el rango de semanas/mazos, consulta exclusivamente tarjetas "revisado_docente" de esos mazos.
- CA-3.1.2 (Generación aleatoria de preguntas): preguntas de opción múltiple o asociación término-definición; distractores aleatorios entre el resto de términos aprobados, sin repetir opciones.
- CA-3.1.3 (Configuración de parámetros): fecha de apertura, cierre y tiempo límite en minutos → quiz queda en estado "programado", se publica automáticamente en la fecha indicada.

**HU-3.2 — Responder quiz y recibir nota · Estado: En progreso**

Como estudiante, quiero responder el quiz asignado desde la aplicación y recibir mi calificación inmediata, para conocer mi nivel de dominio.

- Endpoint: POST /api/v1/quizzes/{id}/submit (Node.js)
- Frontend: interfaz con temporizador en React
- Tabla: resultados_quiz (DER: `resultado_quiz`, `respuesta_quiz`)
- CA-3.2.1 (Control de tiempo): al agotarse el tiempo límite, se envían automáticamente las respuestas contestadas hasta el momento y se bloquea el formulario.
- CA-3.2.2 (Calificación e historial inmediato): al presionar "Finalizar examen", se calcula el puntaje, se muestra desglose de aciertos/errores y se registra en el historial.
- CA-3.2.3 (Restricción de reintento no autorizado): si ya finalizó y envió, un nuevo intento de acceso al enlace es denegado y se muestra el resumen del resultado previo. (El DER respalda esto con el índice único `resultado_quiz (quiz_id, estudiante_id)`.)

**HU-3.3 — Exportar mazos y quices a PDF · Estado: En progreso**

Como docente del curso, quiero exportar los mazos de vocabulario y las pruebas a archivos PDF, para fotocopiar el material ante imprevistos en aula sin conectividad.

- Endpoint: GET /api/v1/decks/{id}/export-pdf (Node.js, usando pdf-lib)
- Endpoint adicional (aprobado por el equipo 2026-10-07, D-06): GET /api/v1/quizzes/{id}/export-pdf — cubre CA-3.3.2. Pendiente de agregarlo también en Backlog_HU.xlsx.
- Acceso: solo rol Docente en ambos endpoints (decisión D-07, 2026-10-07).
- Frontend: botón de descarga en React
- CA-3.3.1 (Generación de PDF de mazo semanal): la docente o estudiante, desde un mazo completado, selecciona "Exportar a PDF" → PDF maquetado con lista ordenada de términos, traducciones, definiciones y contexto.
- CA-3.3.2 (Exportación de quiz impreso con clave de respuestas): "Exportar versión impresa" de un quiz → PDF listo para fotocopiar, con hoja de preguntas y hoja separada de respuestas para la docente.
- CA-3.3.3 (Formato optimizado para impresión): márgenes académicos, tipografía legible, estructura limpia sin elementos web redundantes.
- D-06 y D-07 resueltas: ver "Decisiones del equipo". ⚠️ A tener en cuenta: CA-3.3.1 menciona "docente o estudiante"; por ahora solo exporta la docente, reconsiderar si el estudiante debe poder exportar el PDF del mazo (nunca el del quiz, que trae la clave de respuestas).

### HE-04 — Repaso Adaptativo y Enriquecimiento Léxico

**HU-4.1 — Estudiar con repetición espaciada · Estado: Pendiente**

Como estudiante, quiero estudiar los mazos compartidos mediante una sesión con repetición espaciada, para afianzar el vocabulario acumulado.

- Endpoint: POST /api/v1/study/review-session (Node.js)
- Lógica: algoritmo SM-2
- Frontend: interfaz interactiva de flashcards en React
- Tabla DER: `progreso_estudio` (factor_facilidad, intervalo_dias, repeticiones, ultima_valoracion, fecha_ultimo_repaso, fecha_proximo_repaso; único por inscripcion_id + tarjeta_id)
- CA-4.1.1 (Interacción de flashcards): muestra la palabra en inglés; al interactuar revela traducción, definición y ejemplo de uso.
- CA-4.1.2 (Cálculo de intervalos SM-2): al confirmar valoración ("Repetir"/"Difícil"/"Buena"/"Fácil"), el algoritmo SM-2 recalcula el factor de facilidad y programa la próxima fecha de repaso individual.
- CA-4.1.3 (Reintroducción de fallos y resumen final): reintroduce la tarjeta fallada al final del bloque, o muestra métricas de la sesión al terminar.

**HU-4.2 — Sugerir familias de palabras · Estado: Pendiente**

Como estudiante, quiero recibir sugerencias de palabras relacionadas por campo semántico al consultar una tarjeta, para ampliar mi léxico.

- Endpoint: GET /api/v1/enrichment/family/{word} (Node.js, integrando node-wordnet)
- Tabla: wordnet_cache (PostgreSQL) — NO existe en el DER, ver D-05
- CA-4.2.1 (Consulta y despliegue de familias léxicas): sugerencias agrupadas por categoría gramatical (sustantivo, verbo, adjetivo) y relaciones semánticas.
- CA-4.2.2 (Optimización por caché): si la palabra ya fue consultada antes por cualquier usuario, se entrega desde wordnet_cache reduciendo latencia.
- CA-4.2.3 (Fallback y adición de términos sugeridos): si el término no existe en WordNet o se selecciona una sugerencia, precarga formulario de registro o muestra vista limpia sin coincidencias.

### HE-05 — Gestión de Usuarios, Perfiles e Inscripción

**HU-5.1 — Registrar estudiante autónomamente · Estado: Completado**

Como estudiante, quiero registrarme autónomamente ingresando mis datos personales, correo y contraseña, para crear mi cuenta e ingresar al sistema.

- Endpoint: POST /api/v1/auth/register (Node.js)
- Seguridad: encriptación bcrypt
- Frontend: formulario de registro en React
- Tabla DER: `usuario`
- CA-5.1.1 (Registro autónomo con correo institucional): datos válidos y contraseña segura → cuenta creada con clave encriptada (bcrypt) en rol "Estudiante".
- CA-5.1.2 (Validación de duplicados y formato de contraseña): correo ya existente o clave débil → solicitud rechazada, error indicado.

**HU-5.2 — Configurar perfil académico · Estado: Completado**

Como estudiante registrado, quiero configurar mi perfil académico (nivel MCER, código y preferencias), para que la docente conozca mis antecedentes.

- Endpoint: PATCH /api/v1/users/profile (Node.js)
- Frontend: interfaz de configuración en React ("Mi Perfil")
- Tabla: usuarios (DER: `usuario`) — ver D-03
- CA-5.2.1 (Configuración de perfil académico y avatar): nivel MCER (A1-C2), código estudiantil, avatar → actualiza tabla usuarios y refresca interfaz.
- CA-5.2.2 (Registro de preferencias de aprendizaje): guarda áreas a reforzar → almacenadas para orientar el seguimiento docente.

**HU-5.3 — Inscribir o asignar a cursos · Estado: En progreso**

Como docente o estudiante, quiero gestionar la inscripción a un curso mediante código de acceso o asignación directa, para vincular al estudiante con su grupo.

- Endpoints: POST /api/v1/courses/enroll y POST /api/v1/courses/{id}/assign (Node.js)
- Frontend: modal en React
- Tabla: inscripciones (DER: `inscripcion`, `curso`) — ver D-04
- CA-5.3.1 (Inscripción vía código de acceso): código proporcionado por la docente + "Unirse a curso" → valida el código y vincula al grupo lectivo en inscripciones.
- CA-5.3.2 (Inscripción directa por la docente): docente busca por correo en la administración del curso + "Inscribir" → asocia al estudiante y habilita acceso a los mazos correspondientes.

**HU-5.4 — Iniciar sesión y control de roles · Estado: Completado**

Como usuario de la plataforma, quiero iniciar sesión con mis credenciales y tener vistas según mi rol, para acceder a las funciones de Docente, Estudiante o Invitado.

- Endpoint: POST /api/v1/auth/login (Node.js)
- Seguridad: tokens JWT, middleware de autenticación
- Frontend: rutas protegidas en React
- CA-5.4.1 (Autenticación exitosa con JWT): credenciales válidas + "Iniciar Sesión" → retorna token JWT con claims de rol, acceso al Dashboard.
- CA-5.4.2 (Control de acceso por roles): estudiante intenta URL restringida a docentes → middleware deniega con HTTP 403, redirige a vista estudiantil.
- CA-5.4.3 (Acceso en modo Invitado): usuario no registrado como invitado → acceso de solo lectura al diccionario demostrativo, sin edición.

## Modelo de datos oficial (DER)

Fuente: `Diagrama_entidad_relacion` (formato DBML). Los nombres de tabla del DER están en SINGULAR; el backlog los menciona en plural (ver D-02).

- `usuario` (id_usuario, nombre_completo, email único, password_hash, rol, nivel_ingles, activo, fecha_registro)
- `curso` (id_curso, nombre, periodo, fecha_inicio, fecha_fin, docente_id → usuario, estado)
- `inscripcion` (id_inscripcion, curso_id, estudiante_id → usuario, fecha_inscripcion, estado; único curso_id + estudiante_id)
- `mazo` (id_mazo, curso_id, nombre_lectura, autor, semana, variante_regional_predeterminada, estado, fecha_apertura, fecha_cierre, fecha_creacion)
- `tarjeta` (id_tarjeta, mazo_id, palabra, traduccion, definicion, ejemplo varchar(150), estado, fecha_creacion, fecha_revision; único mazo_id + palabra)
- `aporte` (id_aporte, tarjeta_id, inscripcion_id, traduccion_aportada, definicion_aportada, ejemplo_aportado, tipo_aporte, fecha_aporte)
- `etiqueta_contexto` (id_etiqueta, tarjeta_id, tipo, valor, fecha_asignacion)
- `progreso_estudio` (SM-2 por inscripcion_id + tarjeta_id)
- `quiz` (id_quiz, curso_id, titulo, semana_corte, fecha_creacion, fecha_apertura, fecha_cierre, tiempo_limite_min, estado)
- `quiz_mazo` (PK quiz_id + mazo_id)
- `pregunta_quiz` (id_pregunta, quiz_id, tarjeta_id, tipo_pregunta, enunciado, opcion_a..d, respuesta_correcta, orden)
- `resultado_quiz` (id_resultado, quiz_id, estudiante_id → usuario, fecha_inicio, fecha_envio, puntaje_obtenido, puntaje_maximo, calificacion, tiempo_empleado_seg; único quiz_id + estudiante_id)
- `respuesta_quiz` (id_respuesta, resultado_id, pregunta_id, respuesta_estudiante, es_correcta, puntaje_obtenido; único resultado_id + pregunta_id)

## Discrepancias pendientes de decisión humana

Claude NO debe resolver estas discrepancias por su cuenta. Si una tarea depende de alguna, preguntar al equipo. Cuando se decida, mover la decisión a "Decisiones del equipo" y borrarla de aquí.

- **D-01 — Estado de los CA:** En el Excel todos los CA están "Pendiente", incluso en HU "Completado" (HE-01, HE-02, HU-5.1, 5.2, 5.4). ¿Se actualizan los CA a "Completado" o hay CA que realmente no se cumplen?
- **D-02 — Nombres de tabla plural vs. singular:** El backlog dice `tarjetas`, `aportes`, `etiquetas_contexto`, `resultados_quiz`, `usuarios`, `inscripciones`; el DER dice `tarjeta`, `aporte`, `etiqueta_contexto`, `resultado_quiz`, `usuario`, `inscripcion`. Supuesto pendiente de validar: en SQL y modelos usar los nombres del DER/init.sql; el backlog solo describe.
- **D-03 — Campos de perfil (HU-5.2) sin columna en el DER:** `usuario` solo tiene `nivel_ingles`. No existen columnas para código estudiantil, avatar ni preferencias/áreas a reforzar. HU-5.2 figura como Completado: confirmar dónde se guardaron o si falta migración.
- **D-04 — Código de acceso del curso (HU-5.3, CA-5.3.1):** La tabla `curso` no tiene columna para el código de acceso.
- **D-05 — Tablas fuera del DER:** `wordnet_cache` (HU-4.2) y `notificacion` (HE-02, propuesta en migración 002) no están en el DER. Tampoco `tarjeta.motivo_rechazo`.
- **D-08 — Unicidad de tarjetas vs. acepciones (HU-1.3):** El DER tiene índice único `tarjeta (mazo_id, palabra)`, lo que impide guardar una acepción adicional como tarjeta nueva (CA-1.3.2). Además ese índice distingue mayúsculas/minúsculas en PostgreSQL, lo que no cumple CA-1.3.3 a nivel de BD. Confirmar si las acepciones se guardan como `aporte` con `tipo_aporte` distinto y si se usa `LOWER(palabra)`.
- **D-09 — Campos obligatorios de mazo:** El DER exige `curso_id`, `fecha_apertura` y `fecha_cierre` (not null), pero CA-1.1.1 solo pide nombre, semana, autor y variante. Confirmar de dónde salen esos valores.
- **D-10 — Endpoint de filtrado de pendientes (CA-2.1.1):** Este archivo menciona dos rutas distintas: `GET /decks/:id/cards?estado=pendiente_revision` y `GET /api/v1/cards/pending`. Definir cuál es la oficial.
- **D-11 — Correo institucional (CA-5.1.1):** El título habla de "correo institucional", pero no se especifica el dominio permitido ni si se valida.

## Implementación técnica — HE-02 (detalle real de esta sesión de desarrollo)

### Endpoints implementados
- GET /decks/:id/cards?estado=pendiente_revision — CA-2.1.1 (endpoint adicional, no listado originalmente en el backlog pero necesario para el filtrado) — ver D-10
- PATCH /cards/:id/approve {accion:"aprobar", ...correcciones} — CA-2.1.2
- PATCH /cards/:id/approve {accion:"rechazar", observacion} — persiste motivo_rechazo, crea notificacion — CA-2.1.3
- PUT /cards/:id/context (UPSERT) — CA-2.2.1
- PATCH /decks/:id/context {variante_dialectal} — CA-2.2.2 (endpoint adicional para asignación masiva)
- GET /cards/:id — incluye etiquetas_contexto — CA-2.2.3 (endpoint adicional)
- GET /teacher/analytics/deck/:id — CA-2.3.1
- GET /teacher/analytics/deck/:id?filtro=sin_aportes — CA-2.3.2
- CA-2.3.3 resuelto por recálculo fresco en cada GET (sin WebSockets, el proyecto no tiene esa infraestructura) — decisión conocida, no "tiempo real" verdadero.

### Cambios de esquema pendientes de fusión (no aplicados a init.sql)

Documentados en HE-02_PROPUESTA_correccion_DER.md, migración en migrations/002_he02_correcciones_der.sql:

- tarjeta.motivo_rechazo TEXT (columna nueva) — CA-2.1.3
- Índice único etiqueta_contexto (tarjeta_id, tipo) — CA-2.2.1 / CA-2.2.2
- Tabla nueva notificacion — CA-2.1.3

Estos cambios solo se fusionan a init.sql si el equipo los aprueba en Slack/revisión. No asumir que ya están aplicados en producción.

### Archivos clave de HE-02
- Nuevos: migrations/002_he02_correcciones_der.sql, HE-02_PROPUESTA_correccion_DER.md, HE-02 - ...postman_collection.json (21 requests), Notificacion.js (model/repo/controller/routes), AnaliticaController.js, teacherRoutes.js
- Modificados: CuraduriaService.js, TarjetaController.js, MazoController.js, Tarjeta.js, TarjetaRepository.js, AporteRepository.js, EtiquetaContextoRepository.js, MazoRepository.js, tarjetaRoutes.js, mazoRoutes.js, app.js, CHANGELOG_BACKEND.md

### Pendiente / conocido
- Falta correr la colección Postman (21 requests) contra una BD con la migración aplicada (no había Docker disponible en la sesión donde se implementó).
- CA-2.3.3 sin tiempo real verdadero; revisar si se agrega infraestructura de sockets.
- Listar tarjetas aprobadas (pestaña "Historial Aprobadas" del panel de curaduría): ninguna HU ni CA de HE-02 pide originalmente un listado de tarjetas en estado "revisado_docente". Por pedido explícito del equipo (fuera del backlog formal), se agregó GET /api/v1/cards/approved (CuraduriaService.listarAprobadas, TarjetaController.listarAprobadas, tarjetaRoutes.js) como endpoint adicional, mismo patrón que /cards/pending. Pendiente: el frontend todavía llama a GET /cards?estado=revisado_docente (ruta inexistente) en vez de /cards/approved — hay que corregir esa llamada en tarjetasApi.js para que esa pestaña deje de recibir 404.

## Implementación técnica — HE-01, HE-05 (pendiente de documentar)

HU-1.1, 1.2, 1.3, 5.1, 5.2 y 5.4 figuran como Completado en el backlog, pero su detalle de implementación (endpoints reales, archivos, migraciones, desviaciones del backlog) no está documentado aquí. El equipo debe completar esta sección con el mismo formato de HE-02. Mientras tanto, antes de modificar código de estas HU, Claude debe leer el código existente y preguntar en vez de asumir cómo se implementaron.

HU en progreso (3.1, 3.2, 3.3, 5.3): documentar aquí el avance real al terminar cada sesión de trabajo.

## Convenciones generales
- Roles: Docente, Estudiante, Invitado.
- Nomenclatura de estados en español, tal como aparece en el backlog (pendiente_revision, revisado_docente, rechazada, abierto, cerrado, programado, etc.) — no traducir ni renombrar.
- Nombres de tabla: ver D-02 hasta que el equipo decida.
- Endpoints bajo /api/v1/....
- Autenticación: JWT con claims de rol (HU-5.4); middleware de control de acceso por rol (403 si no autorizado).
- Al trabajar en una HU, usar exactamente el endpoint y la tabla especificados en su spec técnica arriba. Si el endpoint real implementado difiere del backlog (como pasó en HE-02 con endpoints adicionales), documentarlo explícitamente en vez de asumir que el backlog quedó desactualizado.

## Decisiones del equipo

Registro de decisiones humanas que Claude debe respetar en todas las sesiones. Formato: fecha — decisión — quién la tomó — HU/CA afectados.

- 2026-10-07 — D-06: se aprueba el endpoint adicional `GET /api/v1/quizzes/:id/export-pdf` para cubrir CA-3.3.2 (el backlog solo lista el de mazos); falta reflejarlo en Backlog_HU.xlsx — wsernam — HU-3.3 (CA-3.3.2)
- 2026-10-07 — D-07: solo la docente exporta PDF (`authenticate` + `requireRole('docente')` en `/decks/:id/export-pdf` y `/quizzes/:id/export-pdf`). A tener en cuenta: CA-3.3.1 dice "docente o estudiante"; reconsiderar el acceso del estudiante al PDF del mazo más adelante — wsernam — HU-3.3 (CA-3.3.1, CA-3.3.2)
- 2026-10-07 — En `POST /api/v1/quizzes/:id/submit` el `estudiante_id` se toma del JWT (`req.usuario.id_usuario`), no del body; ruta protegida con `authenticate` + `requireRole('estudiante')` — wsernam — HU-3.2 (CA-3.2.2, CA-3.2.3), CA-5.4.2
- 2026-10-07 — Responder o pedir preguntas de un quiz exige estar inscrito en el curso del quiz (`InscripcionRepository.obtenerPorCursoYEstudiante`), 403 si no — wsernam — HU-3.2
- 2026-10-07 — Control de tiempo de CA-3.2.1 se queda con `fecha_inicio`/`tiempo_empleado_seg` informados por el cliente; NO se agrega endpoint de inicio de intento por ahora (limitación conocida) — wsernam — HU-3.2 (CA-3.2.1)
- 2026-10-07 — Se aprueba el endpoint adicional `GET /api/v1/quizzes/:id/preguntas` (preguntas sin `respuesta_correcta` ni `tarjeta_id`, solo estudiante inscrito y quiz abierto) — wsernam — HU-3.2
- 2026-10-08 — HU-3.1 se alinea con el contrato del front (`docs/contrato-quiz.md`, P2-P5): mínimo 4 traducciones distintas (400), ventana apertura-cierre ≥ `tiempo_limite_min` (400), `titulo` ≤ 200 (400), curso inexistente o mazo de otro curso (404) — wsernam — HU-3.1 (CA-3.1.1, CA-3.1.2, CA-3.1.3)
- 2026-10-08 — Auditoría OWASP H-06: con `DB_SSL=true` la conexión valida el certificado (`rejectUnauthorized: true` + CA de Supabase). El certificado raíz se versiona en `backend/certs/supabase-ca.crt` (es público); `DB_SSL_CA_PATH` es opcional. Si falta el certificado, el backend no arranca (falla cerrada). Rama `feature/owasp-h06-ssl-db`. PENDIENTE antes del merge: probar la conexión real contra Supabase (staging de Render o `SELECT 1` con credenciales); solo se probó contra la BD local y un servidor TLS falso — wsernam — sin HU (seguridad transversal)
