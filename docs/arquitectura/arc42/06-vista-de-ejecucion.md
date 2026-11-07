# 6. Vista de ejecución

Cuatro escenarios representativos, tomados del código.

## 6.1 Inicio de sesión con Google (CA-5.4.1)

```mermaid
sequenceDiagram
  actor U as Usuario
  participant SPA as SPA React
  participant G as Google
  participant API as API Express
  participant DB as PostgreSQL

  U->>SPA: Pulsa iniciar sesión
  SPA->>G: Solicita identidad (Google Identity Services)
  G-->>SPA: idToken
  SPA->>API: POST /api/v1/auth/google con idToken
  API->>G: verifyIdToken (audiencia GOOGLE_CLIENT_ID)
  alt token inválido
    API-->>SPA: 401 AUTH_GOOGLE_TOKEN_INVALID
  else correo no verificado
    API-->>SPA: 401 AUTH_GOOGLE_EMAIL_NOT_VERIFIED
  else token válido
    API->>DB: Busca el usuario por correo
    alt no existe
      API-->>SPA: 403 AUTH_USER_NOT_REGISTERED
    else cuenta inactiva
      API-->>SPA: 401 AUTH_ACCOUNT_INACTIVE
    else activo
      API-->>SPA: 200 token JWT (8 horas) y datos del usuario
      SPA->>SPA: Guarda token y usuario en localStorage
    end
  end
```

Notas: el servicio no crea usuarios (el alta se hace en `POST /auth/register`); el JWT lleva `id_usuario`, `email` y `rol`; la contraseña nunca viaja.

## 6.2 Registrar una palabra con detección de duplicados (HU-1.2 y HU-1.3)

```mermaid
sequenceDiagram
  actor E as Estudiante
  participant SPA as SPA React
  participant API as API Express
  participant DB as PostgreSQL

  E->>SPA: Escribe palabra, traducción, definición y ejemplo
  SPA->>API: POST /api/v1/cards/check-duplicate
  API->>DB: Busca la palabra normalizada en el mazo
  API-->>SPA: Coincidencia o no (no escribe nada)
  SPA->>E: Muestra la alerta de coautoría o acepción nueva
  E->>SPA: Confirma el envío
  SPA->>API: POST /api/v1/decks/:id/cards
  API->>DB: Lee el mazo
  alt mazo cerrado
    API-->>SPA: 409 DECK_CLOSED
  else estudiante no inscrito
    API-->>SPA: 403
  else campos faltantes o demasiado largos
    API-->>SPA: 400
  else datos válidos
    API->>DB: buscarDuplicado(mazo, palabra normalizada)
    alt no hay duplicado
      API->>DB: Crea la tarjeta (pendiente_revision) y el aporte (creada)
      API-->>SPA: 201 resultado creada
    else hay duplicado
      API->>DB: Crea solo el aporte (coautoria o acepcion_nueva)
      API-->>SPA: 201 resultado coautoria o acepcion_nueva
    end
  end
```

Notas: la comparación ignora mayúsculas y espacios (CA-1.3.3). El criterio exacto que distingue coautoría de acepción nueva está en `DeduplicacionService.resolverAporte` (supuesto pendiente P7; ver D-08).

## 6.3 Responder un quiz y recibir la nota (HU-3.2)

```mermaid
sequenceDiagram
  actor E as Estudiante
  participant SPA as SPA React
  participant API as API Express
  participant DB as PostgreSQL

  E->>SPA: Pulsa finalizar examen (o se agota el tiempo)
  SPA->>API: POST /api/v1/quizzes/:id/submit con las respuestas
  API->>API: authenticate y requireRole estudiante, estudiante_id sale del JWT
  API->>DB: Lee el quiz y comprueba la inscripción
  alt quiz aún no abierto o ya cerrado (margen de 30 s)
    API-->>SPA: 400 QUIZ_NOT_OPEN o QUIZ_CLOSED
  else ya existe un resultado del estudiante
    API-->>SPA: Error con el resultado previo (QUIZ_ALREADY_SUBMITTED)
  else en ventana
    API->>DB: Lee las preguntas del quiz
    API->>API: Califica: aciertos, puntaje máximo y nota de 0 a 5
    alt tiempo límite superado (con margen de 30 s)
      API-->>SPA: 400 QUIZ_TIME_EXPIRED
    else dentro del tiempo
      API->>DB: Transacción: crea resultado y respuestas
      API-->>SPA: Resultado con el desglose de aciertos y errores
    end
  end
```

Notas: la unicidad `(quiz_id, estudiante_id)` del DER garantiza un solo intento; si dos envíos llegan a la vez, la violación de unicidad (23505) se traduce en el mismo error de reintento. La nota usa escala 0 a 5 (supuesto pendiente P2). El tiempo de inicio lo informa el cliente (limitación conocida).

## 6.4 Exportar un mazo a PDF (HU-3.3)

```mermaid
sequenceDiagram
  actor D as Docente
  participant SPA as SPA React
  participant API as API Express
  participant DB as PostgreSQL

  D->>SPA: Pulsa exportar a PDF
  SPA->>API: GET /api/v1/decks/:id/export-pdf con Bearer JWT
  API->>API: authenticate y requireRole docente
  alt id inválido
    API-->>SPA: 400 INVALID_ID
  else id válido
    API->>DB: Lee el mazo y sus tarjetas
    API->>API: ExportarPDFService genera el PDF con pdf-lib
    API-->>SPA: 200 application/pdf como adjunto
    SPA->>D: Descarga el archivo
  end
```

Los reportes en `/api/v1/reports/...` siguen el mismo patrón, con límite de peticiones y reglas de acceso propias de cada servicio.