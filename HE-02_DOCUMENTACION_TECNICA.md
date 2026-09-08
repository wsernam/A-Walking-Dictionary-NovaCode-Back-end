# HE-02 — Documentación técnica y decisiones de diseño

**Épica:** HE-02 — Supervisión y Curaduría Pedagógica Docente
**Historias:** HU-2.1 (revisar/aprobar tarjetas), HU-2.2 (etiquetas de contexto cultural), HU-2.3 (resumen de participación)
**Rama:** `feature/Sprint_2_HU_002` · **Autor:** William Serna · **Fecha:** 2026-09-08
**Stack:** Node.js + Express + PostgreSQL (driver `pg`, sin ORM)

Documentos relacionados:
- `HE-02_PROPUESTA_correccion_DER.md` — cambios al DER para llevar a Slack.
- `migrations/002_he02_correcciones_der.sql` — script SQL de esos cambios.
- `HE-02 - Supervisión y Curaduría Pedagógica Docente.postman_collection.json` — pruebas.
- `CHANGELOG_BACKEND.md` — bitácora de la sesión.

---

## 1. Alcance

### Qué se implementó
- Backend completo de las 3 historias, cubriendo **todos** los criterios de aceptación.
- 8 endpoints REST (3 exigidos por las especificaciones + 5 de apoyo para CA que no traían endpoint).
- 1 migración de base de datos (propuesta de corrección al DER).
- Colección Postman con 21 requests y asserts 1:1 contra los criterios de aceptación.

### Qué NO entra
- **Frontend (React).** Este repositorio es solo backend; no contiene la app React. Los componentes
  (panel de curaduría, selector de etiquetas, tabla analítica) quedan fuera de alcance. Los endpoints
  entregan el contrato JSON que ese frontend consumirá.
- **Autenticación / autorización.** `authMiddleware.js` sigue aplazado en el proyecto y ninguna ruta
  valida token ni rol. Los endpoints de HE-02 quedan sin proteger, igual que el resto de la API.
- **Notificación en tiempo real (push).** No hay infraestructura de WebSocket/SSE.

---

## 2. Arquitectura y patrones respetados

Se mantuvo la arquitectura por capas que ya usaba el proyecto en HE-01, sin introducir librerías ni
patrones nuevos:

```
routes/ ──► controllers/ ──► services/ (lógica pura) ──► repositories/ (SQL) ──► PostgreSQL
                    │                                          ▲
                    └──────────────── models/ ─────────────────┘
```

- **`routes/`**: solo declaran verbo + path + handler. URLs en inglés (`decks`, `cards`), campos del
  body en español alineados al DER (igual que HE-01).
- **`controllers/`**: validan la petición, traducen a códigos HTTP, orquestan repos/services. Todos
  con el mismo `try/catch → res.status(500).json({ error })`.
- **`services/`**: lógica de negocio **pura**, sin acceso a BD (mismo criterio que
  `DeduplicacionService`). `CuraduriaService` solo transforma objetos.
- **`repositories/`**: único lugar con SQL. Un método = una consulta. Devuelven instancias de modelo.
- **`models/`**: reflejo 1:1 de la tabla, sin comportamiento.

---

## 3. Endpoints implementados

| Método | Ruta | HU / CA | Auth esperada |
|---|---|---|---|
| `GET` | `/api/v1/decks/:id/cards?estado=` | HU-2.1 / CA-2.1.1 | Docente |
| `PATCH` | `/api/v1/cards/:id/approve` | HU-2.1 / CA-2.1.2, CA-2.1.3 | Docente |
| `PUT` | `/api/v1/cards/:id/context` | HU-2.2 / CA-2.2.1 | Docente |
| `PATCH` | `/api/v1/decks/:id/context` | HU-2.2 / CA-2.2.2 | Docente |
| `GET` | `/api/v1/cards/:id` | HU-2.2 / CA-2.2.3 | Estudiante |
| `GET` | `/api/v1/teacher/analytics/deck/:id` | HU-2.3 / CA-2.3.1, CA-2.3.2 | Docente |
| `GET` | `/api/v1/notifications?usuario_id=` | HU-2.1 / CA-2.1.3 | Estudiante |
| `PATCH` | `/api/v1/notifications/:id/read` | HU-2.1 / CA-2.1.3 | Estudiante |

### 3.1 `GET /api/v1/decks/:id/cards` — panel de curaduría (CA-2.1.1)

Lista las tarjetas de un mazo. Query param opcional `?estado=pendiente_revision` para el "listado
exclusivo" de tarjetas que requieren revisión.

- **200** → `Tarjeta[]` (ordenadas por `fecha_creacion`).
- **400** id de mazo no numérico · **404** mazo inexistente.

### 3.2 `PATCH /api/v1/cards/:id/approve` — revisar tarjeta (CA-2.1.2 / CA-2.1.3)

Un solo endpoint para las dos decisiones de la docente (el enunciado nombra solo `.../approve` para
toda la HU-2.1).

**Body:**
```jsonc
{
  "accion": "aprobar" | "rechazar",   // obligatorio
  "palabra": "…",                      // opcional — solo se usa con "aprobar" (CA-2.1.2)
  "traduccion": "…",                   // opcional — corrección
  "definicion": "…",                   // opcional — corrección
  "ejemplo": "…",                      // opcional — corrección
  "observacion": "…"                   // OBLIGATORIO con "rechazar" (CA-2.1.3)
}
```

**Aprobar (CA-2.1.2):** aplica las correcciones enviadas → `estado = "revisado_docente"` →
`fecha_revision = NOW()` → `motivo_rechazo = NULL`. La tarjeta queda habilitada para quices.

**Rechazar (CA-2.1.3):** `estado = "rechazada"` → `fecha_revision = NOW()` →
`motivo_rechazo = observacion` → crea una fila en `notificacion` para el estudiante aportante.

**Respuesta 200:**
```jsonc
{
  "resultado": "revisado_docente" | "rechazada",
  "tarjeta": { …, "motivo_rechazo": "…" },
  "notificacion": { "id_notificacion": 7, "usuario_id": 2, "tipo": "tarjeta_rechazada", … } // solo al rechazar
}
```

- **400** `accion` inválida · falta `observacion` al rechazar · corrección fuera de los límites del DER
  (`palabra` ≤150, `traduccion` ≤255, `ejemplo` ≤150) · corrección que deja vacío un campo `NOT NULL`.
- **404** tarjeta inexistente.
- **409** la tarjeta **no** está en `pendiente_revision` (no se puede re-revisar).

### 3.3 `PUT /api/v1/cards/:id/context` — etiquetas de la tarjeta (CA-2.2.1)

**Body** (al menos uno): `{ "registro": "Formal", "variante_dialectal": "Ingles Jamaicano" }`

Semántica PUT = reemplazo. Por cada campo enviado hace **UPSERT** en `etiqueta_contexto`
(`ON CONFLICT (tarjeta_id, tipo)`), dejando una sola fila por tipo. Valores de la columna `tipo`:
`"registro"` y `"variante_dialectal"`.

- **200** → `{ "tarjeta_id": 5, "etiquetas": EtiquetaContexto[] }`
- **400** ningún campo · valor vacío · valor > 150 chars · **404** tarjeta inexistente.

### 3.4 `PATCH /api/v1/decks/:id/context` — variante predeterminada del mazo (CA-2.2.2)

**Body:** `{ "variante_dialectal": "Ingles Ghanes" }`

1. Guarda `mazo.variante_regional_predeterminada`.
2. Inserta esa etiqueta `variante_dialectal` en **cada tarjeta del mazo que todavía no tenga una**
   (`ON CONFLICT DO NOTHING`). Las tarjetas curadas individualmente en CA-2.2.1 se respetan.

- **200** → `{ "mazo": Mazo, "tarjetas_actualizadas": 12 }`
- **400** falta `variante_dialectal` · > 100 chars (límite del DER) · **404** mazo inexistente.

### 3.5 `GET /api/v1/cards/:id` — detalle para el estudiante (CA-2.2.3)

- **200** → `{ …tarjeta, "etiquetas_contexto": EtiquetaContexto[] }`
- **400** id no numérico · **404** inexistente.

### 3.6 `GET /api/v1/teacher/analytics/deck/:id` — participación (CA-2.3.1 / CA-2.3.2)

Query param opcional `?filtro=sin_aportes`.

**Respuesta 200:**
```jsonc
{
  "mazo": { "id_mazo": 3, "semana": 4, "nombre_lectura": "…", "estado": "abierto" },
  "filtro_aplicado": null | "sin_aportes",
  "participacion": [
    {
      "usuario_id": 2, "nombre_completo": "Juan Estudiante", "inscripcion_id": 1,
      "aportes_totales": 3, "palabras_creadas": 2, "coautorias": 1, "acepciones_nuevas": 0,
      "estado_revision": { "pendiente_revision": 1, "revisado_docente": 1, "rechazada": 1 },
      "sin_aportes": false
    }
  ],
  "resumen_revision": { "pendiente_revision": 4, "revisado_docente": 8, "rechazada": 2 }
}
```

- Incluye **a todos los estudiantes inscritos** en el curso del mazo (LEFT JOIN), aunque tengan 0
  aportes → `sin_aportes: true`.
- `?filtro=sin_aportes` devuelve solo esas filas (CA-2.3.2).
- **400** id no numérico · **404** mazo inexistente.

### 3.7 `GET /api/v1/notifications` y `PATCH /api/v1/notifications/:id/read` (CA-2.1.3, lado estudiante)

`GET /api/v1/notifications?usuario_id=2&no_leidas=true` → `Notificacion[]` (más recientes primero).
`PATCH /api/v1/notifications/:id/read` → marca `leida = true`.

> Sin auth, el destinatario se pasa por query string. Cuando exista JWT saldrá del token y el
> parámetro `usuario_id` desaparece.

---

## 4. Cambios al modelo de datos — migración 002

`migrations/002_he02_correcciones_der.sql`. **Es una propuesta**: no se fusionó en `init.sql`
(que refleja el DER oficial) hasta que el equipo la apruebe en Slack. El script es idempotente.

| # | Cambio | Motivo |
|---|---|---|
| 1 | `ALTER TABLE tarjeta ADD COLUMN motivo_rechazo TEXT` | CA-2.1.3: guardar la observación del rechazo. |
| 2 | `CREATE UNIQUE INDEX uq_etiqueta_contexto_tarjeta_tipo ON etiqueta_contexto (tarjeta_id, tipo)` | CA-2.2.1 / CA-2.2.2: una etiqueta por tipo; habilita el UPSERT. |
| 3 | `CREATE TABLE notificacion (…)` | CA-2.1.3: "se le notifica al estudiante aportante". |

**Estructura de `notificacion`:**

| Columna | Tipo | Nota |
|---|---|---|
| `id_notificacion` | serial PK | |
| `usuario_id` | int NOT NULL, FK → usuario | estudiante que recibe el aviso |
| `tarjeta_id` | int, FK → tarjeta | tarjeta relacionada (nullable para futuros tipos) |
| `tipo` | varchar(40) NOT NULL | p.ej. `'tarjeta_rechazada'` |
| `mensaje` | text NOT NULL | |
| `leida` | boolean NOT NULL default false | |
| `fecha_creacion` | timestamp NOT NULL default now() | |

**Sin la migración aplicada, los endpoints de HE-02 devuelven HTTP 500.**

---

## 5. Decisiones de diseño

### 5.1 Decisiones acordadas con el equipo (respuestas a preguntas de arranque)

| ID | Decisión | Alternativas descartadas | Por qué |
|---|---|---|---|
| **D1** | **Solo backend.** El entregable de frontend queda fuera de alcance. | Crear un `frontend/` con esqueleto React en este repo. | Este repo es el backend; la app React vive (o vivirá) en otro lado. Meter React aquí desalinea la estructura. |
| **D2** | **Nombres de tabla en singular** (`tarjeta`, `etiqueta_contexto`, `aporte`). | Usar los del enunciado de HE-02 (`tarjetas`, `etiquetas_contexto`, `aporta`). | El DER oficial ya implementado (`init.sql` + 13 repositorios) usa singular. Cambiarlo rompería todo lo anterior. Se registró la discrepancia para validar cuál es la fuente de verdad. |
| **D3** | **Rechazo con persistencia + notificación** vía migración 002. | (v1) Solo cambiar el estado a `rechazada`, sin guardar la observación ni notificar. | El equipo pidió cumplir el CA literalmente. "Solo cambio de estado" incumple CA-2.1.3 (no queda registro del motivo ni el estudiante se entera). |
| **D4** | **Sin auth**; se documenta como pendiente. En `notifications`, el `usuario_id` va por query string. | Implementar JWT + `AuthService` ahora. | Ninguna ruta del proyecto valida token todavía; hacerlo solo aquí sería inconsistente y ampliaría el alcance. Se deja el "hook" listo para cuando se retome auth. |

### 5.2 Decisiones técnicas tomadas durante la implementación

| ID | Decisión | Contexto / alternativas | Resolución |
|---|---|---|---|
| **D5** | **`CuraduriaService` es lógica pura** (sin acceso a BD): solo `construirTarjetaRevisada()` y `mensajeRechazo()`. | Podría haber hecho el UPDATE y el INSERT de notificación dentro del service. | Se copió el criterio de `DeduplicacionService` (services puros, controllers orquestan repos). Facilita testear la regla de negocio sin BD. |
| **D6** | **Se agregaron endpoints para CA sin especificación técnica** (CA-2.1.1, CA-2.2.2, CA-2.2.3). | El enunciado solo nombra 3 endpoints; los otros 3 CA no traen ruta. | Sin esos endpoints los CA no se pueden cumplir. Se eligieron rutas REST convencionales, anidadas bajo el recurso natural (`/decks/:id/cards`, `/decks/:id/context`, `/cards/:id`). |
| **D7** | **`PUT /cards/:id/context` reemplaza vía UPSERT**, no acumula. | Delete + insert en cada llamada (funciona sin índice único, pero permite duplicados por carrera). | UPSERT con `ON CONFLICT (tarjeta_id, tipo)`. Requiere el índice único de la migración 002. Una tarjeta = una etiqueta por tipo. |
| **D8** | **CA-2.2.2 "valor predeterminado" = rellenar huecos.** El mazo solo asigna la variante a las tarjetas que **no** tienen una propia. | Sobrescribir la variante de **todas** las tarjetas del mazo. | "Predeterminado" implica *default/fallback*, no *forzar*. La curaduría individual (CA-2.2.1) debe prevalecer sobre el default del mazo. |
| **D9** | **Semántica de las métricas de CA-2.3.1:** `palabras_creadas` = aportes con `tipo_aporte='creada'`; `coautorias` = `'coautoria'`; `acepciones_nuevas` = `'acepcion_nueva'`. | "Número de palabras aportadas" es ambiguo (¿tarjetas distintas? ¿todos los aportes?). | Se usaron los `tipo_aporte` que ya produce `TarjetaController.crear` en HE-01. Queda anotado para confirmar. |
| **D10** | **"Estado de revisión" se reporta en dos niveles:** por estudiante (`estado_revision`: conteo de sus aportes según el estado de la tarjeta asociada) **y** a nivel de mazo (`resumen_revision`). | Reportarlo solo a nivel de mazo, o solo por estudiante. | La tabla de CA-2.3.1 es "por estudiante", pero un resumen global del mazo es útil para la docente. Se entregan los dos. |
| **D11** | **La consulta de analíticas parte de `inscripcion`** (LEFT JOIN a `aporte`), no de `aporte`. | `SELECT … FROM aporte GROUP BY usuario` (solo muestra quien aportó). | CA-2.3.2 ("Sin aportes") necesita ver a los estudiantes con 0 aportes. El DER relaciona `aporte` con `inscripcion`, no con `usuario` directo → join `aporte → inscripcion → usuario`. |
| **D12** | **CA-2.3.3 "tiempo real" = recálculo por consulta.** Cada `GET /analytics` recomputa los conteos desde `aporte`. | Push por WebSocket/SSE al panel docente. | No hay infraestructura de sockets en el proyecto. El conteo siempre está vigente al consultarlo; el "incremento automático" real es responsabilidad del frontend (re-fetch tras un aporte). Anotado como cumplimiento parcial. |
| **D13** | **`fecha_revision` se sella también al rechazar**, no solo al aprobar. | Dejar `fecha_revision = NULL` en tarjetas rechazadas. | Se interpretó la columna como "momento en que la docente revisó" (aprobó o rechazó). Queda para confirmar. |
| **D14** | **El "aportante" a notificar es el autor del aporte `tipo_aporte='creada'`** más antiguo de esa tarjeta. | Notificar a todos los coautores. | CA-2.1.3 dice "el estudiante aportante" (singular) = quien originó la tarjeta. Si no se encuentra ese aporte, la tarjeta igual se rechaza y la respuesta incluye un `aviso`. |
| **D15** | **`notificacion` mínima**, sin canal de email. | Notificar por correo. | Fuera de alcance (no hay servicio de correo) y una tabla consultable deja historial para el estudiante. |
| **D16** | **Migración separada** (`migrations/002_…`), no se toca `init.sql`. | Editar `init.sql` directamente. | `init.sql` refleja el DER oficial; modificarlo sin aprobación del equipo es justo lo que se debe evitar. Si se aprueba, se fusiona y se borra la migración. |

---

## 6. Trazabilidad — criterio de aceptación → implementación

| CA | Dónde se cumple | Prueba Postman |
|---|---|---|
| **CA-2.1.1** filtrado de pendientes | `GET /decks/:id/cards?estado=pendiente_revision` → `TarjetaController.listarPorMazo` → `TarjetaRepository.listarPorMazo` | "HU-2.1 / CA-2.1.1 - Panel de curaduria…" |
| **CA-2.1.2** editar + aprobar | `PATCH /cards/:id/approve` (`accion:"aprobar"`) → `CuraduriaService.construirTarjetaRevisada` → `TarjetaRepository.actualizar` | "HU-2.1 / CA-2.1.2 - Docente corrige y APRUEBA…" |
| **CA-2.1.3** rechazo + observación + notificación | mismo endpoint (`accion:"rechazar"`) → `tarjeta.motivo_rechazo` + `NotificacionRepository.crear` | "…RECHAZA la tarjeta 2…" + "…El estudiante aportante VE la notificacion" |
| **CA-2.2.1** registro + variante | `PUT /cards/:id/context` → `EtiquetaContextoRepository.upsert` | "HU-2.2 / CA-2.2.1 - Asignar registro + variante…" + "…PUT reemplaza…" |
| **CA-2.2.2** asignación masiva por mazo | `PATCH /decks/:id/context` → `MazoController.asignarContextoPredeterminado` → `EtiquetaContextoRepository.asignarPredeterminadaPorTarjetas` | "HU-2.2 / CA-2.2.2 - Docente fija la variante…" |
| **CA-2.2.3** contexto visible al estudiante | `GET /cards/:id` → incluye `etiquetas_contexto` | "HU-2.2 / CA-2.2.3 - El estudiante abre el detalle…" |
| **CA-2.3.1** métricas por mazo | `GET /teacher/analytics/deck/:id` → `AporteRepository.analiticasPorMazo` + `TarjetaRepository.resumenEstadosPorMazo` | "HU-2.3 / CA-2.3.1 - Resumen de participacion…" |
| **CA-2.3.2** informe "sin aportes" | mismo endpoint `?filtro=sin_aportes` | "HU-2.3 / CA-2.3.2 - Filtro 'sin_aportes'" |
| **CA-2.3.3** conteo actualizado | recálculo desde `aporte` en cada `GET` (cumplimiento parcial — ver D12) | assert dentro de "CA-2.3.1" |

---

## 7. Cómo probar

```bash
# 1. Levantar la BD y crear el esquema
docker compose up -d
# init.sql se ejecuta solo la primera vez. Luego, datos de prueba:
docker exec -i <contenedor_pg> psql -U <user> -d <db> < seed.sql

# 2. Aplicar la migración de HE-02 (PROPUESTA)
docker exec -i <contenedor_pg> psql -U <user> -d <db> < migrations/002_he02_correcciones_der.sql

# 3. Arrancar el backend
cd backend && npm install && npm run dev   # http://localhost:5000

# 4. Importar en Postman:
#    "HE-02 - Supervisión y Curaduría Pedagógica Docente.postman_collection.json"
#    y correr la colección completa en orden (Collection Runner).
```

La colección crea su propio mazo y tarjetas; usa `curso_id=1` e `inscripcion_id=1` del `seed.sql`.

### Verificación ya realizada en esta sesión
- `npm install` + carga del grafo completo de módulos (`import('./src/app.js')`) — OK.
- `npx eslint src/` — sin errores.
- Smoke test de las rutas nuevas (respuestas 400 de validación antes de tocar BD) — OK.
- Test unitario de `CuraduriaService` (lógica pura) — 3/3 OK.
- **Pendiente:** correr la colección Postman contra PostgreSQL con la migración aplicada (no había
  Docker en el entorno de la sesión).

---

## 8. Deuda técnica y pendientes

| Tema | Detalle | Bloqueante para |
|---|---|---|
| Aprobación del DER en Slack | Los 3 cambios de la migración 002. Si se aprueban, fusionar en `init.sql` y borrar la migración. | Que HE-02 funcione en cualquier entorno. |
| Autenticación / rol Docente | `authMiddleware.js` aplazado. Todos los endpoints sin proteger. | Exponer la API a producción. |
| `usuario_id` por query en `/notifications` | Stand-in mientras no hay JWT. | Se limpia al implementar auth. |
| Confirmar semántica de métricas (D9, D10, D13) | Definición exacta de "palabras aportadas", "estado de revisión", `fecha_revision` en rechazo. | Reportes definitivos. |
| CA-2.3.3 push real | Si el equipo quiere incremento en vivo sin re-fetch, requiere WebSocket/SSE. | — (mejora). |
| Colección Postman ejecutada contra BD | Falta la corrida end-to-end. | Cierre de QA. |
| `EtiquetaContextoRepository.eliminarPorTarjetaYTipo` | Quedó sin uso tras cambiar a UPSERT (D7). Se conserva como parte de la superficie del repo. | — |

---

## 9. Archivos

### Nuevos
```
migrations/002_he02_correcciones_der.sql
HE-02_PROPUESTA_correccion_DER.md
HE-02_DOCUMENTACION_TECNICA.md            (este archivo)
HE-02 - Supervisión y Curaduría Pedagógica Docente.postman_collection.json
backend/src/models/Notificacion.js
backend/src/repositories/NotificacionRepository.js
backend/src/controllers/NotificacionController.js
backend/src/controllers/AnalyticsController.js
backend/src/routes/notificationRoutes.js
backend/src/routes/teacherRoutes.js
```

### Modificados
```
backend/src/services/CuraduriaService.js       stub → lógica de HU-2.1 (pura)
backend/src/controllers/TarjetaController.js    aprobar, asignarContexto, listarPorMazo, obtenerPorId (+etiquetas)
backend/src/controllers/MazoController.js       asignarContextoPredeterminado (CA-2.2.2)
backend/src/models/Tarjeta.js                   campo motivo_rechazo
backend/src/repositories/TarjetaRepository.js   motivo_rechazo + listarPorMazo, idsSinEtiquetaDeTipo, resumenEstadosPorMazo
backend/src/repositories/AporteRepository.js    analiticasPorMazo, obtenerAportanteCreador
backend/src/repositories/EtiquetaContextoRepository.js  listarPorTarjeta, eliminarPorTarjetaYTipo, upsert, asignarPredeterminadaPorTarjetas
backend/src/repositories/MazoRepository.js      actualizarVariantePredeterminada
backend/src/routes/cardRoutes.js               PATCH /:id/approve, PUT /:id/context, GET /:id
backend/src/routes/deckRoutes.js               GET /:id/cards, PATCH /:id/context
backend/src/app.js                             monta teacherRoutes y notificationRoutes
CHANGELOG_BACKEND.md                           bitácora de la sesión
```
