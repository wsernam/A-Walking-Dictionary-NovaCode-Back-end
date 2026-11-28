# Matriz RBAC — A Walking Dictionary

Nov 17, 2026 · @Karen Sandoval

## 1. Objetivo y alcance

Este documento define qué puede hacer cada rol en A Walking Dictionary y es la fuente de las pruebas automáticas de acceso del backend. Cubre los 61 endpoints montados en `app.js` bajo `/api/v1`; las rutas de `routes/index.js` no están montadas y quedan fuera.

- Definir roles, permisos y herencia en una matriz de control de acceso.
- Traducir la matriz a tablas SQL y a un middleware de autorización en el servidor.
- Detectar combinaciones de permisos que rompen la separación de funciones.
- Verificar la matriz con pruebas automáticas, una por cada celda.

**Principio rector:** todo lo que no está concedido de forma explícita queda denegado.

La interfaz (React) solo refleja lo que el servidor ya decidió: ocultar un botón no protege nada, por eso todas las decisiones de este documento se aplican en el backend.

### Cómo se lee

> ● permitido. · denegado.
>
> Un denegado da 401 para Invitado y 403 para los demás roles.
>
> † hueco confirmado: el valor de la tabla es lo seguro, pero la prueba ejecutada contra el backend comprobó que hoy lo permite (sección 8, Hallazgos).
>
> ⚑ supuesto pendiente de validar con el equipo.
>
> Propiedad indica qué verifica el servidor además del rol (\_own). No hay herencia entre roles.

### Trazabilidad normativa de la matriz

| Principio | Control de referencia |
| --- | --- |
| Control de acceso aplicado en el servidor | OWASP ASVS V4.1 · NIST SP 800-53 AC-3 · ISO/IEC 27001 A.5.15 |
| Gestión de cuentas y roles | NIST AC-2 · ISO/IEC 27001 A.5.18 |
| Mínimo privilegio | NIST AC-6 · ISO/IEC 27001 A.8.2 · ASVS V4.1.3 |
| Separación de funciones | NIST AC-5 · ISO/IEC 27001 A.5.3 |
| Registro de actividad | NIST AU-2 · ISO/IEC 27001 A.8.15 |

## 2. Roles

Hay cuatro roles y ninguno hereda de otro. Cada usuario tiene un solo rol, guardado en `usuario.rol`; Invitado no se guarda en la base de datos: es quien llega sin token.

| Rol | Hereda de | Responsabilidad |
| --- | --- | --- |
| Invitado (`invitado`) | ninguno | Solo lectura pública: diccionario, cursos, mazos |
| Estudiante (`estudiante`) | ninguno | Aporta palabras, estudia, responde quices, ve su perfil y reportes |
| Docente (`docente`) | ninguno | Crea cursos y mazos, cura tarjetas, genera quices, ve analíticas y reportes |
| Administrador (`administrador`) | ninguno | Asigna roles y gestiona cuentas (lista, busca, activa y desactiva usuarios). No accede a funciones académicas |

## 3. Matriz de permisos

Cada columna es un rol y cada fila un permiso. Un denegado responde 401 a Invitado y 403 al resto; un permitido nunca responde 401, 403 ni 5xx.

### AUTENTICACIÓN

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `auth.login` | POST /auth/google | ● | ● | ● | ● | Público |
| 2 | `auth.register` | POST /auth/register | ● | ● | ● | ● | Público |

### DICCIONARIO

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | `dictionary.read` | GET /dictionary | ● | ● | ● | ● | Público |
| 4 | `dictionary.read_card` | GET /dictionary/:card\_id | ● | ● | ● | ● | Público |
| 5 | `enrichment.family` | GET /enrichment/family/:word | ● | ● | ● | ● | Público |

### CURSOS E INSCRIPCIÓN

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | `course.list` | GET /courses | ● | ● | ● | ● | Auth opcional |
| 7 | `course.read` | GET /courses/:id | ● | ● | ● | ● | Auth opcional |
| 8 | `course.create` | POST /courses | · | · | ● | · |  |
| 9 | `course.enroll` | POST /courses/enroll | · | ● | · | · | `estudiante_id` sale del JWT |
| 10 | `course.access_code` | POST /courses/:id/access-code | · | · | ● | · | Dueño del curso † |
| 11 | `course.assign` | POST /courses/:id/assign | · | · | ● | · | Dueño del curso † |
| 12 | `course.students` | GET /courses/:id/students | · | · | ● | · | Dueño del curso † |

### MAZOS

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | `deck.list` | GET /decks | ● | ● | ● | ● | El estudiante ve solo los de sus cursos |
| 14 | `deck.read` | GET /decks/:id | ● | ● | ● | ● | Público, intencional (decisión del equipo) |
| 15 | `deck.create` | POST /decks | · | · | ● | · |  |
| 16 | `deck.edit_own` | PUT /decks/:id | · | · | ● | · | Dueño del mazo |
| 17 | `deck.set_status` | PATCH /decks/:id/estado | · | · | ● | · | Cualquier docente autenticado (decisión del equipo, 2026-11-11) |
| 18 | `deck.set_variant` | PATCH /decks/:id/default-variant | · | · | ● | · | Dueño del mazo |
| 19 | `deck.export` | GET /decks/:id/export-pdf | · | · | ● | · | Dueño del mazo † |
| 20 | `deck.delete_own` | DELETE /decks/:id | · | · | ● | · | Dueño del mazo |
| 21 | `deck.analytics` | GET /teacher/analytics/deck/:id | · | · | ● | · | Dueño del mazo † |

### TARJETAS

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 22 | `card.create` | POST /decks/:id/cards | · | ● | · | · | Estudiante inscrito en el curso del mazo |
| 23 | `card.check_duplicate` | POST /cards/check-duplicate | · | ● | ● | · † ⚑ | Hoy solo exige sesión |
| 24 | `card.read` | GET /cards/:id | ● | ● | ● | ● | Público, intencional (decisión del equipo) |
| 25 | `card.list_pending` | GET /cards/pending | · | · | ● | · |  |
| 26 | `card.list_approved` | GET /cards/approved | · | · | ● | · |  |
| 27 | `card.edit_review` | PUT /cards/:id | · | · | ● | · | Docente dueño del curso † |
| 28 | `card.context` | PUT /cards/:id/context | · | · | ● | · | Docente dueño del curso † |
| 29 | `card.approve` | PATCH /cards/:id/approve | · | · | ● | · | Docente dueño del curso † |

### APORTES

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30 | `contribution.create` | POST /aportes | · | ● | ● | · | `inscripcion_id` debe ser del usuario † |
| 31 | `contribution.list` | GET /aportes | · | ● | ● | · | El estudiante ve solo los suyos † |
| 32 | `contribution.read` | GET /aportes/:id | · | ● | ● | · | El estudiante solo el suyo † |
| 33 | `contribution.pending` | GET /aportes/pending | · | · | ● | · |  |
| 34 | `contribution.edit` | PUT /aportes/:id | · | · | ● | · | Docente dueño del curso † |
| 35 | `contribution.approve` | PATCH /aportes/:id/approve | · | · | ● | · | Docente dueño del curso † |
| 36 | `contribution.delete` | DELETE /aportes/:id | · | · | ● | · | Docente dueño del curso † |

### QUICES

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 37 | `quiz.generate` | POST /quizzes/generate | · | · | ● | · |  |
| 38 | `quiz.create` | POST /quizzes | · | · | ● | · |  |
| 39 | `quiz.list` | GET /quizzes | · | ● | ● | · † ⚑ | Hoy solo exige sesión |
| 40 | `quiz.list_mine` | GET /quizzes/mine | · | ● | · | · |  |
| 41 | `quiz.read` | GET /quizzes/:id | · | ● | ● | · † ⚑ | Estudiante inscrito, docente dueño † |
| 42 | `quiz.edit` | PUT /quizzes/:id | · | · | ● | · | Docente dueño † |
| 43 | `quiz.delete` | DELETE /quizzes/:id | · | · | ● | · | Docente dueño † |
| 44 | `quiz.export` | GET /quizzes/:id/export-pdf | · | · | ● | · | Docente dueño † |
| 45 | `quiz.teacher_results` | GET /quizzes/:id/teacher-results | · | · | ● | · | Docente dueño † |
| 46 | `quiz.teacher_result_detail` | GET /quizzes/:id/teacher-results/:resultadoId | · | · | ● | · | Docente dueño † |
| 47 | `quiz.questions` | GET /quizzes/:id/preguntas | · | ● | · | · | Estudiante inscrito |
| 48 | `quiz.submit` | POST /quizzes/:id/submit | · | ● | · | · | Estudiante inscrito |
| 49 | `quiz.result` | GET /quizzes/:id/result | · | ● | · | · | Estudiante inscrito |

### ESTUDIO (REPETICIÓN ESPACIADA)

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | `study.start` | POST /study/review-session | · | ● | · | · | `inscripcion_id` propia |
| 51 | `study.review` | POST /study/review-session/review | · | ● | · | · | `inscripcion_id` propia |

### USUARIOS Y PERFIL

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 52 | `profile.edit_own` | PATCH /users/profile | · | ● | · | · | El id sale del JWT |
| 53 | `profile.read` | GET /users/:id | · | ● | ● | · | Estudiante solo el suyo; docente cualquier estudiante (decisión del equipo) |
| 54 | `student.context` | GET /students/:id/context | · | ● | ● | · | Estudiante solo el suyo; docente cualquier estudiante |

### REPORTES

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 55 | `report.study` | GET /reports/study-mode/export-pdf | · | ● | ● | · | Estudiante solo el suyo; docente cualquiera (decisión del 2026-11-06) |
| 56 | `report.progress` | GET /reports/students/:id/progress/export-pdf | · | ● | ● | · | Igual que la fila 55 |
| 57 | `report.course` | GET /reports/students/export-pdf | · | · | ● | · | Docente dueño del curso |
| 58 | `report.quiz_results` | GET /reports/quizzes/:id/results/export-pdf | · | · | ● | · | Docente dueño del quiz |

### ADMINISTRACIÓN

| # | Permiso | Endpoint | Inv | Est | Doc | Adm | Propiedad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 59 | `admin.users_list` | GET /admin/users | · | · | · | ● |  |
| 60 | `admin.user_role` | PATCH /admin/users/:id/role | · | · | · | ● | No cambia su propio rol; protege al último administrador |
| 61 | `admin.user_status` | PATCH /admin/users/:id/status | · | · | · | ● | No cambia su propio estado; protege al último administrador |

### Permisos efectivos por rol

|  | Invitado | Estudiante | Docente | Administrador |
| --- | --- | --- | --- | --- |
| **Permisos efectivos (de 61)** | 10 | 29 | 49 | 13 |

La unión de roles no aplica: cada usuario tiene un solo rol. Los permisos terminados en `_own` o con propiedad conceden la capacidad solo sobre recursos propios, así que el servidor también debe comprobar que el recurso pertenezca al usuario (secciones 6 y 7).

## 4. Separación de funciones (SoD)

Una regla de separación de funciones (SoD, *separation of duties*) es un par de permisos que una misma persona no debe reunir. Como cada usuario tiene un solo rol, basta revisar cada rol de la matriz: los cuatro roles cumplen las tres reglas.

| Regla | Par de permisos | Motivo | Control |
| --- | --- | --- | --- |
| R1 | `card.create` + `card.approve` | Quien aporta una tarjeta no la aprueba | NIST AC-5 · ISO/IEC 27001 A.5.3 |
| R2 | `admin.user_role` + `card.approve` | Quien administra cuentas no valida contenido académico | NIST AC-5 · AC-6 |
| R3 | `quiz.submit` + `quiz.edit` | Quien responde un quiz no puede editarlo | NIST AC-5 · AC-6 |

### Verificación por rol

| Rol | Permisos efectivos | R1 | R2 | R3 | Resultado |
| --- | --- | --- | --- | --- | --- |
| Invitado | 10 | Cumple | Cumple | Cumple | Cumple |
| Estudiante | 29 | Cumple | Cumple | Cumple | Cumple |
| Docente | 49 | Cumple | Cumple | Cumple | Cumple |
| Administrador | 13 | Cumple | Cumple | Cumple | Cumple |

Hasta el 2026-11-27 el Docente reunía `card.create` y `card.approve`, porque `POST /decks/:id/cards` aceptaba los roles `docente` y `estudiante` y `PATCH /cards/:id/approve` es del docente. El equipo decidió quitar `docente` de ese endpoint (D-13): ahora solo lo usa el estudiante, y el docente recibe 403 `AUTH_FORBIDDEN`.

El endpoint `PATCH /admin/users/:id/role` reemplaza el valor de `usuario.rol`, así que un usuario no acumula roles y no puede reunir permisos de dos roles.

## 5. Modelo de datos

El proyecto no tiene tablas de roles ni de permisos: el rol es la columna `usuario.rol` y la matriz de la sección 3 se aplica en el código con `requireRole` y se verifica con un archivo de datos (sección 8). Lo que sí está en PostgreSQL es la información que permite comprobar la propiedad de cada recurso. La base se crea con `init.sql` y los datos de prueba con `seed.sql`.

| Tabla | Columnas que importan para el acceso | Para qué sirven |
| --- | --- | --- |
| `usuario` | `rol` VARCHAR(30) NOT NULL, `activo` BOOLEAN | Rol único del usuario; una cuenta con `activo = false` no puede iniciar sesión |
| `curso` | `docente_id` → `usuario` | Docente dueño del curso |
| `inscripcion` | `curso_id`, `estudiante_id`, `estado`; única por (`curso_id`, `estudiante_id`) | Define quién está «inscrito» en un curso |
| `mazo` | `curso_id`, `docente_id` | Dueño del mazo; `docente_id` repite `curso.docente_id` por decisión del equipo |
| `tarjeta` | `mazo_id` | La tarjeta pertenece al curso de su mazo |
| `aporte` | `tarjeta_id`, `inscripcion_id` | Autor del aporte: `inscripcion` → estudiante |
| `quiz` | `curso_id` | Dueño: `curso.docente_id`; estudiantes con acceso: los inscritos en ese curso |
| `resultado_quiz` | `quiz_id`, `estudiante_id`; único por (`quiz_id`, `estudiante_id`) | El resultado es de un solo estudiante |
| `progreso_estudio` | `inscripcion_id`, `tarjeta_id` | La sesión de estudio es de la inscripción |

### Consultas de referencia para la propiedad

```sql
-- ¿El docente $2 es dueño de la tarjeta $1?
SELECT 1 FROM tarjeta t
  JOIN mazo m  ON m.id_mazo  = t.mazo_id
  JOIN curso c ON c.id_curso = m.curso_id
 WHERE t.id_tarjeta = $1 AND c.docente_id = $2;

-- ¿El estudiante $2 está inscrito (activo) en el curso del quiz $1?
SELECT 1 FROM quiz q
  JOIN inscripcion i ON i.curso_id = q.curso_id
 WHERE q.id_quiz = $1 AND i.estudiante_id = $2 AND i.estado = 'activa';
```

La columna `rol` no tiene restricción `CHECK` ni tabla de catálogo: los valores válidos (`estudiante`, `docente`, `administrador`) los controla la aplicación. Un valor desconocido no está en ningún `requireRole`, así que queda denegado.

## 6. Verificación de acceso en el servidor

La decisión se toma siempre en el backend (Node.js + Express), en tres pasos que se declaran en cada ruta: identificar la sesión, comprobar el rol y comprobar la propiedad del recurso.

1. **`authenticate`** verifica el JWT del encabezado `Authorization: Bearer <token>` (algoritmo HS256, firmado con `JWT_SECRET`) y deja `{ id_usuario, email, rol }` en `req.usuario`. El rol sale del token firmado, nunca del cuerpo de la petición.
2. **`requireRole(...roles)`** responde 403 si el rol del token no está en la lista de la ruta.
3. **Propiedad:** el controlador o el servicio compara el recurso con `req.usuario.id_usuario` (dueño del mazo, inscripción del estudiante, docente del curso).

`autenticacionOpcional` se usa en las lecturas públicas (`GET /courses`, `GET /courses/:id`, `GET /decks`): con un token válido personaliza la respuesta; sin token o con uno inválido atiende como Invitado.

```js
router.post('/',    authenticate, requireRole('docente'), MazoController.crear);
router.get('/',     autenticacionOpcional, MazoController.listar);

// Propiedad: el permiso solo no basta.
function esDuenoDelMazo(req, mazo) {
  return Number(mazo.docente_id) === Number(req.usuario?.id_usuario);
}
```

### Respuestas de denegación

| Situación | HTTP | `code` |
| --- | --- | --- |
| Sin encabezado `Authorization` | 401 | `AUTH_TOKEN_MISSING` |
| Token inválido o expirado | 401 | `AUTH_TOKEN_INVALID` |
| Rol no permitido en la ruta | 403 | `AUTH_FORBIDDEN` |
| Perfil de otro usuario | 403 | `PROFILE_FORBIDDEN` |
| Contexto académico de otro estudiante | 403 | `STUDENT_CONTEXT_FORBIDDEN` |
| Reporte de otro estudiante o rol sin permiso | 403 | `REPORT_FORBIDDEN` |
| Mazo de otra docente (editar, variante, eliminar) | 403 | `DECK_NOT_OWNER` |
| Registrar palabra sin estar inscrito | 403 | `DECK_NOT_ENROLLED` |
| Quiz de un curso donde no está inscrito | 403 | `QUIZ_NOT_ENROLLED` |
| Inscripción ajena en la sesión de estudio | 403 | `ENROLLMENT_FORBIDDEN` |
| Resultados de quiz de otra docente | 403 | `AUTH_FORBIDDEN` |

### Controles que acompañan a la matriz

- **Registro:** `registroSeguridad` deja constancia de cada 401, 403 y 5xx (auditoría OWASP H-09).
- **Límite de solicitudes:** `/auth` limita los intentos fallidos por IP; las rutas académicas, de reportes y de administración tienen su propio límite.
- **Interruptor de desarrollo:** `DISABLE_AUTH=true` salta `authenticate` y `requireRole` fuera de producción. Debe estar en `false` al ejecutar las pruebas de esta matriz.
- **Limitación conocida:** un JWT ya emitido sigue siendo válido hasta 8 horas después de cambiar el rol o desactivar la cuenta; el inicio de sesión sí rechaza cuentas desactivadas.

## 7. Control de propiedad (IDOR)

Un IDOR ocurre cuando un usuario autenticado, con el rol correcto, accede a un recurso que no es suyo cambiando un identificador en la ruta o en el cuerpo. El rol está bien y lo que falta es validar la propiedad, por eso la prueba endpoint × rol de la sección 8 no lo detecta. La convención del proyecto es responder 403, y la misma respuesta para un recurso ajeno que para uno inexistente, para no revelar qué identificadores existen.

### Reglas de propiedad

| Recurso | Quién es el dueño | Regla | Esperado |
| --- | --- | --- | --- |
| Perfil y contexto académico | El propio usuario | El estudiante ve solo el suyo; el docente ve el de cualquier estudiante (decisión del equipo) | 403 `PROFILE_FORBIDDEN`, `STUDENT_CONTEXT_FORBIDDEN` |
| Aporte | El estudiante autor (por su inscripción) y el docente dueño del curso | El estudiante crea y ve solo los suyos; el docente edita, aprueba y elimina los de su curso | 403 |
| Tarjeta | Docente dueño del curso del mazo | Solo ese docente edita, etiqueta y aprueba | 403 |
| Mazo | `mazo.docente_id` | Solo el dueño edita, cambia la variante, exporta y elimina; cualquier docente abre o cierra el mazo (decisión del 2026-11-11) | 403 `DECK_NOT_OWNER` |
| Curso | `curso.docente_id` | Solo el dueño genera el código, asigna estudiantes y lista inscritos | 403 |
| Quiz | Docente dueño del curso; estudiantes inscritos | El docente edita, elimina, exporta y ve resultados; el estudiante ve preguntas, envía y ve su resultado | 403 `QUIZ_NOT_ENROLLED`, `AUTH_FORBIDDEN` |
| Inscripción y estudio | El estudiante titular | Solo usa sus propias inscripciones | 403 `ENROLLMENT_FORBIDDEN` |
| Reportes | El estudiante titular; el docente | Estudiante solo el suyo; docente cualquiera en progreso y estudio, y solo su curso o su quiz en curso y resultados | 403 `REPORT_FORBIDDEN`, `AUTH_FORBIDDEN` |

### Casos IDOR a probar

Estudiante A es Juan (id 2, inscripción 1) y estudiante B es María (id 3, inscripción 2). La no inscrita es Thalía (id 8). La docente dueña es Ana (id 1) y la docente ajena es William (id 5). La columna *Resultado* es lo que dio la ejecución real contra el backend (rama `develop`, 2026-11-17): *Protegido* ya valida la propiedad y *Hallazgo n* es un hueco confirmado, descrito en la sección 8.

| # | Actor | Petición sobre un recurso ajeno | Esperado | Resultado |
| --- | --- | --- | --- | --- |
| IDOR-01 | Estudiante B | GET /users/2 | 403 | Protegido |
| IDOR-02 | Estudiante B | GET /students/2/context | 403 | Protegido |
| IDOR-03 | Estudiante B | GET /reports/students/2/progress/export-pdf | 403 | Protegido |
| IDOR-04 | Estudiante B | POST /study/review-session con `inscripcion_id` 1 | 403 | Protegido |
| IDOR-05 | Estudiante B | POST /study/review-session/review con `inscripcion_id` 1 | 403 | Protegido |
| IDOR-06 | Estudiante B | GET /aportes/:id de un aporte de A | 403 | Hallazgo 3 |
| IDOR-07 | Estudiante B | POST /aportes con `inscripcion_id` 1 | 403 | Hallazgo 3 |
| IDOR-08 | Estudiante B | GET /aportes | Solo los de B | Hallazgo 3 |
| IDOR-09 | No inscrita | POST /decks/6/cards | 403 | Protegido |
| IDOR-10 | No inscrita | GET /quizzes/:id/preguntas | 403 | Protegido |
| IDOR-11 | No inscrita | POST /quizzes/:id/submit | 403 | Protegido |
| IDOR-12 | No inscrita | GET /quizzes/:id/result | 403 | Protegido |
| IDOR-13 | No inscrita | GET /quizzes/:id | 403 | Hallazgo 8 |
| IDOR-14 | No inscrita | GET /decks | Sin mazos del curso 1 | Protegido |
| IDOR-15 | No inscrita | POST /study/review-session con `inscripcion_id` 1 | 403 | Protegido |
| IDOR-16 | Docente ajena | PUT /decks/6 | 403 | Protegido |
| IDOR-17 | Docente ajena | DELETE /decks/:id de un mazo de Ana | 403 | Protegido |
| IDOR-18 | Docente ajena | PATCH /decks/6/default-variant | 403 | Protegido |
| IDOR-19 | Docente ajena | PATCH /decks/6/estado | 200 | Permitido por decisión del equipo (2026-11-11) |
| IDOR-20 | Docente ajena | GET /decks/6/export-pdf | 403 | Hallazgo 7 |
| IDOR-21 | Docente ajena | GET /teacher/analytics/deck/6 | 403 | Hallazgo 7 |
| IDOR-22 | Docente ajena | PATCH /cards/:id/approve | 403 | Hallazgo 5 |
| IDOR-23 | Docente ajena | PUT /cards/:id | 403 | Hallazgo 5 |
| IDOR-24 | Docente ajena | PUT /cards/:id/context | 403 | Hallazgo 5 |
| IDOR-25 | Docente ajena | POST /courses/1/access-code | 403 | Hallazgo 6 |
| IDOR-26 | Docente ajena | POST /courses/1/assign | 403 | Hallazgo 6 |
| IDOR-27 | Docente ajena | GET /courses/1/students | 403 | Hallazgo 6 |
| IDOR-28 | Docente ajena | PUT /aportes/:id | 403 | Hallazgo 4 |
| IDOR-29 | Docente ajena | PATCH /aportes/:id/approve | 403 | Hallazgo 4 |
| IDOR-30 | Docente ajena | DELETE /aportes/:id | 403 | Hallazgo 4 |
| IDOR-31 | Docente ajena | GET /quizzes/:id | 403 | Hallazgo 8 |
| IDOR-32 | Docente ajena | PUT /quizzes/:id | 403 | Hallazgo 8 |
| IDOR-33 | Docente ajena | DELETE /quizzes/:id | 403 | Hallazgo 8 |
| IDOR-34 | Docente ajena | GET /quizzes/:id/export-pdf | 403 | Hallazgo 8 |
| IDOR-35 | Docente ajena | GET /quizzes/:id/teacher-results | 403 | Hallazgo 8 |
| IDOR-36 | Docente ajena | GET /reports/quizzes/:id/results/export-pdf | 403 | Protegido |
| IDOR-37 | Docente ajena | GET /reports/students/export-pdf?curso\_id=1 | 403 | Hallazgo 9 |

Resultado de la ejecución: 15 casos protegidos, 1 permitido por decisión del equipo (IDOR-19) y 21 hallazgos confirmados.

## 8. Pruebas automáticas: endpoint × rol e IDOR

La matriz de la sección 3 se convierte en un archivo de datos que dos pruebas recorren contra el backend real: una compara el código HTTP de cada fila y cada rol (244 comprobaciones: 61 endpoints × 4 roles) y otra ejecuta los 37 casos IDOR de la sección 7. Viven junto a las pruebas funcionales existentes, en `backend/pruebas-funcionales/`.

| Archivo (en `backend/pruebas-funcionales/`) | Qué hace |
| --- | --- |
| `datos/matriz-rbac.json` | La matriz como datos: una entrada por endpoint con los roles permitidos |
| `rbac-matriz.test.js` | Para cada fila y rol hace la petición con el token de ese rol y compara con el JSON |
| `rbac-idor.test.js` | Ejecuta los casos IDOR-01 a IDOR-37 y seis controles positivos, con datos que crea la propia prueba |
| `rbac-cobertura.test.js` | Compara las rutas montadas en `app.js` con el JSON, en las dos direcciones |
| `soporte/listar-rutas.mjs` | Auxiliar de la prueba de cobertura: imprime las rutas de Express en un proceso aparte |

### Formato del JSON

```json
{
  "version": "1.2",
  "roles": ["invitado", "estudiante", "docente", "administrador"],
  "endpoints": [
    {"id": 15, "permiso": "deck.create", "metodo": "POST", "ruta": "/decks", "permitido": ["docente"], "body": {}},
    {"id": 20, "permiso": "deck.delete_own", "metodo": "DELETE", "ruta": "/decks/{id}", "permitido": ["docente"]},
    {"id": 23, "permiso": "card.check_duplicate", "metodo": "POST", "ruta": "/cards/check-duplicate",
     "permitido": ["estudiante", "docente"], "body": {},
     "hallazgos": {"administrador": "HALLAZGO-1: la ruta solo exige sesion, el administrador pasa"}}
  ]
}
```

`permitido` lista los roles con ● en la matriz; para los demás roles la prueba espera 401 (invitado) o 403. En la ruta, `{id}` se reemplaza por 999999, `{yo}` por el id del propio actor y `{palabra}` por una palabra de ejemplo. `hallazgos` declara una celda con un hueco ya confirmado.

### Qué se compara

| Celda de la matriz | Resultado esperado de la petición |
| --- | --- |
| · en Invitado | Exactamente 401 |
| · en Estudiante, Docente o Administrador | Exactamente 403 |
| ● | Cualquier código que no sea 401, 403 ni 5xx |

Para no modificar datos, las rutas con `:id` usan un identificador inexistente (999999) y los cuerpos van vacíos. El control de rol corre antes de buscar el recurso, así que un rol sobrante recibe 401 o 403 y un rol permitido recibe 400 o 404.

### Usuarios y datos de prueba (`seed.sql`)

| Actor | id | Rol | Papel en la prueba |
| --- | --- | --- | --- |
| Ana Docente | 1 | docente | Dueña del curso 1 y de sus mazos |
| William Serna | 5 | docente | Docente ajena: no tiene cursos |
| Juan Estudiante | 2 | estudiante | Estudiante A (inscripción 1) |
| María Estudiante | 3 | estudiante | Estudiante B (inscripción 2) |
| Carlos Estudiante | 4 | estudiante | Inscripción 3 |
| thaliabernal | 8 | estudiante | Nunca inscrita en un curso |
| Administrador | 90 | administrador | No está en el seed: el token se firma con `JWT_SECRET` y ese id |

El curso 1 es «Literatura Anglófona»; el mazo 6 («Fear of Stones and Other Stories») está abierto y el mazo 1 cerrado. El seed no trae quices: la prueba los crea con `POST /quizzes/generate` sobre mazos con tarjetas aprobadas. Las tarjetas y los aportes que se modifican también los crea la prueba.

### Hallazgos

Al ejecutar las pruebas contra el backend (rama `develop`, 2026-11-17) dieron 272 comprobaciones correctas y 28 celdas con hueco confirmado, agrupadas en 9 hallazgos. Cada una corre con `it.fails`: la integración continua sigue en verde, el hueco queda visible en el reporte y la prueba avisa cuando el backend se corrija, momento en que se borra la marca. La corrección en el backend es un cambio aparte que aprueba el equipo.

| Hallazgo | Qué ocurre | Dónde | Corrección sugerida |
| --- | --- | --- | --- |
| 1 | El administrador atraviesa rutas que solo exigen sesión | Filas 23, 39 y 41 | Agregar `requireRole` con los roles permitidos |
| 2 | `GET /enrichment/family/:word` responde 500 a todos los roles | Fila 5 | Corregido 2026-11-27: `init.sql` ya trae `categoria_gramatical` y `familia` en `wordnet_cache` (commit 928e5d5); se quitó la marca `it.fails` de la fila 5 |
| 3 | Aportes: un estudiante lee, lista y crea aportes de otros | IDOR-06, 07, 08 | Filtrar por la inscripción del token y validar `inscripcion_id` |
| 4 | Aportes: cualquier docente edita, aprueba y elimina | IDOR-28, 29, 30 | Comparar `curso.docente_id` con el token |
| 5 | Tarjetas: cualquier docente edita, etiqueta y aprueba | IDOR-22, 23, 24 | Comparar `curso.docente_id` con el token |
| 6 | Cursos: cualquier docente genera el código, asigna y lista inscritos | IDOR-25, 26, 27 | Comparar `curso.docente_id` con el token |
| 7 | Mazos: cualquier docente exporta el PDF y ve las analíticas | IDOR-20, 21 | Usar `esDuenoDelMazo` |
| 8 | Quices: se leen sin estar inscrito; cualquier docente los lee, edita, elimina, exporta y ve sus resultados | IDOR-13, 31 a 35 | Validar inscripción o docente dueño del curso |
| 9 | El reporte de curso de otra docente responde 200 | IDOR-37 | Comparar `curso.docente_id` con el token; el comentario de `ReporteCursoService` ya lo promete |

⚑ Si el equipo decide que, con un solo docente desplegado, las reglas de propiedad del docente no aplican (como ya decidió con el estado del mazo el 2026-11-11), se cambia la matriz y no la prueba.

### Ejecución

```bash
# 1. Base de datos: desde la raíz de walking-dictionary-infra
docker compose up -d db

# 2. Backend: desde backend/, con backend/.env creado (ver abajo). Dejar esta terminal abierta
npm ci
npm run dev

# 3. Pruebas: otra terminal, desde backend/
npm run test:funcional
```

- `backend/.env` debe tener `DB_HOST=localhost`, `DISABLE_AUTH=false`, un `JWT_SECRET` (el mismo archivo lo leen el backend y las pruebas) y tres límites elevados: `RATE_LIMIT_AUTH_MAX=1000`, `RATE_LIMIT_REPORTES_MAX=1000` y `RATE_LIMIT_ADMIN_MAX=1000`.
- Sin esos límites, repetir la ejecución produce un 429 en `/auth`, en los reportes o en `/admin`. Los contadores viven en la memoria del backend: reiniciarlo los pone en cero.
- La preparación global reinicia la base local a `init.sql` + `seed.sql` (dentro del contenedor `walking_dictionary_db` si está corriendo) y nunca apunta a Supabase.
- `rbac-cobertura.test.js` falla si una ruta de `app.js` no está en el JSON: una ruta sin permiso declarado no debería existir.
- En GitHub Actions, las tres variables `RATE_LIMIT_*` se agregan al bloque `env` de `funcionales.yml`.
- Resultado verificado el 2026-11-17 con la suite funcional completa (las pruebas existentes más estas): 400 correctas, 28 hallazgos esperados y 6 pendientes, repetido 4 veces en orden aleatorio.
- El reporte queda en `reportes-funcionales/index.html` y `junit.xml`.

## 9. Buenas prácticas

- **Denegar por defecto.** Una ruta sin permiso declarado no debería existir; la prueba de cobertura de la sección 8 lo verifica.
- **Autorizar en el servidor.** La interfaz solo refleja lo que el servidor ya decidió.
- **No confiar en el cliente.** El rol sale del JWT firmado, nunca del cuerpo, una cabecera o una cookie sin firmar; `estudiante_id` e `id_usuario` también salen del token.
- **Comprobar la propiedad.** Los permisos con propiedad exigen verificar el dueño del recurso (sección 7).
- **Mínimo privilegio.** El Administrador no accede a funciones académicas y el Docente no gestiona cuentas.
- **Responder bien.** 401 si no hay sesión y 403 si hay sesión sin permiso, con un `code` estable.
- **Registrar.** Cada 401, 403 y 5xx queda en el registro de seguridad.
- **Invalidar sesiones.** Un JWT emitido sigue válido hasta 8 horas tras cambiar el rol o desactivar la cuenta; es una limitación conocida y documentada.

## 10. Referencias

- Sandhu, R. S., Coyne, E. J., Feinstein, H. L., Youman, C. E. (1996). Role-based access control models. *IEEE Computer*, 29(2), 38-47. <https://doi.org/10.1109/2.485845>
- Ferraiolo, D. F., Sandhu, R., Gavrila, S., Kuhn, D. R., Chandramouli, R. (2001). Proposed NIST standard for role-based access control. *ACM Transactions on Information and System Security*, 4(3), 224-274. <https://doi.org/10.1145/501978.501980>
- Joint Task Force (2020). *Security and Privacy Controls for Information Systems and Organizations*, NIST SP 800-53 Rev. 5. <https://doi.org/10.6028/NIST.SP.800-53r5>
- OWASP. *Application Security Verification Standard*, capítulo V4 (Access Control). [owasp.org/www-project-application-security-verification-standard](https://owasp.org/www-project-application-security-verification-standard)

## 11. Control de versiones

| Versión | Fecha | Cambios |
| --- | --- | --- |
| v1.1 | 2026-11-03 | Borrador: objetivo, roles y matriz de permisos (parcial, hasta el permiso 21) |
| v1.2 | 2026-11-17 | Matriz de los 61 endpoints, separación de funciones, modelo de datos, verificación en el servidor, reglas y casos IDOR, pruebas automáticas, buenas prácticas y referencias |
| v1.3 | 2026-11-27 | D-13: `card.create` (POST /decks/:id/cards) pasa a ser solo del estudiante; el Docente queda con 49 permisos y cumple la R1 |

Los nombres y datos de usuarios de prueba son los de `seed.sql` y sirven solo como ejemplo de aprendizaje.
