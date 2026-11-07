# 4. Estrategia de solución

## 4.1 Decisiones fundamentales

| Tema | Decisión | Razón | Referencia |
| --- | --- | --- | --- |
| Estilo de arquitectura | SPA + API REST monolítica en 5 capas | Un equipo pequeño y un solo curso: sin necesidad de microservicios | `CONTEXTO_PROYECTO` 2.6 |
| Capas del backend | `routes` → `controllers` → `services` → `repositories` → PostgreSQL, con dependencia en una sola dirección | Cambiar una capa sin romper las demás | Sección 5 (pendiente) |
| Lenguaje | JavaScript en ambos lados | Rotar de rol no obliga a cambiar de lenguaje | DP-07 |
| Base de datos | PostgreSQL relacional | Las reglas de integridad viven en el motor (únicos, claves foráneas) | DP-02 |
| Autenticación | Google OAuth + JWT propio (HS256, 8 horas) con el rol como claim | Sin contraseñas que custodiar; el rol viaja en el token | DP-26 |
| Repetición espaciada | SM-2 implementado por el equipo (`SM2Service`, factor mínimo 1.3) | Algoritmo estándar y documentado, sin dependencias | DP-14 |
| Léxico | WordNet 3.1 local con caché en la tabla `wordnet_cache` | Sin costo ni dependencia en vivo de un servicio externo | DP-08 |
| PDF | `pdf-lib` en el servidor | Pedido explícito de la docente | `CONTEXTO_PROYECTO` 2.5 |

## 4.2 Cómo se alcanza cada meta de calidad

| Meta | Enfoque | Dónde se ve |
| --- | --- | --- |
| Seguridad | `helmet`, CORS por lista, límite de intentos, JWT con `requireRole`, errores genéricos en producción, registro de eventos 401/403/5xx, `node:crypto` para códigos de acceso y barajado | `app.js`, `autenticacionMiddleware.js`, auditoría OWASP |
| Integridad del contenido | Índices únicos en `init.sql` (por ejemplo `tarjeta (mazo_id, palabra)`, `resultado_quiz (quiz_id, estudiante_id)`); transacciones al generar el quiz y al enviar respuestas; el estudiante solo ve tarjetas con `revisado_docente` en los quices | `init.sql`, `QuizService`, `ResultadoQuizRepository` |
| Mantenibilidad | Capas con responsabilidades separadas, pruebas unitarias, funcionales y E2E, análisis estático (SonarQube, CodeQL), documentación (README, OpenAPI, Arc42, comentarios en el código) | `backend/tests`, `.github/workflows`, `docs/` |
| Rendimiento | Consultas en lote en lugar de una por tarjeta; caché de WordNet; PDF generado en memoria con límite de peticiones | `CuraduriaService`, `WordnetService`, `reporteRoutes.js` |
| Usabilidad | Rutas protegidas por rol en el front, interfaz internacionalizada, modo oscuro | `src/App.jsx`, `src/i18n` |

## 4.3 Decisiones organizativas

- Gitflow con PR obligatorio hacia `develop` y revisión de al menos un compañero.
- CI con pruebas, análisis estático y suite OWASP en cada PR.
- Registro de decisiones del proyecto en `docs/ai/DECISIONES.md` (identificadores DP-nn).
- Todo cambio de arquitectura se anota en el registro de decisiones y, si afecta a la API, en el OpenAPI.