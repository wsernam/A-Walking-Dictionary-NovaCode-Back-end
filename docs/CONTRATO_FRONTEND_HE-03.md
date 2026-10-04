# Contrato Backend → Frontend — HE-03 (HU-3.1, HU-3.2, HU-3.3)

Rama: `feature/Sprint_2_HU_7_8_9` · Última actualización: 2026-09-26

Este documento explica **qué quedó implementado en el backend** para las historias HU-3.1, HU-3.2 y HU-3.3 y **qué tiene que construir el frontend (React)** para consumirlo. Si algo de aquí no coincide con lo que responde el backend, avisar al equipo de back antes de adaptar el front.

---

## 0. Reglas generales

| Tema | Regla |
|---|---|
| Base URL | `/api/v1` |
| Formato | JSON (`Content-Type: application/json`), excepto los endpoints de PDF que devuelven binario. |
| Errores | Siempre `{ "error": "mensaje legible" }` con el status HTTP correspondiente. Mostrar `error` tal cual al usuario. |
| Fechas | Enviar en ISO 8601 con zona horaria (`new Date(...).toISOString()` → `2026-10-01T13:00:00.000Z`). |
| Autenticación | **Todavía no hay JWT ni validación de rol** en estos endpoints (HU-5.4 no está integrada). El `estudiante_id` viaja en el body. Cuando entre el login, este contrato cambia. |
| Pruebas de referencia | Colección Postman `Sprint 2 (HE3).postman_collection.json` en la raíz del repo. |

### Resumen de endpoints

| HU | Método y ruta | Pantalla / usuario | Nota |
|---|---|---|---|
| HU-3.1 | `POST /quizzes/generate` | Configuración de quiz (Docente) | Del backlog |
| HU-3.1 | `GET /quizzes` | Listado de quices (Docente / Estudiante) | Apoyo |
| HU-3.1 | `GET /quizzes/:id` | Detalle / portada del quiz | Apoyo, **no trae preguntas** |
| HU-3.2 | `POST /quizzes/:id/submit` | Resolver quiz (Estudiante) | Del backlog |
| HU-3.3 | `GET /decks/:id/export-pdf` | Botón en el mazo (Docente) | Del backlog |
| HU-3.3 | `GET /quizzes/:id/export-pdf` | Botón en el quiz (Docente) | **Adicional**: el backlog solo lista el de mazos, pero CA-3.3.2 pide el PDF del quiz |

---

## 1. HU-3.1 — Generar quiz acumulativo (Docente)

### Qué tiene que hacer el front

Una **pantalla de configuración** con:

1. Selector de curso (`GET /courses`).
2. Selector **múltiple** de mazos (`GET /decks`). El backend **no** recibe "rango de semanas": el front convierte la selección de semanas en la lista de `mazo_ids`.
3. Título del quiz.
4. Fecha/hora de apertura y de cierre.
5. Tiempo límite en minutos.
6. (Opcional) cantidad de preguntas.
7. Botón "Generar quiz" → `POST /quizzes/generate`.
8. Vista previa de las preguntas generadas (solo para la docente).

### `POST /api/v1/quizzes/generate`

**Body**

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `curso_id` | number | sí | |
| `titulo` | string | sí | |
| `mazo_ids` | number[] | sí | Al menos un mazo. |
| `fecha_apertura` | string ISO | sí | |
| `fecha_cierre` | string ISO | sí | Debe ser posterior a `fecha_apertura`. |
| `tiempo_limite_min` | number | sí | Minutos, mayor que 0. |
| `cantidad_preguntas` | number | no | Si se omite, se usa **una pregunta por cada tarjeta aprobada**. Si es mayor que las tarjetas disponibles, se recorta a ese total. Las tarjetas se eligen al azar. |

```json
{
  "curso_id": 1,
  "titulo": "Quiz semanas 1-2",
  "mazo_ids": [1, 2],
  "fecha_apertura": "2026-10-01T13:00:00.000Z",
  "fecha_cierre": "2026-10-03T23:59:00.000Z",
  "tiempo_limite_min": 20,
  "cantidad_preguntas": 10
}
```

**Respuesta 201**

```json
{
  "quiz": {
    "id_quiz": 1,
    "curso_id": 1,
    "titulo": "Quiz semanas 1-2",
    "semana_corte": 2,
    "fecha_creacion": "2026-09-26T15:00:00.000Z",
    "fecha_apertura": "2026-10-01T13:00:00.000Z",
    "fecha_cierre": "2026-10-03T23:59:00.000Z",
    "tiempo_limite_min": 20,
    "estado": "programado",
    "estado_efectivo": "programado"
  },
  "preguntas": [
    {
      "id_pregunta": 1,
      "quiz_id": 1,
      "tarjeta_id": 4,
      "tipo_pregunta": "seleccion_multiple",
      "enunciado": "¿Cuál es la traducción correcta de \"cooking\"?",
      "opcion_a": "cocinar",
      "opcion_b": "correr",
      "opcion_c": "leer",
      "opcion_d": null,
      "respuesta_correcta": "cocinar",
      "orden": 1
    }
  ]
}
```

- `semana_corte` lo calcula el backend (la semana más alta entre los mazos elegidos). El front no lo envía.
- `respuesta_correcta` viene en esta respuesta porque es la vista de la docente. **Nunca usar este payload para pintar el quiz del estudiante.**

**Errores**

| Status | Cuándo |
|---|---|
| `400` | Faltan campos (el mensaje lista cuáles); `fecha_cierre` ≤ `fecha_apertura`; hay **menos de 2 tarjetas `revisado_docente`** en los mazos elegidos. |
| `404` | Algún `mazo_id` no existe (`"El mazo 7 no existe"`). |

### Reglas de negocio que el front debe conocer

- **CA-3.1.1:** solo entran tarjetas en estado `revisado_docente`. Si la docente no ha aprobado tarjetas en esos mazos, el backend responde 400. Sugerencia: mostrar el mensaje e invitar a ir al panel de curaduría (HU-2.1).
- **CA-3.1.2:** todas las preguntas son de **opción múltiple**: "¿Cuál es la traducción correcta de X?". Los distractores son traducciones de otras tarjetas aprobadas y no se repiten (se comparan sin distinguir mayúsculas). Si hay pocas traducciones distintas, **una pregunta puede traer 2 o 3 opciones: las opciones `null` no se pintan.**
- El orden de las opciones ya viene barajado; pintarlas en el orden `opcion_a` → `opcion_d`. Las preguntas se ordenan por `orden`.
- La variante "asociación término-definición" que menciona el CA **no está implementada**.

### Estado del quiz (CA-3.1.3)

El quiz se guarda con `estado: "programado"`. No hay tarea programada que lo cambie: el backend calcula **`estado_efectivo`** con la hora actual en cada consulta.

| `estado_efectivo` | Significa | Qué hace el front |
|---|---|---|
| `programado` | Todavía no llega `fecha_apertura` | Mostrar "Disponible el …" y deshabilitar "Iniciar". |
| `abierto` | Entre apertura y cierre | Permitir iniciar y responder. |
| `cerrado` | Ya pasó `fecha_cierre` | Bloquear el quiz. |

**Usar siempre `estado_efectivo`, nunca `estado`.** Viene en `POST /quizzes/generate`, `GET /quizzes` y `GET /quizzes/:id`. Como se calcula en el momento de la petición, si la pantalla queda abierta mucho tiempo conviene volver a pedir `GET /quizzes/:id` antes de iniciar.

---

## 2. HU-3.2 — Responder quiz y recibir nota (Estudiante)

### Qué tiene que hacer el front

1. Portada del quiz con título, tiempo límite y `estado_efectivo` (`GET /quizzes/:id`).
2. Botón "Iniciar" (solo si `estado_efectivo === "abierto"`).
3. Formulario con las preguntas, **temporizador regresivo** y botón "Finalizar examen".
4. Envío automático cuando el tiempo llega a 0.
5. Pantalla de resultado con nota y desglose de aciertos y errores.
6. Si el estudiante ya había enviado, mostrar su resultado anterior en vez del formulario.

### `POST /api/v1/quizzes/:id/submit`

**Body**

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `estudiante_id` | number | sí | Hasta que se integre JWT. |
| `respuestas` | array | sí | `[{ "pregunta_id": 1, "respuesta_estudiante": "cocinar" }]`. Puede ir vacío (`[]`) si no contestó nada. |
| `fecha_inicio` | string ISO | **recomendado** | Momento en que el estudiante pulsó "Iniciar". |
| `tiempo_empleado_seg` | number | opcional | Alternativa a `fecha_inicio`. |

> ⚠️ `respuesta_estudiante` es el **texto de la opción elegida** (por ejemplo `"cocinar"`), **no la letra** (`"a"`). Se compara exacto con `respuesta_correcta` (mayúsculas y espacios incluidos), así que hay que enviar el valor de `opcion_x` sin modificarlo.
>
> Las preguntas sin contestar se omiten o se envían con `respuesta_estudiante: null`; cuentan como incorrectas.
>
> Si no se envía ni `fecha_inicio` ni `tiempo_empleado_seg`, **el backend no puede validar el tiempo límite**. Enviar siempre `fecha_inicio`.

```json
{
  "estudiante_id": 2,
  "fecha_inicio": "2026-10-01T14:00:00.000Z",
  "respuestas": [
    { "pregunta_id": 1, "respuesta_estudiante": "cocinar" },
    { "pregunta_id": 2, "respuesta_estudiante": null }
  ]
}
```

**Respuesta 201 (primer envío)**

```json
{
  "resultado": {
    "id_resultado": 1,
    "quiz_id": 1,
    "estudiante_id": 2,
    "fecha_inicio": "2026-10-01T14:00:00.000Z",
    "fecha_envio": "2026-10-01T14:10:40.000Z",
    "puntaje_obtenido": 7,
    "puntaje_maximo": 10,
    "calificacion": 3.5,
    "tiempo_empleado_seg": 640
  },
  "respuestas": [
    {
      "id_respuesta": 1,
      "resultado_id": 1,
      "pregunta_id": 1,
      "respuesta_estudiante": "cocinar",
      "es_correcta": true,
      "puntaje_obtenido": 1
    }
  ]
}
```

- `puntaje_obtenido` / `puntaje_maximo` = aciertos / total de preguntas del quiz.
- `calificacion` está en escala **0.0 – 5.0**, con 2 decimales (*supuesto pendiente de validar con la docente*).
- `respuestas` trae **una fila por cada pregunta del quiz**, incluidas las no contestadas. El desglose se arma cruzando `pregunta_id` con las preguntas que ya tiene el front.
- La respuesta **no incluye `respuesta_correcta`**. Para errores, el front puede mostrar "Incorrecta"; si se quiere mostrar la opción correcta, hay que decidirlo con back (ver pendientes).

**Errores**

| Status | Cuándo | Qué hacer en el front |
|---|---|---|
| `400` | `id` no numérico; falta `estudiante_id`; `respuestas` no es un arreglo | Error de programación del front: revisar el payload. |
| `400` | `"El quiz aún no está abierto…"` | Volver a la portada y mostrar la fecha de apertura. |
| `400` | `"El quiz ya cerró…"` | Mostrar mensaje; bloquear. |
| `400` | `"Se agotó el tiempo límite de N minutos; el envío fue rechazado"` | El envío **no se guardó**. Mostrar el mensaje. |
| `404` | Quiz no existe o no tiene preguntas | Mostrar `error`. |
| `409` | El estudiante **ya envió** este quiz (CA-3.2.3) | El body trae `{ error, resultado, respuestas }` del intento anterior: **mostrar ese resumen** como pantalla de resultado, no un error genérico. |

### Márgenes de tolerancia del servidor

- **Tiempo límite:** el backend acepta envíos hasta `tiempo_limite_min` + **30 segundos** después de `fecha_inicio`.
- **Cierre del quiz:** acepta envíos hasta **30 segundos** después de `fecha_cierre`, para que un envío automático que llega con latencia no se pierda.

Pasados esos márgenes, responde 400 y no guarda nada.

### Cómo implementar el temporizador (CA-3.2.1)

El cronómetro visible es del front; el backend solo lo hace cumplir.

1. Al pulsar "Iniciar", guardar `fecha_inicio = new Date().toISOString()` en el estado de React. Guardarlo también en `sessionStorage` con clave por quiz (por ejemplo `quiz_${id}_inicio`) para que un refresh no reinicie el reloj.
2. Tiempo restante = `tiempo_limite_min * 60 - (ahora - fecha_inicio)`. Calcularlo a partir de `fecha_inicio`, no con un contador que se decrementa, para que no se desfase si la pestaña queda en segundo plano.
3. Si `fecha_cierre` llega antes que el fin del tiempo límite, usar la menor de las dos como límite.
4. Al llegar a 0: **bloquear el formulario y enviar automáticamente** lo contestado hasta ese momento, con `fecha_inicio`.
5. "Finalizar examen" hace el mismo envío antes de que se acabe el tiempo (pedir confirmación si quedan preguntas sin contestar).
6. Enviar **una sola vez**: deshabilitar el botón y el autoenvío tras el primer intento para no generar un 409 propio.
7. Con 201 → pantalla de resultado (CA-3.2.2). Con 409 → pantalla de resultado usando `resultado` y `respuestas` del body (CA-3.2.3).

### Comportamiento a tener en cuenta con el reintento (CA-3.2.3)

El backend valida en este orden: quiz existe → quiz abierto → quiz no cerrado → **ya envió (409)**. Por eso:

- Mientras el quiz está **abierto**, un segundo envío responde `409` con el resumen previo. ✅
- Si el quiz **ya cerró**, un estudiante que sí había enviado recibe `400 "El quiz ya cerró…"`, **no** el 409 con su resumen.

El 409 solo se dispara al **enviar**; abrir el enlace no consulta nada. Para saber si el estudiante ya respondió antes de mostrar el formulario no hay endpoint todavía (ver pendientes). Mientras tanto, el front puede recordar localmente que ese quiz ya se envió y mostrar el resultado guardado.

---

## 3. HU-3.3 — Exportar mazos y quices a PDF (Docente)

Los dos endpoints devuelven el archivo directamente (`Content-Type: application/pdf`, `Content-Disposition: attachment`), **no JSON**. El PDF ya sale maquetado para impresión (márgenes, tipografía y sin elementos web, CA-3.3.3): el front solo lo descarga.

| Endpoint | Archivo | Contenido |
|---|---|---|
| `GET /api/v1/decks/:id/export-pdf` | `mazo-{id}.pdf` | Encabezado con título, autor, semana y variante. Por tarjeta: término, traducción, definición, ejemplo y contexto (registro / variante). **Solo tarjetas `revisado_docente`.** (CA-3.3.1) |
| `GET /api/v1/quizzes/:id/export-pdf` | `quiz-{id}.pdf` | Hoja de preguntas con opciones y, en página separada, hoja de respuestas (clave). (CA-3.3.2) |

**Errores (llegan en JSON)**

| Status | Cuándo |
|---|---|
| `400` | `id` no numérico |
| `404` | El mazo o quiz no existe, o el quiz no tiene preguntas |
| `500` | Algún texto tiene caracteres que la fuente del PDF no soporta (emoji, IPA, alfabetos no latinos). Mostrar un mensaje genérico. |

Un mazo sin tarjetas aprobadas **no da error**: se genera un PDF con el aviso "Este mazo todavía no tiene tarjetas revisado_docente para exportar". Si el front ya sabe que no hay aprobadas, conviene deshabilitar el botón.

### Qué tiene que hacer el front

- Botón "Exportar a PDF" en la vista del mazo y "Exportar versión impresa" en la vista del quiz.
- Pedir la respuesta como binario y forzar la descarga:

```js
async function descargarPdf(url, nombreArchivo) {
  const res = await fetch(url);
  if (!res.ok) {
    const { error } = await res.json(); // los errores vienen en JSON
    throw new Error(error);
  }
  const blob = await res.blob();
  const enlace = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = enlace;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(enlace);
}

descargarPdf(`/api/v1/decks/${id}/export-pdf`, `mazo-${id}.pdf`);
descargarPdf(`/api/v1/quizzes/${id}/export-pdf`, `quiz-${id}.pdf`);
```

- Con axios: usar `responseType: 'blob'`. En error, `err.response.data` también es un `Blob`; leer el mensaje con `JSON.parse(await err.response.data.text()).error`.
- Mostrar un indicador de carga mientras se genera: puede tardar un poco con mazos grandes.

---

## 4. Endpoints de apoyo

| Endpoint | Respuesta |
|---|---|
| `GET /api/v1/quizzes` | `200` arreglo de quices, cada uno con `estado_efectivo`. No se puede filtrar por curso: filtrar en el front por `curso_id`. |
| `GET /api/v1/quizzes/:id` | `200` un quiz con `estado_efectivo`; `404` si no existe. **No incluye preguntas.** |

---

## 5. Pendientes y supuestos que afectan al front

Según la regla del proyecto, no se crean endpoints que no estén en el backlog sin que el equipo lo decida. Estos puntos quedan **pendientes de decisión**:

1. **🔴 No hay endpoint para que el estudiante obtenga las preguntas del quiz.** `GET /quizzes/:id` no las trae, y las rutas de `pregunta_quiz` existen en el código pero no están montadas. El único que devuelve preguntas es `POST /quizzes/generate`, y trae `respuesta_correcta`. **Esto bloquea la pantalla del estudiante de HU-3.2.** Propuesta a validar: `GET /quizzes/:id/questions` sin `respuesta_correcta`. Mientras tanto, desarrollar el formulario y el temporizador con el payload de `generate` como dato de prueba, ignorando `respuesta_correcta`.
2. **🟡 No hay endpoint para consultar el resultado previo de un estudiante** sin reenviar (por ejemplo, para "historial" o para abrir el enlace después del cierre). Hoy solo se obtiene con el `409` del submit.
3. **🟡 La respuesta del submit no trae la respuesta correcta** de cada pregunta, así que el desglose solo puede decir acierto o error.
4. Escala de `calificacion` 0–5 (pendiente de validar con la docente).
5. `fecha_inicio` la informa el cliente; el servidor no registra cuándo empezó el intento, así que el límite de tiempo no es inviolable.
6. Sin JWT ni control de rol hasta integrar HU-5.4: hoy cualquier cliente puede llamar a los endpoints de docente.
