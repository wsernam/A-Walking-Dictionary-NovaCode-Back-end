# 2. Restricciones de la arquitectura

## 2.1 Restricciones técnicas

| Restricción | Detalle | Origen |
| --- | --- | --- |
| Lenguaje | JavaScript en backend y frontend | DP-07 |
| Backend | Node.js 20 o superior + Express 4; API REST bajo `/api/v1` | DP-07, DP-27 |
| Frontend | React 19 + Vite, SPA (Node 22 en desarrollo, ver `.nvmrc`) | DP-06 |
| Base de datos | PostgreSQL 16; el esquema oficial es `init.sql` | DP-02 |
| Autenticación | Login con Google OAuth; JWT propio con el rol como claim | DP-26 |
| Registro | Solo con correo institucional `@unicauca.edu.co` y sin contraseña (el dominio está marcado como supuesto pendiente, D-11) | DP-26 |
| Entornos | Docker Compose en desarrollo; Vercel + Render + Supabase en staging y producción, en capas gratuitas (tope de 1 GB de almacenamiento) | DP-09 |
| Léxico | WordNet 3.1 local, solo en inglés; sin Cambridge ni Oxford | DP-03, DP-08 |
| Navegadores | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ | Entrega 1 |
| Alcance funcional | Se maneja un solo curso | DP-17 |
| Idioma | Interfaz en inglés (i18n); mensajes de error de la API en español con `code` en inglés | DP-16 |

## 2.2 Restricciones organizativas

| Restricción | Detalle | Origen |
| --- | --- | --- |
| Duración | 16 semanas, Scrum en 4 sprints: S1 27-ago a 9-sep, S2 10 a 23-sep, S3 24-sep a 21-oct, S4 22-oct a 19-nov | DP-28 |
| Equipo | 4 integrantes con rotación obligatoria de roles | DP-29 |
| Flujo de trabajo | Gitflow: ramas `feature/...` desde `develop`, PR a `develop` con al menos una revisión, `main` protegida | DP-15 |
| Calidad en CI | Pruebas unitarias, SonarQube Cloud, CodeQL y suite OWASP en GitHub Actions; cobertura mayor al 70 % | DP-18 |
| Uso de IA | Política de validación crítica; los PR con IA llevan `[IA-ASSISTED]` y se registran en la bitácora y la trazabilidad | DP-21, DP-30 |

## 2.3 Convenciones

| Convención | Detalle |
| --- | --- |
| Nombres de estado | En español, tal como el backlog (`pendiente_revision`, `revisado_docente`, `abierto`, `cerrado`, `programado`, etc.) |
| Nombres de tabla | Los de `init.sql`, en singular |
| Respuestas de error | `{ error, code }`; ver `docs/codigos-error.md` |
| Roles | Docente, Estudiante, Invitado |
| Contenido | La aplicación no aloja libros; el ejemplo de uso es opcional y de máximo 150 caracteres (derechos de autor, DP-12) |