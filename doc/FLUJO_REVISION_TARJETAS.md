# Flujo de Revisión de Tarjetas — Individual vs. Coautoría

## Fecha
2026-09-10

## Regla de negocio (tal como la definió el equipo)

> **Flujo de Revisión Individual (Docente):** Se elimina el botón/opción de "Rechazar" cuando
> la profesora está revisando o evaluando una tarjeta individual aportada por un estudiante. En
> este flujo, la profesora se enfocará en editar, corregir y aprobar la tarjeta.
>
> **Flujo de Coautoría (Aportes Duplicados):** La opción de "Rechazar" se mantiene activa
> únicamente para el escenario de gestión de coautorías, es decir, cuando se evalúa un aporte
> duplicado o una nueva acepción sobre una palabra ya existente.

## Por qué el DER ya soportaba esto sin cambios de esquema

El DER distingue dos entidades relacionadas:

- **`tarjeta`**: la palabra "oficial" del mazo (una sola fila por `mazo_id` + `palabra`).
- **`aporte`**: el historial de intentos de un estudiante sobre esa tarjeta, con una columna
  `tipo_aporte` que ya venía siendo `'creada'` | `'coautoria'` | `'acepcion_nueva'` desde HU-1.3.

Esa columna `tipo_aporte` es exactamente la que distingue los dos flujos — no hizo falta
agregar ninguna tabla ni columna nueva.

## Flujo 1 — Revisión Individual (tarjeta con aporte `'creada'`)

```
Docente ve una tarjeta "pendiente_revision"
        │
        ▼
GET /api/v1/cards/:id          → ver la tarjeta
        │
        ▼
PUT /api/v1/cards/:id          → editar / corregir (opcional, cuantas veces haga falta)
        │
        ▼
PATCH /api/v1/cards/:id/approve → APROBAR
        │
        ▼
tarjeta.estado = 'revisado_docente'
tarjeta.fecha_revision = ahora
```

**No existe una acción de "Rechazar" en este flujo.** `TarjetaController` no tiene ningún
método `rechazar` — no es que el frontend oculte el botón nada más, el backend ni siquiera
expone el endpoint para hacerlo.

## Flujo 2 — Coautoría / Acepción nueva (aporte `'coautoria'` o `'acepcion_nueva'`)

```
Estudiante intenta registrar una palabra que ya existe en el mazo (HU-1.3)
        │
        ▼
Se crea un "aporte" nuevo sobre la tarjeta existente
(tipo_aporte = 'coautoria' o 'acepcion_nueva', la tarjeta original NO se toca)
        │
        ▼
Docente revisa ese aporte
        │
        ├── Lo acepta → no se necesita ninguna acción (el aporte simplemente queda como está)
        │
        └── Lo rechaza → DELETE /api/v1/contributions/:id
                              │
                              ▼
                    Se borra la fila de "aporte"
                    (la tarjeta original sigue intacta)
```

## La regla que impide mezclar los dos flujos (aplicada en el backend, no solo en el frontend)

`AporteController.rechazar` verifica el `tipo_aporte` **antes** de borrar nada:

```js
async rechazar(req, res) {
  // ...busca el aporte por id...
  if (aporte.tipo_aporte === 'creada') {
    return res.status(403).json({
      error: 'No se puede rechazar un aporte de creación original; use el flujo de revisión individual de la tarjeta (editar/aprobar).',
    });
  }
  const eliminado = await AporteRepository.eliminar(id);
  res.status(200).json({ eliminado });
}
```

Esto significa que aunque el frontend tuviera un error y mostrara el botón "Rechazar" en el
lugar equivocado, la petición al backend fallaría con `403 Forbidden` — la regla de negocio no
depende solo de que la interfaz oculte el botón correctamente.

## Endpoints nuevos/modificados

| Método | Endpoint | Acción | Flujo |
|---|---|---|---|
| GET | `/api/v1/cards/:id` | Ver una tarjeta | Individual |
| PUT | `/api/v1/cards/:id` | Editar/corregir una tarjeta | Individual |
| PATCH | `/api/v1/cards/:id/approve` | Aprobar una tarjeta (`estado` → `revisado_docente`) | Individual |
| DELETE | `/api/v1/contributions/:id` | Rechazar (borrar) un aporte de coautoría/acepción nueva | Coautoría |

## Archivos modificados en esta sesión

| Archivo | Cambio |
|---|---|
| `backend/src/controllers/TarjetaController.js` | Método `aprobar()` nuevo. Sin método `rechazar` (a propósito). |
| `backend/src/controllers/AporteController.js` | Método `rechazar()` nuevo, con el chequeo de `tipo_aporte === 'creada'` → `403`. `@file` agregado. |
| `backend/src/routes/cardRoutes.js` | Se agregaron `GET /:id`, `PUT /:id` y `PATCH /:id/approve`. |
| `backend/src/routes/contributionRoutes.js` | **Archivo nuevo** — `DELETE /:id` → `AporteController.rechazar`. |
| `backend/src/app.js` | Se montó `/api/v1/contributions`; documentación `@file` actualizada con los 4 endpoints nuevos. |

## Pendientes / decisiones que no se tomaron por cuenta propia

- **`estado: 'revisado_docente'`**: es el nombre de estado que ya estaba anotado en el
  comentario pendiente original de `CuraduriaService.js` (HU-004). No hay una lista de valores
  posibles para `tarjeta.estado` definida en el DER (es `varchar(30)` libre), así que se usó
  ese valor por continuidad — el equipo puede confirmarlo o cambiarlo.
- **"Aprobar" un aporte de coautoría/acepción nueva no tiene endpoint propio**: como `aporte`
  no tiene columna de estado en el DER, "aceptar" un aporte de coautoría no requiere ninguna
  acción en el backend — simplemente no se rechaza. Si el equipo necesita dejar un rastro
  explícito de "esto fue aprobado" (auditoría), haría falta agregar una columna nueva a
  `aporte`, lo cual no se hizo por no estar en el DER oficial.
- **No se agregó ningún request nuevo a `Pruebas postman H.json`** para estos 4 endpoints —
  quedó pendiente de que el equipo confirme si lo quiere ahí.
- **Sin `authMiddleware`**: estos endpoints no verifican que quien llama sea realmente una
  docente — la autenticación sigue aplazada, como el resto del backend.
