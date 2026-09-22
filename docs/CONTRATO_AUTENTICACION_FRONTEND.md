# Contrato de Autenticación (login con Google) — para Frontend

## Fecha
2026-09-19

## Para quién es este documento

Para quien implementa el login en el frontend. Dice exactamente qué debe hacer el front y qué
responde el backend, para que se pueda conectar sin adivinar nada. El detalle interno del backend
(cómo verifica el token, decisiones de diseño) está en `FLUJO_AUTENTICACION.md`.

## Resumen

- **No hay login por email y contraseña.** El login es solo con Google (OAuth).
- El front muestra un botón "Iniciar sesión con Google". Google devuelve un token (`credential`).
- El front manda ese token al backend y recibe a cambio un **JWT propio de la app** (dura 8 h).
- Ese JWT se envía en cada petición y trae el `rol` (`docente` o `estudiante`).
- **El login no crea usuarios.** El correo de Google tiene que existir ya en la tabla `usuario`.

Base de la API en local: `http://localhost:5000/api/v1`

## 1. Configuración necesaria

| Qué | Valor / dónde |
|---|---|
| Client ID de Google | `508368789495-ho3nb17ce63id81rdht97tuqpvouisb0.apps.googleusercontent.com` (es público; guardarlo como `VITE_GOOGLE_CLIENT_ID`) |
| Origen del front | Solo `http://localhost:3000` está autorizado en Google por ahora. Otro puerto o dominio falla. |
| Usuarios de prueba en Google | Mientras la app esté en modo "Testing", solo pueden entrar los correos agregados como *usuarios de prueba* en la consola de Google. Para agregar uno, pedírselo a William. |
| Variable del backend | `GOOGLE_CLIENT_ID` (mismo valor) en el `.env` de la raíz del repo de infraestructura, y el servicio `backend` de su `docker-compose.yml` debe pasarla. |
| Variable del front en Docker | Si el front corre con `docker compose`, agregar `VITE_GOOGLE_CLIENT_ID` al bloque `environment` del servicio `frontend` y al `.env` (ese compose solo pasa las variables `VITE_*` que estén listadas explícitamente). |

Para levantar el backend con la variable nueva (desde el repo de infraestructura):

```
docker compose up -d --build --force-recreate --renew-anon-volumes backend
```

## 2. Endpoint

### `POST /api/v1/auth/google`

Request (JSON):

```json
{ "idToken": "<el credential que entrega Google>" }
```

Respuesta **200**:

```json
{
  "token": "<JWT propio de la app>",
  "usuario": {
    "id_usuario": 7,
    "nombre_completo": "William Serna",
    "email": "wserna@unicauca.edu.co",
    "rol": "docente"
  }
}
```

Errores (siempre con la forma `{ "error": "mensaje" }`):

| Status | `error` | Cuándo | Qué hacer en el front |
|---|---|---|---|
| 400 | `idToken es obligatorio` | No se mandó `idToken` | Error de programación, revisar el body |
| 401 | `Token de Google inválido` | Token falso, vencido o de otra app | Pedir que intente de nuevo |
| 401 | `El email de la cuenta de Google no está verificado` | Cuenta de Google sin correo verificado | Mensaje de error |
| 401 | `Cuenta inactiva` | El usuario existe pero está desactivado | Mensaje de error |
| 403 | `Usuario no registrado en la plataforma` | El correo no existe en `usuario` | Mostrar "tu cuenta no está registrada" |
| 500 | `GOOGLE_CLIENT_ID no está configurado en el entorno` (u otro) | Falta configuración en el servidor | Avisar al backend |

## 3. Qué tiene que hacer el front (paso a paso)

1. Instalar y configurar Google Identity Services (por ejemplo `@react-oauth/google`, o el script
   `https://accounts.google.com/gsi/client`) con el Client ID de arriba.
2. Pantalla de login: **solo el botón de Google**, sin campos de correo ni contraseña. La
   contraseña se escribe únicamente en la ventana de Google; el front y el backend nunca la ven.
3. Cuando Google responda con éxito, tomar el campo `credential` y enviarlo tal cual como
   `idToken` a `POST /api/v1/auth/google`.
4. Según la respuesta:
   - **200:** guardar `token` y `usuario`, y redirigir según `usuario.rol`.
   - **403:** mostrar que la cuenta no está registrada.
   - **401:** mostrar que no se pudo iniciar sesión.
5. En **todas** las peticiones siguientes enviar el header `Authorization: Bearer <token>`.
6. Si cualquier petición responde **401**, el token venció (8 h) o es inválido: borrarlo y volver
   al login.
7. **Cerrar sesión** es solo borrar el token guardado. El backend no tiene endpoint de logout.
8. Ocultar en la interfaz lo que no corresponde al rol (por ejemplo las vistas de docente para un
   estudiante). Igual el backend responde 403 si se intenta, pero no debe depender solo de eso.

Se puede personalizar el aspecto del botón (tema, tamaño, forma, texto) con las opciones de la
librería. **No** conviene reemplazarlo por un botón totalmente propio: algunas opciones de la
librería devuelven un *access token* o un *código* en vez del `credential` (ID token) que este
backend espera.

## 4. Respuestas del backend en rutas protegidas

| Status | `error` | Cuándo |
|---|---|---|
| 401 | `Token de autenticación no proporcionado` | Falta el header `Authorization: Bearer ...` |
| 401 | `Token inválido o expirado` | Token mal formado, alterado o vencido |
| 403 | `No tiene permisos para acceder a este recurso` | Token válido, pero el rol no alcanza (ej. estudiante en ruta de docente) |

El JWT lleva dentro `id_usuario`, `email` y `rol`; se puede leer en el front (es base64, no está
cifrado) pero **no** se debe confiar en él para seguridad, solo para decidir qué mostrar.

## 5. Qué rutas exigen qué

| Nivel | Significa |
|---|---|
| Pública | No requiere token (lectura, modo invitado) |
| Login | Requiere token válido de cualquier rol |
| Docente | Requiere token válido con `rol = docente` |

| Ruta | Nivel |
|---|---|
| `GET /decks`, `GET /decks/:id` | Pública |
| `GET /cards/:id` | Pública |
| `GET /courses`, `GET /courses/:id` | Pública |
| `POST /decks/:id/cards` | Login |
| `DELETE /decks/:id` | Login |
| `POST /cards/check-duplicate` | Login |
| `POST /courses` | Login |
| `DELETE /contributions/:id` | Login |
| `POST /decks` | Docente |
| `PATCH /decks/:id/estado` | Docente |
| `PATCH /decks/:id/default-variant` | Docente |
| `GET /cards/pending`, `GET /cards/approved` | Docente |
| `PUT /cards/:id` | Docente |
| `PUT /cards/:id/context` | Docente |
| `PATCH /cards/:id/approve` | Docente |
| `GET /teacher/analytics/deck/:id` | Docente |

## 6. Cuentas de prueba (base de datos sembrada con `seed.sql`)

| Correo | Rol |
|---|---|
| `wserna@unicauca.edu.co` | docente |
| `ksandoval@unicauca.edu.co` | estudiante |
| `manmeneses@unicauca.edu.co` | estudiante |
| `thaliabernal@unicauca.edu.co` | estudiante |

Además están los usuarios de siempre del seed (`ana.docente@`, `juan.estudiante@`, etc.), pero esos
correos no son cuentas de Google reales, así que solo sirven para probar el backend sin login.

Ojo: `seed.sql` solo corre cuando se **crea** el volumen de Postgres. Si tu base ya existía,
inserta esos usuarios a mano o recrea el volumen (`docker compose down -v` y volver a levantar).

## 7. Ejemplo orientativo (React)

No conozco el código del front; esto es solo para ilustrar el flujo.

```jsx
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <GoogleLogin
    onSuccess={async ({ credential }) => {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credential }),
      });
      const data = await res.json();
      if (res.ok) {
        // guardar data.token y data.usuario; redirigir según data.usuario.rol
      } else {
        // 403: cuenta no registrada; 401: no se pudo iniciar sesión (mostrar data.error)
      }
    }}
    onError={() => { /* el usuario canceló o Google falló */ }}
  />
</GoogleOAuthProvider>
```

## 8. Lo que el backend NO hace (para que no se espere)

- **No crea usuarios** en el login (la creación/registro es otra HU).
- **No tiene logout** ni refresh token: pasadas las 8 h hay que volver a iniciar sesión.
- **No restringe el dominio** del correo (`@unicauca.edu.co`): entra cualquier cuenta de Google
  cuyo correo exista en `usuario`.
- **Login de punta a punta con una cuenta real no está probado todavía**: el backend se probó con
  los casos de error contra el servidor real y la lógica completa con Google simulado. La primera
  prueba real será cuando el botón esté conectado en el front; si algo falla, avisar con el
  mensaje de `error` que devuelve el backend.
