# HE-02 — Propuesta de corrección al DER

**Autor:** William Serna · **Rama:** `feature/Sprint_2_HU_002` · **Fecha:** 2026-09-07
**Épica:** HE-02 — Supervisión y Curaduría Pedagógica Docente (HU-2.1, HU-2.2, HU-2.3)

Para poder cerrar **todos** los criterios de aceptación de HE-02, el DER necesita 3 cambios.
Están implementados en el backend y en `migrations/002_he02_correcciones_der.sql`, pero **no se
tocó `init.sql`** (que refleja el DER oficial) hasta que el equipo los apruebe.

---

## 1. `tarjeta.motivo_rechazo` — columna nueva

**Por qué:** CA-2.1.3 — *"cuando la docente selecciona Rechazar e **ingresa una observación**,
la tarjeta cambia a estado 'rechazada'"*. Hoy no hay dónde guardar esa observación.

**Cambio DBML:**
```diff
 Table tarjeta {
   id_tarjeta      serial       [pk]
   mazo_id         int          [not null, ref: > mazo.id_mazo]
   palabra         varchar(150) [not null]
   traduccion      varchar(255) [not null]
   definicion      text         [not null]
   ejemplo         varchar(150)
   estado          varchar(30)  [not null]
   fecha_creacion  timestamp    [not null, default: `now()`]
   fecha_revision  timestamp
+  motivo_rechazo  text         [note: 'Observación de la docente al rechazar (CA-2.1.3). NULL si no fue rechazada.']
 }
```

## 2. `etiqueta_contexto` — índice único `(tarjeta_id, tipo)`

**Por qué:** CA-2.2.1 y CA-2.2.2 — una tarjeta tiene **una** etiqueta de registro y **una** de
variante dialectal. El índice único permite reasignar sin duplicar (UPSERT) y que la propagación
de la variante del mazo (CA-2.2.2) no cree filas repetidas.

**Cambio DBML:**
```diff
 Table etiqueta_contexto {
   id_etiqueta      serial      [pk]
   tarjeta_id       int         [not null, ref: > tarjeta.id_tarjeta]
   tipo             varchar(40) [not null]
   valor            varchar(150)[not null]
   fecha_asignacion timestamp   [not null, default: `now()`]
+
+  indexes {
+    (tarjeta_id, tipo) [unique, name: 'uq_etiqueta_contexto_tarjeta_tipo']
+  }
 }
```
> Valores acordados para `tipo` en HE-02: `'registro'` y `'variante_dialectal'`.
> **Ojo:** si ya hay filas duplicadas `(tarjeta_id, tipo)` hay que limpiarlas antes de crear el índice.

## 3. `notificacion` — tabla nueva

**Por qué:** CA-2.1.3 — *"...y **se le notifica al estudiante aportante** para su corrección"*.
No existe ninguna entidad de notificaciones en el DER.

**Cambio DBML:**
```dbml
Table notificacion {
  id_notificacion serial      [pk]
  usuario_id      int         [not null, ref: > usuario.id_usuario, note: 'estudiante que recibe el aviso']
  tarjeta_id      int         [ref: > tarjeta.id_tarjeta, note: 'tarjeta relacionada; nullable para futuros tipos de aviso']
  tipo            varchar(40) [not null, note: "p.ej. 'tarjeta_rechazada'"]
  mensaje         text        [not null]
  leida           boolean     [not null, default: false]
  fecha_creacion  timestamp   [not null, default: `now()`]

  indexes {
    (usuario_id) [name: 'ix_notificacion_usuario']
  }
}
```

---

## Cómo se aplica

```bash
# BD ya levantada (Docker):
docker exec -i <contenedor_pg> psql -U <user> -d <db> < migrations/002_he02_correcciones_der.sql
```
El script es idempotente (`IF NOT EXISTS` / `IF EXISTS`).

Si se aprueba, hay que **fusionar estos 3 cambios en `init.sql`** para que las BD nuevas los
tengan desde el arranque, y borrar la migración 002.

## Impacto si NO se aplica

El backend de HE-02 ya está escrito asumiendo estos cambios. Sin la migración:
- `PATCH /api/v1/cards/:id/approve` con `accion:"aprobar"` o `"rechazar"` → error 500 (`column "motivo_rechazo" does not exist`).
- `PUT /api/v1/cards/:id/context` y `PATCH /api/v1/decks/:id/context` → error 500 (falta el índice para el `ON CONFLICT`).
- `GET/PATCH /api/v1/notifications` → error 500 (no existe la tabla).

## Alternativas consideradas (descartadas)

- **CA-2.1.3 sin persistir la observación** (solo cambiar estado): incumple el CA — no queda
  registro de por qué se rechazó ni el estudiante se entera.
- **Etiquetas sin índice único** (borrar + insertar en cada reasignación): funciona pero deja la
  puerta abierta a duplicados por condiciones de carrera y complica CA-2.2.2.
- **Notificación por email en vez de tabla**: fuera de alcance (no hay servicio de correo) y no
  deja historial consultable para el estudiante.
