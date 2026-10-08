# Contrato Backend → Frontend — HU-3.1 (HU-007 en la numeración de sprint del equipo)

Este documento le dice al frontend (React) **qué se implementó en el backend** y **cómo debe consumirlo** para la pantalla de "Generar quiz acumulativo" de la docente. Cubre únicamente HU-3.1 (CA-3.1.1, CA-3.1.2, CA-3.1.3). Última actualización: 2026-10-08.

Queda alineado con el contrato del frontend (`docs/contrato-quiz.md`, rama `feature/HU-3.1-generar-quiz-front`): los pendientes P1 a P5 de ese documento ya están implementados (ver «Cambios del 2026-10-08» al final).

- Implementación fusionada en **`develop`** (venía de `feature/Sprint_3_HU_007`). HU-3.2 (responder quiz) está en `feature/Sprint_3_HU_008` con su contrato `docs/CONTRATO_FRONTEND_HU-3.2.md`, y HU-3.3 (PDF) en `feature/Sprint_3_HU_009` con `docs/CONTRATO_FRONTEND_HU-3.3.md`.
- Base URL: `/api/v1`.
- Formato: JSON (`Content-Type: application/json`).
- Errores: siempre `{ "error": "mensaje legible" }` con el status HTTP correspondiente. Mostrar `error` tal cual al usuario.
- Fechas: enviar en ISO 8601 con zona horaria (`new Date(...).toISOString()` → `2026-10-01T13:00:00.000Z`).

> 🔒 **Autenticación:** `POST /quizzes/generate` exige `Authorization: Bearer <token>` con rol **docente** (`authenticate` + `requireRole('docente')`). Sin token o con token inválido responde `401`; con otro rol, `403`. `GET /quizzes` y `GET /quizzes/:id` todavía no piden token.

---

## Resumen

| HU | Método y ruta | Quién lo usa | Estado |
|---|---|---|---|
| HU-3.1 | `POST /quizzes/generate` | Docente (pantalla de configuración) | ✅ Del backlog |
| HU-3.1 | `GET /quizzes` | Docente / Estudiante (listado) | ✅ Apoyo |
| HU-3.1 | `GET /quizzes/:id` | Detalle / portada del quiz | ✅ Apoyo, **no trae preguntas** |

Para llenar los selectores de la pantalla se usan endpoints que ya existían:

| Método y ruta | Para qué | Nota |
|---|---|---|
| `GET /courses` | Selector de curso | Devuelve todos los cursos. |
| `GET /decks` | Selector de mazos | Como docente (o sin token) devuelve **todos** los mazos de todos los cursos: **filtrar en el front por `curso_id`** del curso elegido. Cada mazo trae `id_mazo`, `curso_id`, `nombre_lectura`, `semana`, `estado`, entre otros. |

---

## `POST /api/v1/quizzes/generate`

Genera el quiz a partir de las tarjetas aprobadas de los mazos elegidos y lo guarda en estado `programado`.

### Body

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `curso_id` | number | sí | Entero ≥ 1. El curso debe existir. |
| `titulo` | string | sí | Máximo 200 caracteres (el back lo valida y responde `400`). |
| `mazo_ids` | number[] | sí | Al menos un mazo. Cada valor debe ser un id entero ≥ 1. Si un mazo viene repetido se cuenta una sola vez. Todos los mazos deben existir y **pertenecer a `curso_id`**. |
| `fecha_apertura` | string ISO | sí | Debe ser una fecha válida. |
| `fecha_cierre` | string ISO | sí | Debe ser una fecha válida y **posterior** a `fecha_apertura`. |
| `tiempo_limite_min` | number | sí | Entero ≥ 1 (minutos). La ventana `fecha_cierre − fecha_apertura` (en minutos) debe ser **≥ `tiempo_limite_min`**. |
| `cantidad_preguntas` | number | no | Entero ≥ 1. Si se omite, se genera **una pregunta por cada tarjeta aprobada**. Si es mayor que las tarjetas disponibles, se recorta a ese total. Las tarjetas se eligen al azar. |

El backend **no** recibe "rango de semanas": el front convierte la selección de semanas en la lista de `mazo_ids`.

```json
{
  "curso_id": 1,
  "titulo": "Quiz acumulativo semanas 7-8",
  "mazo_ids": [5, 6],
  "fecha_apertura": "2026-10-04T16:36:39.000Z",
  "fecha_cierre": "2026-10-07T15:36:39.000Z",
  "tiempo_limite_min": 20
}
```

### Respuesta 201

```json
{
  "quiz": {
    "id_quiz": 1,
    "curso_id": 1,
    "titulo": "Quiz acumulativo semanas 7-8",
    "semana_corte": 8,
    "fecha_creacion": "2026-10-04T15:36:39.843Z",
    "fecha_apertura": "2026-10-04T16:36:39.000Z",
    "fecha_cierre": "2026-10-07T15:36:39.000Z",
    "tiempo_limite_min": 20,
    "estado": "programado",
    "estado_efectivo": "programado"
  },
  "preguntas": [
    {
      "id_pregunta": 1,
      "quiz_id": 1,
      "tarjeta_id": 30,
      "tipo_pregunta": "seleccion_multiple",
      "enunciado": "¿Cuál es la traducción correcta de \"patchwork\"?",
      "opcion_a": "posibilidad",
      "opcion_b": "trabajo de retazos",
      "opcion_c": "pertenecer",
      "opcion_d": "isla",
      "respuesta_correcta": "trabajo de retazos",
      "orden": 1
    }
  ]
}
```

- `semana_corte` lo calcula el backend: es la semana más alta entre los mazos elegidos. El front no lo envía.
- `respuesta_correcta` viene en esta respuesta porque es la vista de la docente. **Nunca usar este payload para pintar el quiz del estudiante.**

### Errores

| Status | Mensaje (`error`) | Cuándo / qué hacer en el front |
|---|---|---|
| `400` | `Los siguientes campos son obligatorios: titulo, mazo_ids, …` | Faltan campos; el mensaje lista cuáles. Marcar esos campos en el formulario. |
| `400` | `curso_id debe ser un número entero mayor o igual a 1` | `curso_id` no es un id. |
| `400` | `titulo debe tener máximo 200 caracteres` | Título demasiado largo. |
| `400` | `fecha_apertura no es una fecha válida` / `fecha_cierre no es una fecha válida` | La fecha no se pudo interpretar. |
| `400` | `fecha_cierre debe ser posterior a fecha_apertura` | Fechas invertidas o iguales. |
| `400` | `tiempo_limite_min debe ser un número entero mayor o igual a 1` | Tiempo vacío, 0, negativo, con decimales o texto. |
| `400` | `La ventana entre fecha_apertura y fecha_cierre (25 min) debe ser mayor o igual a tiempo_limite_min (30 min)` | El quiz cerraría antes de poder completarse. |
| `400` | `cantidad_preguntas debe ser un número entero mayor o igual a 1` | Solo si se envía el campo. Para "usar todas", **no enviar el campo** (o enviarlo como `null`). |
| `400` | `mazo_ids debe contener solo ids de mazo (enteros mayores o iguales a 1)` | Algún valor del arreglo no es un id. |
| `400` | `Se encontraron 3 traducciones distintas entre las tarjetas revisado_docente de los mazos seleccionados; se requieren al menos 4.` | No hay suficientes traducciones distintas aprobadas para armar 4 opciones. Sugerencia: elegir más mazos o ir al panel de curaduría (HU-2.1). |
| `401` | `Token de autenticación no proporcionado` / `Token inválido o expirado` | Sin sesión o sesión vencida: cerrar sesión y llevar al login. |
| `403` | `No tiene permisos para acceder a este recurso` | El usuario no es docente. |
| `404` | `El curso 3 no existe` | `curso_id` no existe. |
| `404` | `El mazo 7 no existe` | Algún `mazo_id` no existe. |
| `404` | `El mazo 9 no pertenece al curso 1` | Se eligió un mazo de otro curso. |
| `500` | (mensaje técnico) | Error inesperado del servidor. Mostrar un mensaje genérico. |

Si la respuesta es un error, **no se guarda nada**: el quiz, sus mazos y sus preguntas se crean juntos en una transacción.

### Reglas de negocio que el front debe conocer

- **CA-3.1.1:** solo entran tarjetas en estado `revisado_docente` de los mazos elegidos. Las tarjetas `pendiente_revision` o `rechazada` no aparecen ni como pregunta ni como opción.
- **CA-3.1.2:** todas las preguntas son de **opción múltiple**: "¿Cuál es la traducción correcta de X?". La respuesta correcta es la traducción de la tarjeta; los distractores son traducciones de otras tarjetas aprobadas y no se repiten (se comparan sin distinguir mayúsculas ni espacios).
  - Se exigen al menos **4 traducciones distintas** entre las tarjetas aprobadas de los mazos elegidos, así que **toda pregunta trae siempre 4 opciones** (`opcion_a` a `opcion_d`, ninguna `null`).
  - El orden de las opciones ya viene barajado: pintarlas en el orden `opcion_a` → `opcion_d`. Las preguntas se ordenan por `orden`.
  - La variante "asociación término-definición" que menciona el CA **no está implementada**.
- **CA-3.1.3:** el quiz queda en estado `programado` con su fecha de apertura, de cierre y tiempo límite (ver la sección siguiente).

---

## Estado del quiz (CA-3.1.3)

El quiz se guarda con `estado: "programado"`. No hay tarea programada que lo cambie: el backend calcula **`estado_efectivo`** con la hora actual en cada consulta, y así "se publica automáticamente en la fecha indicada".

| `estado_efectivo` | Significa | Qué hace el front |
|---|---|---|
| `programado` | Todavía no llega `fecha_apertura` | Mostrar "Disponible el …". |
| `abierto` | Entre apertura y cierre | El quiz está publicado para los estudiantes. |
| `cerrado` | Ya pasó `fecha_cierre` | Mostrar como cerrado. |

**Usar siempre `estado_efectivo`, nunca `estado`** (el campo `estado` se queda en `programado`). Viene en `POST /quizzes/generate`, `GET /quizzes` y `GET /quizzes/:id`. Como se calcula al momento de la petición, si una pantalla queda abierta mucho tiempo conviene volver a pedir los datos.

---

## Endpoints de apoyo

### `GET /api/v1/quizzes`

`200` con un arreglo de quices; cada uno con los mismos campos que `quiz` en la respuesta de `generate`, incluido `estado_efectivo`. No se puede filtrar por curso: filtrar en el front por `curso_id`.

### `GET /api/v1/quizzes/:id`

| Status | Cuándo |
|---|---|
| `200` | Un quiz con `estado_efectivo`. **No incluye preguntas.** |
| `400` | `id` no numérico (`"id inválido"`). |
| `404` | El quiz no existe (`"Quiz no encontrado"`). |

---

## Cómo implementarlo en el front

1. **Selector de curso** con `GET /courses`.
2. **Selector múltiple de mazos** con `GET /decks`, filtrado por el `curso_id` elegido. Mostrar `nombre_lectura` y `semana`.
3. Campos de **título**, **fecha/hora de apertura**, **fecha/hora de cierre** y **tiempo límite en minutos**. Convertir las fechas con `toISOString()` antes de enviar.
4. Campo opcional de **cantidad de preguntas**. Si queda vacío, **no enviar** `cantidad_preguntas`.
5. Validar en el front lo mismo que el back (campos obligatorios, título ≤ 200, cierre posterior a apertura, ventana ≥ tiempo límite, enteros ≥ 1) para dar feedback inmediato. El back valida igual, así que siempre mostrar el `error` que responda.
6. Botón **"Generar quiz"** → `POST /quizzes/generate`. Deshabilitarlo mientras la petición está en curso para no crear dos quices.
7. Con `201`, mostrar una **vista previa** de las preguntas (solo para la docente) con la respuesta correcta resaltada, y el `estado_efectivo`.

---

## Supuestos pendientes de validar (afectan al front)

1. **Variante "asociación término-definición"** de CA-3.1.2: no implementada; solo hay opción múltiple de traducción.
2. **Preguntas para el estudiante:** `GET /quizzes/:id` no trae preguntas y no hay un endpoint que las devuelva sin `respuesta_correcta`. No afecta a la pantalla de la docente (HU-3.1), pero sí a la del estudiante (HU-3.2): ver `docs/CONTRATO_FRONTEND_HU-3.2.md` en `feature/Sprint_3_HU_008`.

---

## Cambios del 2026-10-08 (alineación con el contrato del frontend)

Pendientes P1 a P5 de `docs/contrato-quiz.md` (frontend), todos en `QuizService.generar` salvo P1:

| # | Cambio | Antes |
|---|---|---|
| P1 | `POST /quizzes/generate` exige token y rol docente (`401` / `403`). | Sin protección. |
| P2 | Mínimo **4 traducciones distintas** (sin distinguir mayúsculas ni espacios) entre las tarjetas aprobadas; el mensaje dice cuántas se encontraron. Toda pregunta trae 4 opciones. Sigue siendo `400`. | Mínimo 2 tarjetas; preguntas de 2 o 3 opciones. |
| P3 | `400` si la ventana entre apertura y cierre (minutos) es menor que `tiempo_limite_min`. | Solo exigía cierre posterior a apertura. |
| P4 | `404` si `curso_id` no existe o si algún mazo no pertenece a ese curso; `400` si `curso_id` no es un entero ≥ 1. | Solo validaba que el mazo existiera. |
| P5 | `400` si `titulo` supera 200 caracteres. | Lo frenaba la base de datos (`500`). |

Sin cambios en el body ni en la respuesta `201`.
