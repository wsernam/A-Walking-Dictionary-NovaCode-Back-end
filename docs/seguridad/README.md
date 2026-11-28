# Pruebas de seguridad del código y de la API

Cómo el proyecto aplica las cuatro técnicas de testing de seguridad (SAST, SCA, IAST y DAST), con qué
herramienta, sobre qué y en qué momento. Cubre los dos repositorios (back-end y front-end).

## Resumen

| Técnica | Herramienta | Objeto de análisis | Acceso al código | Momento de aplicación | Dónde está |
| --- | --- | --- | --- | --- | --- |
| **SAST** (estático) | CodeQL y SonarQube Cloud | Código propio de los dos repositorios | Sí (caja blanca) | Cada PR y push a `develop`/`main`; CodeQL además cada lunes | `.github/workflows/codeql.yml`, `backend-tests.yml` (back) y `ci.yml` (front) |
| **SCA** (dependencias) | `npm audit` y Dependabot | Librerías de terceros (`package-lock.json`) | Sí (archivos de bloqueo) | Cada PR y push; Dependabot cada lunes | `.github/workflows/sca.yml` y `.github/dependabot.yml` en los dos repos |
| **IAST** (interactivo) | No se aplica (ver abajo) | — | — | — | — |
| **DAST** (dinámico) | OWASP ZAP (escaneo de API) | API desplegada en CI, con los endpoints de `docs/api/openapi.yaml` | No (caja negra) | Push a `develop`, cada lunes y manual | `.github/workflows/dast-zap.yml` y `.zap/rules.tsv` |

Complementa estas técnicas la suite OWASP del equipo (`backend/security-suite/`, workflow
`owasp-security.yml`), con comprobaciones puntuales de SQLi, XSS, CSRF, JWT e integridad del lockfile.

Además, toda la API tiene un límite global de peticiones por IP (`backend/src/middleware/limiteGlobalMiddleware.js`,
variable `RATE_LIMIT_GLOBAL_MAX`, 1000 cada 15 minutos; `/health` queda fuera) como techo de lo que no tiene límite
propio. Los límites de `/auth`, reportes y `/admin` siguen aplicando por encima. Los workflows de DAST, fuzzing, IAST,
OWASP y pruebas funcionales lo suben a 100000 porque envían miles de peticiones desde una sola IP.

## SAST — análisis estático

CodeQL busca vulnerabilidades (inyección, XSS, secretos, etc.) y SonarQube Cloud agrega bugs, *code
smells* y cobertura. Los dos leen el código sin ejecutarlo.

## SCA — análisis de composición

`npm audit --omit=dev` revisa si alguna dependencia de producción tiene un CVE conocido y deja el resumen
en el job. Dependabot revisa cada semana y abre un PR hacia `develop` cuando hay que actualizar.
Configurado por Manuela Erazo (ramas `feature/backend/sca-dependencias` y
`feature/frontend/sca-dependencias`).

## IAST — por qué no se aplica

IAST necesita un agente instalado dentro de la aplicación que observe el flujo de datos mientras se
ejecutan pruebas funcionales. Las herramientas para Node.js (Contrast Security, Seeker, Checkmarx IAST)
son comerciales y piden licencia y un servidor propio; no hay una opción libre mantenida. Para un
proyecto académico sin presupuesto se decidió **no aplicarla** y cubrir su objetivo de forma parcial con:

- las pruebas funcionales de la API (`backend/pruebas-funcionales/`) y E2E del front, que recorren los
  flujos reales;
- el registro de 401/403/5xx del middleware `registroSeguridadMiddleware.js` (OWASP H-09);
- el DAST con ZAP, que ataca la aplicación en ejecución.

## DAST — OWASP ZAP

### Qué hace el workflow

El escaneo es **activo** y se repite **una vez por rol** (un job de la matriz por cada uno):

| Rol | Token | Comprobación de arranque |
| --- | --- | --- |
| invitado | sin token | — |
| estudiante | juan.estudiante (`seed.sql`) | `GET /cards/pending` debe dar **403** |
| docente | ana.docente (`seed.sql`) | `GET /cards/pending` debe dar **200** |
| administrador | admin.pruebas (`.github/ci/admin-pruebas.sql`) | `GET /admin/users` debe dar **200** |

1. Verifica que el objetivo y la base sean locales; si no, corta el job (nunca contra staging ni producción).
2. Crea una base PostgreSQL **desechable** con `init.sql` + `seed.sql` + el administrador de prueba.
3. Enciende el back-end en modo producción (`NODE_ENV=production`).
4. Firma el token del rol (el invitado no lleva) y comprueba con la ruta de arranque que ZAP de verdad
   escanea como ese rol; si el código no es el esperado, el job falla. El token se oculta en el log.
5. ZAP importa `docs/api/openapi.yaml` y ataca cada endpoint con intensidad alta
   (`scanner.strength=HIGH`, `scanner.threshold=LOW`, tope de 60 minutos): inyección SQL, XSS, path
   traversal, cabeceras, divulgación de información, etc.
6. Publica el reporte HTML y JSON de cada rol como artefacto **reporte-zap-&lt;rol&gt;** y una tabla de
   alertas por riesgo en el resumen del job.

Por ahora **solo reporta**: el workflow no falla por las alertas. El límite de intentos de `/auth`
(OWASP H-07) se sube con `RATE_LIMIT_AUTH_MAX` solo en esa base desechable, para que ZAP no quede
bloqueado; el código no cambia.

ZAP **crea y borra datos** (POST, PUT, DELETE). No correrlo contra una base con datos reales.

### Cómo ver el reporte

GitHub → Actions → **DAST - OWASP ZAP** → la ejecución. El resumen de cada job muestra la tabla de
alertas de ese rol. El reporte completo está en el artefacto **reporte-zap-&lt;rol&gt;**
(`reporte-zap-invitado`, `-estudiante`, `-docente`, `-administrador`) → abrir `reporte-zap-<rol>.html`.

Al comparar roles: una alerta que aparece solo en un rol suele venir de un endpoint que solo ese rol
alcanza (los demás reciben 401/403); una que aparece en todos es transversal (cabeceras, 404, etc.).

### Correrlo en local

Con Docker, contra un back-end apuntando a una base **de prueba** (no la de desarrollo):

```bash
mkdir -p zap && cp docs/api/openapi.yaml .zap/rules.tsv zap/ && chmod 777 zap
docker run --rm -v "$PWD/zap:/zap/wrk/:rw" -e ZAP_AUTH_HEADER_VALUE="Bearer <token>" \
  ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py -t /zap/wrk/openapi.yaml -f openapi \
  -O http://host.docker.internal:<puerto> -c rules.tsv -r reporte-zap.html -I
```

### Escaneo activo por rol (run #42, 2026-11-27, `develop` en `6b95674`)

Primer escaneo activo con intensidad alta y un reporte por rol, después de las correcciones de
validación de entrada del PR #104. **Ningún rol tiene inyección SQL, XSS explotable, inyección de
comandos ni divulgación de información.**

Alertas por rol (instancias). La confianza es la que asigna ZAP: baja (1), media (2), alta (3).

| Riesgo | Alerta ZAP | Confianza | Invitado | Estudiante | Docente | Admin | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Alto | Path Traversal (6) | Baja | 0 | 1 | 4 | 0 | Falso positivo |
| Medio | HTTP Only Site (10106) | Media | 1 | 1 | 1 | 1 | Esperado en CI |
| Bajo | Server Error response (100000) | Alta | 0 | 1 | 5 | 1 | **Real: byte nulo** |
| Bajo | Cross Site Scripting Weakness, persistente en JSON (40014) | Baja | 0 | 0 | 8 | 0 | No explotable desde la API |
| Bajo | Unexpected Content-Type (100001) | — | 444 | 445 | 443 | 487 | **Real: 404 en HTML** |
| Info | Client Error response (100000) | — | 743 | 742 | 721 | 737 | Normal (400/401/403/404 esperados) |
| Info | User Agent Fuzzer (10104) | — | 5 | 5 | 5 | 5 | Normal |
| Info | Non-Storable / Storable and Cacheable Content (10049) | — | 7 | 5 | 5 | 5 | Normal |

Detalle de cada alerta:

- **Server Error, byte nulo (real).** `POST /cards/check-duplicate`, `POST /courses`,
  `POST /courses/{id}/assign`, `POST /decks` y `POST /quizzes` responden 500 si un texto del body trae
  `\u0000` (PostgreSQL no lo acepta). Reproducido en local: con datos normales responden 200/201/404 y
  con el byte nulo, 500. El cuerpo es genérico (`INTERNAL_ERROR`, OWASP H-08): **no se filtran datos**.
  Pendiente: rechazar el byte nulo en la entrada (PR aparte).
- **Unexpected Content-Type (real, menor).** Una ruta inexistente responde la página 404 HTML de Express
  («Cannot GET …») en vez de JSON `{ error, code }`. Es la misma alerta del primer escaneo.
  Pendiente: manejador 404 en JSON (PR aparte).
- **Path Traversal (falso positivo).** ZAP manda como «ataque» el último tramo de la URL (`courses`,
  `profile`, `10`) y lo marca porque la API devuelve ese texto en el JSON. El back-end no abre archivos
  con datos del usuario: el único uso de `fs` es leer el certificado de la base con una ruta fija al
  arrancar (`src/config/db.js`). Sin evidencia en ninguna instancia.
- **XSS persistente en JSON (no explotable desde la API).** El texto se guarda tal cual, pero se
  devuelve como `application/json` con `X-Content-Type-Options: nosniff` y una CSP estricta (Helmet),
  así que el navegador no lo ejecuta. ZAP mismo lo marca con confianza baja «porque el Content-Type no
  es HTML». Solo sería explotable si el front pintara esos textos como HTML (`dangerouslySetInnerHTML`);
  React los escapa por defecto.
- **HTTP Only Site (esperado en CI).** El escaneo apunta a `http://localhost` dentro del job. En
  producción Render sirve por HTTPS y la CSP trae `upgrade-insecure-requests`.

Lectura por rol:

- **Invitado:** solo alertas transversales (HTTP, 404 en HTML). No alcanza ninguna ruta protegida,
  como debe ser.
- **Estudiante:** un 500 por byte nulo en `POST /cards/check-duplicate` y un falso positivo en
  `PATCH /users/profile`. No llega a rutas de docente.
- **Docente:** el que más alertas tiene, porque es el que alcanza casi todos los endpoints de
  escritura: 5 de los 500, las 8 de XSS en JSON y los 4 falsos positivos de Path Traversal.
- **Administrador:** un 500 por byte nulo en `POST /cards/check-duplicate`. Que el administrador
  llegue a esa ruta académica **confirma con ZAP el HALLAZGO-1 / D-12** (debería recibir 403); queda
  para la decisión del equipo.

Respecto del primer escaneo (2026-11-08): desaparecen los 500 por validación de entrada (corregidos
en el PR #104) y la alerta Application Error Disclosure (90022), que venía de esos mismos 500.

### Resultado del primer escaneo (2026-11-08, local, rama `feature/dast-zap`)

67 URLs importadas del OpenAPI, 178 URLs probadas. **0 fallos y 118 reglas superadas**, entre ellas
inyección SQL, XSS, path traversal, inyección de comandos y divulgación de mensajes de depuración.

Alertas (todas de riesgo bajo o falso positivo):

| Alerta ZAP | Riesgo | Qué pasa | Decisión |
| --- | --- | --- | --- |
| Server Error response (100000), 20 casos | Bajo | Entradas inválidas que la API no valida llegan a PostgreSQL y la respuesta es **500** en vez de **400**: ids fuera del rango `integer` (`GET /cards/5026139382315441753`), fechas y textos inválidos o demasiado largos, campos obligatorios vacíos (`POST /decks` sin `curso_id`, `POST /aportes`, `POST /quizzes`, `PUT /quizzes/:id`). El mensaje es genérico (`INTERNAL_ERROR`, OWASP H-08): **no se filtran datos** | Corregido en el PR #104 (validación de entrada; Schemathesis sin fallos en el run #32). En el run #42 de ZAP solo quedan los 500 por byte nulo |
| Server Error en `GET /enrichment/family/{word}` | Bajo | La columna `wordnet_cache.categoria_gramatical` no está en `init.sql` (ya conocido, D-05) | Corregido 2026-11-27: la columna se agregó a `init.sql` (commit 928e5d5) |
| Application Error Disclosure (90022), 5 casos | Bajo | Son las mismas respuestas 500; el cuerpo no muestra trazas ni SQL | Resuelto: ya no aparece en el run #42 |
| Unexpected Content-Type (100001), 78 casos | Bajo | Una ruta inexistente responde el 404 HTML por defecto de Express («Cannot GET …») en vez de JSON `{ error, code }` | Pendiente: manejador 404 en JSON (sigue en el run #42, ~450 instancias por rol) |
| Format String Error (30002), 1 caso | — | **Falso positivo**: Node.js no interpreta `%n`/`%s`; ZAP lo marca por el 500 de `PUT /quizzes/:id` con un `estado` inválido | Ignorado en `.zap/rules.tsv`, con justificación |

### Mantenimiento

- Al agregar endpoints, actualizar `docs/api/openapi.yaml`: ZAP solo ataca lo que está en la
  especificación.
- Ignorar una alerta en `.zap/rules.tsv` solo si es un falso positivo verificado, con su justificación
  en un comentario.
- Cuando se corrijan las alertas pendientes, se puede hacer obligatorio el escaneo quitando `-I` y
  marcando reglas como `FAIL`.

## Pruebas de control de acceso (RBAC e IDOR)

Verifican que cada endpoint responda lo que dice la matriz de permisos ([`matriz-rbac.md`](matriz-rbac.md)) y que un usuario con el rol correcto no acceda a recursos ajenos. Corren con la suite funcional (`npm run test:funcional`, ver [`backend/pruebas-funcionales/README.md`](../../backend/pruebas-funcionales/README.md)).

| Prueba | Qué comprueba | Casos |
| --- | --- | --- |
| `rbac-matriz.test.js` | Código HTTP de cada endpoint con el token de cada rol (datos en `datos/matriz-rbac.json`) | 61 endpoints × 4 roles |
| `rbac-idor.test.js` | Estudiante A contra B, estudiante no inscrita y docente ajena | 37 casos y 6 controles |
| `rbac-cobertura.test.js` | Toda ruta de `app.js` está en la matriz y viceversa | 3 |

### Hallazgos (ejecución del 2026-11-17, rama `develop`)

Las celdas con un hueco confirmado corren con `it.fails`: la integración continua sigue en verde, el hueco queda visible en el reporte y, cuando se corrige, la prueba falla y se borra la marca.

| Hallazgo | Qué ocurre | Dónde | Corrección sugerida | Estado |
| --- | --- | --- | --- | --- |
| HALLAZGO-1 | El administrador atraviesa rutas que solo exigen sesión | `POST /cards/check-duplicate`, `GET /quizzes`, `GET /quizzes/:id` | Agregar `requireRole` con los roles permitidos | Abierto (D-13). ZAP lo confirma en el run #42: el administrador llega a `POST /cards/check-duplicate` |
| HALLAZGO-2 | `GET /enrichment/family/:word` responde 500 a todos los roles | Falta `wordnet_cache.categoria_gramatical` en `init.sql` | Agregar la columna (D-05) | Corregido 2026-11-27 (commit 928e5d5) |
| HALLAZGO-3 | Un estudiante lee, lista y crea aportes de otros | `GET /aportes`, `GET /aportes/:id`, `POST /aportes` | Filtrar por la inscripción del token y validar `inscripcion_id` | Abierto |
| HALLAZGO-4 | Cualquier docente edita, aprueba y elimina aportes | `PUT`, `PATCH /approve`, `DELETE /aportes/:id` | Comparar `curso.docente_id` con el token | Abierto (D-12) |
| HALLAZGO-5 | Cualquier docente edita, etiqueta y aprueba tarjetas | `PUT /cards/:id`, `PUT /cards/:id/context`, `PATCH /cards/:id/approve` | Comparar `curso.docente_id` con el token | Abierto (D-12) |
| HALLAZGO-6 | Cualquier docente genera código, asigna y lista inscritos de un curso ajeno | `POST /courses/:id/access-code`, `POST /courses/:id/assign`, `GET /courses/:id/students` | Comparar `curso.docente_id` con el token | Abierto (D-12) |
| HALLAZGO-7 | Cualquier docente exporta el PDF y ve las analíticas de un mazo ajeno | `GET /decks/:id/export-pdf`, `GET /teacher/analytics/deck/:id` | Usar `esDuenoDelMazo` | Abierto (D-12) |
| HALLAZGO-8 | Los quices se leen sin estar inscrito; cualquier docente los lee, edita, elimina, exporta y ve sus resultados | `GET`, `PUT`, `DELETE /quizzes/:id`, `export-pdf`, `teacher-results` | Validar inscripción o docente dueño del curso | Abierto (D-12) |
| HALLAZGO-9 | El reporte de curso de otra docente responde 200 | `GET /reports/students/export-pdf` | Comparar `curso.docente_id` con el token (el comentario de `ReporteCursoService` ya lo promete) | Abierto (D-12) |

## Pruebas de seguridad de sesión

Construyen tokens "malos" y verifican que la API los rechace con 401. Corren con la suite funcional (`npm run test:funcional`) contra el backend de pruebas, nunca contra producción, y forman parte de `funcionales.yml`. Viven en `backend/pruebas-funcionales/seguridad-sesion.test.js` (21 pruebas).

| Prueba | Qué comprueba | Resultado |
| --- | --- | --- |
| SES-01 a SES-03 | Controles: sin token, cabecera sin esquema Bearer y token legítimo que sí accede | 401 / 200 |
| SES-04 a SES-06 | Token manipulado: firma alterada, payload con otro rol y firma con otro secreto | 401 |
| SES-07 a SES-10 | `alg:none` (y variantes de mayúsculas), `none` con la firma original y HS384/HS512 con el secreto correcto | 401 |
| SES-11 y SES-12 | Token vencido y token con `nbf` en el futuro | 401 |
| SES-13b y SES-14b | Token reutilizado tras cerrar sesión y token de una cuenta desactivada | `[RIESGO CONOCIDO]` |

Los dos riesgos corren con `it.fails` (igual que los HALLAZGO de arriba): la integración continua sigue en verde, el hueco queda visible como "expected fail" y, cuando el backend se corrija, la prueba falla y se cambia `it.fails` por `it`.

### Riesgos conocidos (ejecución del 2026-11-19, rama `develop`)

| Riesgo | Qué ocurre | Dónde | Corrección sugerida | Estado |
| --- | --- | --- | --- | --- |
| RIESGO-SES-1 (SES-13b) | Un token sigue valiendo tras cerrar sesión: el JWT es sin estado (8 h) y "cerrar sesión" solo lo borra del navegador | No existe `POST /auth/logout` ni lista de revocación en `autenticacionMiddleware.js` | Versión de token por usuario o lista de revocación; reducir la caducidad a 2-4 h | Abierto (H-12, T7) |
| RIESGO-SES-2 (SES-14b) | La cuenta desactivada conserva el acceso con un token ya emitido, hasta 8 h | `authenticate` solo verifica firma y vigencia; `usuario.activo` se consulta únicamente al iniciar sesión (`AUTH_ACCOUNT_INACTIVE`) | Consultar `activo` en `authenticate` (una consulta por petición) o usar la versión de token de RIESGO-SES-1 | Abierto (H-12) |

Ambos son el mismo hueco que H-12 de `backend/Auditoria_OWASP_Top10_2025.md` (sin revocación: si se desactiva a un usuario o se le cambia el rol, conserva el acceso hasta que expire) y que T7 de [`11-riesgos-y-deuda-tecnica.md`](../arquitectura/arc42/11-riesgos-y-deuda-tecnica.md).
