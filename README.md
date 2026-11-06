# A Walking Dictionary 

Aplicación web de vocabulario contextualizado para el curso de Literatura Anglófona (Licenciatura en Educación Bilingüe, Universidad del Cauca). Digitaliza el ejercicio "A Walking Dictionary": los estudiantes registran palabras nuevas por lectura semanal, la docente las revisa y valida, y el sistema genera quices automáticos a partir del vocabulario aprobado.

## Equipo — Grupo 1

- Thalía Bernal
- Karen Sandoval
- William Serna
- Manuela Meneses

**Docente:** Ph.D. MSc. César Jesús Pardo Calvache — Proyecto II, Segundo Semestre 2026.

## Repositorios

| Repositorio | Contenido |
| --- | --- |
| [Back-end](https://github.com/wsernam/A-Walking-Dictionary-NovaCode-Back-end) (este) | API REST, esquema de base de datos, pruebas de la API y documentación de arquitectura/API |
| [Front-end](https://github.com/knnsand/A-Walking-Dictionary-NovaCode-Front-end) | Aplicación React, pruebas E2E y manuales de usuario |

La documentación de ambos repositorios se indexa en [`docs/README.md`](docs/README.md).

## Stack técnico

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 + Vite, `react-router-dom`, `react-i18next` (ver repo del front) |
| Backend | Node.js ≥ 20 + Express 4, API REST bajo `/api/v1` |
| Base de datos | PostgreSQL 16 (`init.sql` define el esquema; `seed.sql` carga datos de prueba) |
| Autenticación | Login con Google (`google-auth-library`) y JWT propio con claim de rol |
| Seguridad | `helmet`, CORS por lista de orígenes, `express-rate-limit` |
| PDF y léxico | `pdf-lib`; `node-wordnet` + `wordnet-db` |
| Pruebas y calidad | Vitest, SonarQube Cloud, CodeQL |

## Estructura del repositorio

```
.
├── backend/                 # Aplicación Node.js (package.json, server.js)
│   ├── src/
│   │   ├── config/          # Pool de PostgreSQL (db.js)
│   │   ├── routes/          # Rutas Express (por recurso)
│   │   ├── controllers/     # Capa HTTP
│   │   ├── services/        # Reglas de negocio
│   │   ├── repositories/    # Consultas SQL
│   │   ├── models/          # Modelos de datos
│   │   ├── middleware/      # Autenticación, roles, registro de seguridad
│   │   └── utils/           # Códigos de error y utilidades de PDF
│   ├── tests/               # Pruebas unitarias (Vitest, BD simulada)
│   ├── pruebas-funcionales/ # Una prueba por criterio de aceptación, contra API y BD reales
│   ├── security-suite/      # Suite OWASP
│   └── certs/               # Certificado CA para conexión TLS a la BD
├── docs/                    # Documentación (ver docs/README.md)
├── init.sql                 # Esquema oficial de la BD (DER)
├── seed.sql                 # Datos de prueba
├── docker-compose.yml       # PostgreSQL + backend para desarrollo local
├── tools/hitl/              # Herramienta de trazabilidad de uso de IA
└── CLAUDE.md                # Contexto y reglas de trabajo del proyecto
```

## Requisitos

- **Con Docker (recomendado):** Docker y Docker Compose.
- **Sin Docker:** Node.js ≥ 20 y PostgreSQL 16 (con `psql`).
- Un *Client ID* de Google OAuth (tipo «Web application») para el login. Se crea en Google Cloud Console → APIs & Services → Credentials.

## Instalación y ejecución

### Opción A — Docker Compose

Todos los comandos se ejecutan desde la raíz de este repositorio.

1. Crear `backend/.env` a partir del ejemplo y completar los valores:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Crear un archivo `.env` **en la raíz** con las variables que usa `docker-compose.yml`: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` y `GOOGLE_CLIENT_ID`.
3. Levantar la base de datos y el backend:
   ```bash
   docker compose up -d --build postgres backend
   ```
4. Verificar que el servidor arrancó (debe aparecer `Servidor escuchando en el puerto 5000`):
   ```bash
   docker compose logs -f backend
   ```

Notas:
- `init.sql` y `seed.sql` se ejecutan **solo la primera vez** que se crea el volumen. Para reiniciar la base: `docker compose down -v` y volver a levantar.
- `docker-compose.yml` no pasa `CORS_ORIGINS` al contenedor. Sin esa variable el backend rechaza a todos los navegadores; agrégala en la sección `environment` del servicio `backend` (por ejemplo `http://localhost:3000`).

### Opción B — Sin Docker

1. Crear la base de datos en PostgreSQL y cargar el esquema y los datos de prueba:
   ```bash
   psql -U <usuario> -d <base> -f init.sql
   psql -U <usuario> -d <base> -f seed.sql
   ```
2. Instalar dependencias y configurar el entorno:
   ```bash
   cd backend
   npm install
   cp .env.example .env   # y completar los valores (DB_HOST=localhost)
   ```
3. Arrancar con recarga automática:
   ```bash
   npm run dev
   ```

La API queda en `http://localhost:5000/api/v1`.

## Variables de entorno

Se leen de `backend/.env` (plantilla: `backend/.env.example`).

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Sí | Conexión a PostgreSQL |
| `DB_SSL` | No | `true` activa TLS con verificación del certificado |
| `DB_SSL_CA_PATH` | No | Ruta del certificado CA (hay uno en `backend/certs/`) |
| `JWT_SECRET` | Sí | Secreto para firmar el JWT de la aplicación |
| `GOOGLE_CLIENT_ID` | Sí | Client ID de Google OAuth con el que se valida el `idToken` |
| `CORS_ORIGINS` | Sí | Orígenes del front permitidos, separados por comas, sin barra final |
| `PORT` | No | Puerto del servidor (por defecto `5000`) |
| `RATE_LIMIT_AUTH_MAX` | No | Intentos fallidos por IP cada 15 min en `/auth` (por defecto `20`) |
| `RATE_LIMIT_REPORTES_MAX` | No | Peticiones por IP cada 15 min en `/reports` (por defecto `30`) |
| `DISABLE_AUTH`, `DISABLE_AUTH_ROL` | No | **Solo desarrollo local.** Omiten el login con un rol simulado. Nunca en producción |
| `NODE_ENV` | No | Lo leen `app.js` y el middleware de autenticación |

> `DB_SSL`, `DB_SSL_CA_PATH`, `RATE_LIMIT_REPORTES_MAX` y `NODE_ENV` se usan en el código pero todavía no aparecen en `backend/.env.example`.

## Scripts (desde `backend/`)

| Comando | Qué hace |
| --- | --- |
| `npm start` | Arranca el servidor (`node server.js`) |
| `npm run dev` | Arranca con recarga automática (`node --watch`) |
| `npm run lint` | ESLint |
| `npm test` | Pruebas unitarias (Vitest, BD simulada) |
| `npm run test:coverage` | Pruebas unitarias con cobertura |
| `npm run test:funcional` | Pruebas funcionales por CA (requiere backend y PostgreSQL corriendo; ver [`backend/pruebas-funcionales/README.md`](backend/pruebas-funcionales/README.md)) |
| `npm run test:security` | Suite OWASP (ver [`backend/security-suite/README.md`](backend/security-suite/README.md)) |

## Login y datos de prueba

El inicio de sesión es **solo con Google**: el correo de la cuenta de Google debe existir en la tabla `usuario`. `seed.sql` crea una docente y estudiantes de ejemplo (por ejemplo `ana.docente@unicauca.edu.co` y `juan.estudiante@unicauca.edu.co`) cuyas contraseñas son marcadores (`hash_temporal`), por lo que no sirven para iniciar sesión. Las pruebas funcionales evitan Google firmando un JWT con `JWT_SECRET`.

## Documentación

Índice completo en [`docs/README.md`](docs/README.md): contratos con el front, flujos, códigos de error, changelog, auditoría de seguridad y decisiones del proyecto.

## Flujo de trabajo (Git)

Se sigue un flujo tipo **Gitflow**, adaptado al ritmo de sprints del curso (3 sprints en 16 semanas).

### Estrategia de ramas

| Rama | Uso |
| --- | --- |
| `main` | Rama protegida y de producción. Solo recibe merges desde `release/*` o `hotfix/*`. Siempre debe estar en estado desplegable. |
| `develop` | Rama de integración. Aquí se juntan todas las funcionalidades ya terminadas y probadas antes de pasar a `release`. |
| `feature/nombre-corto` | Nueva funcionalidad o historia de usuario, creada desde `develop`. Ej: `feature/gestion-electivas`, `feature/conexion-back-front`. |
| `feature/area/nombre-corto` | Variante con subcarpeta cuando se quiere agrupar por módulo/área. Ej: `feature/backend/publicadores-consumidores`, `feature/frontend/panel-docente`. |
| `release/nombre-o-version` | Prepara una entrega (fin de sprint). Se crea desde `develop`, se estabiliza (ajustes finos, sin funcionalidades nuevas) y luego se mergea a `main` y de vuelta a `develop`. |
| `hotfix/nombre-corto` | Corrección urgente directo sobre `main` cuando ya hubo release y aparece un bug crítico. Se mergea a `main` y a `develop`. |
| `backup/nombre-corto` | Respaldo puntual de una rama antes de un cambio riesgoso (rebase, refactor grande). No se mergea a `develop`; se elimina cuando ya no se necesita. |

### Convenciones de nombre

- Minúsculas, palabras separadas por guion (`-`), sin tildes ni ñ.
- El nombre describe la funcionalidad o módulo, no la persona ni la fecha. Ej: `feature/gestion-electivas`, no `feature/manuela-tarea1`.
- Cuando la rama corresponde a una historia de usuario del backlog, se puede incluir el ID: `feature/HU-002-registro-palabra`.

### Flujo de trabajo

1. Actualizar `develop` local (`git pull origin develop`) antes de crear una rama nueva.
2. Crear la rama de trabajo desde `develop`: `git checkout -b feature/nombre-corto`.
3. Trabajar con commits pequeños y descriptivos (`feat:`, `fix:`, `docs:`, `chore:`).
4. Subir la rama: `git push -u origin feature/nombre-corto`.
5. Abrir un Pull Request hacia `develop`, enlazando la historia/issue correspondiente del board.
6. Al menos un compañero revisa y aprueba el PR antes de hacer merge.
7. Al cierre de cada sprint: crear `release/sprintX` desde `develop`, estabilizar, hacer PR de `release/sprintX` → `main` y luego mergear `main` de vuelta a `develop`.
8. Si aparece un bug crítico en producción: crear `hotfix/nombre-corto` desde `main`, corregir, y mergear tanto a `main` como a `develop`.
9. Eliminar cada rama (`feature/*`, `release/*`, `hotfix/*`) una vez mergeada, para mantener la lista limpia.
