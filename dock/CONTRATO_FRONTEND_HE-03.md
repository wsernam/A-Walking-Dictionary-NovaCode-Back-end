# Contrato Backend → Frontend — HE-03 (HU-3.1, HU-3.2, HU-3.3)

Este documento le dice al frontend (React) **qué se implementó en el backend** y **cómo debe consumirlo** para que funcione. Cubre únicamente HU-3.1, HU-3.2 y HU-3.3. Última actualización: 2026-09-21.

- Base URL: `/api/v1`
- Formato: JSON (`Content-Type: application/json`), salvo los PDF.
- Errores: siempre `{ "error": "mensaje legible" }` con el status HTTP correspondiente. Mostrar `error` tal cual al usuario.
- Fechas: enviar en ISO 8601 (`2026-10-01T08:00:00Z`).
- Colección Postman de referencia: `Sprint 2 (HE3).postman_collection.json`.

> ⚠️ **Autenticación:** hoy estos endpoints **no validan JWT ni rol** (HU-5.4 no está integrada). El `estudiante_id` viaja en el body. El frontend debe enviarlo, y cuando entre el login este contrato se actualizará.

---

## Resumen de endpoints

| HU | Método y ruta | Quién lo usa | Estado |
|---|---|---|---|
| HU-3.1 | `POST /quizzes/generate` | Docente | ✅ |
| HU-3.1 | `GET /quizzes` · `GET /quizzes/:id` | Docente / Estudiante | ✅ (adicional, de apoyo) |
| HU-3.2 | `POST /quizzes/:id/submit` | Estudiante | ✅ |
| HU-3.3 | `GET /decks/:id/export-pdf` | Docente | ✅ |
| HU-3.3 | `GET /quizzes/:id/export-pdf` | Docente | ✅ (endpoint adicional: el backlog solo lista el de mazos) |

---

## HU-3.1 — Generar quiz acumulativo

### `POST /api/v1/quizzes/generate`

**Body**

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `curso_id` | number | sí | |
| `titulo` | string | sí | máx. 200 caracteres |
| `mazo_ids` | number[] | sí | Mazos cuyas tarjetas `revisado_docente` forman el pool. **El backend no resuelve "rango de semanas": el frontend elige los mazos** (ya tiene la lista con `GET /decks`) y manda sus ids. |
| `fecha_apertura` | string ISO | sí | |
| `fecha_cierre` | string ISO | sí | Debe ser posterior a `fecha_apertura`. |
| `tiempo_limite_min` | number | sí | Minutos. |
| `cantidad_preguntas` | number | no | Si se omite, se usan todas las tarjetas aprobadas. Si es mayor al pool, se topa al pool. |

**Respuesta 201**

```json
{
  "quiz": {
    "id_quiz": 1, "curso_id": 1, "titulo": "Quiz semanas 1-2", "semana_corte": 2,
    "fecha_apertura": "...", "fecha_cierre": "...", "tiempo_limite_min": 20,
    "estado": "programado", "estado_efectivo": "programado"
  },
  "preguntas": [
    {
      "id_pregunta": 1, "quiz_id": 1, "tarjeta_id": 4, "tipo_pregunta": "seleccion_multiple",
      "enunciado": "¿Cuál es la traducción correcta de \"cooking\"?",
      "opcion_a": "cocinar", "opcion_b": "...", "opcion_c": "...", "opcion_d": null,
      "respuesta_correcta": "cocinar", "orden": 1
    }
  ]
}
```

**Errores:** `400` faltan campos / `fecha_cierre` ≤ `fecha_apertura` / hay menos de 2 tarjetas `revisado_docente` en los mazos elegidos; `404` algún `mazo_id` no existe.

**Cómo implementarlo en el front**
1. Pantalla de configuración: selector múltiple de mazos, título, apertura, cierre, tiempo límite y (opcional) cantidad de preguntas.
2. Validar antes de enviar que cierre > apertura y que hay al menos un mazo. Mostrar `error` del backend si responde 400.
3. Esta respuesta trae `respuesta_correcta`: **es solo para la vista de la docente**. No reutilizar este payload para pintar el quiz del estudiante.

**Reglas que el front debe conocer**
- Solo entran tarjetas en estado `revisado_docente` (CA-3.1.1). Si la docente no ha aprobado tarjetas en esos mazos, dará 400.
- Cada pregunta es de **opción múltiple** con hasta 4 opciones (`opcion_a` a `opcion_d`). Las opciones nunca se repiten (se comparan sin mayúsculas). Si hay pocas traducciones distintas en el pool, una pregunta puede traer menos de 4 opciones: **las opciones `null` no se pintan**.
- La asociación término-definición **no está implementada** (el CA la deja como alternativa).

### Estado del quiz (CA-3.1.3)

El quiz se crea con `estado: "programado"`. No hay cron: el backend calcula `estado_efectivo` en cada consulta:

| `estado_efectivo` | Significa | Qué hace el front |
|---|---|---|
| `programado` | Aún no llega `fecha_apertura` | Mostrar "Disponible el …", botón de iniciar deshabilitado |
| `abierto` | Entre apertura y cierre | Permitir iniciar y responder |
| `cerrado` | Pasó `fecha_cierre` | Bloquear; solo mostrar resultado si ya lo envió |

**Siempre usar `estado_efectivo`, no `estado`.** Se obtiene con `GET /quizzes` (lista) o `GET /quizzes/:id`.

---

## HU-3.2 — Responder quiz y recibir nota

### `POST /api/v1/quizzes/:id/submit`

**Body**

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `estudiante_id` | number | sí | Hasta integrar JWT. |
| `respuestas` | array | sí | `[{ "pregunta_id": 1, "respuesta_estudiante": "cocinar" }]`. `respuesta_estudiante` es el **texto de la opción elegida** (no la letra) y debe coincidir exactamente con el texto de `opcion_a…d`. Las preguntas sin contestar se omiten o van con `null`: cuentan como incorrectas. |
| `fecha_inicio` | string ISO | recomendado | Momento en que el estudiante abrió el quiz. |
| `tiempo_empleado_seg` | number | recomendado | Alternativa a `fecha_inicio`. |

> Enviar **`fecha_inicio`** (o al menos `tiempo_empleado_seg`) es lo que activa la validación de tiempo del servidor. Sin ninguno de los dos, el backend no puede verificar el límite.

**Respuesta 201 (primer envío)**

```json
{
  "resultado": {
    "id_resultado": 1, "quiz_id": 1, "estudiante_id": 2,
    "fecha_inicio": "...", "fecha_envio": "...",
    "puntaje_obtenido": 7, "puntaje_maximo": 10, "calificacion": 3.5,
    "tiempo_empleado_seg": 640
  },
  "respuestas": [
    { "id_respuesta": 1, "resultado_id": 1, "pregunta_id": 1,
      "respuesta_estudiante": "cocinar", "es_correcta": true, "puntaje_obtenido": 1 }
  ]
}
```

- `calificacion` está en escala **0.0 – 5.0** (supuesto pendiente de validar con la docente).
- `puntaje_obtenido` / `puntaje_maximo` = aciertos / total de preguntas.

**Errores**

| Status | Cuándo | Qué hacer en el front |
|---|---|---|
| `400` | Faltan `estudiante_id`/`respuestas`; el quiz aún no abre; el quiz ya cerró; **se agotó el tiempo límite** (excede `tiempo_limite_min` + 30 s de margen) | Mostrar `error`. |
| `404` | Quiz no existe o no tiene preguntas | Mostrar `error`. |
| `409` | El estudiante **ya envió** este quiz (CA-3.2.3) | El body trae `{ error, resultado, respuestas }` del intento previo: **mostrar ese resumen**, no un error genérico. |

### Cómo implementar el temporizador (CA-3.2.1)

El cronómetro visible es responsabilidad del front; el backend lo hace cumplir.

1. Al abrir el quiz, guardar `fecha_inicio = new Date().toISOString()` (en estado de React; opcionalmente `sessionStorage` para sobrevivir un refresh).
2. Contar regresivamente `tiempo_limite_min`.
3. Al llegar a 0: **bloquear el formulario y enviar automáticamente** lo contestado hasta ese momento (con `fecha_inicio`). Las preguntas sin respuesta se omiten.
4. El botón "Finalizar examen" hace el mismo envío antes de que se acabe el tiempo.
5. Enviar **una sola vez**: deshabilitar el botón al primer clic para evitar envíos dobles.
6. Tras el 201, mostrar el desglose (aciertos/errores por pregunta, `calificacion`, `puntaje_obtenido/puntaje_maximo`).
7. Si el backend responde `400` por tiempo agotado, el envío no se guardó: mostrar el mensaje. Para evitarlo, el autoenvío debe dispararse en cuanto el contador llegue a 0 (el backend tolera hasta 30 s de latencia).
8. Si responde `409` (por ejemplo, el usuario abre el enlace de nuevo), mostrar el resumen previo con `resultado` y `respuestas`.

### ⚠️ Pendiente que bloquea la pantalla del estudiante

**Hoy no existe un endpoint montado para que el estudiante obtenga las preguntas del quiz.** `GET /quizzes/:id` devuelve solo los datos del quiz (sin preguntas), y las rutas de `pregunta_quiz` existen en el código pero **no están montadas en `app.js`**. Solo `POST /quizzes/generate` devuelve las preguntas, y trae `respuesta_correcta`, así que no sirve para el estudiante.

Según la regla del proyecto (no inventar endpoints que no estén en el backlog), esto queda como **decisión pendiente del equipo**: definir el endpoint para listar las preguntas de un quiz sin `respuesta_correcta`. Hasta entonces el front puede desarrollar el temporizador y el formulario con datos de prueba del payload de `generate`, ignorando `respuesta_correcta`.

---

## HU-3.3 — Exportar a PDF

Ambos endpoints devuelven el archivo directamente (`Content-Type: application/pdf`, `Content-Disposition: attachment`), **no JSON**.

| Endpoint | Nombre de archivo | Contenido |
|---|---|---|
| `GET /api/v1/decks/:id/export-pdf` | `mazo-{id}.pdf` | Título, autor, semana, variante; por tarjeta: término, traducción, definición, ejemplo y contexto (registro / variante). **Solo tarjetas `revisado_docente`.** |
| `GET /api/v1/quizzes/:id/export-pdf` | `quiz-{id}.pdf` | Hoja de preguntas + página separada con la hoja de respuestas (clave). |

**Errores (JSON):** `400` id no numérico; `404` mazo/quiz no existe o el quiz no tiene preguntas.

**Cómo implementarlo en el front**
- Botón "Exportar a PDF" en el mazo y "Exportar versión impresa" en el quiz.
- Pedir el archivo como binario y descargarlo:

```js
const res = await fetch(`/api/v1/decks/${id}/export-pdf`);
if (!res.ok) {
  const { error } = await res.json();   // errores llegan como JSON
  throw new Error(error);
}
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `mazo-${id}.pdf`;
a.click();
URL.revokeObjectURL(url);
```

- Con axios: `responseType: 'blob'`; en caso de error el `blob` contiene el JSON, así que hay que leerlo con `await err.response.data.text()`.
- El PDF ya sale con márgenes académicos y sin elementos web (CA-3.3.3); no requiere maquetación en el front.
- Limitación conocida: si un texto contiene caracteres fuera de Latin-1/WinAnsi (emoji, IPA, alfabetos no latinos), el backend responde 500. Mostrar un mensaje genérico de error.
- El PDF del mazo con cero tarjetas aprobadas se genera igual, con el aviso "Este mazo todavía no tiene tarjetas revisado_docente para exportar". Conviene deshabilitar el botón si el front ya sabe que no hay aprobadas.

---

## Endpoints de apoyo

- `GET /api/v1/quizzes` → arreglo de quices, cada uno con `estado_efectivo`.
- `GET /api/v1/quizzes/:id` → un quiz con `estado_efectivo` (`404` si no existe). **No incluye preguntas.**

## Supuestos pendientes de validar (afectan al front)

1. Escala de `calificacion` 0–5.
2. El inicio del quiz lo informa el cliente (`fecha_inicio`); el servidor no lo registra, por lo que el límite de tiempo no es inviolable.
3. Endpoint para que el estudiante obtenga las preguntas (ver sección de HU-3.2).
4. Sin JWT/roles hasta integrar HU-5.4.
