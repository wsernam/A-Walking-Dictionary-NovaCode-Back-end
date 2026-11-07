# 1. Introducción y metas

## 1.1 Visión general de los requisitos

**A Walking Dictionary** es una aplicación web de vocabulario contextualizado para el curso de Literatura Anglófona (Licenciatura en Educación Bilingüe, Universidad del Cauca). Digitaliza el ejercicio «A Walking Dictionary», que se hacía en papel: cada semana un estudiante reportaba palabras nuevas de la lectura y al final se compilaban para un quiz. El papel perdía información, no permitía consultar semanas anteriores, no daba repaso espaciado ni nota individual, y no capturaba el contexto cultural, dialectal y de registro de cada palabra.

La aplicación es colaborativa y curricular:

- La docente crea **mazos** semanales ligados a la lectura del cronograma.
- Los estudiantes **aportan palabras** (traducción, definición y un ejemplo opcional de máximo 150 caracteres) a un mazo compartido. Si la palabra ya existe, el sistema suma una coautoría o registra una acepción adicional.
- La docente **revisa, edita y aprueba** las tarjetas y les asigna etiquetas de contexto. Este paso es previo al quiz y no es negociable.
- Los estudiantes **repasan** con repetición espaciada (SM-2) y reciben **sugerencias** de palabras relacionadas (WordNet).
- El sistema **genera quices** automáticos con las tarjetas aprobadas y los califica por estudiante.
- Mazos, quices y reportes se **exportan a PDF**.

Los requisitos se organizan en 7 épicas, 21 historias de usuario (HU) y 61 criterios de aceptación (CA). El detalle vigente está en el backlog (`docs/ai/Backlog_HU.xlsx`).

| Épica | Tema | Historias principales |
| --- | --- | --- |
| HE-01 | Gestión curricular de mazos y vocabulario | HU-1.1 crear mazos, HU-1.2 registrar palabra, HU-1.3 detectar duplicados |
| HE-02 | Supervisión y curaduría pedagógica docente | HU-2.1 revisar y aprobar, HU-2.2 etiquetas de contexto, HU-2.3 resumen de participación |
| HE-03 | Evaluación automatizada y exportación | HU-3.1 generar quices, HU-3.2 responder quiz, HU-3.3 exportar a PDF |
| HE-04 | Repaso adaptativo y enriquecimiento léxico | HU-4.1 repetición espaciada, HU-4.2 familias de palabras |
| HE-05 | Gestión de usuarios, perfiles e inscripción | HU-5.1 registro, HU-5.2 perfil, HU-5.3 inscripción, HU-5.4 login y roles |
| HE-06 | Consulta centralizada de vocabulario y mazos | HU-016 diccionario global, HU-017 consulta de mazos |
| HE-07 | Generación de reportes | HU-018 a HU-021 (reportes en PDF) |

## 1.2 Metas de calidad

Orden propuesto por el equipo de documentación; **pendiente de validar con el equipo**. El detalle y los escenarios están en la sección 10.

| Prioridad | Meta | Motivación |
| --- | --- | --- |
| 1 | Seguridad | Hay datos de estudiantes y control por roles; la auditoría OWASP Top 10:2025 encontró fallos de control de acceso que hubo que corregir. |
| 2 | Integridad del contenido | Los estudiantes se evalúan solo sobre vocabulario validado por la docente; no puede haber palabras duplicadas por mazo ni resultados repetidos. |
| 3 | Mantenibilidad | Equipo de 4 integrantes con rotación de roles; cobertura de pruebas mayor al 70 % y API documentada. |
| 4 | Rendimiento | Latencia de la API menor a 500 ms y carga menor a 2 s para unos 60 usuarios concurrentes. |
| 5 | Usabilidad | Interfaz distinta por rol (docente, estudiante, invitado) y accesibilidad mayor a 90. |

## 1.3 Partes interesadas

| Parte interesada | Qué espera |
| --- | --- |
| Docente del curso de Literatura Anglófona (usuaria principal) | Curar el vocabulario, evaluar y hacer seguimiento sin trabajo manual. |
| Estudiantes del curso | Aportar y estudiar vocabulario, presentar quices y ver su nota. |
| Invitado | Ver una demostración de solo lectura. |
| Docente de Proyecto II (evaluación académica) | Evidencia de diseño, gestión, calidad y uso responsable de IA. |
| Equipo NovaCode (4 integrantes) | Un código que se pueda entender y mantener pese a la rotación de roles. |