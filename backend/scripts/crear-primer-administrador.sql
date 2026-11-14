-- HU-023: asigna el PRIMER administrador de la plataforma. Procedimiento completo y obligatorio:
-- docs/procedimiento-primer-administrador.md
--
-- Se ejecuta SOLO con acceso directo a la base de datos (no hay ninguna ruta de la API que cree un
-- administrador si todavía no existe uno). Antes: reemplazar el correo. NO subir a git el correo real.
--
-- Reglas que el script hace cumplir (si alguna falla, no cambia nada):
--   1. Solo actúa si NO existe ningún administrador activo.
--   2. La cuenta debe existir ya (la persona ingresó antes con Google; el login no crea cuentas).
--   3. No acepta a un docente con cursos asignados (no se deja un curso con un docente sin rol).
DO $$
DECLARE
  v_email CONSTANT text := 'REEMPLAZAR@unicauca.edu.co';
  v_id    integer;
  v_rol   text;
BEGIN
  IF EXISTS (SELECT 1 FROM usuario WHERE rol = 'administrador' AND activo) THEN
    RAISE EXCEPTION 'Ya existe un administrador activo. Use la aplicación: PATCH /api/v1/admin/users/{id}/role';
  END IF;

  SELECT id_usuario, rol INTO v_id, v_rol FROM usuario WHERE LOWER(email) = LOWER(v_email);
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'No existe una cuenta con el correo %. La persona debe ingresar primero con Google.', v_email;
  END IF;

  IF v_rol = 'docente' AND EXISTS (SELECT 1 FROM curso WHERE docente_id = v_id) THEN
    RAISE EXCEPTION 'La cuenta % es docente con cursos asignados; elija otra cuenta.', v_email;
  END IF;

  UPDATE usuario SET rol = 'administrador', activo = true WHERE id_usuario = v_id;
  RAISE NOTICE 'Administrador asignado: id_usuario=% (rol anterior: %)', v_id, v_rol;
END $$;

-- Verificación: debe devolver exactamente 1 fila.
SELECT id_usuario, nombre_completo, email, rol, activo
FROM usuario
WHERE rol = 'administrador';