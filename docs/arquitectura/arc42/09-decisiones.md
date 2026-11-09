# 9. Decisiones de arquitectura

El registro completo del proyecto está en [`docs/ai/DECISIONES.md`](../../ai/DECISIONES.md) (identificadores DP-nn). Aquí se resumen las que condicionan la arquitectura, con su motivo, la alternativa descartada y la consecuencia visible en el sistema.

## 9.1 Decisiones del proyecto

| ID | Decisión | Motivo | Alternativa descartada | Consecuencia en el sistema |
| --- | --- | --- | --- | --- |
| DP-02 | PostgreSQL relacional | Las reglas de integridad viven en el motor; el volumen de un curso no justifica un grafo | GraphDB + SKOS | Índices únicos y claves foráneas en `init.sql` |
| DP-05 | Ninguna traducción o sugerencia automática se guarda sin confirmación humana | Pueden fallar justo en matices culturales | Traducción automática sin revisión | La docente aprueba cada tarjeta antes de que entre a un quiz |
| DP-06 | React para el frontend | Soporte documentado y continuidad con el trabajo base | Angular | SPA con `react-router-dom` |
| DP-07 | Node.js + Express para el backend | Un solo lenguaje para que la rotación de roles sea viable | Django, Spring Boot | JavaScript en ambos repositorios |
| DP-08 | WordNet 3.1 local con `node-wordnet` y caché `wordnet_cache`, solo en inglés | Reducir el riesgo del MVP | Carga masiva previa y WordNet multilingüe | Cobertura limitada (modismos, variantes regionales). La Free Dictionary API opcional **no está implementada** |
| DP-09 | Docker Compose en desarrollo; Vercel + Render + Supabase en staging y producción | Entornos idénticos para los cuatro integrantes | Instalación manual | Ver sección 7 |
| DP-12 | Ejemplo de uso opcional y de máximo 150 caracteres | Ambigüedad legal con frases de los libros | Ejemplos sin límite | `tarjeta.ejemplo` es `varchar(150)` y se valida en el controlador |
| DP-13 | Duplicado exacto: se suma el aporte; parcial: acepción adicional; comparación sin distinguir mayúsculas | Evitar duplicados sin perder aportes | — | Tabla `aporte` con `tipo_aporte` (`creada`, `coautoria`, `acepcion_nueva`). Tensión abierta con el único `tarjeta (mazo_id, palabra)` (D-08) |
| DP-14 | Quiz cada unas 2 semanas con tarjetas aprobadas, calificado por estudiante | Coincide con el ritmo real del curso | Quiz único a fin de semestre | Solo entran tarjetas `revisado_docente`; único `resultado_quiz (quiz_id, estudiante_id)` |
| DP-16 | Interfaz en inglés con `react-i18next`; lo que va a la base de datos no se traduce | Mantener el contenido del curso separado del idioma de la interfaz | Traducir componente por componente | Textos en `src/i18n/locales/en.json`; errores de la API en español con `code` |
| DP-17 | Se maneja un solo curso | Alcance del MVP | — | Ver la discrepancia sobre `curso_id` en la sección 11 |
| DP-26 | Registro con correo institucional sin contraseña; login con Google OAuth y JWT con rol | No manejar contraseñas y limitar el acceso a cuentas institucionales | Correo y contraseña con bcrypt | `AutenticacionService`, `RegistroService`; `password_hash` queda opcional |
| DP-27 | API unificada bajo `/api/v1/...`; mazos en `/api/v1/decks` | Contrato de API consistente entre frontend y backend | `/api/v1/desk` | Prefijos de `app.js` |

## 9.2 Decisiones de implementación registradas en `CLAUDE.md`

El detalle completo está en la sección «Decisiones del equipo» de [`CLAUDE.md`](../../../CLAUDE.md).

| Fecha | Decisión | Consecuencia |
| --- | --- | --- |
| 2026-10-07 | Solo la docente exporta PDF de mazos y quices (D-06, D-07) | `requireRole('docente')` en ambos endpoints de exportación |
| 2026-10-07 | En `POST /quizzes/:id/submit` el `estudiante_id` sale del JWT; responder exige inscripción | No se puede enviar un quiz a nombre de otro estudiante |
| 2026-10-07 | El control de tiempo usa `fecha_inicio` y `tiempo_empleado_seg` del cliente; no hay endpoint de inicio de intento | Limitación conocida (ver sección 11) |
| 2026-10-08 | Se elimina el CRUD público de `/users` (H-01) y se agrega el registro de eventos de seguridad (H-09) | `usuarioRoutes` solo expone perfil; `registroSeguridadMiddleware` |
| 2026-10-11 | Endpoints adicionales `GET /quizzes/mine` y `GET /quizzes/:id/result` | Vista del estudiante sin depender del estado del quiz |
| 2026-10-18 | Las columnas `TIMESTAMP` se leen y escriben en UTC | `config/db.js` |
| 2026-10-22 | Toda respuesta de error lleva un `code` fijo en inglés | Interceptor en `app.js` y `docs/codigos-error.md` |

## 9.3 Cómo registrar una decisión nueva

1. Agregar una entrada `DP-nn` al final de `docs/ai/DECISIONES.md` con decisión, motivo, alternativa descartada y quién la aprobó.
2. Si es una decisión de implementación del backend, agregarla también en «Decisiones del equipo» de `CLAUDE.md`.
3. Si cambia la estructura, actualizar la sección correspondiente de este documento.