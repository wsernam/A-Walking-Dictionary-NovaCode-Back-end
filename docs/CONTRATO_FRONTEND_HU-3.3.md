# Contrato Backend → Frontend — HU-3.3 (HU-009 en la numeración de sprint del equipo)

Este documento le dice al frontend (React) **qué se implementó en el backend** y **cómo debe consumirlo** para los botones de "Exportar a PDF" de mazos y quices. Cubre únicamente HU-3.3 (CA-3.3.1, CA-3.3.2, CA-3.3.3). Última actualización: 2026-10-04.

- Rama donde vive la implementación: **`feature/Sprint_2_HU_9`**. El PDF de quiz necesita un quiz generado con HU-3.1 (`feature/Sprint_2_HU_7`, contrato `docs/CONTRATO_FRONTEND_HU-3.1.md`).
- Base URL: `/api/v1`.
- Formato: los dos endpoints devuelven **el archivo PDF directamente** (`Content-Type: application/pdf`, `Content-Disposition: attachment`), **no JSON**. Solo los errores llegan en JSON: `{ "error": "mensaje legible" }`.

> ⚠️ **Autenticación:** el login (HU-5.4, Google + JWT) ya existe en el backend, pero **estos endpoints todavía no piden token ni rol**. El front debe mostrar los botones solo a la docente hasta que el equipo decida protegerlos en el back.

---

## Resumen

| HU | Método y ruta | Quién lo usa | Estado |
|---|---|---|---|
| HU-3.3 | `GET /decks/:id/export-pdf` | Docente (vista del mazo) | ✅ Del backlog |
| HU-3.3 | `GET /quizzes/:id/export-pdf` | Docente (vista del quiz) | ✅ **Adicional**: el backlog solo lista el de mazos, pero CA-3.3.2 pide el PDF del quiz |

---

## Qué contiene cada PDF

El PDF ya sale maquetado para impresión (márgenes académicos, tipografía legible, sin elementos web, CA-3.3.3): el front solo lo descarga.

| Endpoint | Archivo | Contenido |
|---|---|---|
| `GET /api/v1/decks/:id/export-pdf` | `mazo-{id}.pdf` | Encabezado con nombre de la lectura, autor, semana y variante regional (si tiene). Por cada tarjeta: término, traducción, definición y, si los tiene, ejemplo y contexto (registro / variante). **Solo tarjetas `revisado_docente`.** (CA-3.3.1) |
| `GET /api/v1/quizzes/:id/export-pdf` | `quiz-{id}.pdf` | Página de preguntas (título, tiempo límite, cantidad de preguntas, línea para el nombre del estudiante y las preguntas con sus opciones A–D) y, en **página separada**, la hoja de respuestas con la clave. (CA-3.3.2) |

Un mazo sin tarjetas aprobadas **no da error**: se genera un PDF con el aviso "Este mazo todavía no tiene tarjetas revisado_docente para exportar". Si el front ya sabe que no hay aprobadas, conviene deshabilitar el botón.

### Errores (llegan en JSON)

| Status | Mensaje (`error`) | Cuándo |
|---|---|---|
| `400` | `id inválido` | El `:id` no es numérico. |
| `404` | `Mazo no encontrado` | El mazo no existe. |
| `404` | `Quiz no encontrado` | El quiz no existe. |
| `404` | `El quiz no tiene preguntas generadas todavía` | El quiz existe pero no tiene preguntas. |
| `500` | (mensaje técnico) | Algún texto tiene caracteres que la fuente del PDF no soporta (emoji, IPA, alfabetos no latinos). Mostrar un mensaje genérico. |

---

## Cómo implementarlo en el front

- Botón **"Exportar a PDF"** en la vista del mazo y **"Exportar versión impresa"** en la vista del quiz.
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

## Supuestos pendientes de validar (afectan al front)

1. **Solo tarjetas aprobadas en el PDF del mazo:** el backlog no aclara si deben ir todas; se exportan solo las `revisado_docente`, que son las que la docente ya validó.
2. **Caracteres especiales:** la fuente del PDF cubre español e inglés (incluye ñ, tildes, ¿, ¡), pero un emoji o un alfabeto no latino hace fallar la exportación con `500`.
3. **Autenticación:** los endpoints no piden token ni rol (ver la advertencia del inicio).

---

## Referencia para pruebas

Colección Postman `Sprint 2 (HE3).postman_collection.json` en la raíz del repo (rama `feature/Sprint_2_HU_9`). Cubre HU-3.1, HU-3.2 y HU-3.3.
