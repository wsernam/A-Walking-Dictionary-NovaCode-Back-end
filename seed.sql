-- seed.sql
-- Datos mínimos de prueba para poder ejercitar los endpoints de HE-01
-- (POST /decks, POST /decks/:id/cards, POST /cards/check-duplicate).
-- Ejecutar DESPUÉS de que init.sql haya creado las tablas. No se auto-ejecuta con Docker
-- (solo init.sql en /docker-entrypoint-initdb.d/ se ejecuta solo); este se corre a mano.

-- 1 docente
INSERT INTO usuario (nombre_completo, email, password_hash, rol, nivel_ingles, activo)
VALUES ('Ana Docente', 'ana.docente@unicauca.edu.co', 'hash_temporal', 'docente', NULL, true);

-- 2 estudiantes
INSERT INTO usuario (nombre_completo, email, password_hash, rol, nivel_ingles, activo)
VALUES
  ('Juan Estudiante', 'juan.estudiante@unicauca.edu.co', 'hash_temporal', 'estudiante', 'B1', true),
  ('Maria Estudiante', 'maria.estudiante@unicauca.edu.co', 'hash_temporal', 'estudiante', 'B2', true);

-- 1 curso, con docente_id apuntando al usuario docente recién creado
INSERT INTO curso (nombre, periodo, fecha_inicio, fecha_fin, docente_id, estado)
VALUES (
  'Literatura Anglófona',
  '2026-2',
  '2026-08-01',
  '2026-12-15',
  (SELECT id_usuario FROM usuario WHERE email = 'ana.docente@unicauca.edu.co'),
  'activo'
);

-- 2 inscripciones (los 2 estudiantes matriculados en el curso recién creado)
INSERT INTO inscripcion (curso_id, estudiante_id, fecha_inscripcion, estado)
VALUES
  (
    (SELECT id_curso FROM curso WHERE nombre = 'Literatura Anglófona'),
    (SELECT id_usuario FROM usuario WHERE email = 'juan.estudiante@unicauca.edu.co'),
    CURRENT_DATE,
    'activa'
  ),
  (
    (SELECT id_curso FROM curso WHERE nombre = 'Literatura Anglófona'),
    (SELECT id_usuario FROM usuario WHERE email = 'maria.estudiante@unicauca.edu.co'),
    CURRENT_DATE,
    'activa'
  );

-- Verificación rápida: muestra los ids que quedaron, para usarlos en requests.http
SELECT id_usuario, nombre_completo, rol FROM usuario;
SELECT id_curso, nombre, docente_id FROM curso;
SELECT id_inscripcion, curso_id, estudiante_id FROM inscripcion;
