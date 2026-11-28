# 11. Riesgos y deuda técnica

## 11.1 Riesgos del proyecto

Tomados de `docs/ai/CONTEXTO_PROYECTO.md` (2.11).

| Riesgo | Mitigación |
| --- | --- |
| Disponibilidad de la docente | Reuniones fijas y grupo de mensajería |
| Baja participación de los estudiantes | Datos de prueba y piloto en clase |
| Inexperiencia con SM-2 | Pruebas unitarias tempranas |
| Ambigüedad legal de las frases de ejemplo | Límite de 150 caracteres y campo opcional |
| Expansión de alcance (GraphDB, diccionarios de pago) | Fuera del MVP |
| Duplicados | Restricción en el motor de base de datos |
| La pronunciación consume tiempo | Corte a mitad del Sprint 2 |

## 11.2 Deuda técnica y riesgos técnicos

Estado a la fecha de esta revisión. Todas están abiertas salvo que se indique lo contrario.

| # | Tema | Impacto | Acción sugerida |
| --- | --- | --- | --- |
| T1 | CA-2.1.3 (rechazo de tarjetas con observación) no está implementado; el mock del front conserva un rechazo que el backend no tiene | Criterio sin cubrir | Decidir si se implementa o se retira del backlog; quitar el mock si se retira |
| T2 | Los `DECIMAL` de `resultado_quiz` llegan como string | El cliente debe convertir con `Number()` | Convertir en el repositorio o documentarlo en el contrato |
| T3 | El control de tiempo del quiz usa `fecha_inicio` y `tiempo_empleado_seg` que informa el cliente | Un cliente manipulado podría extender su tiempo | Agregar un endpoint de inicio de intento (requiere aprobación del equipo) |
| T4 | Siete routers CRUD no montados y sin `authenticate` | Quedarían abiertos si alguien los monta | Protegerlos antes de montarlos, o eliminarlos |
| T5 | Servicios reservados sin código (`EnriquecimientoLexicoService`, `LimiteSemanalService`, `ModeracionService`) y `validacionMiddleware` vacío; las validaciones están repartidas en controladores y servicios | Confusión y duplicación | Eliminarlos o implementarlos; centralizar validaciones |
| T6 | Los contadores de límite de peticiones están en memoria | Se pierden al reiniciar y no se comparten entre instancias | Almacén compartido si se escala a más de una instancia |
| T7 | El JWT se guarda en `localStorage` y no hay mecanismo de revocación | Riesgo ante XSS; un token robado vale hasta las 8 horas | Evaluar cookies `HttpOnly` y una lista de revocación (la suite OWASP lo marca como advertencia) |
| T8 | `docker-compose.yml`: falta `CORS_ORIGINS`, el volumen monta `./backend` sobre `/app` pero la imagen corre en `/usr/src/app`, y el servicio frontend está comentado | Entorno local confuso | Corregir el compose |
| T9 | Los `.env.example` omiten variables que el código usa (backend: `DB_SSL`, `DB_SSL_CA_PATH`, `RATE_LIMIT_REPORTES_MAX`, `NODE_ENV`; frontend: `VITE_GOOGLE_CLIENT_ID`) | Configuración incompleta para quien clona | Verificar si ya se actualizaron y completarlos |
| T10 | Discrepancias entre backlog, DER y código abiertas: D-01, D-02, D-04, D-08, D-09, D-10 y D-11 (ver `CLAUDE.md`) | Documentación y código pueden divergir | Decisión del equipo sobre cada una |
| T11 | **Nueva:** DP-17 dice que los reportes no piden seleccionar curso, pero el endpoint de HU-020 (`GET /reports/students/export-pdf`) recibe `curso_id` | Contradicción entre decisión y código | Validar con el equipo y actualizar la que corresponda |
| T12 | El estado de HU-4.1 y HU-4.2 figura «Pendiente» en `CLAUDE.md`, pero existen `EstudioService`, `SM2Service` y `WordnetService` | Documentación desactualizada | Actualizar `CLAUDE.md` (el cambio de estado lo decide el equipo) |
| T13 | La Free Dictionary API prevista en DP-08 no está implementada | Palabras fuera de WordNet no tienen apoyo externo | Decidir si se implementa o se retira de DP-08 |
| T14 | Mezcla de etiquetas JSDoc y Doxygen en los comentarios y sin generación automática de la documentación del código | La documentación no se genera sola | Bloque 3C (generación) |