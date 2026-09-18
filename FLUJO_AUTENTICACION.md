# Flujo de Autenticación y Control de Roles (HU-5.4)

## Fecha
2026-09-17

## Alcance

Esta HU cubre **solo** login (autenticación) y autorización por rol. El **registro** de usuarios
(HU-5.1, `POST /api/v1/auth/register`) se implementa en otra rama — este documento no lo cubre,
y el login descrito aquí asume que el usuario ya existe en la tabla `usuario` con un
`password_hash` válido.

No hubo cambios de esquema: `usuario.password_hash` y `usuario.rol` ya existían en el DER
(`init.sql`) desde antes de esta sesión.

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

## Flujo 1 — Login (CA-5.4.1)

```
Cliente envía { email, password }
        │
        ▼
POST /api/v1/auth/login
        │
        ▼
AuthController.login
        │
        ▼
AuthService.login(email, password)
        │
        ├── UsuarioRepository.obtenerPorEmail(email)
        │       │
        │       ├── no existe, o usuario.activo = false  ──► 401 "Credenciales inválidas"
        │       │
        │       └── existe
        │               │
        │               ▼
        │       bcrypt.compare(password, usuario.password_hash)
        │               │
        │               ├── no coincide  ──► 401 "Credenciales inválidas"
        │               │
        │               └── coincide
        │                       │
        │                       ▼
        │               jwt.sign({ id_usuario, email, rol }, JWT_SECRET, { expiresIn: '8h' })
        │                       │
        ▼                       ▼
200 OK  { token, usuario: { id_usuario, nombre_completo, email, rol } }
```

**El mensaje de error es el mismo** ("Credenciales inválidas", 401) tanto si el email no existe
como si la contraseña no coincide — así no se revela cuál de los dos campos fue el incorrecto
(evita que alguien use el endpoint para enumerar emails registrados).

`password_hash` **nunca** viaja en la respuesta; el objeto `usuario` que se retorna se arma a
mano en `AuthService.login` solo con los campos necesarios.

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

## Endpoints nuevos

| Método | Endpoint | CA |
|---|---|---|
| POST | `/api/v1/auth/login` | CA-5.4.1 |

## Archivos nuevos / modificados en esta sesión

| Archivo | Cambio |
|---|---|
| `backend/src/services/AuthService.js` | Implementado (antes stub): `login(email, password)`. |
| `backend/src/middleware/authMiddleware.js` | Implementado (antes stub): `authenticate`, `requireRole(...roles)`, interruptor `DISABLE_AUTH`. |
| `backend/src/controllers/AuthController.js` | **Nuevo**: `login`. |
| `backend/src/routes/authRoutes.js` | **Nuevo**: `POST /login`. |
| `backend/src/repositories/UsuarioRepository.js` | Se agregó `obtenerPorEmail(email)`. |
| `backend/src/app.js` | Se montó `authRoutes` en `/api/v1/auth`; `@file` actualizado. |
| `backend/src/routes/deckRoutes.js`, `cardRoutes.js`, `analyticsRoutes.js`, `courseRoutes.js`, `contributionRoutes.js` | Se agregó `authenticate`/`requireRole('docente')` según la tabla de arriba. |
| `backend/.env.example` | Documentadas `DISABLE_AUTH` y `DISABLE_AUTH_ROL`. |

## Pendientes / decisiones que no se tomaron por cuenta propia

- **CA-5.4.3 (modo Invitado)**: el backlog no define ningún endpoint de "diccionario
  demostrativo". Se interpretó (confirmado con el usuario) dejando las rutas `GET` de
  decks/cards/courses sin `authenticate` — no es un CA formalmente cerrado con un endpoint
  propio, es una interpretación sobre la infraestructura ya existente.
- **`seed.sql` no sirve para probar login todavía**: los usuarios de prueba tienen
  `password_hash = 'hash_temporal'`, que no es un hash bcrypt real. El login fallará contra esos
  datos hasta que se reemplace por un hash bcrypt válido a mano, o hasta que HU-5.1 (registro, en
  otra rama) genere usuarios con hash real.
- **Duración del token (8h)**: no está especificada en ningún CA; se hardcodeó en
  `AuthService.js` en vez de agregar una variable de entorno nueva, para no introducir
  configuración no pedida. El equipo puede ajustarla si lo necesita.
- **`DISABLE_AUTH`**: no corresponde a ningún CA del backlog, es una utilidad de desarrollo. Se
  documenta aquí para que quede claro que es temporal/opcional y no parte de la regla de negocio
  de HU-5.4.
