# Contrato Backend → Frontend — HU-023 (administrar usuarios y roles)

Le dice al frontend (React) qué expone el backend para la vista de gestión de usuarios. Cubre CA-23.1 y CA-23.2. Última actualización: 2026-11-14.

- Rama: `feature/backend/hu-023-administrar-usuarios`. Base URL: `/api/v1`. Formato: JSON.
- 🔐 Todos los endpoints exigen `Authorization: Bearer <token>` de un usuario con rol **administrador**. Sin token → `401`; cualquier otro rol → `403` (`AUTH_FORBIDDEN`). Mostrar la vista y proteger las rutas de React solo para ese rol.
- Roles asignables: `estudiante`, `docente`, `administrador`. **`invitado` no existe en la base de datos y no se puede asignar** (400).

## Resumen

| Método y ruta | Para qué | CA |
|---|---|---|
| `GET /admin/users` | Lista y busca usuarios, paginado | CA-23.1 |
| `PATCH /admin/users/:id/role` | Cambia el rol de una cuenta | CA-23.2 |
| `PATCH /admin/users/:id/status` | Activa o desactiva una cuenta | CA-23.2 |

## GET /admin/users

Query (todos opcionales): `search` (texto en nombre o correo, máx. 100), `rol` (`estudiante|docente|administrador`), `activo` (`true|false`), `page` (por defecto 1), `limit` (por defecto 20, máximo 100). Orden: más recientes primero.

```json
{
  "data": [
    { "id_usuario": 5, "nombre_completo": "Ana Pérez", "email": "ana@unicauca.edu.co",
      "rol": "estudiante", "activo": true, "fecha_registro": "2026-11-01T15:20:00.000Z" }
  ],
  "page": 1, "limit": 20, "total": 45, "total_pages": 3
}
```
Nunca se devuelve `password_hash`.

## PATCH /admin/users/:id/role

Body: `{ "rol": "docente" }`. Respuesta 200: el usuario actualizado (misma forma que un elemento de `data`).
Pedir el rol que la cuenta ya tiene responde 200 sin cambios.

## PATCH /admin/users/:id/status

Body: `{ "activo": false }` (booleano, no texto). Respuesta 200: el usuario actualizado.
Una cuenta desactivada no puede iniciar sesión. **Desactivar a un docente no modifica sus cursos ni el historial.**

## Errores (`{ "error": "...", "code": "..." }`; el front traduce por `code`)

| Status | `code` | Cuándo |
|---|---|---|
| 400 | `INVALID_ID` | El `:id` no es un entero válido |
| 400 | `ADMIN_INVALID_ROLE` | Rol fuera de los tres asignables (incluye `invitado`) o filtro `rol` inválido |
| 400 | `ADMIN_INVALID_STATUS` | `activo` no es booleano, o el filtro `activo` no es `true`/`false` |
| 400 | `ADMIN_INVALID_QUERY` | `page`, `limit` o `search` inválidos |
| 401 | `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` | Falta el token o expiró |
| 403 | `AUTH_FORBIDDEN` | El rol del token no es administrador |
| 404 | `USER_NOT_FOUND` | La cuenta no existe |
| 409 | `ADMIN_SELF_CHANGE` | Intenta cambiar su propio rol o estado |
| 409 | `ADMIN_LAST_ADMIN` | Quitar el rol o desactivar al último administrador activo |
| 409 | `ADMIN_TEACHER_HAS_COURSES` | Quitarle el rol docente a quien tiene cursos asignados |
| 429 | `RATE_LIMITED` | Demasiadas peticiones (100 por IP cada 15 min) |

## Sugerencias para la interfaz

- Deshabilitar los controles de rol y estado en la fila del propio administrador (el backend igual responde 409).
- Pedir confirmación antes de enviar el cambio (CA-23.2: «y confirma»).
- No ofrecer `invitado` en el selector de rol.

## Limitaciones conocidas

- **Sesiones ya emitidas:** el backend no consulta la base de datos en cada petición. Si se desactiva una cuenta o se le cambia el rol, su JWT sigue siendo válido hasta que expire (8 horas); el cambio se nota en el siguiente inicio de sesión. La cuenta desactivada sí se rechaza de inmediato en el login.
- **Primer administrador:** no se crea desde la aplicación. Ver `docs/procedimiento-primer-administrador.md`.