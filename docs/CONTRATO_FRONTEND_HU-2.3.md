# Contrato Backend → Frontend — HU-2.3 (HU-006 en la numeración de sprint del equipo)

Este documento le dice al frontend (React) **qué se implementó en el backend** y **cómo debe consumirlo** para el panel de "Visualizar resumen de participación". Cubre únicamente HU-2.3 (CA-2.3.1, CA-2.3.2, CA-2.3.3). Última actualización: 2026-09-21.

- Rama donde vive la implementación: **`develop`** (no está en `main` ni en `feature/Sprint_2_HU_7_8_9`).
- Base URL: `/api/v1`.
- Formato: JSON (`Content-Type: application/json`).
- Errores: siempre `{ "error": "mensaje legible" }` con el status HTTP correspondiente. Mostrar `error` tal cual al usuario.

> ⚠️ **Autenticación:** este endpoint **no valida JWT ni rol** todavía (HU-5.4 no está integrada). Cualquier usuario que conozca la URL puede consultarlo; el frontend debe restringir el acceso a la vista de docente por su cuenta (ruta protegida) hasta que se integre el login.

---

## Resumen

| HU | Método y ruta | Quién lo usa | Estado |
|---|---|---|---|
| HU-2.3 | `GET /teacher/analytics/deck/:id` | Docente | ✅ |
| HU-2.3 | `GET /teacher/analytics/deck/:id?sinAportes=true` | Docente | ✅ |

---

## `GET /api/v1/teacher/analytics/deck/:id`

### Parámetros

| Parámetro | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `:id` (path) | number | sí | Id del mazo (`mazo_id`). |
| `sinAportes` (query) | `"true"` | no | CA-2.3.2. Si se manda, la respuesta se filtra a solo los estudiantes sin ningún aporte en el mazo. |

> ⚠️ **Ojo con el nombre del query param.** El `CLAUDE.md` del backlog documenta este filtro como `?filtro=sin_aportes`, pero el código real implementado en `develop` usa **`?sinAportes=true`**. Es una divergencia real backlog↔código (no un error de este doc) — úsala tal como está en el backend hasta que el equipo decida homologar el nombre.

### Respuesta 200

Arreglo con una fila **por cada estudiante inscrito en el curso del mazo** (incluye a los que no han aportado nada — por eso sirve también para CA-2.3.2):

```json
[
  {
    "estudiante_id": 5,
    "nombre_completo": "Ana Pérez",
    "palabras_aportadas": 3,
    "coautorias": 1,
    "tarjetas_pendientes": 1,
    "tarjetas_aprobadas": 2
  },
  {
    "estudiante_id": 8,
    "nombre_completo": "Luis Gómez",
    "palabras_aportadas": 0,
    "coautorias": 0,
    "tarjetas_pendientes": 0,
    "tarjetas_aprobadas": 0
  }
]
```

| Campo | Significado |
|---|---|
| `estudiante_id` | `id_usuario` del estudiante. |
| `nombre_completo` | Para pintar directo en la tabla, sin otra consulta. |
| `palabras_aportadas` | Tarjetas que el estudiante **creó** originalmente (`tipo_aporte='creada'`) en este mazo. |
| `coautorias` | Aportes de tipo `coautoria` o `acepcion_nueva` que hizo sobre tarjetas ya existentes (HU-1.3). |
| `tarjetas_pendientes` | De sus tarjetas creadas, cuántas siguen en `pendiente_revision`. |
| `tarjetas_aprobadas` | De sus tarjetas creadas, cuántas ya están en `revisado_docente`. |

Un estudiante con `palabras_aportadas === 0 && coautorias === 0` es exactamente el criterio que usa el backend para el filtro `sinAportes=true` (CA-2.3.2).

### Errores

| Status | Cuándo | Qué hacer en el front |
|---|---|---|
| `400` | `:id` no es numérico | Mostrar `error`. |
| `404` | El mazo no existe | Mostrar `error` ("Mazo no encontrado"). |
| `500` | Error inesperado | Mostrar mensaje genérico. |

---

## Cómo implementarlo en el front

1. **Selector de mazo semanal** (ya existe con `GET /decks`): al elegir uno, disparar `GET /teacher/analytics/deck/{id}`.
2. **Tabla analítica**: columnas Estudiante, Palabras aportadas, Coautorías, Pendientes, Aprobadas — mapeo 1:1 con los campos de la respuesta.
3. **Filtro "Sin aportes" (CA-2.3.2)**: un toggle/checkbox que agrega `?sinAportes=true` a la misma llamada. No hace falta filtrar en el cliente: el backend ya devuelve solo los estudiantes sin aportes.
4. **"Tiempo real" (CA-2.3.3)**: no hay WebSockets en el proyecto (decisión conocida, documentada en `CLAUDE.md`). El contador se "actualiza en tiempo real" solo en el sentido de que **cada GET nuevo refleja el estado actual de la BD** — no hay push desde el servidor. Si el front quiere simular tiempo real, debe hacer polling (por ejemplo, re-consultar cada X segundos o al reenfocar la pestaña) o refrescar manualmente con un botón. No implementar (ni prometer al usuario) actualización push automática.
5. **Sin JWT todavía**: no hay que mandar `Authorization` ni ningún id de docente en la petición; el endpoint solo necesita el `:id` del mazo. Cuando se integre HU-5.4, este contrato se actualizará para agregar el middleware de rol.

## Supuestos pendientes de validar (afectan al front)

1. Nombre real del query param del filtro: `sinAportes=true` (código) vs. `filtro=sin_aportes` (backlog en `CLAUDE.md`) — pendiente de que el equipo decida si se homologa.
2. Sin autenticación/roles hasta integrar HU-5.4 — cualquier ruta que consuma este endpoint debe protegerse solo en el cliente por ahora.
3. "Tiempo real" (CA-2.3.3) es en realidad "recálculo fresco por consulta", no push del servidor — el front debe decidir su propia estrategia de refresco (polling o manual).
