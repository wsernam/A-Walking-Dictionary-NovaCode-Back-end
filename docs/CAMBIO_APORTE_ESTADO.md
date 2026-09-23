# Cambio: columna `aporte.estado` y ajustes a la PR #5 (coautorías)

**Fecha:** 2026-09-23
**PR:** #5 — *feat(HU-1.3): endpoints de listado/aprobacion de coautorias y enriquecimiento del historial*
**Rama:** `conexión-back-front` → `develop`

## Autoría: quién hizo qué

Para que no haya confusión al revisar esta PR:

| Parte | Autor | Commit |
|---|---|---|
| Funcionalidad original: `GET /aportes/pending`, `PATCH /aportes/:id/approve`, historial de aprobadas enriquecido y el uso de `aporte.estado` en las consultas | **ManuelaE08** (Manuela Erazo) | `b9e0e7c` |
| Resolución del conflicto de merge con `develop` (`app.js`) | wsernam | `dbda870` |
| Correcciones de revisión: autenticación, nombre real del estudiante, documentación restaurada, validación de longitudes | wsernam | `bcc013d` |
| Columna `aporte.estado` en `init.sql` + modelo `Aporte.js` + este documento | wsernam | `a0380d7` |
| Validación: no aprobar una tarjeta con coautorías/acepciones pendientes | wsernam | (ver sección más abajo) |

wsernam **no diseñó** la funcionalidad de aprobación de coautorías ni la regla de negocio detrás de
ella. Solo hizo los cambios mínimos para que la PR se pueda fusionar en `develop` sin romper nada.
Las decisiones de diseño de la sección "Preguntas abiertas" siguen sin tomarse.

## Por qué hacía falta la columna

El código de la PR #5 (`AporteRepository.listarCoautoriasPendientes` y `AporteRepository.aprobar`)
lee y escribe `aporte.estado`, pero esa columna **no existía** en `init.sql` ni en el DER oficial.
Sin ella, en `develop`:

- `GET /api/v1/aportes/pending` → error 500 (`column ap.estado does not exist`).
- `PATCH /api/v1/aportes/:id/approve` → error 500.

## Qué se cambió

**`init.sql`**, tabla `aporte`:

```sql
estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_revision',
```

- Valores que usa el código: `'pendiente_revision'` (al crearse) y `'aprobado'` (al aprobarlo la docente).
- El `DEFAULT` hace que todos los aportes nuevos queden pendientes sin tocar `AporteRepository.crear`
  ni el flujo de duplicados (`DeduplicacionService`).
- Los aportes `tipo_aporte = 'creada'` también quedan en `'pendiente_revision'`. No afecta nada:
  esos se aprueban por la tarjeta (`PATCH /cards/:id/approve`) y los endpoints de `/aportes` los excluyen.

**`backend/src/models/Aporte.js`**: se agregó el campo `estado`, para que aparezca en las respuestas JSON.

### Si ya tienes la base de datos creada

`init.sql` solo se ejecuta la primera vez que se crea el volumen de Postgres. Si tu base ya
existía, bórrala y vuelve a levantarla para que tome la columna nueva (esto **borra los datos**):

```bash
docker compose down -v
docker compose up
```

Si prefieres conservar tus datos, corre esto a mano (los aportes que ya existen quedan en
`'pendiente_revision'`):

```sql
ALTER TABLE aporte
  ADD COLUMN estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_revision';
```

## Otros ajustes de la revisión (commit `bcc013d`)

- **Autenticación:** al montarse `/api/v1/aportes`, todo el CRUD de aportes quedaba expuesto sin
  token (por ejemplo, `DELETE /aportes/:id` borraba cualquier aporte). Ahora todas las rutas
  exigen JWT, y `pending`, `approve`, `PUT` y `DELETE` además exigen el rol `docente`.
- **Nombre del estudiante en el historial de aprobadas:** la PR generaba "Estudiante A/B/C" a
  partir del `inscripcion_id`, así que dos estudiantes distintos podían recibir la misma letra.
  Ahora se usa el `usuario.nombre_completo` real (aporte `creada` → `inscripcion` → `usuario`).
  El campo sigue llamándose `estudiante`.
- **Rendimiento:** el historial hacía 2 consultas por cada tarjeta; ahora son 3 en total.
- **Validación:** `aprobar` revisa los mismos límites de longitud del DER que `crear` (255/150).
- **Documentación:** se restauraron los comentarios JSDoc que la PR había borrado.

## Validación: no se aprueba una tarjeta con coautorías pendientes

**Problema encontrado al probar:** `GET /aportes/pending` solo muestra aportes de tarjetas que
siguen en `pendiente_revision`. Si la docente aprobaba la tarjeta primero, sus coautorías y
acepciones pendientes desaparecían del panel y quedaban sin revisar para siempre.

**Cambio:** `PATCH /api/v1/cards/:id/approve` ahora responde **409** si la tarjeta tiene
coautorías o acepciones nuevas en `pendiente_revision`, e indica cuáles son:

```json
{
  "error": "La tarjeta tiene 1 coautoría(s)/acepción(es) pendiente(s) de revisión; apruébalas o recházalas antes de aprobar la tarjeta.",
  "aportes_pendientes": [11]
}
```

La docente primero aprueba cada una (`PATCH /aportes/:id/approve`) o la rechaza
(`DELETE /contributions/:id`), y después aprueba la tarjeta. Archivos: `CuraduriaService.aprobarTarjeta`,
`AporteRepository.listarIdsPendientesPorTarjeta` y `TarjetaController.aprobar` (agrega `aportes_pendientes` a la respuesta).

**Para frontend:** el panel de curaduría debería mostrar ese mensaje cuando llegue el 409, o
llevar a la docente a la pestaña de Coautoría.

## Preguntas abiertas para el equipo

Esta columna es un **supuesto pendiente de validar**. Ninguna HU ni CA del backlog pide que la
docente apruebe coautorías: HU-1.3 solo cubre detectarlas al registrar la palabra. Falta decidir:

1. **Nombre del estado aprobado:** la PR usa `'aprobado'`, pero en `tarjeta` el equivalente es
   `'revisado_docente'`. ¿Se unifica?
2. **Acepción nueva:** al aprobarla, ¿se modifica la tarjeta o solo el aporte? Hoy solo cambia el aporte.
3. **Correcciones de la docente** al aprobar: ¿se aplican al aporte, a la tarjeta o a ambos? Hoy solo al aporte.

Si el equipo decide otra cosa, este cambio se ajusta o se revierte.

## Para coordinar con frontend

Como las rutas de `/api/v1/aportes` ahora exigen JWT, el cliente tiene que enviar el header
`Authorization: Bearer <token>` en `GET /aportes/pending` y `PATCH /aportes/:id/approve`.

## Estado de pruebas

Probado el 2026-09-23 contra la base real (Docker, después de `docker compose down -v`):

- `GET /aportes/pending` → 200; `PATCH /aportes/:id/approve` → 200 (con correcciones), 403
  (aporte `creada`), 404, 400 (id inválido o ejemplo de más de 150 caracteres).
- `GET /cards/approved` → nombres reales de los estudiantes, con `registro` y `variante_regional`.
- Aprobar una tarjeta con coautoría pendiente → 409; después de aprobar o rechazar la coautoría → 200.
- Con la autenticación activada: sin token 401, estudiante en pending/approve 403, docente 200.
