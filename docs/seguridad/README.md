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

1. Crea una base PostgreSQL **desechable** con `init.sql` + `seed.sql`.
2. Enciende el back-end en modo producción (`NODE_ENV=production`).
3. Firma un token de la docente de `seed.sql` (ana.docente, id 1) para que ZAP pruebe también las rutas
   protegidas. El token se oculta en el log.
4. ZAP importa `docs/api/openapi.yaml` y ataca cada endpoint (inyección SQL, XSS, path traversal,
   cabeceras, divulgación de información, etc.).
5. Publica el reporte HTML y JSON como artefacto **reporte-zap** y un resumen en el job.

Por ahora **solo reporta**: el workflow no falla por las alertas. El límite de intentos de `/auth`
(OWASP H-07) se sube con `RATE_LIMIT_AUTH_MAX` solo en esa base desechable, para que ZAP no quede
bloqueado; el código no cambia.

ZAP **crea y borra datos** (POST, PUT, DELETE). No correrlo contra una base con datos reales.

### Cómo ver el reporte

GitHub → Actions → **DAST - OWASP ZAP** → la ejecución → artefacto **reporte-zap** → abrir
`reporte-zap.html`.

### Correrlo en local

Con Docker, contra un back-end apuntando a una base **de prueba** (no la de desarrollo):

```bash
mkdir -p zap && cp docs/api/openapi.yaml .zap/rules.tsv zap/ && chmod 777 zap
docker run --rm -v "$PWD/zap:/zap/wrk/:rw" -e ZAP_AUTH_HEADER_VALUE="Bearer <token>" \
  ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py -t /zap/wrk/openapi.yaml -f openapi \
  -O http://host.docker.internal:<puerto> -c rules.tsv -r reporte-zap.html -I
```

### Resultado del primer escaneo (2026-11-08, local, rama `feature/dast-zap`)

67 URLs importadas del OpenAPI, 178 URLs probadas. **0 fallos y 118 reglas superadas**, entre ellas
inyección SQL, XSS, path traversal, inyección de comandos y divulgación de mensajes de depuración.

Alertas (todas de riesgo bajo o falso positivo):

| Alerta ZAP | Riesgo | Qué pasa | Decisión |
| --- | --- | --- | --- |
| Server Error response (100000), 20 casos | Bajo | Entradas inválidas que la API no valida llegan a PostgreSQL y la respuesta es **500** en vez de **400**: ids fuera del rango `integer` (`GET /cards/5026139382315441753`), fechas y textos inválidos o demasiado largos, campos obligatorios vacíos (`POST /decks` sin `curso_id`, `POST /aportes`, `POST /quizzes`, `PUT /quizzes/:id`). El mensaje es genérico (`INTERNAL_ERROR`, OWASP H-08): **no se filtran datos** | Pendiente: agregar validación de entrada en los controladores (tarea aparte) |
| Server Error en `GET /enrichment/family/{word}` | Bajo | La columna `wordnet_cache.categoria_gramatical` no está en `init.sql` (ya conocido, D-05) | Pendiente de decisión del equipo |
| Application Error Disclosure (90022), 5 casos | Bajo | Son las mismas respuestas 500; el cuerpo no muestra trazas ni SQL | Se resuelve con la validación de entrada |
| Unexpected Content-Type (100001), 78 casos | Bajo | Una ruta inexistente responde el 404 HTML por defecto de Express («Cannot GET …») en vez de JSON `{ error, code }` | Pendiente: manejador 404 en JSON (tarea aparte) |
| Format String Error (30002), 1 caso | — | **Falso positivo**: Node.js no interpreta `%n`/`%s`; ZAP lo marca por el 500 de `PUT /quizzes/:id` con un `estado` inválido | Ignorado en `.zap/rules.tsv`, con justificación |

### Mantenimiento

- Al agregar endpoints, actualizar `docs/api/openapi.yaml`: ZAP solo ataca lo que está en la
  especificación.
- Ignorar una alerta en `.zap/rules.tsv` solo si es un falso positivo verificado, con su justificación
  en un comentario.
- Cuando se corrijan las alertas pendientes, se puede hacer obligatorio el escaneo quitando `-I` y
  marcando reglas como `FAIL`.
