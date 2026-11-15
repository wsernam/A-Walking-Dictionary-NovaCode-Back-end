# Contrato Backend → Frontend — HU-023 (administrar usuarios y roles)

Le dice al frontend (React) qué expone el backend para la vista de gestión de usuarios. Cubre CA-23.1 y CA-23.2, y las reglas backend de CA-23.3 y CA-23.4.

Última actualización: 2026-11-15.

- Rama de esta actualización: `feature/backend/hu-023-acceso-salvaguardas`.
- PR relacionado: #76 hacia `develop`.
- Base URL: `/api/v1`.
- Formato: JSON.
- Todos los endpoints administrativos exigen `Authorization: Bearer <token>` de un usuario con rol `administrador`.
- Sin token, con token inválido o expirado: 401.
- Con un rol distinto de administrador: 403 `AUTH_FORBIDDEN`.
- Roles asignables: `estudiante`, `docente`, `administrador`.
- `invitado` no existe como rol guardado en la base de datos y no se puede asignar.

## Resumen

| Método y ruta | Para qué | CA |
|---|---|---|
| `GET /admin/users` | Lista y busca usuarios, paginado | CA-23.1 |
| `PATCH /admin/users/:id/role` | Cambia el rol de una cuenta | CA-23.2, CA-23.4 |
| `PATCH /admin/users/:id/status` | Activa o desactiva una cuenta | CA-23.2, CA-23.4 |

Las tres rutas están sujetas al control de acceso de CA-23.3.

## GET /admin/users

Query, todos opcionales:

| Parámetro | Descripción |
|---|---|
| `search` | Búsqueda por nombre o correo; máximo 100 caracteres |
| `rol` | `estudiante`, `docente` o `administrador` |
| `activo` | Texto `true` o `false` |
| `page` | Entero positivo; por defecto 1 |
| `limit` | Entero positivo; por defecto 20, máximo 100 |

Orden: fecha de registro descendente e identificador descendente.

Respuesta 200:

```json
{
  "data": [
    {
      "id_usuario": 5,
      "nombre_completo": "Ana Pérez",
      "email": "ana@unicauca.edu.co",
      "rol": "estudiante",
      "activo": true,
      "fecha_registro": "2026-11-01T15:20:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 45,
  "total_pages": 3
}
```

Nunca se devuelve `password_hash`.

## PATCH /admin/users/:id/role

Body:

```json
{
  "rol": "docente"
}
```

Respuesta 200: el usuario actualizado, con la misma forma que un elemento de `data`.

Pedir el rol que la cuenta ya tiene responde 200 sin escribir ni auditar, siempre que no se trate de una modificación de la propia cuenta.

No se admite `invitado` ni ningún valor diferente de los tres roles asignables.

## PATCH /admin/users/:id/status

Body:

```json
{
  "activo": false
}
```

`activo` debe ser booleano; no se admite el texto `"false"`.

Respuesta 200: el usuario actualizado.

Pedir el estado que la cuenta ya tiene responde 200 sin escribir ni auditar, siempre que no se trate de una modificación de la propia cuenta.

Una cuenta desactivada no puede iniciar una nueva sesión.

Desactivar a un docente no modifica sus cursos ni el historial. La restricción del docente con cursos aplica al cambio de rol.

## Errores

Formato:

```json
{
  "error": "Mensaje en español",
  "code": "CODIGO_FIJO"
}
```

El frontend traduce por `code`.

| Status | `code` | Cuándo |
|---|---|---|
| 400 | `ADMIN_INVALID_ID` | El `:id` no es un entero positivo válido entre 1 y 2147483647 |
| 400 | `ADMIN_INVALID_ROLE` | Rol fuera de los tres asignables, incluido `invitado`, o filtro `rol` inválido |
| 400 | `ADMIN_INVALID_STATUS` | `activo` no es booleano, o el filtro `activo` no es `true` o `false` |
| 400 | `ADMIN_INVALID_QUERY` | `page`, `limit` o `search` inválidos |
| 401 | `AUTH_TOKEN_MISSING` | Falta el token |
| 401 | `AUTH_TOKEN_INVALID` | Token inválido o expirado |
| 403 | `AUTH_FORBIDDEN` | El rol no está permitido en la ruta |
| 404 | `ADMIN_USER_NOT_FOUND` | La cuenta que se intenta modificar no existe |
| 409 | `ADMIN_SELF_CHANGE` | Intenta cambiar su propio rol o estado |
| 409 | `ADMIN_LAST_ADMIN` | Intenta quitar el rol o desactivar al último administrador activo |
| 409 | `ADMIN_TEACHER_HAS_COURSES` | Intenta cambiar el rol de un docente con cursos asignados |
| 429 | `RATE_LIMITED` | Se superó el límite de solicitudes |

Los códigos `ADMIN_INVALID_ID` y `ADMIN_USER_NOT_FOUND` corresponden a las operaciones administrativas. No sustituyen los códigos genéricos de otras funcionalidades.

## CA-23.3 — Separación de funciones por rol

Las rutas `/admin/*` exigen JWT válido y rol `administrador`.

El administrador no hereda los permisos de docente o estudiante.

Las rutas académicas siguientes rechazan al administrador con 403 `AUTH_FORBIDDEN`:

| Método y ruta | Roles permitidos |
|---|---|
| `GET /users/:id` | Docente y estudiante, con la regla adicional de propiedad del controlador |
| `PATCH /users/profile` | Estudiante |
| `GET /students/:id/context` | Docente y estudiante, con la regla adicional de propiedad del controlador |
| `POST /decks/:id/cards` | Docente y estudiante, con la comprobación adicional de inscripción activa |
| `POST /aportes` | Docente y estudiante |
| `GET /aportes` | Docente y estudiante |
| `GET /aportes/:id` | Docente y estudiante |

Las demás funciones exclusivas de docente o estudiante conservan sus restricciones por rol.

Los reportes de progreso individual y modo de estudio también rechazan al administrador, con 403 `REPORT_FORBIDDEN`, mediante sus servicios.

### Responsabilidad del frontend

- Mostrar la gestión administrativa únicamente para el rol `administrador`.
- Proteger las rutas de React.
- Dirigir al administrador a su vista administrativa después del login.
- Evitar redirecciones circulares entre las vistas de docente y estudiante.
- Tratar un 401 como ausencia o invalidez de sesión.
- Tratar un 403 como falta de permisos.

La navegación y la vista administrativa corresponden al repositorio frontend.

## CA-23.4 — Salvaguardas de administración

El backend rechaza:

- Cambiar el propio rol o estado: 409 `ADMIN_SELF_CHANGE`.
- Quitar el rol al último administrador activo: 409 `ADMIN_LAST_ADMIN`.
- Desactivar al último administrador activo: 409 `ADMIN_LAST_ADMIN`.
- Cambiar el rol de un docente con cursos: 409 `ADMIN_TEACHER_HAS_COURSES`.
- Asignar un rol inválido: 400 `ADMIN_INVALID_ROLE`.
- Modificar una cuenta inexistente: 404 `ADMIN_USER_NOT_FOUND`.
- Enviar un identificador inválido: 400 `ADMIN_INVALID_ID`.

Los cambios de rol y estado se evalúan en una transacción de PostgreSQL con `pg_advisory_xact_lock`.

Los rechazos no deben alterar los datos. Las pruebas de integración comprueban rollback y protección del último administrador ante operaciones simultáneas.

## Auditoría

Los cambios efectivos dejan una línea en el log:

```text
[AUDITORIA] cambio_rol admin=<id> objetivo=<id> rol_anterior=<rol> rol_nuevo=<rol>
[AUDITORIA] cambio_estado admin=<id> objetivo=<id> activo_anterior=<valor> activo_nuevo=<valor>
```

No se registran correos ni contraseñas en esas líneas.

Solicitar el mismo valor, sin cambios efectivos, no genera una línea de auditoría de cambio.

## Límites de solicitudes

### Administración

Las rutas administrativas comparten un límite de 100 solicitudes por IP cada 15 minutos, ajustable mediante `RATE_LIMIT_ADMIN_MAX`.

### Rutas académicas de esta actualización

Utilizan límites de 300 solicitudes por IP cada 15 minutos:

- En usuarios, la consulta y actualización del perfil comparten contador.
- En aportes, las tres rutas generales protegidas comparten contador.
- El contexto académico tiene su instancia de limitador.
- El registro de tarjetas tiene su instancia de limitador.

Los contadores están en memoria y se reinician con el proceso.

Al superar un límite, se responde 429 `RATE_LIMITED`. Este rechazo puede producirse antes de evaluar autenticación o permisos.

## Sugerencias para la interfaz

- Deshabilitar los controles de rol y estado en la fila del propio administrador.
- Pedir confirmación antes de enviar un cambio.
- No ofrecer `invitado` en el selector de rol.
- Mostrar los errores de las salvaguardas sin asumir que el cambio se guardó.
- Manejar 429 e indicar que se debe intentar nuevamente más tarde.

El backend mantiene las restricciones aunque el frontend oculte los controles.

## Verificación del backend

- Pruebas funcionales de acceso: `backend/pruebas-funcionales/hu023-control-acceso.test.js`.
- Pruebas de integración: `backend/tests-integracion/hu023-salvaguardas.test.js`.
- Comando de integración desde `backend`: `npm run test:integracion:hu023`.
- CI: job `HU-023 - Integración CA-23.4` en `.github/workflows/backend-tests.yml`.
- PostgreSQL de pruebas aislado en el puerto 55432.
- La integración utiliza un esquema temporal y publica un reporte JUnit en CI.

La cobertura backend no valida la navegación de React.

## Limitaciones conocidas

- Sesiones ya emitidas: el backend no consulta la base de datos en cada petición. Si se desactiva una cuenta o se le cambia el rol, su JWT sigue siendo válido hasta que expire, hasta 8 horas. El cambio se refleja en un nuevo inicio de sesión; el login sí rechaza las cuentas desactivadas.
- Primer administrador: no se crea desde la aplicación. Ver `docs/procedimiento-primer-administrador.md`.
- Los límites de solicitudes utilizan contadores en memoria; no son contadores distribuidos entre varias instancias.