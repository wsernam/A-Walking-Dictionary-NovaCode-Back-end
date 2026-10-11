# Contrato Backend → Frontend — HU-3.2 (HU-008 en la numeración de sprint del equipo)

Este documento le dice al frontend (React) **qué se implementó en el backend** y **cómo debe consumirlo** para la pantalla de "Responder quiz y recibir nota" del estudiante. Cubre únicamente HU-3.2 (CA-3.2.1, CA-3.2.2, CA-3.2.3). Última actualización: 2026-10-11.

- Rama donde vive la implementación: **`feature/Sprint_3_HU_008`**. Depende de HU-3.1 (generar quiz, `feature/Sprint_3_HU_007`, contrato `docs/CONTRATO_FRONTEND_HU-3.1.md`): para responder un quiz, la docente primero tiene que generarlo.
- Base URL: `/api/v1`.
- Formato: JSON (`Content-Type: application/json`).
- Errores: siempre `{ "error": "mensaje legible" }` con el status HTTP correspondiente. Mostrar `error` tal cual al usuario (salvo el `409`, ver más abajo).
- Fechas: enviar en ISO 8601 con zona horaria (`new Date().toISOString()`).

> 🔐 **Autenticación (cambio 2026-10-07):** `GET /quizzes/:id/preguntas` y `POST /quizzes/:id/submit` exigen `Authorization: Bearer <token>` de un usuario con rol **estudiante** **inscrito en el curso del quiz**. El estudiante se toma del token: **ya no se envía `estudiante_id` en el body** (si llega, se ignora). Sin token → `401`; otro rol → `403`; no inscrito → `403`.

> 🔄 **Cambio 2026-10-11 (pedido en `docs/contrato-quiz-estudiante.md` del frontend):** nuevos `GET /quizzes/mine` y `GET /quizzes/:id/result`. Además, `GET /quizzes` y `GET /quizzes/:id` ahora piden token (cualquier rol), y `POST /quizzes`, `PUT /quizzes/:id` y `DELETE /quizzes/:id` piden token con rol docente.

---

## Resumen

| HU | Método y ruta | Quién lo usa | Estado |
|---|---|---|---|
| HU-3.2 | `GET /quizzes/:id/preguntas` | Estudiante (pintar el formulario) | ➕ Adicional, aprobado por el equipo |
| HU-3.2 | `POST /quizzes/:id/submit` | Estudiante (resolver quiz) | ✅ Del backlog |
| HU-3.2 | `GET /quizzes/mine` | Estudiante (lista de sus quices con nota) | ➕ Adicional (2026-10-11) |
| HU-3.2 | `GET /quizzes/:id/result` | Estudiante (resultado previo, CA-3.2.3) | ➕ Adicional (2026-10-11) |
| HU-3.1 | `GET /quizzes/:id` | Portada del quiz (título, tiempo límite, `estado_efectivo`) | ✅ Apoyo, viene de HU-3.1, **no trae preguntas**. Pide token (cualquier rol). |

---

## `GET /api/v1/quizzes/:id/preguntas`

Devuelve las preguntas del quiz **sin `respuesta_correcta`** (ni `tarjeta_id`) para pintar el formulario. Solo responde mientras el quiz está **abierto**.

### Respuesta 200

```json
{
  "quiz": {
    "id_quiz": 1,
    "titulo": "Quiz semanas 1-2",
    "tiempo_limite_min": 15,
    "fecha_apertura": "2026-10-07T13:00:00.000Z",
    "fecha_cierre": "2026-10-10T23:59:00.000Z",
    "estado": "programado",
    "estado_efectivo": "abierto"
  },
  "preguntas": [
    {
      "id_pregunta": 1,
      "tipo_pregunta": "seleccion_multiple",
      "enunciado": "¿Cuál es la traducción correcta de \"cook\"?",
      "opcion_a": "comer",
      "opcion_b": "cocinar",
      "opcion_c": "beber",
      "opcion_d": null,
      "orden": 1
    }
  ]
}
```

(`quiz` trae todas las columnas de la tabla `quiz`; aquí se muestran solo las útiles para el formulario.)

### Errores

| Status | Mensaje (`error`) | Qué hacer en el front |
|---|---|---|
| `401` | `Token de autenticación no proporcionado` / `Token inválido o expirado` | Mandar al login. |
| `403` | `No tiene permisos para acceder a este recurso` | El usuario no es estudiante. |
| `400` | `id inválido` | Error de programación del front. |
| `404` | `Quiz no encontrado` | Mostrar `error`. |
| `403` | `No estás inscrito en el curso de este quiz` | Mostrar `error`. |
| `400` | `El quiz aún no está abierto (fecha_apertura no ha llegado)` | Volver a la portada. |
| `400` | `El quiz ya cerró y no acepta más respuestas` | Bloquear. |
| `404` | `El quiz no tiene preguntas generadas todavía` | Mostrar `error`. |

---

## `POST /api/v1/quizzes/:id/submit`

Recibe las respuestas del estudiante, las califica y las guarda. Cada estudiante puede enviar **una sola vez** cada quiz.

### Body

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `respuestas` | array | sí | `[{ "pregunta_id": 1, "respuesta_estudiante": "cocinar" }]`. Puede ir vacío (`[]`) si no contestó nada. |
| `fecha_inicio` | string ISO | **recomendado** | Momento en que el estudiante pulsó "Iniciar". |
| `tiempo_empleado_seg` | number | opcional | Alternativa a `fecha_inicio`. |

> ⚠️ `respuesta_estudiante` es el **texto de la opción elegida** (por ejemplo `"cocinar"`), **no la letra** (`"a"`). Se compara exacto con la respuesta correcta (mayúsculas y espacios incluidos), así que hay que enviar el valor de `opcion_x` sin modificarlo.
>
> Las preguntas sin contestar se omiten o se envían con `respuesta_estudiante: null`; cuentan como incorrectas.
>
> Si no se envía ni `fecha_inicio` ni `tiempo_empleado_seg`, **el backend no puede validar el tiempo límite**. Enviar siempre `fecha_inicio`.

```json
{
  "fecha_inicio": "2026-10-01T14:00:00.000Z",
  "respuestas": [
    { "pregunta_id": 1, "respuesta_estudiante": "cocinar" },
    { "pregunta_id": 2, "respuesta_estudiante": null }
  ]
}
```

### Respuesta 201 (primer envío)

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
- `tiempo_empleado_seg` se guarda topado al tiempo límite.
- `respuestas` trae **una fila por cada pregunta del quiz**, incluidas las no contestadas. El desglose de aciertos y errores (CA-3.2.2) se arma cruzando `pregunta_id` con las preguntas que ya tiene el front.
- La respuesta **no incluye la respuesta correcta** de cada pregunta: el desglose solo puede decir "Correcta" o "Incorrecta" (ver pendientes).

### Errores

El backend valida en este orden y responde con el primero que falle:

| Status | Mensaje (`error`) | Qué hacer en el front |
|---|---|---|
| `400` | `id inválido` | El `:id` de la URL no es numérico. Error de programación del front. |
| `401` | `Token de autenticación no proporcionado` / `Token inválido o expirado` | Mandar al login. |
| `403` | `No tiene permisos para acceder a este recurso` | El usuario no es estudiante. |
| `400` | `respuestas debe ser un arreglo de { pregunta_id, respuesta_estudiante }` | Error de programación del front. |
| `404` | `Quiz no encontrado` | Mostrar `error`. |
| `403` | `No estás inscrito en el curso de este quiz` | Mostrar `error`. |
| `400` | `El quiz aún no está abierto (fecha_apertura no ha llegado)` | Volver a la portada y mostrar la fecha de apertura. |
| `400` | `El quiz ya cerró y no acepta más respuestas` | Mostrar mensaje; bloquear. |
| `409` | `Ya enviaste este quiz. No se permite un nuevo intento.` | El body trae `{ error, resultado, respuestas }` del intento anterior: **mostrar ese resumen** como pantalla de resultado, no un error genérico (CA-3.2.3). También se responde así si llegan dos envíos simultáneos. |
| `404` | `El quiz no tiene preguntas generadas todavía` | Mostrar `error`. |
| `400` | `Se agotó el tiempo límite de N minutos; el envío fue rechazado` | El envío **no se guardó**. Mostrar el mensaje. |
| `500` | (mensaje técnico) | Error inesperado. No se guarda nada (resultado y respuestas van en una sola transacción), así que el estudiante puede reintentar. Mostrar un mensaje genérico. |

### Márgenes de tolerancia del servidor

- **Tiempo límite:** acepta envíos hasta `tiempo_limite_min` + **30 segundos** después de `fecha_inicio`.
- **Cierre del quiz:** acepta envíos hasta **30 segundos** después de `fecha_cierre`, para que un envío automático que llega con latencia no se pierda.

Pasados esos márgenes responde `400` y no guarda nada.

---

## `GET /api/v1/quizzes/mine`

➕ Adicional, pedido por el frontend (`docs/contrato-quiz-estudiante.md`, 2.1). Lista de quices del estudiante.

- Requiere token con rol **estudiante**; el estudiante sale del token.
- Solo trae quices de cursos donde el estudiante tiene inscripción **activa**.
- Orden: `fecha_apertura` descendente.

### Respuesta 200

```json
[
  {
    "id_quiz": 1,
    "curso_id": 1,
    "titulo": "Quiz semanas 1-2",
    "semana_corte": 2,
    "fecha_creacion": "2026-10-08T15:00:00.000Z",
    "fecha_apertura": "2026-10-09T18:00:00.000Z",
    "fecha_cierre": "2026-10-11T18:00:00.000Z",
    "tiempo_limite_min": 120,
    "estado": "programado",
    "estado_efectivo": "abierto",
    "resultado": null
  }
]
```

`resultado` es `null` si el estudiante no ha enviado el quiz. Si ya lo envió:
`{ "id_resultado", "puntaje_obtenido", "puntaje_maximo", "calificacion", "fecha_envio" }`.
Los puntajes y la calificación llegan como **texto** (`"3.75"`), igual que en el submit, porque son `DECIMAL` en Postgres.

### Errores

| Status | Mensaje (`error`) | Cuándo |
|---|---|---|
| `401` | `Token de autenticación no proporcionado` / `Token inválido o expirado` | Sin sesión. |
| `403` | `No tiene permisos para acceder a este recurso` | El usuario no es estudiante. |

---

## `GET /api/v1/quizzes/:id/result`

➕ Adicional, pedido por el frontend (`docs/contrato-quiz-estudiante.md`, 2.2). Resultado previo del estudiante para CA-3.2.3, en cualquier dispositivo y **aunque el quiz ya esté cerrado** (no depende de `estado_efectivo`).

- Requiere token con rol **estudiante** inscrito en el curso del quiz; el estudiante sale del token.

### Respuesta 200

```json
{
  "resultado": { "id_resultado": 9, "quiz_id": 1, "estudiante_id": 7, "fecha_inicio": "…", "fecha_envio": "…", "puntaje_obtenido": "3", "puntaje_maximo": "4", "calificacion": "3.75", "tiempo_empleado_seg": 540 },
  "respuestas": [
    { "id_respuesta": 1, "resultado_id": 9, "pregunta_id": 11, "respuesta_estudiante": "isla", "es_correcta": true, "puntaje_obtenido": "1" }
  ],
  "preguntas": [
    { "id_pregunta": 11, "tipo_pregunta": "seleccion_multiple", "enunciado": "¿Cuál es la traducción correcta de \"island\"?", "opcion_a": "isla", "opcion_b": "…", "opcion_c": "…", "opcion_d": "…", "orden": 1 }
  ]
}
```

- `resultado` y `respuestas` tienen la misma forma que en el `201` / `409` del submit.
- `preguntas` **no** trae `respuesta_correcta` ni `tarjeta_id` (mismo recorte que `GET /:id/preguntas`). Trae además `tipo_pregunta`.

### Errores

| Status | Mensaje (`error`) | Cuándo |
|---|---|---|
| `400` | `id inválido` | `id` no numérico. |
| `401` | `Token de autenticación no proporcionado` / `Token inválido o expirado` | Sin sesión. |
| `403` | `No tiene permisos para acceder a este recurso` | El usuario no es estudiante. |
| `403` | `No estás inscrito en el curso de este quiz` | No está inscrito (mismo criterio que `/preguntas` y `/submit`). |
| `404` | `Quiz no encontrado` | El quiz no existe. |
| `404` | `Aún no has enviado este quiz` | El estudiante todavía no ha enviado: mostrar la portada normal. |

---

## Cómo implementarlo en el front

### Pantallas

1. **Portada del quiz** con título, tiempo límite y `estado_efectivo` (`GET /quizzes/:id`).
2. Botón **"Iniciar"**, habilitado solo si `estado_efectivo === "abierto"`. Si es `programado`, mostrar "Disponible el …"; si es `cerrado`, bloquear.
3. **Formulario** con las preguntas de `GET /quizzes/:id/preguntas`, **temporizador regresivo** y botón **"Finalizar examen"**. Pintar las opciones en orden `opcion_a` → `opcion_d` y omitir las que vengan `null`.
4. **Pantalla de resultado** con la nota y el desglose de aciertos y errores (CA-3.2.2).
5. Si el estudiante ya había enviado (`409`), mostrar su resultado anterior en vez del formulario.

### Temporizador (CA-3.2.1)

El cronómetro visible es del front; el backend solo lo hace cumplir.

1. Al pulsar "Iniciar", guardar `fecha_inicio = new Date().toISOString()` en el estado de React. Guardarlo también en `sessionStorage` con clave por quiz (por ejemplo `quiz_${id}_inicio`) para que un refresh no reinicie el reloj.
2. Tiempo restante = `tiempo_limite_min * 60 - (ahora - fecha_inicio)`. Calcularlo a partir de `fecha_inicio`, no con un contador que se decrementa, para que no se desfase si la pestaña queda en segundo plano.
3. Si `fecha_cierre` llega antes que el fin del tiempo límite, usar la menor de las dos como límite.
4. Al llegar a 0: **bloquear el formulario y enviar automáticamente** lo contestado hasta ese momento, con `fecha_inicio`.
5. "Finalizar examen" hace el mismo envío antes de que se acabe el tiempo (pedir confirmación si quedan preguntas sin contestar).
6. Enviar **una sola vez**: deshabilitar el botón y el autoenvío tras el primer intento para no generar un `409` propio.
7. Con `201` → pantalla de resultado. Con `409` → pantalla de resultado usando `resultado` y `respuestas` del body.

### Reintento (CA-3.2.3)

- Mientras el quiz está **abierto**, un segundo envío responde `409` con el resumen previo. ✅
- Si el quiz **ya cerró**, el submit responde `400 "El quiz ya cerró…"`, **no** el `409` (la validación de cierre va antes). Para ese caso está `GET /quizzes/:id/result`.
- Antes de mostrar la portada, consultar `GET /quizzes/:id/result`: con `200` mostrar el resultado; con `404 "Aún no has enviado este quiz"` mostrar la portada normal. El respaldo en `localStorage` queda solo para cuando ese endpoint falle.

---

## Supuestos pendientes de validar (afectan al front)

1. ✅ **Resuelto (2026-10-07):** las preguntas se obtienen con `GET /quizzes/:id/preguntas` (ver arriba).
2. ✅ **Resuelto (2026-10-11):** el resultado previo se consulta con `GET /quizzes/:id/result`, y la lista con nota con `GET /quizzes/mine`.
3. **🟡 La respuesta del submit no trae la respuesta correcta** de cada pregunta, así que el desglose solo puede decir acierto o error.
4. Escala de `calificacion` 0–5 (pendiente de validar con la docente).
5. `fecha_inicio` la informa el cliente; el servidor no registra cuándo empezó el intento, así que el límite de tiempo no es inviolable. **Decisión del equipo (2026-10-07):** se acepta como limitación conocida; no se agrega endpoint de inicio por ahora.
6. ✅ **Resuelto (2026-10-07):** ambos endpoints piden JWT de estudiante y comprueban la inscripción en el curso del quiz.
