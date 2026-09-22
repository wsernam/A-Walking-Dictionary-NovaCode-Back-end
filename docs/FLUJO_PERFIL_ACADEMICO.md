# Flujo de Perfil Académico (HU-5.2)

## Fecha
2026-09-18

## Contexto

El frontend (rama `feature/HU-013-configuracion-perfil`, repo de frontend) ya tenía el perfil
académico funcionando contra un mock. La compañera de frontend dejó un contrato exacto para que
el backend real coincidiera sin que ella tuviera que tocar nombres de campos — ese contrato es la
fuente de este documento, junto con el backlog oficial (HE-05 / HU-5.2, CA-5.2.1 y CA-5.2.2).

## Alcance de esta sesión

Se implementó **CA-5.2.1** (nivel MCER, código estudiantil, avatar) y **CA-5.2.2** (preferencias
de aprendizaje / áreas a reforzar, implementado como el campo `intereses`, arreglo de strings; la lista de opciones la define el front).

No hay autenticación real en esta rama (es anterior a HU-5.4), así que `estudiante_id` viaja en
el body del `PATCH`, no en la URL ni en un token — mismo patrón que ya usan mazos/tarjetas/
inscripción en el resto del proyecto.

## Cambio de esquema (autorizado explícitamente por el usuario, aplicado directo a `init.sql`)

```sql
-- usuario, columnas agregadas:
codigo_estudiantil VARCHAR(20),  -- nullable, no aplica a docentes
avatar VARCHAR(500),             -- nullable; guarda una URL, NO el archivo (ver más abajo)
intereses TEXT[],                -- nullable; CA-5.2.2, selección de la lista fija del front
```

A diferencia de HE-02 (donde los cambios de esquema quedaron en una migración aparte pendiente de
aprobación), aquí el usuario pidió explícitamente agregarlas directo a `init.sql`, así que no hay
archivo de migración separado.

**Importante para quien ya tenga una base de datos corriendo**: `init.sql` solo se ejecuta la
primera vez que se crea el volumen de Postgres. Si tu base ya existía antes de este cambio, corre
a mano:
```sql
ALTER TABLE usuario
  ADD COLUMN codigo_estudiantil VARCHAR(20),
  ADD COLUMN avatar VARCHAR(500),
  ADD COLUMN intereses TEXT[];
```

## Decisión: avatar como URL (string), no como archivo

Decisión tomada con el usuario en una conversación previa: la columna `avatar` guarda una **URL**
de una imagen ya alojada en otro lado (ej. el estudiante pega un link), no el archivo en sí. No
se construyó ningún endpoint de subida de archivos — eso implicaría guardar el archivo en disco
del contenedor backend (sin volumen persistente configurado para eso en `docker-compose.yml`,
se perdería en cada rebuild) o integrar un servicio externo (S3, Cloudinary, etc.), ninguno de los
dos pedido explícitamente. El mock del frontend usaba base64 directo "solo para no bloquearse" —
eso no se replica en el backend real.

## Flujo — Actualizar perfil (CA-5.2.1 + CA-5.2.2)

```
Frontend envía { estudiante_id, nivel_ingles, codigo_estudiantil, avatar, intereses }
        │
        ▼
PATCH /api/v1/users/profile
        │
        ▼
UsuarioController.actualizarPerfil
        │
        ├── estudiante_id falta o no es numérico  ──► 400
        │
        ▼
PerfilService.actualizarPerfil(estudiante_id, {...})
        │
        ├── UsuarioRepository.obtenerPorId(estudiante_id)
        │       │
        │       └── no existe  ──► 404 "Usuario no encontrado"
        │
        ├── valida nivel_ingles contra A1/A2/B1/B2/C1/C2 (CA-5.2.1: "selecciona su nivel MCER")
        │       │
        │       └── inválido  ──► 400
        │
        ├── intereses: se valida que sea arreglo de strings (las opciones las define el front)
        │
        ├── UsuarioRepository.actualizarPerfil(id, {...})  -- UPDATE parcial, solo estas 4 columnas
        │       (los campos no enviados en el body conservan su valor anterior, no se pisan a NULL)
        │
        ▼
200 OK { estudiante_id, nombre_completo, correo, rol, nivel_ingles, codigo_estudiantil, avatar, intereses }
```

**El shape de la respuesta es el que pidió el frontend explícitamente**, no el shape crudo del
modelo `Usuario`: `estudiante_id` (no `id_usuario`), `correo` (no `email`), sin `password_hash`,
`activo` ni `fecha_registro`. Ese mapeo vive en `PerfilService.mapearPerfil()`.

## Flujo — Consultar perfil

`GET /api/v1/users/:id` devuelve el mismo shape de arriba (`PerfilService.obtenerPerfil`). Esta
ruta ya existía en el código (`usuarioRoutes.js`) pero no estaba montada en `app.js` — se montó
en esta sesión. El método del controlador se llama `obtenerPerfil` (nuevo), no `obtenerPorId`
(que sigue existiendo con el shape crudo del modelo, sin usarse en ninguna ruta activa todavía).

## Endpoints

| Método | Endpoint | CA |
|---|---|---|
| PATCH | `/api/v1/users/profile` | CA-5.2.1 + CA-5.2.2 |
| GET | `/api/v1/users/:id` | Apoya CA-5.2.1/CA-5.2.2 (consulta el perfil ya guardado) |

## Archivos nuevos / modificados

| Archivo | Cambio |
|---|---|
| `init.sql` | Se agregaron `usuario.codigo_estudiantil`, `usuario.avatar` y `usuario.intereses`. |
| `backend/src/models/Usuario.js` | Se agregaron los tres campos nuevos. |
| `backend/src/repositories/UsuarioRepository.js` | `crear`/`actualizar` incluyen las columnas nuevas; se agregó `actualizarPerfil` (update parcial, solo perfil). |
| `backend/src/services/PerfilService.js` | **Nuevo**: `obtenerPerfil`, `actualizarPerfil`, validación de nivel MCER, mapeo al shape acordado con frontend. |
| `backend/src/controllers/UsuarioController.js` | Se agregaron `obtenerPerfil` y `actualizarPerfil`. |
| `backend/src/routes/usuarioRoutes.js` | `GET /:id` ahora usa `obtenerPerfil` (antes `obtenerPorId`, sin usar en ninguna ruta activa); se agregó `PATCH /profile`. |
| `backend/src/app.js` | Se montó `usuarioRoutes` en `/api/v1/users`. |
| `backend/.dockerignore` | **Nuevo** en esta rama (ya existía en `feature/Sprint_2_HU_005`) — excluye `node_modules/` del build de Docker. |

## Pendientes / decisiones que no se tomaron por cuenta propia

- **Nombre/tipo del campo `intereses` (CA-5.2.2)**: no venía en el contrato original de la
  compañera de frontend. Se confirmó con el usuario en el chat: nombre `intereses` (coincide con
  el texto de la propia HU-5.2), texto libre (no lista de opciones fijas). Si el mock de frontend
  usa otro nombre para este campo, avisar para renombrarlo.
- **"Contexto Académico"** (`curso_asignado`, `semestre_activo`, `departamento_universidad`): la
  compañera de frontend lo dejó explícitamente como pendiente de repensar antes de construirlo
  (ella misma lo marcó como invención suya para el mock, no viene de ningún CA del backlog). No
  se implementó ningún endpoint para esto. Su propia sugerencia — que `curso_asignado` y
  `semestre_activo` podrían salir de la tabla `inscripcion` sin columnas nuevas en `usuario` — es
  razonable y evitaría inventar campos nuevos, pero `departamento_universidad` sigue sin tener
  ninguna fuente de datos clara. Se le devuelve la pregunta al equipo de frontend antes de
  construir nada de este punto.
- **Sin auth real**: `estudiante_id` en el body es spoofable (cualquiera puede mandar cualquier
  id). Cuando esta rama se integre con HU-5.4 (login/roles, ya implementado en otra rama), habría
  que migrar esto a tomar el id del JWT (`req.usuario.id_usuario`) en vez del body — no se hizo
  aquí para no adelantarse a un merge que todavía no pasó.
