# 8. Conceptos transversales

## 8.1 Autenticación y autorización

- Login con Google; el backend verifica el `idToken` y emite su **propio JWT** (HS256, 8 horas) con los claims `id_usuario`, `email` y `rol`.
- Tres middleware en `autenticacionMiddleware.js`: `authenticate` (exige token válido, si no responde 401), `autenticacionOpcional` (continúa como Invitado si no hay token) y `requireRole(...)` (responde 403 si el rol no corresponde).
- El front guarda el token y el usuario en `localStorage` (`walking_dictionary_token` y `walking_dictionary_usuario`) y `httpClient.js` lo envía en cada petición.
- Las reglas de propiedad se aplican en controladores y servicios, no en el router: el estudiante solo consulta lo suyo, el `docente_id` y el `estudiante_id` salen del token y no del body, y el docente solo ve sus cursos (hallazgos H-03 y H-13).
- `DISABLE_AUTH` es un interruptor solo para desarrollo local.

## 8.2 Manejo de errores

- Toda respuesta de error tiene la forma `{ error, code }`: `error` es el mensaje en español y `code` es un código fijo en inglés (lista en `docs/codigos-error.md`).
- Un interceptor en `app.js` garantiza el `code`: si el controlador no puso uno, o puso uno ajeno (como el SQLSTATE de PostgreSQL), usa el genérico del status. El helper `errorApi(status, code, mensaje)` de `utils/codigosError.js` crea los errores de los servicios.
- En producción, todo 5xx sale como `INTERNAL_ERROR` sin detalle; el detalle real queda en los logs.
- El front traduce el `code` con `en.json` en vez de comparar mensajes en español.

## 8.3 Seguridad HTTP

- `helmet` para cabeceras de seguridad; `trust proxy` activado porque Render está detrás de un proxy.
- CORS por lista de orígenes (`CORS_ORIGINS`), sin comodines.
- Límite de intentos fallidos en `/auth` (20 por 15 minutos) y de peticiones en `/reports` (30 por 15 minutos), ambos ajustables por variable de entorno.
- Consultas SQL parametrizadas en todos los repositorios; la auditoría OWASP no encontró inyección SQL.
- Auditoría completa en `backend/Auditoria_OWASP_Top10_2025.md`.

## 8.4 Registro de eventos de seguridad

El middleware `registroSeguridadMiddleware` registra con `console.warn` cada 401 y 403 y con `console.error` cada 5xx (método, ruta, IP y, si hay sesión, usuario y rol). No registra acciones exitosas, tokens, cabeceras ni cuerpos de petición. `GET /health` permite comprobar que el servicio está vivo.

## 8.5 Persistencia y transacciones

- Pool de conexiones `pg` en `config/db.js`; un repositorio por tabla o consulta.
- Las reglas de integridad viven en el motor: únicos como `tarjeta (mazo_id, palabra)`, `inscripcion (curso_id, estudiante_id)` y `resultado_quiz (quiz_id, estudiante_id)`.
- Se usan transacciones al generar el quiz y al guardar el resultado con sus respuestas.
- Los `DECIMAL` de PostgreSQL llegan como string (observación abierta en `resultado_quiz`).

## 8.6 Fechas y zona horaria

Las columnas `TIMESTAMP` no llevan zona horaria. `config/db.js` las lee y escribe como UTC para que el comportamiento no dependa de la zona del servidor. Las fechas de la API van en ISO 8601.

## 8.7 Internacionalización

La interfaz está en inglés con `react-i18next` (todo texto visible va por `t('bloque.clave')` en `en.json`). Los mensajes de error de la API siguen en español, con el `code` para traducirlos.

## 8.8 Generación de PDF

Los PDF se arman en el servidor con `pdf-lib` (mazo, quiz con hoja de respuestas y los cuatro reportes), con helpers de maquetado compartidos en `utils/formatoPdf.js`. Los reportes pasan por el límite de peticiones. El front descarga el archivo con el componente `BotonExportarPdf`.

## 8.9 Estrategia de pruebas y calidad

| Nivel | Herramienta | Ubicación |
| --- | --- | --- |
| Unitarias | Vitest, repositorios simulados | `backend/tests/`, `src/**/*.test.jsx` |
| Funcionales de la API | Vitest contra backend y PostgreSQL reales | `backend/pruebas-funcionales/` |
| End to end | Playwright | `e2e/` (front) |
| Seguridad | Suite OWASP, CodeQL | `backend/security-suite/`, `codeql.yml` |
| Análisis estático | ESLint, SonarQube Cloud | Workflows de CI |

La meta de cobertura es mayor al 70 %.

## 8.10 Datos simulados en el frontend

Con `VITE_USE_MOCK=true`, los clientes de `cliente-api/` usan los datos de `cliente-api/mocks/` en lugar de llamar al backend. Sirve para trabajar la interfaz sin API; los mocks no siempre reflejan el comportamiento real (por ejemplo, mantienen un rechazo de tarjetas que el backend no implementa).

## 8.11 Documentación y trazabilidad del uso de IA

Los PR hechos con IA llevan `[IA-ASSISTED]` y se registran en la bitácora y en `docs/ai/TRAZABILIDAD.md`. El workflow «Reconstruir SUPERPROMPT» mantiene el contexto del proyecto actualizado y exige revisión humana.