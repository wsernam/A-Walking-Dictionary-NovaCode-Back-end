### 2.1 Origen del proyecto
*Fuentes: Propuesta v2, Entrega 1 (Definición del Producto) y Presentación de la entrega 1.*

- **Asignatura y equipo.** Proyecto II, Ingeniería de Sistemas, Universidad del Cauca (Departamento de Sistemas). Grupo **NovaCode**, cuatro integrantes: Thalia Bernal, William Serna, Manuela Meneses y Karen Sandoval. Duración: 16 semanas del semestre, metodología Scrum en 3 sprints.
- **Antecedente técnico.** Parte del trabajo de Arquitectura de la Información «Sistema de tarjetas de aprendizaje de idiomas con base a un tesauro» (Ashlee V. Campaz Valencia y Karen N. Sandoval Sánchez): mazos, tarjetas, etiquetas de contexto, búsqueda y navegación. Era un producto genérico («un Anki mejorado») con usuarios hipotéticos, GraphDB y estándar SKOS.
- **Giro del proyecto.** Se adaptó ese trabajo a un caso real y validado: el curso de **Literatura Anglófona** de la Licenciatura en Educación Bilingüe. La docente fue entrevistada en dos reuniones; en la segunda validó punto por punto cada funcionalidad. Cambió quién sube el contenido, para quién es y con qué tecnología se construye; se conservó la arquitectura de información.
- **Rúbrica que gobierna el proyecto.** Sustentación (15 %), Introducción y justificación (10 %), Estado del arte técnico (20 %), Diseño del producto y arquitectura (20 %), Gestión de proyecto y roles (20 %), Uso responsable de IA generativa (10 %). Exige evidencia de usuarios reales, bitácora de prompts, validación crítica de la IA y rotación de roles.

### 2.2 Problema
El curso trabaja una lectura por semana (aprox. un libro cada dos semanas) y los estudiantes deben incorporar vocabulario nuevo. El ejercicio **«A Walking Dictionary»** se hacía en papel: cada semana un estudiante distinto reportaba palabras nuevas y al final se compilaban para un quiz. Problemas: pérdida de información, consulta limitada del vocabulario de semanas anteriores, ausencia de registro digital reutilizable, sin repaso espaciado, sin nota individual, y sin capturar lo central del curso: el **contexto cultural, dialectal y de registro** de cada palabra. La docente lo había intentado con Classroom y una tabla de Excel no interactiva.

### 2.3 Solución (MVP)
Aplicación web de tarjetas de vocabulario **colaborativa y curricular**:
- **Mazos** semanales ligados al libro del cronograma (p. ej. «Semana 3 — Stitch by Stitch»). La docente los crea; pueden precargarse ~16 mazos al inicio del semestre. Estado abierto/cerrado.
- **Aporte de vocabulario.** El estudiante registra palabra, traducción, definición y, opcionalmente, una frase corta de ejemplo (nunca texto del libro; máximo 150 caracteres). **El estudiante no etiqueta el contexto cultural/dialectal/registro**: encontró la palabra justamente por no conocerla.
- **Diccionario colectivo.** Las tarjetas de todos van al mismo mazo compartido y todos ven los mazos de sus compañeros (intencional).
- **Control de duplicados.** Misma palabra y misma definición: avisa y suma el aporte; misma palabra con otra definición: se permite como acepción adicional; la comparación ignora mayúsculas.
- **Revisión docente previa al quiz** (requisito no negociable): la docente revisa, edita, aprueba y asigna etiquetas de contexto; los estudiantes estudian y se evalúan sobre contenido ya validado. Si dos estudiantes registran definiciones distintas se muestran ambas; la docente decide.
- **Repaso individual** con repetición espaciada **SM-2**, acumulando mazos anteriores.
- **Quiz automático** aprox. cada dos semanas, con las tarjetas aprobadas, calificado individualmente. **Exportación a PDF** de mazos y quices (contingencia: fotocopiar sin conectividad; quiz con hoja de respuestas separada para la docente).
- **Sugerencias por familia de palabras** a partir de WordNet (no necesariamente sinónimos).
- **Seguimiento docente**: aportes por estudiante, quién hizo el quiz, estado del mazo.
- **Exploratorio, no requisito del MVP**: pronunciación (Web Speech API / TTS), con criterio de corte a mitad del Sprint 2.

Flujo semanal: la docente crea el mazo → los estudiantes leen y aportan palabras → repasan con SM-2 → la docente revisa y corrige → se genera el quiz (con PDF opcional) → la docente revisa el seguimiento → se repite acumulando mazos.

### 2.4 Roles de la aplicación
- **Docente**: crea mazos, revisa/aprueba/edita tarjetas, asigna etiquetas de contexto, genera quices, ve notas y seguimiento.
- **Estudiante** (inscrito en el curso): ve todos los mazos, aporta palabras, estudia con SM-2, presenta quices y recibe nota individual.
- **Invitado**: demostración interactiva limitada, sin acceso al material completo del curso.
- Se maneja **un solo curso** (los reportes no piden seleccionar curso).

### 2.5 Stack y por qué *(Entrega 1, decisiones 1 a 5)*
| Capa | Elección | Razón decisiva | Descartado |
|---|---|---|---|
| Frontend | **React** (SPA, responsive) | Mayor soporte documentado, continuidad con el trabajo base | Angular (demasiado rígido para un MVP de 16 semanas con roles rotativos) |
| Backend | **Node.js 20 + Express**, API REST bajo `/api/v1` | Un solo lenguaje (JavaScript) para que rotar de rol no obligue a cambiar de lenguaje | Django, Spring Boot |
| Base de datos | **PostgreSQL** | Reglas relacionales en el motor (aporte pertenece a tarjeta y estudiante; sin palabras duplicadas por mazo) | GraphDB + SKOS (sin beneficio para el volumen de un curso) |
| Léxico | **WordNet 3.1 local** (`node-wordnet`) con caché en la tabla `wordnet_cache`; Free Dictionary API solo como apoyo opcional que nunca se guarda sin confirmación | Sin costo ni dependencia en vivo | Cambridge (sin API pública), Oxford (de pago y descontextualizado) |
| Entornos | **Docker + Docker Compose** (dev local) | Mismo entorno para todo el equipo | Instalación manual |
| Repetición espaciada | **SM-2** implementado por el equipo | Estándar, documentado, sin dependencias | — |
| PDF | pdf-lib / jsPDF | Pedido explícito de la docente | — |
| Gestión | **Trello** (tablero: Tareas, Product Backlog, Sprint Backlog, En proceso, En revisión, Terminado) + **Slack** (comunicación) | Gratuitas, visuales, trazabilidad | Jira, Azure DevOps |

Ajuste de alcance: el enriquecimiento léxico (sugerir palabras relacionadas) se mantiene en el MVP pero se **programa para el Sprint 3**, limitado a inglés, con consulta bajo demanda y caché. **Criterio objetivo: si tras 12 días de esfuerzo en el Sprint 3 no está funcional, se documenta como trabajo futuro** y se entrega el flujo base (estudiante registra, docente valida).

### 2.6 Arquitectura en 5 capas (dependencia unidireccional)
1. **Presentación**: React.
2. **Conector / API**: rutas y controladores REST.
3. **Motor de negocio / servicios de dominio**: reglas del mazo, filtro de 150 caracteres, SM-2, generación de quices.
4. **Gestor de datos**: repositorios SQL.
5. **Infraestructura**: PostgreSQL y WordNet local.

### 2.7 Modelo de datos *(Tabla 4A de la Entrega 1; el DER oficial, con nombres en singular, está en la sección 8 desde `CLAUDE.md` del backend y en `init.sql`; ante diferencias manda `init.sql`)*
Entidades: **Usuario** (nombre, correo, contraseña, rol, nivel_ingles), **Curso**, **Inscripción**, **Mazo** (nombre_lectura, autor, semana, variante regional, estado, fechas), **Tarjeta** (palabra, traducción, definición, ejemplo, estado), **Aporte** (traducción/definición/ejemplo aportados, tipo), **Etiqueta_contexto** (tipo, valor, docente), **Progreso_estudio** (factor de facilidad, intervalo, repeticiones, próxima fecha de repaso: SM-2), **Quiz**, **Quiz_mazo**, **Pregunta_quiz**, **Resultado_quiz**, **Respuesta_quiz**.
Relaciones clave: Curso 1:N Mazo; Mazo 1:N Tarjeta; Usuario N:N Tarjeta vía Aporte; Tarjeta 1:N Etiqueta_contexto; Quiz N:N Mazo vía Quiz_mazo; Quiz 1:N Pregunta_quiz; Quiz 1:N Resultado_quiz; Resultado_quiz 1:N Respuesta_quiz.

### 2.8 Ambientes y despliegue
- **Desarrollo**: Docker Compose local. Frontend `localhost:3000`, backend `localhost:5000`, PostgreSQL `5432`. El repo **infra** solo orquesta (compose, `.env.example`, README); backend y frontend se clonan dentro (rama `develop`).
- **Staging**: Vercel (preview del front) + Render (backend desde su Dockerfile) + proyecto Supabase separado con datos de prueba.
- **Producción**: Vercel (rama `main`) + Render + Supabase con connection pooling.
- Quien tenga el rol DevOps/QA en el sprint mantiene `docker-compose.yml` y el README del repo infra.

### 2.9 Restricciones y atributos de calidad *(metas de la Entrega 1)*
- Navegadores: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.
- Rendimiento: carga < 2 s y latencia de API < 500 ms. Disponibilidad 99 % durante las 16 semanas. Escalabilidad: 60 usuarios concurrentes. Almacenamiento: tope de 1 GB en capa gratuita.
- Seguridad: 0 vulnerabilidades críticas, contraseñas con bcrypt, JWT con claims de rol, suite OWASP Top 10 en pruebas. *(La Entrega 1 menciona OAuth; el backlog y la presentación hablan de JWT + bcrypt. Lo vigente es lo que esté implementado en el backend: no asumas.)*
- Usabilidad: accesibilidad > 90. Mantenibilidad: **cobertura de pruebas > 70 %** y API documentada. Confiabilidad: MTBF > 30 días.

### 2.10 Limitaciones asumidas
1. El contexto cultural/dialectal no lo puede aportar el estudiante ni WordNet: lo completa la docente o la discusión en clase; el campo puede quedar incompleto hasta entonces.
2. Sin Cambridge/Oxford no se detecta automáticamente si una palabra es anticuada u ofensiva.
3. WordNet no cubre modismos, variantes regionales (jamaiquino, ghanés) ni coloquialismos: la traducción de esos casos la escribe el estudiante.
4. La carga del dataset semilla (PDF de vocabulario de la docente) exige preparación de datos.
5. El valor depende de la participación activa de los estudiantes.
6. La app no aloja libros ni resuelve su acceso (derechos de autor).
7. La pronunciación no está garantizada en el MVP.

### 2.11 Riesgos y mitigaciones
Disponibilidad de la docente (reuniones los miércoles en la mañana, grupo de WhatsApp); baja participación (datos de prueba y piloto en su clase del jueves 9 a. m. a 1 p. m.); inexperiencia con SM-2 (pruebas unitarias tempranas); ambigüedad legal de frases de ejemplo (límite de 150 caracteres, opcional); expansión de alcance hacia GraphDB/SKOS o diccionarios de pago (fuera del MVP); duplicados (restricción en el motor); pronunciación que consume tiempo (corte a mitad del Sprint 2).

### 2.12 Gestión del proyecto
- **Scrum** en 3 sprints: 1 Fundamentos y Arquitectura; 2 Lógica de Negocio y Algoritmos; 3 Integración, Cierre y Despliegue (pruebas de rendimiento y seguridad, despliegue en producción).
- **Rotación de roles obligatoria**: cada integrante debe pasar por al menos dos roles distintos; el liderazgo cambia cada sprint. **La rotación vigente es la de la sección 5 (se genera desde `docs/ai/roles.json`); no uses otra.**
- Gitflow: ramas `feature/...` desde `develop`, PR hacia `develop` con al menos una revisión, `main` protegida, un repo por capa (frontend, backend, infra).
- Épicas, historias y criterios de aceptación: los define el backlog (sección 6), con prioridad, estado y estimaciones. Cada HU se trabaja contra sus criterios Dado/Cuando/Entonces.

### 2.13 Política de uso de IA generativa *(Entrega 1, sección 6; Presentación)*
- **Declarado**: ChatGPT, Claude y Gemini para estructurar documentación y fundamentación; Claude para componentes React, endpoints Node.js y refactorización; Stitch para mockups; Google AI Studio para prototipado de flujos.
- **Límites declarados**: la IA propone; las decisiones de diseño, requisitos y planeación son del equipo. No hay decisiones de arquitectura autónomas de la IA. Todo el código se revisa, se prueba y se verifica manualmente (incluida seguridad OWASP Top 10).
- **Validación crítica**: verificar cada referencia, corregir errores, adaptar al contexto del proyecto, reescribir con tono académico. Toda cifra o afirmación fáctica generada se contrasta con una fuente confiable.
- **Diferenciación**: el contenido asistido por IA se marca de forma explícita («[Asistido por IA]» o «Esta sección fue estructurada con asistencia de …») indicando herramienta y validación hecha; el contenido propio no lleva etiqueta.
- **Bitácora de prompts**: cada uso relevante se registra con fecha, prompt, herramienta, resultado y validación (VALIDADO, ADAPTADO, CORREGIDO o RECHAZADO), con el responsable. Es criterio crítico de la rúbrica.

### 2.14 Convenciones para entender el historial
- Prompt-ID: `P-AAAAMMDD-HHMM[-HU-nnn]`; aparece como trailer `Prompt-ID:` en commits y como fila en `TRAZABILIDAD.md`.
- Las HU se nombran de dos formas: Excel (`HU-009`) y `CLAUDE.md`/ramas del backend (`HU-3.3`).
- Las secciones 7, 9, 10 y 11 de este prompt se generan en el momento de ejecutar `fill`: son el estado real del proyecto hoy.
