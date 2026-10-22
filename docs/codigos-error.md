# Códigos de error de la API

Toda respuesta de error de la API tiene esta forma:

```json
{ "error": "Código de acceso inválido", "code": "ENROLL_INVALID_CODE" }
```

- `error`: el mensaje de siempre, en español. **No cambia**, para no romper al front actual.
- `code`: código fijo en inglés. El front lo usa para mostrar el texto traducido (`src/i18n/locales/en.json`) en vez de comparar mensajes en español.
- El status HTTP tampoco cambia.

Algunas respuestas traen campos extra además de `error` y `code` (por ejemplo, `QUIZ_ALREADY_SUBMITTED` incluye `resultado` y `respuestas`).

La columna "Texto sugerido" es una propuesta para `en.json`; el front puede ajustarla.

## Códigos genéricos

Si un error no tiene código específico, la API le pone uno según su status (`src/app.js`, `src/utils/codigosError.js`). El front debería tener siempre un texto para estos, como respaldo.

| code | Status | Texto sugerido |
|---|---|---|
| `BAD_REQUEST` | 400 | The request is not valid. |
| `UNAUTHORIZED` | 401 | You need to log in. |
| `FORBIDDEN` | 403 | You don't have permission to do this. |
| `NOT_FOUND` | 404 | The resource was not found. |
| `CONFLICT` | 409 | The request conflicts with the current state. |
| `RATE_LIMITED` | 429 | Too many attempts. Try again in a few minutes. |
| `INTERNAL_ERROR` | 500 | Something went wrong. Please try again. |

## Validación (cualquier módulo)

| code | Status | Cuándo | Texto sugerido |
|---|---|---|---|
| `INVALID_ID` | 400 | Un id de la URL o del body no es un número válido | The identifier is not valid. |
| `REQUIRED_FIELDS_MISSING` | 400 | Faltan campos obligatorios (el mensaje dice cuáles) | Complete the required fields. |
| `FIELD_TOO_LONG` | 400 | Un campo supera su longitud máxima | One of the fields is too long. |
| `INVALID_STATUS_VALUE` | 400 | El estado del mazo no es `abierto` ni `cerrado` | The status is not valid. |
| `INVALID_QUERY` | 400 | El parámetro `q` del diccionario no es texto | The search text is not valid. |

## Autenticación y permisos

| code | Status | Cuándo | Texto sugerido |
|---|---|---|---|
| `AUTH_TOKEN_MISSING` | 401 | No se envió el token | You need to log in. |
| `AUTH_TOKEN_INVALID` | 401 | El token es inválido o expiró | Your session expired. Please log in again. |
| `AUTH_FORBIDDEN` | 403 | El rol no tiene acceso a la ruta | You don't have permission to access this page. |
| `AUTH_USER_NOT_REGISTERED` | 403 | Login con Google de un correo que no está registrado | This account is not registered. Sign up first. |
| `AUTH_ACCOUNT_INACTIVE` | 401 | La cuenta está desactivada | This account is inactive. |
| `AUTH_GOOGLE_TOKEN_MISSING` | 400 | No llegó el `idToken` de Google | Could not receive the Google credential. |
| `AUTH_GOOGLE_TOKEN_INVALID` | 401 | Google rechazó el token | Could not verify your Google account. |
| `AUTH_GOOGLE_EMAIL_NOT_VERIFIED` | 401 | El correo de Google no está verificado | Your Google email is not verified. |

## Registro y perfil

| code | Status | Cuándo | Texto sugerido |
|---|---|---|---|
| `REGISTER_INVALID_DOMAIN` | 400 | El correo no es institucional | Use your institutional email. |
| `REGISTER_EMAIL_TAKEN` | 409 | El correo ya tiene cuenta | This email is already registered. |
| `USER_NOT_FOUND` | 404 | El usuario no existe | User not found. |
| `PROFILE_FORBIDDEN` | 403 | Un estudiante pide el perfil de otro | You can't view this profile. |
| `STUDENT_CONTEXT_FORBIDDEN` | 403 | Un estudiante pide el contexto académico de otro | You can't view this information. |
| `PROFILE_INVALID_LEVEL` | 400 | `nivel_ingles` no está entre A1 y C2 | Select a valid CEFR level. |
| `PROFILE_INVALID_DATA` | 400 | Código estudiantil, avatar o intereses no válidos (el mensaje dice cuál) | Check your profile data. |

## Cursos e inscripciones

| code | Status | Cuándo | Texto sugerido |
|---|---|---|---|
| `COURSE_NOT_FOUND` | 404 | El curso no existe | Course not found. |
| `ENROLL_INVALID_CODE` | 404 | El código de acceso no corresponde a ningún curso | Invalid access code. |
| `ENROLL_ALREADY_ENROLLED` | 409 | El estudiante ya está inscrito en el curso | The student is already enrolled in this course. |
| `STUDENT_NOT_FOUND` | 404 | No hay un estudiante con ese correo | No student was found with that email. |
| `USER_NOT_STUDENT` | 400 | El correo es de un usuario que no es estudiante | That user is not a student. |
| `ENROLLMENT_NOT_FOUND` | 404 | La inscripción no existe | Enrollment not found. |
| `ENROLLMENT_INACTIVE` | 400 | La inscripción no está activa | Your enrollment is not active. |
| `ENROLLMENT_FORBIDDEN` | 403 | La inscripción es de otro estudiante | You can't use this enrollment. |

## Mazos, tarjetas y aportes

| code | Status | Cuándo | Texto sugerido |
|---|---|---|---|
| `DECK_NOT_FOUND` | 404 | El mazo no existe | Deck not found. |
| `DECK_NOT_OWNER` | 403 | Una docente que no es la dueña intenta editar, cerrar o borrar el mazo | Only the deck owner can do this. |
| `DECK_CLOSED` | 409 | Se intenta aportar a un mazo cerrado | This deck no longer accepts new words. |
| `DECK_NOT_ENROLLED` | 403 | El estudiante no está inscrito en el curso del mazo | You are not enrolled in this deck's course. |
| `CARD_NOT_FOUND` | 404 | La tarjeta no existe | Card not found. |
| `CARD_NOT_PENDING` | 409 | Se intenta aprobar o editar una tarjeta que ya no está pendiente | This card is no longer pending review. |
| `CONTRIBUTION_NOT_FOUND` | 404 | El aporte no existe | Contribution not found. |
| `CONTRIBUTION_NOT_APPROVABLE` | 403 | Un aporte de creación original se intenta aprobar por la ruta de aportes | This contribution must be approved from the card review. |
| `CONTEXT_INVALID_REGISTER` | 400 | El registro no es uno de los permitidos | Select a valid register. |
| `CONTEXT_INVALID_VARIANT` | 400 | La variante regional no es una de las permitidas | Select a valid regional variant. |
| `CONTEXT_EMPTY` | 400 | No se envió ninguna etiqueta de contexto | Select at least one context tag. |

## Estudio

| code | Status | Cuándo | Texto sugerido |
|---|---|---|---|
| `STUDY_CARD_NOT_AVAILABLE` | 404 | La tarjeta no está disponible para esa inscripción | This card is not available for review. |
| `STUDY_INVALID_RATING` | 400 | La valoración no es Repetir, Difícil, Buena ni Fácil | Select a valid rating. |

## Quices

| code | Status | Cuándo | Texto sugerido |
|---|---|---|---|
| `QUIZ_NOT_FOUND` | 404 | El quiz no existe | Quiz not found. |
| `QUIZ_NOT_ENROLLED` | 403 | El estudiante no está inscrito en el curso del quiz | You are not enrolled in this quiz's course. |
| `QUIZ_NOT_OPEN` | 400 | El quiz todavía no abre | This quiz is not open yet. |
| `QUIZ_CLOSED` | 400 | El quiz ya cerró | This quiz is closed. |
| `QUIZ_TIME_EXPIRED` | 400 | El envío llegó después del tiempo límite | Time is up: the submission was rejected. |
| `QUIZ_ALREADY_SUBMITTED` | 409 | El estudiante ya envió el quiz (trae `resultado` y `respuestas`) | You have already submitted this quiz. |
| `QUIZ_NOT_SUBMITTED` | 404 | Se pide el resultado de un quiz que no se ha enviado | You haven't submitted this quiz yet. |
| `QUIZ_NO_QUESTIONS` | 404 | El quiz no tiene preguntas | This quiz has no questions yet. |
| `QUIZ_RESULT_NOT_FOUND` | 404 | El resultado no existe | Result not found. |
| `QUIZ_INVALID_ANSWERS` | 400 | `respuestas` no tiene el formato esperado | The answers are not valid. |
| `QUIZ_INVALID_TITLE` | 400 | El título supera 200 caracteres | The title is too long. |
| `QUIZ_INVALID_DATES` | 400 | Fechas inválidas, o el cierre no es posterior a la apertura | Check the opening and closing dates. |
| `QUIZ_INVALID_TIME_LIMIT` | 400 | El tiempo límite no es un entero ≥ 1 | The time limit must be at least 1 minute. |
| `QUIZ_WINDOW_TOO_SHORT` | 400 | La ventana apertura-cierre es menor que el tiempo límite | The window must be at least as long as the time limit. |
| `QUIZ_INVALID_QUESTION_COUNT` | 400 | La cantidad de preguntas no es un entero ≥ 1 | The number of questions must be at least 1. |
| `QUIZ_INVALID_DECK_IDS` | 400 | `mazo_ids` tiene valores que no son ids | Select valid decks. |
| `QUIZ_DECK_NOT_IN_COURSE` | 404 | Un mazo elegido no pertenece al curso | One of the decks does not belong to the course. |
| `QUIZ_NOT_ENOUGH_CARDS` | 400 | Hay menos de 4 traducciones distintas aprobadas | There are not enough approved cards to build the quiz. |

## Para agregar un código nuevo

- En un controlador: `res.status(404).json({ error: 'Mazo no encontrado', code: 'DECK_NOT_FOUND' })`.
- En un servicio: `throw errorApi(404, 'DECK_NOT_FOUND', 'Mazo no encontrado')` (`src/utils/codigosError.js`). El controlador que lo atrapa responde `{ error: error.message, code: error.code }`.
- Agregarlo a esta tabla, para que el front sepa que existe.
