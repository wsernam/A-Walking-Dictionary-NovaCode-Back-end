# Procedimiento seguro para asignar el primer administrador (HU-023)

## Principio

Ningún usuario puede convertirse en administrador desde la aplicación: el registro solo crea cuentas `estudiante` (o el docente inicial), `PATCH /api/v1/admin/users/:id/role` exige ser administrador, y el rol del JWT va firmado con `JWT_SECRET`. El **primer** administrador solo se asigna con acceso directo a la base de datos, mediante `backend/scripts/crear-primer-administrador.sql`. Quien no tenga las credenciales de la base de datos no puede hacerlo.

## Responsables

- **Ejecuta:** la persona del equipo que tiene acceso al proyecto de base de datos (Supabase).
- **Verifica:** una segunda persona del equipo confirma que el correo es el de la persona que administrará la plataforma.

## Antes de empezar

1. La futura administradora ya ingresó al menos una vez con su cuenta de Google institucional (el login no crea cuentas; su correo lo verifica Google).
2. En el servicio desplegado (Render): `NODE_ENV=production` y `DISABLE_AUTH` ausente o `false`. Con `DISABLE_AUTH=true` fuera de producción se desactiva la autenticación.
3. `JWT_SECRET` tiene al menos 32 caracteres y no se ha compartido.
4. La cuenta elegida no es un docente con cursos asignados (el script lo rechaza).

## Pasos

1. Confirmar que la cuenta existe y ver su estado actual:
   `SELECT id_usuario, nombre_completo, email, rol, activo FROM usuario WHERE LOWER(email) = LOWER('correo@unicauca.edu.co');`
2. Copiar `backend/scripts/crear-primer-administrador.sql` a un archivo **local sin versionar**, reemplazar `REEMPLAZAR@unicauca.edu.co` por el correo y ejecutarlo en el editor SQL. **No subir a git el correo real.**
3. Si falla, leer el mensaje: no se cambió nada. Causas: ya hay un administrador activo, la cuenta no existe o es un docente con cursos.
4. Si funciona, la consulta final debe mostrar exactamente 1 fila con `rol = administrador` y `activo = true`.
5. La administradora cierra sesión y vuelve a entrar para recibir un JWT con el rol nuevo.
6. Comprobar que `GET /api/v1/admin/users` responde 200 con su token y 403 con el de un estudiante.
7. Registrar en la bitácora del equipo: fecha, quién ejecutó, quién verificó y el `id_usuario` asignado.

## Qué NO hacer

- No crear administradores editando la tabla `usuario` a mano para más personas: a partir del primero, los demás se asignan desde la aplicación (queda auditoría en el log).
- No activar `DISABLE_AUTH` en producción ni compartir `JWT_SECRET`.
- No guardar en git el script con un correo real.

## Si se pierde el acceso de administrador

El script solo actúa si no existe ningún administrador **activo**; repetir el procedimiento con otra cuenta.

## Limitación conocida

Un JWT ya emitido sigue siendo válido hasta que expire (8 horas) aunque la cuenta se desactive o pierda el rol. El login sí rechaza las cuentas desactivadas.