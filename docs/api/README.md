# Especificación de la API (OpenAPI)

[`openapi.yaml`](openapi.yaml) describe la API REST del back-end en formato **OpenAPI 3.0.3**, el estándar para documentar APIs HTTP. Está escrito a mano y cubre las **58 operaciones** que hoy monta `backend/src/app.js`, todas bajo `/api/v1`.

Para cada endpoint indica la ruta y el método, quién puede usarlo (público, cualquier usuario con sesión, docente o estudiante), qué recibe, qué responde y qué errores puede devolver (con los `code` de [`../codigos-error.md`](../codigos-error.md)).

## Cómo verlo

Sin instalar nada:

- Abre [editor.swagger.io](https://editor.swagger.io) y pega el contenido de `openapi.yaml`. A la derecha aparece la documentación navegable.

Con Redocly, desde la raíz del repositorio (usa `npx`, así que no modifica `package.json`):

```bash
npx @redocly/cli build-docs docs/api/openapi.yaml -o /tmp/api.html
```

Luego abre `/tmp/api.html` en el navegador. No guardes ese HTML en el repositorio.

## Cómo validarlo

```bash
# Debe terminar sin errores (los dos avisos de servidor localhost y de licencia son esperados)
npx @redocly/cli lint docs/api/openapi.yaml

# Debe imprimir 58
grep -cE '^    (get|post|put|patch|delete):' docs/api/openapi.yaml
```

## Convenciones

| Elemento | Significado |
| --- | --- |
| `x-hu` | Historia de usuario a la que pertenece la operación (por ejemplo `HU-3.1`). |
| `x-ca` | Criterios de aceptación que cubre (por ejemplo `[CA-3.1.1, CA-3.1.2]`). |
| `x-pendiente` | La operación tiene una discrepancia abierta con el backlog o con CLAUDE.md (por ejemplo `D-08: ...`). Se documenta lo que hace el código y la descripción empieza con «**Supuesto pendiente de validar**». |
| `security: []` | Endpoint público, sin token. |
| `security: [{}, { bearerAuth: [] }]` | Token opcional: la respuesta cambia si hay sesión. |
| `security: [{ bearerAuth: [] }]` | Requiere el JWT. Si además importa el rol, la descripción dice «Solo docente» o «Solo estudiante». |

Otras reglas:

- **Se documenta lo que hace el código, no lo que dice el backlog.** Si no coinciden, gana el código y se marca con `x-pendiente`.
- **Solo rutas montadas en `app.js`.** Los routers que existen pero no están montados (`inscripcionRoutes`, `etiquetaContextoRoutes`, `preguntaQuizRoutes`, `progresoEstudioRoutes`, `quizMazoRoutes`, `respuestaQuizRoutes`, `resultadoQuizRoutes`) no aparecen.
- Los nombres de schemas y campos son los del DER (`init.sql`, en singular).
- Las columnas `DECIMAL` (puntajes, calificación, factor de facilidad) llegan como texto desde PostgreSQL y así están documentadas.

## Mantenimiento

**Cada endpoint nuevo o modificado actualiza `openapi.yaml` en el mismo Pull Request.** Antes de abrir el PR, corre los dos comandos de validación.
