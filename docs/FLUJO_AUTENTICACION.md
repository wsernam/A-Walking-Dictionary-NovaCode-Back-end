# Flujo de Autenticación y Control de Roles (HU-5.4)

## Fecha
2026-09-17 (login email/password con bcrypt) — actualizado 2026-09-18 (reemplazado por login
con Google/OAuth, a pedido del profesor después de la primera entrega)

## Cambio de enfoque: de login propio a Google/OAuth

La primera versión de esta HU implementaba login con email + contraseña (bcrypt) — ver historial
de git si hace falta ese flujo. El profesor pidió reemplazarlo por **OAuth usando Google como
proveedor de identidad**. Este documento describe la versión actual (Google); el login por
contraseña **ya no existe** en el código (`POST /api/v1/auth/login` fue eliminado).

## Alcance

Esta HU cubre **solo** autenticación (login vía Google/OAuth) y autorización por rol. **No crea
usuarios**: el registro/creación de usuarios (HU-5.1) le corresponde a otra HU. Si el correo de
Google no existe en la tabla `usuario`, el login se rechaza con 403; la cuenta (con su rol) tiene
que haberse creado antes.

No hubo cambios de esquema: `usuario.rol` ya existía en el DER (`init.sql`). `password_hash` ya
no interviene en el login.

## Por qué el DER ya soportaba esto sin cambios de esquema

```sql
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL,
    ...
);
```

`email` ya es `UNIQUE` y `rol` es un `varchar` libre (sin lista fija de valores en el DER); en la
práctica el resto del código ya usaba `'docente'` y `'estudiante'` en minúscula (ver `seed.sql`),
así que el login y el middleware de roles respetan esos mismos valores tal cual están guardados.

## Flujo 1 — Login con Google (CA-5.4.1)

El frontend usa Google Identity Services (fuera de este repo) para conseguir un `idToken` firmado
por Google — este backend nunca ve la contraseña de Google del usuario, solo recibe ese token ya
emitido.

```
Frontend obtiene un idToken de Google (Google Identity Services, fuera de este repo)
        │
        ▼
Cliente envía { idToken }
        │
        ▼
POST /api/v1/auth/google
        │
        ▼
AuthController.loginGoogle
        │
        ▼
AuthService.loginConGoogle(idToken)
        │
        ├── falta idToken  ──► 400 "idToken es obligatorio"
        │
        ├── GOOGLE_CLIENT_ID no configurado en el servidor  ──► 500 (error de configuración,
        │       no confundir con un token inválido del cliente)
        │
        ├── OAuth2Client.verifyIdToken(idToken, audience: GOOGLE_CLIENT_ID)
        │       │
        │       ├── firma inválida / no es de Google / audience no coincide  ──► 401 "Token de Google inválido"
        │       │
        │       └── válido → payload = { email, email_verified, name, ... }
        │               │
        │               ├── email_verified = false  ──► 401 "El email de la cuenta de Google no está verificado"
        │               │
        │               └── email_verified = true
        │                       │
        │                       ▼
        │               UsuarioRepository.obtenerPorEmail(payload.email)
        │                       │
        │                       ├── no existe  ──► 403 "Usuario no registrado en la plataforma"
        │                       │                  (este servicio NO crea usuarios)
        │                       │
        │                       └── existe → se usa tal cual (con el rol que ya tenga guardado,
        │                                    por ejemplo "docente")
        │                               │
        │                               ├── usuario.activo = false  ──► 401 "Cuenta inactiva"
        │                               │
        │                               └── activo
        │                                       │
        │                                       ▼
        │                               jwt.sign({ id_usuario, email, rol }, JWT_SECRET, { expiresIn: '8h' })
        │                                       │
        ▼                                       ▼
200 OK  { token, usuario: { id_usuario, nombre_completo, email, rol } }
```

`password_hash` **nunca** viaja en la respuesta; el objeto `usuario` que se retorna se arma a
mano en `AuthService.loginConGoogle` solo con los campos necesarios. El `token` que devuelve este
endpoint es el **mismo tipo de JWT propio** que ya emitía el login anterior — el resto del
sistema (`authenticate`, `requireRole`, el frontend) no necesita saber que el login ahora pasa
por Google.

## Flujo 2 — Petición a una ruta protegida (CA-5.4.1 / CA-5.4.2)

```
Cliente envía la petición con header
Authorization: Bearer <token>
        │
        ▼
Middleware authenticate
        │
        ├── sin header / no empieza con "Bearer "  ──► 401 "Token de autenticación no proporcionado"
        │
        └── jwt.verify(token, JWT_SECRET)
                │
                ├── inválido o expirado  ──► 401 "Token inválido o expirado"
                │
                └── válido
                        │
                        ▼
                req.usuario = { id_usuario, email, rol }   (siguiente middleware/controlador ya lo puede leer)
                        │
                        ▼
        (si la ruta lo exige) Middleware requireRole('docente')
                        │
                        ├── req.usuario.rol no está en la lista permitida  ──► 403 "No tiene permisos para acceder a este recurso"
                        │
                        └── sí está permitido  ──► continúa al controlador
```

`authenticate` y `requireRole` viven en `backend/src/middleware/authMiddleware.js` y se aplican
**por ruta**, directamente en cada archivo de `routes/` (no hay un middleware global en `app.js`)
— así cada ruta declara explícitamente su nivel de protección justo donde ya se documenta su CA.

```js
// Ejemplo real, backend/src/routes/deckRoutes.js
router.post('/', authenticate, requireRole('docente'), MazoController.crear);
router.get('/', MazoController.listar); // sin middleware = pública
```

## Qué rutas quedan protegidas y con qué nivel

| Nivel | Significado |
|---|---|
| **Pública** | Nadie necesita loguearse. Cubre el acceso de solo lectura de Invitado (CA-5.4.3). |
| **`authenticate`** | Requiere un JWT válido de cualquier rol. |
| **`authenticate` + `requireRole('docente')`** | Requiere JWT válido **y** que `rol === 'docente'`. |

| Ruta | Nivel | Motivo |
|---|---|---|
| `GET /api/v1/decks`, `GET /api/v1/decks/:id` | Pública | Lectura de mazos (CA-5.4.3) |
| `POST /api/v1/decks` | `requireRole('docente')` | HU-1.1: "Como docente... quiero crear mazos" |
| `PATCH /api/v1/decks/:id/estado` | `requireRole('docente')` | CA-1.1.3, acción docente |
| `PATCH /api/v1/decks/:id/default-variant` | `requireRole('docente')` | CA-2.2.2, acción docente |
| `POST /api/v1/decks/:id/cards` | `authenticate` | HU-1.2, sin rol específico exigido por el CA |
| `DELETE /api/v1/decks/:id` | `authenticate` | Utilidad, sin CA que fije un rol |
| `POST /api/v1/cards/check-duplicate` | `authenticate` | HU-1.3, sin rol específico |
| `GET /api/v1/cards/pending`, `GET /api/v1/cards/approved` | `requireRole('docente')` | Panel de curaduría (HU-2.1), no es la vista de "diccionario" |
| `GET /api/v1/cards/:id` | Pública | CA-2.2.3: vista de estudiante sobre tarjeta aprobada |
| `PUT /api/v1/cards/:id` | `requireRole('docente')` | CA-2.1.2, edición docente |
| `PUT /api/v1/cards/:id/context` | `requireRole('docente')` | CA-2.2.1, acción docente |
| `PATCH /api/v1/cards/:id/approve` | `requireRole('docente')` | CA-2.1.2/2.1.3, acción docente |
| `GET /api/v1/teacher/analytics/deck/:id` | `requireRole('docente')` | HU-2.3, panel exclusivo docente |
| `GET /api/v1/courses`, `GET /api/v1/courses/:id` | Pública | Lectura (CA-5.4.3) |
| `POST /api/v1/courses` | `authenticate` | Sin CA que fije un rol exclusivo |
| `DELETE /api/v1/contributions/:id` | `authenticate` | Sin CA que fije un rol exclusivo |

## Interruptor para pruebas locales: `DISABLE_AUTH`

Para poder probar otros endpoints sin tener que loguearte primero, `authenticate`/`requireRole`
leen dos variables de entorno (`backend/.env`, nunca commiteado):

```
DISABLE_AUTH=true          # desactiva por completo la verificación de token y de rol
DISABLE_AUTH_ROL=docente   # rol simulado que se le asigna a req.usuario (default: docente)
```

Con `DISABLE_AUTH=true`, cualquier petición pasa como si viniera de
`{ id_usuario: 0, email: 'dev@local', rol: DISABLE_AUTH_ROL }`, sin pedir header
`Authorization` en absoluto. Con `DISABLE_AUTH=false` (o la variable ausente, que es el valor por
defecto de `.env.example`), el comportamiento es el normal descrito arriba — nada cambia.

**Nunca debe quedar en `true` en un entorno que no sea tu máquina local.** No es parte de ningún
CA del backlog, es solo una salida de escape de conveniencia para desarrollo.

## Endpoints

| Método | Endpoint | CA | Estado |
|---|---|---|---|
| ~~POST~~ | ~~`/api/v1/auth/login`~~ | CA-5.4.1 | **Eliminado** — era el login por email/password |
| POST | `/api/v1/auth/google` | CA-5.4.1 | Actual — recibe el `idToken` de Google |

## Configuración necesaria (variables de entorno)

| Variable | Para qué | Dónde se consigue |
|---|---|---|
| `JWT_SECRET` | Firmar el JWT propio de la app (sin cambios respecto a la versión anterior) | La inventa el equipo, cualquier string largo |
| `GOOGLE_CLIENT_ID` | Verificar que el `idToken` fue emitido por Google para esta app | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (tipo "Web application"). Es un dato público, pero hay que crearlo desde una cuenta de Google real — no se puede inventar. |

## Archivos nuevos / modificados

| Archivo | Cambio |
|---|---|
| `backend/src/services/AuthService.js` | Reescrito: `login(email, password)` → `loginConGoogle(idToken)`, usando `google-auth-library`. |
| `backend/src/controllers/AuthController.js` | Reescrito: `login` → `loginGoogle`. |
| `backend/src/routes/authRoutes.js` | Reescrito: `POST /login` → `POST /google`. |
| `backend/src/middleware/authMiddleware.js` | Sin cambios en esta actualización — `authenticate`/`requireRole`/`DISABLE_AUTH` siguen igual, porque solo dependen del JWT propio, no de cómo se emitió. |
| `backend/src/repositories/UsuarioRepository.js` | Sin cambios nuevos (ya tenía `obtenerPorEmail` y `crear` de la versión anterior; ambos se reutilizan). |
| `backend/package.json` | Se agregó `google-auth-library`; se puede quitar `bcrypt` si ya no se usa en ningún otro lado del proyecto (no se quitó automáticamente por si otro módulo lo necesita). |
| `backend/.env.example` | Se agregó `GOOGLE_CLIENT_ID`. `JWT_SECRET` sigue igual. |
| `seed_auth_test.sql` | **Eliminado** — creaba usuarios con hash bcrypt real para probar el login por contraseña; ya no aplica. |
| `HU-5.4 - Autenticacion y Roles.postman_collection.json` | Reescrito: ya no prueba login de punta a punta (Postman no puede automatizar la pantalla de consentimiento de Google), solo los errores de `/auth/google` que no requieren credenciales reales, más los checks de rol (que ahora requieren pegar un token real obtenido a mano). |

## Pendientes / decisiones que no se tomaron por cuenta propia

- **Creación de usuarios (y su rol) fuera de esta HU**: el login no crea cuentas. Un correo de
  Google sin fila en `usuario` recibe 403. Cómo se crean los usuarios (estudiantes y docentes) lo
  define la HU de registro; mientras tanto, las cuentas de prueba se insertan por SQL. El
  frontend debe mostrar un mensaje claro ante ese 403 ("tu cuenta no está registrada").
- **CA-5.4.3 (modo Invitado)**: sigue igual que antes — el backlog no define ningún endpoint de
  "diccionario demostrativo", se interpretó dejando las rutas `GET` de decks/cards/courses sin
  `authenticate`.
- **Duración del token (8h)**: sigue hardcodeada en `AuthService.js`, sin variable de entorno
  nueva, igual que en la versión anterior.
- **`DISABLE_AUTH`**: sigue existiendo, sin cambios — es independiente de cómo se emite el JWT.
- **`bcrypt` sigue en `package.json`** aunque el login ya no lo use: la HU de registro de
  usuarios (otra rama) probablemente lo necesite para `password_hash`, así que no se quitó.
  Además `password_hash` sigue siendo `NOT NULL` en el DER; cómo se llena para usuarios que
  entran solo con Google lo debe decidir quien implemente la creación de usuarios.
