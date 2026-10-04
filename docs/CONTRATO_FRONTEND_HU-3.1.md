# Contrato Backend → Frontend — HU-3.1 (HU-007 en la numeración de sprint del equipo)

Este documento le dice al frontend (React) **qué se implementó en el backend** y **cómo debe consumirlo** para la pantalla de "Generar quiz acumulativo" de la docente. Cubre únicamente HU-3.1 (CA-3.1.1, CA-3.1.2, CA-3.1.3). Última actualización: 2026-10-04.

- Rama donde vive la implementación: **`feature/Sprint_2_HU_7`**. HU-3.2 (responder quiz) está en `feature/Sprint_2_HU_8` con su contrato `docs/CONTRATO_FRONTEND_HU-3.2.md`, y HU-3.3 (PDF) en `feature/Sprint_2_HU_9` con `docs/CONTRATO_FRONTEND_HU-3.3.md`.
- Base URL: `/api/v1`.
- Formato: JSON (`Content-Type: application/json`).
- Errores: siempre `{ "error": "mensaje legible" }` con el status HTTP correspondiente. Mostrar `error` tal cual al usuario.
- Fechas: enviar en ISO 8601 con zona horaria (`new Date(...).toISOString()` → `2026-10-01T13:00:00.000Z`).

> ⚠️ **Autenticación:** el login (HU-5.4, Google + JWT) ya existe en el backend, pero **los endpoints de quiz todavía no piden token ni rol**. Cualquiera que conozca la URL puede generar un quiz. El frontend debe mostrar esta pantalla solo a la docente (ruta protegida) hasta que el equipo decida protegerlos en el back. Enviar el header `Authorization` no rompe nada.

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
| `curso_id` | number | sí | |
| `titulo` | string | sí | Máximo 200 caracteres (columna de la BD). |
| `mazo_ids` | number[] | sí | Al menos un mazo. Cada valor debe ser un id entero ≥ 1. Si un mazo viene repetido se cuenta una sola vez. |
| `fecha_apertura` | string ISO | sí | Debe ser una fecha válida. |
| `fecha_cierre` | string ISO | sí | Debe ser una fecha válida y **posterior** a `fecha_apertura`. |
| `tiempo_limite_min` | number | sí | Entero ≥ 1 (minutos). |
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
| `400` | `fecha_apertura no es una fecha válida` / `fecha_cierre no es una fecha válida` | La fecha no se pudo interpretar. |
| `400` | `fecha_cierre debe ser posterior a fecha_apertura` | Fechas invertidas o iguales. |
| `400` | `tiempo_limite_min debe ser un número entero mayor o igual a 1` | Tiempo vacío, 0, negativo, con decimales o texto. |
| `400` | `cantidad_preguntas debe ser un número entero mayor o igual a 1` | Solo si se envía el campo. Para "usar todas", **no enviar el campo** (o enviarlo como `null`). |
| `400` | `mazo_ids debe contener solo ids de mazo (enteros mayores o iguales a 1)` | Algún valor del arreglo no es un id. |
| `400` | `Se necesitan al menos 2 tarjetas en estado revisado_docente en los mazos seleccionados para generar un quiz` | Los mazos elegidos no tienen suficientes tarjetas aprobadas. Sugerencia: invitar a ir al panel de curaduría (HU-2.1). |
| `404` | `El mazo 7 no existe` | Algún `mazo_id` no existe. |
| `500` | (mensaje técnico) | Error inesperado del servidor. Mostrar un mensaje genérico. |

Si la respuesta es un error, **no se guarda nada**: el quiz, sus mazos y sus preguntas se crean juntos en una transacción.

### Reglas de negocio que el front debe conocer

- **CA-3.1.1:** solo entran tarjetas en estado `revisado_docente` de los mazos elegidos. Las tarjetas `pendiente_revision` o `rechazada` no aparecen ni como pregunta ni como opción.
- **CA-3.1.2:** todas las preguntas son de **opción múltiple**: "¿Cuál es la traducción correcta de X?". La respuesta correcta es la traducción de la tarjeta; los distractores son traducciones de otras tarjetas aprobadas y no se repiten (se comparan sin distinguir mayúsculas ni espacios).
  - Si hay pocas traducciones distintas, una pregunta puede traer **2 o 3 opciones: las opciones `null` no se pintan**.
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
5. Validar en el front lo mismo que el back (campos obligatorios, cierre posterior a apertura, enteros ≥ 1) para dar feedback inmediato. El back valida igual, así que siempre mostrar el `error` que responda.
6. Botón **"Generar quiz"** → `POST /quizzes/generate`. Deshabilitarlo mientras la petición está en curso para no crear dos quices.
7. Con `201`, mostrar una **vista previa** de las preguntas (solo para la docente) con la respuesta correcta resaltada, y el `estado_efectivo`.

---

## Supuestos pendientes de validar (afectan al front)

1. **Autenticación:** `POST /quizzes/generate` no exige sesión ni rol docente (ver la advertencia del inicio). Pendiente de que el equipo decida protegerlo.
2. **Variante "asociación término-definición"** de CA-3.1.2: no implementada; solo hay opción múltiple de traducción.
3. **Preguntas para el estudiante:** `GET /quizzes/:id` no trae preguntas y no hay un endpoint que las devuelva sin `respuesta_correcta`. No afecta a la pantalla de la docente (HU-3.1), pero sí a la del estudiante (HU-3.2): ver `docs/CONTRATO_FRONTEND_HU-3.2.md` en `feature/Sprint_2_HU_8`.
