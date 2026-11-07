# 10. Requisitos de calidad

## 10.1 Árbol de calidad

| Categoría (ISO 25010) | Atributo | Meta | Prioridad |
| --- | --- | --- | --- |
| Seguridad | Confidencialidad e integridad de acceso | 0 vulnerabilidades críticas; suite OWASP Top 10 en pruebas | 1 |
| Seguridad | Autenticidad | Login con Google y JWT con rol | 1 |
| Fiabilidad | Integridad del contenido | Sin duplicados por mazo ni resultados repetidos; solo contenido aprobado en quices | 2 |
| Mantenibilidad | Capacidad de ser probado y analizado | Cobertura de pruebas mayor al 70 %; API documentada | 3 |
| Eficiencia | Comportamiento temporal | Carga menor a 2 s y latencia de la API menor a 500 ms | 4 |
| Eficiencia | Capacidad | 60 usuarios concurrentes; 1 GB de almacenamiento en capa gratuita | 4 |
| Usabilidad | Accesibilidad | Puntaje de accesibilidad mayor a 90 | 5 |
| Compatibilidad | Navegadores | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ | 5 |
| Fiabilidad | Disponibilidad | 99 % durante las 16 semanas; MTBF mayor a 30 días | 5 |

Las metas vienen de la Entrega 1 (`docs/ai/CONTEXTO_PROYECTO.md`, 2.9). La prioridad es una propuesta a validar con el equipo (ver sección 1.2).

## 10.2 Escenarios de calidad

| ID | Meta | Estímulo | Respuesta esperada | Medida | Cómo se verifica |
| --- | --- | --- | --- | --- | --- |
| Q1 | Seguridad | Un estudiante llama a un endpoint exclusivo de docente | La API responde 403 `AUTH_FORBIDDEN` y registra el evento | 100 % de las rutas de docente rechazan otros roles | Pruebas funcionales de CA-5.4.2 |
| Q2 | Seguridad | Alguien intenta adivinar credenciales en `/auth` | Tras 20 intentos fallidos en 15 minutos, la IP recibe 429 `RATE_LIMITED` | Límite configurable con `RATE_LIMIT_AUTH_MAX` | Suite OWASP (H-07) |
| Q3 | Seguridad | Ocurre un error interno en producción | El cliente recibe `INTERNAL_ERROR` sin detalle; el detalle queda en el log | 0 mensajes internos expuestos | Suite OWASP (H-08) |
| Q4 | Integridad | Un estudiante envía dos veces el mismo quiz (incluso en paralelo) | Solo existe un resultado; el segundo envío recibe el resultado previo | 1 fila por `(quiz_id, estudiante_id)` | Índice único y pruebas de CA-3.2.3 |
| Q5 | Integridad | Dos estudiantes registran «Cooking» y «cooking» en el mismo mazo | No se crea una segunda tarjeta; se suma un aporte | 1 tarjeta por mazo y palabra normalizada | Pruebas de CA-1.3.3 |
| Q6 | Integridad | La docente genera un quiz | Solo se usan tarjetas `revisado_docente` de los mazos elegidos | 0 tarjetas pendientes en un quiz | Pruebas de CA-3.1.1 |
| Q7 | Mantenibilidad | Un integrante nuevo agrega un endpoint | Sigue las capas, actualiza el OpenAPI y el CI queda en verde | PR aprobado con lint, pruebas y SonarQube en verde | Workflows de CI |
| Q8 | Usabilidad | Un invitado abre el diccionario sin sesión | Ve la información en solo lectura | Sin edición ni 401 en las consultas públicas | Pruebas de CA-5.4.3 |
| Q9 | Eficiencia | La docente abre el panel de curaduría con muchas tarjetas | Se resuelve con consultas en lote, no una por tarjeta | Latencia de la API menor a 500 ms | Meta **sin medición registrada** (pendiente) |
| Q10 | Fiabilidad | Render reinicia el servicio | El servicio vuelve a responder en `/health`; los contadores de límite de peticiones se reinician | Disponibilidad de 99 % | Meta **sin medición registrada** (pendiente) |

Las metas de eficiencia, disponibilidad y accesibilidad no tienen medición en los repositorios; está pendiente medirlas (por ejemplo con Lighthouse para carga y accesibilidad).