# Contrato Backend → Frontend — HU-3.2 (HU-008 en la numeración de sprint del equipo)

Este documento le dice al frontend (React) **qué se implementó en el backend** y **cómo debe consumirlo** para la pantalla de "Responder quiz y recibir nota" del estudiante. Cubre únicamente HU-3.2 (CA-3.2.1, CA-3.2.2, CA-3.2.3). Última actualización: 2026-10-04.

- Rama donde vive la implementación: **`feature/Sprint_3_HU_008`**. Depende de HU-3.1 (generar quiz, `feature/Sprint_3_HU_007`, contrato `docs/CONTRATO_FRONTEND_HU-3.1.md`): para responder un quiz, la docente primero tiene que generarlo.
- Base URL: `/api/v1`.
- Formato: JSON (`Content-Type: application/json`).
- Errores: siempre `{ "error": "mensaje legible" }` con el status HTTP correspondiente. Mostrar `error` tal cual al usuario (salvo el `409`, ver más abajo).
- Fechas: enviar en ISO 8601 con zona horaria (`new Date().toISOString()`).

> ⚠️ **Autenticación:** el login (HU-5.4, Google + JWT) ya existe en el backend, pero **`POST /quizzes/:id/submit` todavía no pide token**: el `estudiante_id` viaja en el body. El front debe tomarlo del usuario con sesión iniciada. Cuando el equipo proteja el endpoint, este contrato cambia.

---

## Resumen

| HU | Método y ruta | Quién lo usa | Estado |
|---|---|---|---|
| HU-3.2 | `POST /quizzes/:id/submit` | Estudiante (resolver quiz) | ✅ Del backlog |
| HU-3.1 | `GET /quizzes/:id` | Portada del quiz (título, tiempo límite, `estado_efectivo`) | ✅ Apoyo, viene de HU-3.1, **no trae preguntas** |

---

## `POST /api/v1/quizzes/:id/submit`

Recibe las respuestas del estudiante, las califica y las guarda. Cada estudiante puede enviar **una sola vez** cada quiz.

### Body

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `estudiante_id` | number | sí | `id_usuario` del estudiante con sesión iniciada. |
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
  "estudiante_id": 2,
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
| `400` | `estudiante_id es obligatorio` | Error de programación del front. |
| `400` | `respuestas debe ser un arreglo de { pregunta_id, respuesta_estudiante }` | Error de programación del front. |
| `404` | `Quiz no encontrado` | Mostrar `error`. |
| `400` | `El quiz aún no está abierto (fecha_apertura no ha llegado)` | Volver a la portada y mostrar la fecha de apertura. |
| `400` | `El quiz ya cerró y no acepta más respuestas` | Mostrar mensaje; bloquear. |
| `409` | `Ya enviaste este quiz. No se permite un nuevo intento.` | El body trae `{ error, resultado, respuestas }` del intento anterior: **mostrar ese resumen** como pantalla de resultado, no un error genérico (CA-3.2.3). |
| `404` | `El quiz no tiene preguntas generadas todavía` | Mostrar `error`. |
| `400` | `Se agotó el tiempo límite de N minutos; el envío fue rechazado` | El envío **no se guardó**. Mostrar el mensaje. |
| `500` | (mensaje técnico) | Error inesperado; por ejemplo, un `estudiante_id` que no existe. Mostrar un mensaje genérico. |

### Márgenes de tolerancia del servidor

- **Tiempo límite:** acepta envíos hasta `tiempo_limite_min` + **30 segundos** después de `fecha_inicio`.
- **Cierre del quiz:** acepta envíos hasta **30 segundos** después de `fecha_cierre`, para que un envío automático que llega con latencia no se pierda.

Pasados esos márgenes responde `400` y no guarda nada.

---

## Cómo implementarlo en el front

### Pantallas

1. **Portada del quiz** con título, tiempo límite y `estado_efectivo` (`GET /quizzes/:id`).
2. Botón **"Iniciar"**, habilitado solo si `estado_efectivo === "abierto"`. Si es `programado`, mostrar "Disponible el …"; si es `cerrado`, bloquear.
3. **Formulario** con las preguntas, **temporizador regresivo** y botón **"Finalizar examen"**. Pintar las opciones en orden `opcion_a` → `opcion_d` y omitir las que vengan `null`.
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
- Si el quiz **ya cerró**, un estudiante que sí había enviado recibe `400 "El quiz ya cerró…"`, **no** el `409` con su resumen (la validación de cierre va antes).
- El `409` solo se dispara al **enviar**; abrir el enlace no consulta nada. Para saber si el estudiante ya respondió antes de mostrar el formulario no hay endpoint todavía (ver pendientes). Mientras tanto, el front puede recordar localmente que ese quiz ya se envió y mostrar el resultado guardado.

---

## Supuestos pendientes de validar (afectan al front)

1. **🔴 No hay endpoint para que el estudiante obtenga las preguntas del quiz.** `GET /quizzes/:id` no las trae, y el único que devuelve preguntas es `POST /quizzes/generate` (HU-3.1), que incluye `respuesta_correcta`. **Esto bloquea el formulario del estudiante.** Propuesta a validar con el equipo: `GET /quizzes/:id/questions` sin `respuesta_correcta`. Mientras tanto, desarrollar el formulario y el temporizador usando el payload de `generate` como dato de prueba, ignorando `respuesta_correcta`.
2. **🟡 No hay endpoint para consultar el resultado previo** de un estudiante sin reenviar (por ejemplo, para un "historial" o para abrir el enlace después del cierre). Hoy solo se obtiene con el `409` del submit.
3. **🟡 La respuesta del submit no trae la respuesta correcta** de cada pregunta, así que el desglose solo puede decir acierto o error.
4. Escala de `calificacion` 0–5 (pendiente de validar con la docente).
5. `fecha_inicio` la informa el cliente; el servidor no registra cuándo empezó el intento, así que el límite de tiempo no es inviolable.
6. **Autenticación:** el endpoint no pide token y no comprueba que el estudiante esté inscrito en el curso del quiz. Pendiente de que el equipo decida protegerlo.
