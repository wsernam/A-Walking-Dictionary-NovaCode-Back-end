# Auditoría de seguridad — OWASP Top 10:2025
**Proyecto:** A Walking Dictionary (Grupo 1, Proyecto II)
**Fecha:** 2026-10-06
**Alcance:** backend (`wsernam/A-Walking-Dictionary-NovaCode-Back-end`, rama `develop`, commit `0e07713`) y frontend (`knnsand/A-Walking-Dictionary-NovaCode-Front-end`, rama `develop`, commit `af5f244`).
**Método:** revisión estática del código, mapa completo de rutas y `npm audit` sobre los `package-lock.json`. No se ejecutó la aplicación ni se hicieron pruebas contra Render/Supabase/Vercel, y no se modificó ningún archivo de los repositorios.

---

## 1. Resumen ejecutivo

El código **no tiene inyección SQL** (todas las consultas están parametrizadas) y el login con Google valida bien el token. El problema grave está en el **control de acceso**: varias rutas montadas en `app.js` no exigen sesión y confían en IDs que llegan en el body. La combinación de H-01 y H-02 permite **tomar el rol de docente sin ser docente**.

| Categoría OWASP 2025 | Estado | Hallazgos |
|---|---|---|
| A01 Broken Access Control | 🔴 Crítico | H-01, H-02, H-03, H-13 |
| A02 Security Misconfiguration | 🔴 Alto | H-04, H-05, H-06, H-07 |
| A03 Software Supply Chain Failures | 🟠 Alto | H-10 |
| A04 Cryptographic Failures | 🟡 Medio | H-06, H-11 |
| A05 Injection | 🟢 Sin hallazgos | — |
| A06 Insecure Design | 🟠 Alto | H-13 |
| A07 Authentication Failures | 🟡 Medio | H-01, H-12 |
| A08 Software or Data Integrity Failures | 🟢 Sin hallazgos en código | verificar protección de ramas |
| A09 Security Logging and Alerting Failures | 🟡 Medio | H-09 |
| A10 Mishandling of Exceptional Conditions | 🟠 Alto | H-08 |

**Orden de trabajo sugerido (lo estrictamente necesario primero):** H-01 → H-02/H-03 → H-04 → H-05 (verificar) → H-07 → H-08 → H-10. El resto puede esperar.

---

## 2. Qué NO se pudo verificar (hazlo tú)

- **RLS de Supabase (H-05):** los scripts SQL del repo no activan Row Level Security. El estado real está en tu proyecto de Supabase.
- **Variables de entorno de Render (H-04):** si `DISABLE_AUTH` está en `true`, o si `JWT_SECRET` sigue siendo `change-me`.
- **Cabeceras reales de Vercel/Render, protección de ramas en GitHub, workflows de CI:** no están en el código revisado.

---

## 3. Hallazgos

### 🔴 H-01 — CRUD de usuarios completamente público → toma del rol docente
**OWASP:** A01, A07 · **Severidad:** Crítica

**Evidencia** (`backend/src/routes/usuarioRoutes.js`):
```
14: router.post('/', UsuarioController.crear);        // sin authenticate
16: router.get('/', UsuarioController.listar);         // sin authenticate
22: router.get('/:id', UsuarioController.obtenerPerfil);
25: router.put('/:id', UsuarioController.actualizar);  // sin authenticate
27: router.delete('/:id', UsuarioController.eliminar); // sin authenticate
```
`app.js` monta este router en `/api/v1/users`. `UsuarioController.crear` acepta `rol` libre del body (línea 14) y `AutenticacionService.loginConGoogle` (líneas 120-141) entrega un JWT con el rol que tenga la fila, sin restringir dominio.

**Ataque, sin necesidad de ninguna cuenta del sistema:**
1. `POST /api/v1/users` con `{"nombre_completo":"x","email":"atacante@gmail.com","rol":"docente"}`.
2. Iniciar sesión con Google usando ese correo → JWT con `rol: docente`.
3. Acceso a aprobación de tarjetas, analítica, borrado de mazos, etc.

Además, `GET /users` devuelve **todos los usuarios** (el modelo incluye `password_hash`), y `PUT`/`DELETE` permiten cambiar el rol o borrar a cualquiera.

**Impacto en el frontend:** ninguno. El frontend solo usa `GET /users/:id` y `PATCH /users/profile` (`perfilApi.js`); nunca llama a crear/listar/actualizar/eliminar usuarios.

**Corrección mínima** (`usuarioRoutes.js`):
```js
router.post('/',    authenticate, requireRole('docente'), UsuarioController.crear);
router.get('/',     authenticate, requireRole('docente'), UsuarioController.listar);
router.get('/:id',  authenticate, UsuarioController.obtenerPerfil);
router.put('/:id',  authenticate, requireRole('docente'), UsuarioController.actualizar);
router.delete('/:id', authenticate, requireRole('docente'), UsuarioController.eliminar);
```
Y en `UsuarioController.obtenerPerfil`, antes de consultar, que un estudiante solo vea su propio perfil:
```js
if (req.usuario.rol !== 'docente' && req.usuario.id_usuario !== id) {
  return res.status(403).json({ error: 'No tiene permisos para ver este perfil' });
}
```
> Nota: `PUT /users/:id` toma `rol` y `activo` del body. Aunque quede solo para docente, sigue permitiendo escalar roles; si no lo usa nadie, lo más seguro es **no exponerlo**.

---

### 🔴 H-02 — Cursos: códigos de acceso expuestos y acciones sin sesión
**OWASP:** A01 · **Severidad:** Crítica

**Evidencia** (`backend/src/routes/cursoRoutes.js`):
```
25: router.get('/', CursoController.listar);                       // público, devuelve codigo_acceso
28: router.post('/enroll', InscripcionController.inscribirsePorCodigo);   // sin authenticate
31: router.post('/:id/access-code', InscripcionController.generarCodigoAcceso); // sin authenticate
34: router.post('/:id/assign', InscripcionController.asignarPorCorreo);   // sin authenticate
45: router.get('/:id', CursoController.obtenerPorId);              // público, devuelve codigo_acceso
```
- `CursoRepository.listar()` hace `SELECT * FROM curso` y el modelo `Curso` incluye `codigo_acceso` → **cualquiera puede leer los códigos de todos los cursos**.
- Cualquiera puede **generar o reemplazar** el código de un curso (`/access-code`) y **inscribir a cualquier correo** en cualquier curso (`/assign`).
- `POST /enroll` toma `estudiante_id` del body (`InscripcionController.js`, líneas 163-166): se puede inscribir a **otro** estudiante o suplantarlo.

**Impacto en el frontend:** el docente lee `curso.codigo_acceso` desde la lista de cursos (`CursosEstudiantes.jsx:31`), así que ese campo debe seguir llegando, pero solo al docente.

**Corrección mínima:**

`cursoRoutes.js`:
```js
import { authenticate, requireRole, autenticacionOpcional } from '../middleware/autenticacionMiddleware.js';

router.get('/', autenticacionOpcional, CursoController.listar);
router.post('/enroll', authenticate, requireRole('estudiante'), InscripcionController.inscribirsePorCodigo);
router.post('/:id/access-code', authenticate, requireRole('docente'), InscripcionController.generarCodigoAcceso);
router.post('/:id/assign', authenticate, requireRole('docente'), InscripcionController.asignarPorCorreo);
router.get('/:id', autenticacionOpcional, CursoController.obtenerPorId);
```

`CursoController.listar` y `obtenerPorId`: ocultar el código a quien no sea docente.
```js
const ocultarCodigo = (curso, req) => {
  if (req.usuario?.rol === 'docente') return curso;
  const { codigo_acceso, ...publico } = curso;
  return publico;
};
// listar:        res.status(200).json(cursos.map((c) => ocultarCodigo(c, req)));
// obtenerPorId:  res.status(200).json(ocultarCodigo(curso, req));
```

`InscripcionController.inscribirsePorCodigo`: el estudiante sale del token, no del body.
```js
const estudiante_id = req.usuario.id_usuario;   // en lugar de leerlo del body
const { codigo_acceso } = req.body;
```
(Con `DISABLE_AUTH=true` en local, `id_usuario` vale 0; ahí seguiría fallando con "Estudiante no encontrado", que es aceptable para pruebas.)

---

### 🟠 H-03 — Estudio y perfil: IDs en el body/URL sin sesión (IDOR)
**OWASP:** A01 · **Severidad:** Alta

**Evidencia:**
- `estudioRoutes.js:6,8`: `POST /study/review-session` y `/review` sin `authenticate`; reciben `inscripcion_id` del body → cualquiera lee o **escribe el progreso de repaso de otro estudiante**.
- `estudianteRoutes.js:12`: `GET /students/:id/context` sin sesión.
- `GET /users/:id` (ver H-01): datos personales (correo, código estudiantil, intereses) enumerables, porque los IDs son números consecutivos.
- `GET /cards/:id` (`tarjetaRoutes.js:48`) es público; está justificado por el acceso de Invitado (CA-5.4.3), solo confirma que no devuelva datos de otros usuarios.

**Corrección mínima:**

`estudioRoutes.js`:
```js
import { authenticate, requireRole } from '../middleware/autenticacionMiddleware.js';
router.post('/review-session', authenticate, requireRole('estudiante'), EstudioController.iniciarSesion);
router.post('/review-session/review', authenticate, requireRole('estudiante'), EstudioController.registrarValoracion);
```
En `EstudioController`, comprobar que la inscripción es del usuario de la sesión, antes de llamar al servicio:
```js
import { InscripcionRepository } from '../repositories/InscripcionRepository.js';
// ...
const insc = await InscripcionRepository.obtenerPorId(id);          // en iniciarSesion
if (!insc || insc.estudiante_id !== req.usuario.id_usuario) {
  return res.status(403).json({ error: 'No tiene permisos sobre esta inscripción' });
}
```
(Lo mismo con `inscripcionId` en `registrarValoracion`.)

`estudianteRoutes.js`: `router.get('/:id/context', authenticate, ...)` con la misma comprobación de propietario que en H-01.

---

### 🟠 H-04 — `DISABLE_AUTH` puede apagar toda la seguridad en producción
**OWASP:** A02, A07 · **Severidad:** Alta (crítica si está activo en Render)

**Evidencia** (`autenticacionMiddleware.js:23,38-45`): con `DISABLE_AUTH=true`, `authenticate` y `requireRole` dejan pasar a todos como `docente`. No hay ninguna guarda contra producción. Además `.env.example` trae `JWT_SECRET=change-me` y el código no valida longitud ni valor por defecto.

**Verifica ahora en Render → Environment:** `DISABLE_AUTH` no debe existir o debe valer `false`, y `JWT_SECRET` debe ser largo y aleatorio (≥ 32 caracteres).

**Corrección mínima** (`autenticacionMiddleware.js`):
```js
export const authDeshabilitado = () =>
  process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production';
```
y define `NODE_ENV=production` en Render. En `emitirSesion`, además:
```js
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET ausente o demasiado corto');
}
```
Para generar un secreto: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Si lo cambias, todas las sesiones activas se cierran (es lo esperado).

---

### 🟠 H-05 — Supabase: RLS no activado en los scripts (por verificar)
**OWASP:** A02, A01 · **Severidad:** Potencialmente crítica

**Evidencia:** `init.sql` y `backend/walking_dictionary_supabase.sql` no contienen `ENABLE ROW LEVEL SECURITY` ni políticas. Supabase expone por defecto una API REST (PostgREST) sobre el esquema `public`, accesible con la `anon key`, que es pública por diseño (va en el frontend o en la URL del proyecto). Sin RLS, esa API puede leer y escribir las tablas **sin pasar por tu backend**.

**Verifica en el SQL Editor (solo lectura):**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
Si `rowsecurity` es `false` en alguna tabla, está expuesta.

**Corrección** (esto **sí modifica la base**, sin borrar datos): activar RLS en cada tabla, sin crear políticas, para que `anon` y `authenticated` no vean nada por la API:
```sql
ALTER TABLE public.usuario            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripcion        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mazo               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarjeta            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aporte             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etiqueta_contexto  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progreso_estudio   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_mazo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregunta_quiz      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultado_quiz     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuesta_quiz     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordnet_cache      ENABLE ROW LEVEL SECURITY;
```
**Antes de aplicarlo**, confirma que el backend se conecta con el usuario `postgres` de la cadena de conexión de Supabase (el que usa `DB_USER` en Render). Ese rol ignora RLS, así que el backend sigue funcionando igual. Si usara otro rol, habría que crear políticas. Haz la prueba primero fuera de horario de uso.

---

### 🟡 H-06 — Conexión a la base sin validar el certificado
**OWASP:** A02, A04 · **Severidad:** Media

`backend/src/config/db.js:24-27`: `ssl: { rejectUnauthorized: false }` cifra, pero **acepta cualquier certificado**, por lo que no protege de un intermediario. Supabase publica su certificado raíz (Project Settings → Database → SSL Configuration). Mejora: descargarlo y usarlo como `ca`. Es un cambio pequeño pero requiere probar la conexión; no es prioritario frente a H-01/H-02.

---

### 🟠 H-07 — Sin cabeceras de seguridad, sin límite de intentos y CORS abierto
**OWASP:** A02 · **Severidad:** Media-Alta

`app.js:86-87`: `app.use(cors())` acepta **cualquier origen**; no hay `helmet` ni rate limiting. `/auth/google`, `/courses/enroll` y la creación de aportes se pueden martillar sin límite.

**Corrección mínima:**
```bash
npm install helmet express-rate-limit
```
```js
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.set('trust proxy', 1);   // Render está detrás de un proxy; necesario para que el límite use la IP real
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean) }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/v1', rateLimit({ windowMs: 60 * 1000, max: 300 }));
```
En Render define `CORS_ORIGINS=https://<tu-app>.vercel.app` (sin barra final; separa varios con comas). **Cuidado:** si no defines esa variable, el CORS quedará cerrado para todos y el frontend dejará de funcionar. Para desarrollo local agrega `http://localhost:5173,http://localhost:3000` según tu puerto. Esto instala dependencias nuevas.

---

### 🟠 H-08 — Errores internos expuestos al cliente
**OWASP:** A10, A02 · **Severidad:** Media-Alta

Hay **87 respuestas** del tipo `res.status(500).json({ error: error.message })` en los controladores, y no existe un manejador global de errores ni `process.on('unhandledRejection')`. Se filtran nombres de columnas y mensajes de PostgreSQL: el `column ap.estado does not exist` que viste en la consola del navegador es un ejemplo real.

**Corrección mínima, sin tocar los 87 sitios:** un middleware antes de las rutas (`app.js`, después de `express.json()`):
```js
app.use((req, res, next) => {
  const json = res.json.bind(res);
  res.json = (cuerpo) => {
    if (res.statusCode >= 500 && process.env.NODE_ENV === 'production') {
      console.error(`[ERROR ${res.statusCode}] ${req.method} ${req.originalUrl}`, cuerpo?.error);
      return json({ error: 'Error interno del servidor' });
    }
    return json(cuerpo);
  };
  next();
});
```
y en `server.js`:
```js
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => { console.error('[uncaughtException]', e); process.exit(1); });
```
El mensaje real queda en los logs de Render y el cliente solo ve uno genérico. Los errores 4xx (validaciones) no se tocan.

---

### 🟡 H-09 — Casi sin registro de eventos de seguridad
**OWASP:** A09 · **Severidad:** Media

Solo existe un `console.log` al arrancar (`server.js:16`). No se registran inicios de sesión fallidos, 401/403, aprobaciones ni borrados. Con el middleware de H-08 ya quedan registrados los 5xx. Mínimo adicional en `authenticate`, en los dos `return res.status(401)`:
```js
console.warn(`[AUTH] 401 ${req.method} ${req.originalUrl} ip=${req.ip}`);
```
y en `requireRole`, antes del 403: `console.warn(`[AUTH] 403 usuario=${req.usuario.id_usuario} rol=${req.usuario.rol} ${req.originalUrl}`)`. Render conserva esos logs; si quieres alertas, revísalos periódicamente o conecta un servicio de logs.

---

### 🟠 H-10 — Dependencias con vulnerabilidades conocidas
**OWASP:** A03 · **Severidad:** Alta (contexto: ver notas)

`npm audit` sobre los lockfiles:

| Repo | Críticas | Altas | Moderadas | Total |
|---|---|---|---|---|
| Backend | 2 | 6 | 5 | 13 |
| Frontend | 0 | 2 | 0 | 2 |

**Backend, lo importante:**
- `tar` (**crítica**) y `@mapbox/node-pre-gyp` (alta) llegan solo por **`bcrypt`**, y `bcrypt` **no se importa en ningún archivo** (el login es solo con Google). Quitarlo elimina esas dos y la vulnerabilidad de `bcrypt` de un golpe:
  ```bash
  cd backend
  npm uninstall bcrypt
  ```
  (Confirma antes con: `grep -rn "bcrypt" src` — solo debe aparecer en comentarios.)
- `proxy-addr` (**crítica**), `qs`, `body-parser`: vienen con `express`. Se corrigen con `npm audit fix`. El riesgo real de `proxy-addr` aplica si se confía en cabeceras `X-Forwarded-For`, algo que sí pasará si aplicas `trust proxy` de H-07, así que conviene actualizar.
- `nodemon`, `chokidar`, `braces` son de **desarrollo**; no llegan a producción (el Dockerfile usa `--omit=dev`).

**Frontend:** `brace-expansion` y `source-map-js`, ambas de la cadena de build (Vite); riesgo solo en tu máquina/CI. `npm audit fix` las resuelve.

**Pasos:** `npm uninstall bcrypt` → `npm audit fix` → `npm test`/`npm run lint` → revisar si queda algo con `npm audit`. No uses `npm audit fix --force` sin revisar qué sube de versión.

---

### 🟡 H-11 — Códigos de acceso generados con `Math.random()`
**OWASP:** A04 · **Severidad:** Media-Baja

`InscripcionService.js:10`: `Math.random()` no es criptográficamente seguro y los códigos no caducan. El espacio es de 32⁸ ≈ 1,1 × 10¹², por lo que fuerza bruta es poco realista, pero cualquiera podía regenerarlos (H-02). Cambio de una línea:
```js
import { randomInt } from 'node:crypto';
const posicion = randomInt(caracteres.length);   // en lugar de Math.floor(Math.random() * ...)
```

---

### 🟡 H-12 — Sesión: sin revocación y token en `localStorage`
**OWASP:** A07 · **Severidad:** Baja-Media

- El JWT dura 8 h y lleva el rol dentro; si desactivas a un usuario o le cambias el rol, conserva el acceso hasta que expire.
- `authenticate` llama `jwt.verify(token, secret)` sin fijar algoritmo (`autenticacionMiddleware.js:55`). Con `jsonwebtoken` 9 el valor por defecto ya es seguro para secretos simétricos, pero conviene fijarlo: `jwt.verify(token, secret, { algorithms: ['HS256'] })`.
- El token se guarda en `localStorage` (`AuthProvider.jsx:107`). Es riesgoso solo si hay XSS, y **no se encontró ninguno** (no hay `dangerouslySetInnerHTML`, `innerHTML` ni `eval`). Aceptable en este proyecto; reducir la caducidad a 2-4 h es una mejora barata.

---

### 🟠 H-13 — Diseño: la identidad viaja en el body en lugar de salir del token
**OWASP:** A06, A01 · **Severidad:** Alta

Patrón repetido: `estudiante_id`, `inscripcion_id` y `docente_id` se aceptan del cliente.
- `POST /courses` (`cursoRoutes.js:22`) exige solo sesión; **un estudiante puede crear cursos** y `CursoController.crear` toma `docente_id` del body (líneas 29 y 40), así que puede atribuirlos a otro docente.
- Los endpoints de H-02 y H-03.

`TarjetaController.crear` ya lo hace bien (deriva la inscripción del token; CHANGELOG 2026-09-30). La corrección es aplicar ese mismo criterio a los demás. Mínimo para cursos:
```js
router.post('/', authenticate, requireRole('docente'), CursoController.crear);
// y en CursoController.crear:  const docente_id = req.usuario.id_usuario;
```
(Con `DISABLE_AUTH` local, `id_usuario` es 0; ahí tendrías que enviar `docente_id` en pruebas. Considera mantener el valor del body solo cuando `authDeshabilitado()` sea verdadero, igual que ya hace `TarjetaController`.)

---

### 🟢 Observaciones menores (sin urgencia)
- **Código latente:** `backend/src/routes/index.js` define rutas CRUD sin ninguna autenticación (inscripciones, quizzes, resultados, etiquetas…). **No se montan en `app.js`**, así que hoy no son accesibles, pero si alguien las monta en el futuro quedarán expuestas. Antes de montarlas hay que añadirles `authenticate` y roles.
- `Dockerfile`: el contenedor corre como root (falta `USER node`) y usa `npm install` en vez de `npm ci`.
- `docker-compose.yml`: publica el puerto 5432 de Postgres en el host (aceptable solo en desarrollo local).
- `seed.sql` usa `'hash_temporal'` como `password_hash`: es solo para desarrollo; no cargarlo en Supabase.
- `docs/FLUJO_REVISION_TARJETAS.md` describe un `DELETE /contributions` que ya no existe; documentación desactualizada.

---

## 4. Lo que está bien

- **A05 Inyección:** 0 consultas con interpolación o concatenación; todas usan parámetros `$1, $2…`.
- **Login con Google (`AutenticacionService.js`):** verifica firma, `audience` y `email_verified`; revisa que el usuario exista y esté activo.
- **Registro (`RegistroService.js`):** restringe a `@unicauca.edu.co`, fuerza el rol `estudiante` y controla duplicados con la restricción UNIQUE.
- **Rutas de curaduría, analítica, mazos y aportes:** correctamente protegidas con `authenticate` + `requireRole('docente')`.
- **Secretos:** `.env` en `.gitignore` en ambos repos; no hay credenciales en el árbol del repositorio.
- **Frontend:** sin sinks de XSS, sin `dangerouslySetInnerHTML`, `.env` ignorado.
- **Cadena de suministro:** ambos repos versionan `package-lock.json`.

---

## 5. Checklist de aplicación (en este orden)

1. [ ] **H-01** — proteger `usuarioRoutes.js` + control de propietario en `obtenerPerfil`.
2. [ ] **H-02** — proteger `cursoRoutes.js`, ocultar `codigo_acceso` a no docentes, `estudiante_id` desde el token.
3. [ ] **H-03** — proteger `/study` y `/students/:id/context`, validar propiedad de la inscripción.
4. [ ] **H-04** — revisar `DISABLE_AUTH` y `JWT_SECRET` en Render; guarda por `NODE_ENV`.
5. [ ] **H-05** — consultar `rowsecurity` en Supabase y, si hace falta, activar RLS.
6. [ ] **H-13** — `POST /courses` solo docente y `docente_id` del token.
7. [ ] **H-07** — `helmet`, rate limiting y CORS con lista de orígenes (`CORS_ORIGINS` en Render).
8. [ ] **H-08 / H-09** — middleware de errores genéricos y logs de 401/403/5xx.
9. [ ] **H-10** — `npm uninstall bcrypt` y `npm audit fix` en ambos repos.
10. [ ] Probar con docente y con estudiante: ver curso, inscribirse, estudiar, aprobar tarjeta, aprobar coautoría.

**Cómo probar que quedó cerrado** (sin sesión, deben responder 401 o 403, no 200):
```
GET    https://<backend>/api/v1/users
POST   https://<backend>/api/v1/users
POST   https://<backend>/api/v1/courses/1/access-code
POST   https://<backend>/api/v1/study/review-session
```
Y `GET /api/v1/courses` sin token **no** debe incluir el campo `codigo_acceso`.

---

## Fuentes
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/) — lista y nombres oficiales de las categorías A01–A10.
