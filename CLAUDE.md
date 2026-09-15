CLAUDE.md — Contexto del proyecto

Este archivo se carga automáticamente por Claude Code al inicio de cada sesión. Contiene el contexto estable del proyecto para no tener que reexplicarlo cada vez.

Sobre el proyecto

Plataforma educativa de vocabulario colaborativo para un curso de literatura anglófona. Los estudiantes aportan tarjetas de vocabulario; la docente las supervisa, cura y hace seguimiento. Stack: Node.js + Express (backend), PostgreSQL, React (frontend).

Regla de trabajo más importante

No inventar campos, tablas, endpoints, roles ni reglas de negocio que no estén documentados aquí o en el DER oficial (init.sql). Usar exactamente los endpoints, verbos HTTP y nombres de tabla indicados en cada HU — no cambiarlos ni "mejorarlos" sin pedirlo. Si falta un dato, preguntar o marcarlo como "supuesto pendiente de validar" en vez de asumirlo. Toda funcionalidad nueva debe mapear a un criterio de aceptación (CA) explícito de este backlog.

Backlog completo — Épicas, Historias de Usuario, Criterios de Aceptación y Specs Técnicas
HE-01 — Gestión Curricular de Mazos y Vocabulario

HU-1.1 — Crear mazos precargados por semana · Estado: Completado

Como docente del curso, quiero crear la estructura de mazos por semana/libro al inicio del semestre, para organizar el vocabulario según el cronograma lectivo.

Endpoint: POST /api/v1/decks (Node.js)
Frontend: formulario de creación de mazos en React
Persistencia: PostgreSQL
CA-1.1.1 (Creación exitosa): Dado que el docente está en el formulario de creación de mazos, cuando ingresa nombre de la lectura, semana, autor y variante regional válida, entonces el sistema crea el mazo precargado en estado "abierto" y lo asocia al cronograma.
CA-1.1.2 (Validación de datos obligatorios): Dado que el docente intenta crear un mazo, cuando deja el nombre del libro o la semana vacíos, entonces el sistema impide la creación y muestra un mensaje de validación.
CA-1.1.3 (Control de estado de mazo): Dado que el docente visualiza los mazos creados, cuando cambia el estado de un mazo a "Cerrado", entonces el sistema inhabilita la recepción de nuevos aportes para ese mazo.

HU-1.2 — Registrar palabra en mazo compartido · Estado: En progreso

Como estudiante del curso, quiero registrar una palabra nueva en el mazo compartido ingresando traducción, definición y ejemplo corto, para contribuir al mazo grupal.

Endpoint: POST /api/v1/decks/{id}/cards (Node.js)
Frontend: validación de 150 caracteres en React
Tablas: tarjetas, aportes
CA-1.2.1 (Registro exitoso): Dado que el estudiante está inscrito y el mazo de la semana está "abierto", cuando ingresa palabra, traducción y definición (obligatorios) con ejemplo opcional (máx. 150 caracteres), entonces el sistema crea la tarjeta en estado "pendiente_revision" y registra el aporte asociado al estudiante.
CA-1.2.2 (Validación de campos obligatorios): Dado que el estudiante deja vacío algún campo obligatorio (palabra, traducción o definición), entonces el sistema impide el registro y muestra qué campo falta.
CA-1.2.3 (Bloqueo por mazo cerrado): Dado que el mazo de esa semana ya está "cerrado", cuando el estudiante intenta registrar una palabra, entonces el sistema rechaza el aporte y notifica que el mazo no acepta nuevas palabras.

HU-1.3 — Detectar aportes duplicados · Estado: En progreso

Como estudiante, quiero que el sistema me alerte si una palabra ya fue aportada en el mazo, para evitar duplicados exactos o anexar una acepción adicional.

Endpoint: POST /api/v1/cards/check-duplicate (Node.js)
Frontend: modal de advertencia/coautoría en React
CA-1.3.1 (Duplicado exacto): Cuando la palabra ya existe en el mazo con exactamente la misma definición, el sistema no crea tarjeta nueva sino que suma al estudiante como coautor del aporte existente.
CA-1.3.2 (Duplicado parcial): Cuando la palabra ya existe pero con definición o ejemplo diferente, el sistema la guarda como acepción adicional, sin sobrescribir la existente.
CA-1.3.3 (Insensibilidad a mayúsculas/minúsculas): La comparación de palabras ignora mayúsculas/minúsculas (ej. "Cooking" vs "cooking").
CA-1.3.4 (Notificación al estudiante): Al detectar coincidencia (exacta o parcial), el sistema muestra una alerta antes de confirmar, explicando si será coautoría o acepción nueva.
HE-02 — Supervisión y Curaduría Pedagógica Docente (implementada)

HU-2.1 — Revisar y aprobar tarjetas · Estado backlog original: En progreso → implementada en esta sesión de desarrollo

Como docente del curso, quiero revisar, editar y aprobar las tarjetas ingresadas por los estudiantes, para garantizar que el vocabulario sea correcto.

Endpoint: PATCH /api/v1/cards/{id}/approve (Node.js)
Frontend: panel de curaduría con filtros en React
CA-2.1.1 (Filtrado de tarjetas pendientes): filtro "pendiente_revision" o selección de mazo de la semana → listado exclusivo de tarjetas que requieren revisión.
CA-2.1.2 (Edición y aprobación): corrige ortografía, ajusta definición, presiona "Aprobar" → estado pasa a "revisado_docente", habilitada para quices.
CA-2.1.3 (Rechazo o solicitud de corrección): selecciona "Rechazar" + observación → estado "rechazada", se notifica al estudiante aportante.

HU-2.2 — Asignar etiquetas de contexto cultural · Estado backlog original: En progreso → implementada

Como docente del curso, quiero asignar etiquetas de contexto cultural, registro y variante regional, para enriquecer el matiz pedagógico durante la clase.

Endpoint: PUT /api/v1/cards/{id}/context (Node.js)
Frontend: selector de etiquetas en React
Tabla: etiquetas_contexto
CA-2.2.1 (Selección de variante regional y registro): registro (Formal/Informal/Slang) + variante dialectal (ej. Inglés Ghanés, Jamaicano) → etiquetas guardadas y visibles en el mazo.
CA-2.2.2 (Asignación masiva por mazo): variante regional a nivel de mazo → todas las tarjetas del mazo heredan esa etiqueta como valor predeterminado.
CA-2.2.3 (Visualización de contexto por estudiante): al abrir el detalle de una tarjeta aprobada, se despliegan destacadamente registro y variante regional.

HU-2.3 — Visualizar resumen de participación · Estado backlog original: En progreso → implementada

Como docente del curso, quiero visualizar un resumen de la participación individual por mazo y semana, para realizar el seguimiento formativo.

Endpoint: GET /api/v1/teacher/analytics/deck/{id} (Node.js)
Frontend: tabla analítica de seguimiento en React
CA-2.3.1 (Métricas por mazo): selecciona un mazo semanal → tabla de estudiantes, palabras aportadas, coautorías y estado de revisión.
CA-2.3.2 (Informe de cumplimiento): filtro "Sin aportes" → resalta estudiantes pendientes dentro del cronograma activo.
CA-2.3.3 (Actualización en tiempo real de conteos): al completarse un nuevo aporte, el contador de participación se incrementa automáticamente en el panel docente.

Detalle de implementación real de HE-02: ver sección "Implementación técnica — HE-02" más abajo (incluye endpoints extra creados, cambios de esquema propuestos y pendientes).

HE-03 — Evaluación Automatizada y Exportación

HU-3.1 — Generar quices acumulativos · Estado: Pendiente

Como docente del curso, quiero generar un quiz automático acumulativo a partir de todas las tarjetas aprobadas hasta la fecha, para evaluar el aprendizaje continuo.

Endpoint: POST /api/v1/quizzes/generate (Node.js)
Lógica: selección aleatoria de tarjetas
Frontend: pantalla de configuración en React
CA-3.1.1 (Selección de tarjetas aprobadas): consulta exclusivamente tarjetas "revisado_docente" del rango de semanas/mazos elegido.
CA-3.1.2 (Generación aleatoria de preguntas): distractores aleatorios entre el resto de términos aprobados, sin repetir opciones.
CA-3.1.3 (Configuración de parámetros): fecha de apertura, cierre y tiempo límite en minutos → quiz queda en estado "programado", se publica automáticamente en la fecha indicada.

HU-3.2 — Responder quiz y recibir nota · Estado: Pendiente

Como estudiante, quiero responder el quiz asignado desde la aplicación y recibir mi calificación inmediata, para conocer mi nivel de dominio.

Endpoint: POST /api/v1/quizzes/{id}/submit (Node.js)
Frontend: interfaz con temporizador en React
Tabla: resultados_quiz
CA-3.2.1 (Control de tiempo): al agotarse el tiempo límite, se envían automáticamente las respuestas contestadas hasta el momento y se bloquea el formulario.
CA-3.2.2 (Calificación e historial inmediato): al presionar "Finalizar examen", se calcula el puntaje, se muestra desglose de aciertos/errores y se registra en el historial.
CA-3.2.3 (Restricción de reintento no autorizado): si ya finalizó y envió, un nuevo intento de acceso al enlace es denegado y se muestra el resumen del resultado previo.

HU-3.3 — Exportar mazos y quices a PDF · Estado: Pendiente

Como docente del curso, quiero exportar los mazos de vocabulario y las pruebas a archivos PDF, para fotocopiar el material ante imprevistos en aula sin conectividad.

Endpoint: GET /api/v1/decks/{id}/export-pdf (Node.js, usando pdf-lib)
Frontend: botón de descarga en React
CA-3.3.1 (Generación de PDF de mazo semanal): genera un PDF maquetado con términos, traducciones, definiciones y contexto.
CA-3.3.2 (Exportación de quiz impreso con clave de respuestas): descarga PDF listo para fotocopiar, con hoja de preguntas y hoja separada de respuestas.
CA-3.3.3 (Formato optimizado para impresión): márgenes académicos, tipografía legible, estructura limpia sin elementos web redundantes.
HE-04 — Repaso Adaptativo y Enriquecimiento Léxico

HU-4.1 — Estudiar con repetición espaciada · Estado: Pendiente

Como estudiante, quiero estudiar los mazos compartidos mediante una sesión con repetición espaciada, para afianzar el vocabulario acumulado.

Endpoint: POST /api/v1/study/review-session (Node.js)
Lógica: algoritmo SM-2
Frontend: interfaz interactiva de flashcards en React
CA-4.1.1 (Interacción de flashcards): muestra la palabra en inglés; al interactuar revela traducción, definición y ejemplo de uso.
CA-4.1.2 (Cálculo de intervalos SM-2): al confirmar valoración ("Repetir"/"Difícil"/"Buena"/"Fácil"), el algoritmo SM-2 recalcula el factor de facilidad y programa la próxima fecha de repaso individual.
CA-4.1.3 (Reintroducción de fallos y resumen final): reintroduce la tarjeta fallada al final del bloque, o muestra métricas de la sesión al terminar.

HU-4.2 — Sugerir familias de palabras · Estado: Pendiente

Como estudiante, quiero recibir sugerencias de palabras relacionadas por campo semántico al consultar una tarjeta, para ampliar mi léxico.

Endpoint: GET /api/v1/enrichment/family/{word} (Node.js, integrando node-wordnet)
Tabla: wordnet_cache (PostgreSQL)
CA-4.2.1 (Consulta y despliegue de familias léxicas): sugerencias agrupadas por categoría gramatical (sustantivo, verbo, adjetivo) y relaciones semánticas.
CA-4.2.2 (Optimización por caché): si la palabra ya fue consultada antes, se entrega desde wordnet_cache reduciendo latencia.
CA-4.2.3 (Fallback y adición de términos sugeridos): si el término no existe en WordNet o se selecciona una sugerencia, precarga formulario de registro o muestra vista limpia sin coincidencias.
HE-05 — Gestión de Usuarios, Perfiles e Inscripción

HU-5.1 — Registrar estudiante autónomamente · Estado: Pendiente

Como estudiante, quiero registrarme autónomamente ingresando mis datos personales, correo y contraseña, para crear mi cuenta e ingresar al sistema.

Endpoint: POST /api/v1/auth/register (Node.js)
Seguridad: encriptación bcrypt
Frontend: formulario de registro en React
CA-5.1.1 (Registro autónomo con correo institucional): datos válidos y contraseña segura → cuenta creada con clave encriptada (bcrypt) en rol "Estudiante".
CA-5.1.2 (Validación de duplicados y formato de contraseña): correo ya existente o clave débil → solicitud rechazada, error indicado.

HU-5.2 — Configurar perfil académico · Estado: Pendiente

Como estudiante registrado, quiero configurar mi perfil académico (nivel MCER, código y preferencias), para que la docente conozca mis antecedentes.

Endpoint: PATCH /api/v1/users/profile (Node.js)
Frontend: interfaz de configuración en React
Tabla: usuarios
CA-5.2.1 (Configuración de perfil académico y avatar): nivel MCER (A1-C2), código estudiantil, avatar → actualiza tabla usuarios y refresca interfaz.
CA-5.2.2 (Registro de preferencias de aprendizaje): guarda áreas a reforzar → almacenadas para orientar el seguimiento docente.

HU-5.3 — Inscribir o asignar a cursos · Estado: Pendiente

Como docente o estudiante, quiero gestionar la inscripción a un curso mediante código de acceso o asignación directa, para vincular al estudiante con su grupo.

Endpoints: POST /api/v1/courses/enroll y POST /api/v1/courses/{id}/assign (Node.js)
Frontend: modal en React
Tabla: inscripciones
CA-5.3.1 (Inscripción vía código de acceso): código proporcionado por la docente + "Unirse a curso" → valida el código y vincula al grupo lectivo en inscripciones.
CA-5.3.2 (Inscripción directa por la docente): docente busca por correo + "Inscribir" → asocia al estudiante y habilita acceso a los mazos correspondientes.

HU-5.4 — Iniciar sesión y control de roles · Estado: Pendiente

Como usuario de la plataforma, quiero iniciar sesión con mis credenciales y tener vistas según mi rol, para acceder a las funciones de Docente, Estudiante o Invitado.

Endpoint: POST /api/v1/auth/login (Node.js)
Seguridad: tokens JWT, middleware de autenticación
Frontend: rutas protegidas en React
CA-5.4.1 (Autenticación exitosa con JWT): credenciales válidas + "Iniciar Sesión" → retorna token JWT con claims de rol, acceso al Dashboard.
CA-5.4.2 (Control de acceso por roles): estudiante intenta URL restringida a docentes → middleware deniega con HTTP 403, redirige a vista estudiantil.
CA-5.4.3 (Acceso en modo Invitado): usuario no registrado como invitado → acceso de solo lectura al diccionario demostrativo, sin edición.
Implementación técnica — HE-02 (detalle real de esta sesión de desarrollo)
Endpoints implementados
GET /decks/:id/cards?estado=pendiente_revision — CA-2.1.1 (endpoint adicional, no listado originalmente en el backlog pero necesario para el filtrado)
PATCH /cards/:id/approve {accion:"aprobar", ...correcciones} — CA-2.1.2
PATCH /cards/:id/approve {accion:"rechazar", observacion} — persiste motivo_rechazo, crea notificacion — CA-2.1.3
PUT /cards/:id/context (UPSERT) — CA-2.2.1
PATCH /decks/:id/context {variante_dialectal} — CA-2.2.2 (endpoint adicional para asignación masiva)
GET /cards/:id — incluye etiquetas_contexto — CA-2.2.3 (endpoint adicional)
GET /teacher/analytics/deck/:id — CA-2.3.1
GET /teacher/analytics/deck/:id?filtro=sin_aportes — CA-2.3.2
CA-2.3.3 resuelto por recálculo fresco en cada GET (sin WebSockets, el proyecto no tiene esa infraestructura) — decisión conocida, no "tiempo real" verdadero.
Cambios de esquema pendientes de fusión (no aplicados a init.sql)

Documentados en HE-02_PROPUESTA_correccion_DER.md, migración en migrations/002_he02_correcciones_der.sql:

tarjeta.motivo_rechazo TEXT (columna nueva) — CA-2.1.3
Índice único etiqueta_contexto (tarjeta_id, tipo) — CA-2.2.1 / CA-2.2.2
Tabla nueva notificacion — CA-2.1.3

Estos cambios solo se fusionan a init.sql si el equipo los aprueba en Slack/revisión. No asumir que ya están aplicados en producción.

Archivos clave de HE-02
Nuevos: migrations/002_he02_correcciones_der.sql, HE-02_PROPUESTA_correccion_DER.md, HE-02 - ...postman_collection.json (21 requests), Notificacion.js (model/repo/controller/routes), AnalyticsController.js, teacherRoutes.js
Modificados: CuraduriaService.js, TarjetaController.js, MazoController.js, Tarjeta.js, TarjetaRepository.js, AporteRepository.js, EtiquetaContextoRepository.js, MazoRepository.js, cardRoutes.js, deckRoutes.js, app.js, CHANGELOG_BACKEND.md
Pendiente / conocido
Falta correr la colección Postman (21 requests) contra una BD con la migración aplicada (no había Docker disponible en la sesión donde se implementó).
CA-2.3.3 sin tiempo real verdadero; revisar si se agrega infraestructura de sockets.
Listar tarjetas aprobadas (pestaña "Historial Aprobadas" del panel de curaduría): ninguna HU ni CA de HE-02 pide originalmente un listado de tarjetas en estado "revisado_docente" — HU-2.1/CA-2.1.1 solo especifica el filtrado de "pendiente_revision" (GET /api/v1/cards/pending). Por pedido explícito del equipo (fuera del backlog formal), se agregó GET /api/v1/cards/approved (CuraduriaService.listarAprobadas, TarjetaController.listarAprobadas, cardRoutes.js) como endpoint adicional, mismo patrón que /cards/pending. Pendiente: el frontend todavía llama a GET /cards?estado=revisado_docente (ruta inexistente) en vez de /cards/approved — hay que corregir esa llamada en tarjetasApi.js para que esa pestaña deje de recibir 404.
Convenciones generales
Roles: Docente, Estudiante, Invitado.
Nomenclatura de tablas y estados en español, tal como aparece en el backlog (tarjetas, aportes, etiquetas_contexto, resultados_quiz, wordnet_cache, usuarios, inscripciones, pendiente_revision, revisado_docente, rechazada, abierto, cerrado, programado, etc.) — no traducir ni renombrar.
Endpoints bajo /api/v1/....
Autenticación: JWT con claims de rol (HU-5.4); middleware de control de acceso por rol (403 si no autorizado).
Al trabajar en una HU, usar exactamente el endpoint y la tabla especificados en su spec técnica arriba. Si el endpoint real implementado difiere del backlog (como pasó en HE-02 con endpoints adicionales), documentarlo explícitamente en vez de asumir que el backlog quedó desactualizado.