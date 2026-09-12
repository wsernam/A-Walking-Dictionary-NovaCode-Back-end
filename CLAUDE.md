CLAUDE.md — Contexto del proyecto

Este archivo se carga automáticamente por Claude Code al inicio de cada sesión. Contiene el contexto estable del proyecto para no tener que reexplicarlo cada vez.

Sobre el proyecto

Plataforma educativa de vocabulario colaborativo para un curso de literatura anglófona. Los estudiantes aportan tarjetas de vocabulario; la docente las supervisa, cura y hace seguimiento. Stack: Node.js + Express (backend), PostgreSQL, React (frontend).

Regla de trabajo más importante

No inventar campos, tablas, endpoints, roles ni reglas de negocio que no estén documentados aquí o en el DER oficial (init.sql). Si falta un dato, preguntar o marcarlo como "supuesto pendiente de validar" en vez de asumirlo.

Épicas del backlog
EPIC-001: Gestión curricular de mazos y vocabulario
EPIC-002 (HE-02): Supervisión y curaduría pedagógica docente
EPIC-003: Evaluación automatizada y exportación
EPIC-004: Repaso adaptativo y enriquecimiento léxico
EPIC-005: Gestión de usuarios, perfiles e inscripción a cursos
HE-02 — Supervisión y Curaduría Pedagógica Docente (implementada)
HU-2.1 — Revisar y aprobar tarjetas
GET /decks/:id/cards?estado=pendiente_revision — listar tarjetas pendientes (CA-2.1.1)
PATCH /cards/:id/approve con {accion: "aprobar", ...correcciones} — aprobar y editar (CA-2.1.2)
PATCH /cards/:id/approve con {accion: "rechazar", observacion} — rechazar, persiste motivo_rechazo y crea notificacion (CA-2.1.3)
Estados de tarjeta: pendiente_revision → revisado_docente | rechazada
Tabla: tarjetas (campo estado, campo nuevo motivo_rechazo TEXT)
HU-2.2 — Asignar etiquetas de contexto cultural
PUT /cards/:id/context (UPSERT) — registro + variante dialectal por tarjeta (CA-2.2.1)
PATCH /decks/:id/context con {variante_dialectal} — asignación masiva, propaga a tarjetas sin variante propia (CA-2.2.2)
GET /cards/:id — incluye etiquetas_contexto para que el estudiante vea el contexto (CA-2.2.3)
Tabla: etiquetas_contexto (vinculada a tarjetas), índice único (tarjeta_id, tipo)
HU-2.3 — Visualizar resumen de participación
GET /teacher/analytics/deck/:id — métricas por mazo (CA-2.3.1)
GET /teacher/analytics/deck/:id?filtro=sin_aportes — estudiantes sin aportes (CA-2.3.2)
Conteo se recalcula en cada GET (sin WebSockets, no hay infraestructura de sockets en el proyecto) — cumple CA-2.3.3 de forma parcial, anotado como decisión conocida
Cambios de esquema pendientes de fusión (no aplicados a init.sql)

Documentados en HE-02_PROPUESTA_correccion_DER.md, migración en migrations/002_he02_correcciones_der.sql:

tarjeta.motivo_rechazo TEXT (columna nueva) — requerido por CA-2.1.3
Índice único etiqueta_contexto (tarjeta_id, tipo) — requerido por CA-2.2.1 / CA-2.2.2
Tabla nueva notificacion — requerido por CA-2.1.3 Estos cambios solo se fusionan a init.sql si el equipo los aprueba en Slack/revisión. No asumir que ya están aplicados en producción.
Archivos clave de HE-02
Nuevos: migrations/002_he02_correcciones_der.sql, HE-02_PROPUESTA_correccion_DER.md, HE-02 - ...postman_collection.json (21 requests), Notificacion.js (model/repo/controller/routes), AnalyticsController.js, teacherRoutes.js
Modificados: CuraduriaService.js, TarjetaController.js, MazoController.js, Tarjeta.js, TarjetaRepository.js, AporteRepository.js, EtiquetaContextoRepository.js, MazoRepository.js, cardRoutes.js, deckRoutes.js, app.js, CHANGELOG_BACKEND.md
Pendiente / conocido
Falta correr la colección Postman (21 requests) contra una BD con la migración aplicada (no había Docker disponible en la sesión donde se implementó).
CA-2.3.3 resuelto sin tiempo real verdadero; si se agrega infraestructura de sockets al proyecto, revisar este punto.
Convenciones
Roles: Docente, Estudiante, Invitado.
Nomenclatura de tablas y estados en español, tal como aparece en el backlog (tarjetas, etiquetas_contexto, pendiente_revision, revisado_docente, rechazada, etc.) — no traducir ni renombrar.
Endpoints bajo /api/v1/... salvo que se indique lo contrario.