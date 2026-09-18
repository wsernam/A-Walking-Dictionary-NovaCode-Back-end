-- seed_auth_test.sql
-- Datos adicionales SOLO para poder probar HU-5.4 (login) con la coleccion de Postman
-- "HU-5.4 - Autenticacion y Roles.postman_collection.json".
--
-- Por que hace falta un archivo aparte: los usuarios de seed.sql tienen
-- password_hash = 'hash_temporal', que no es un hash bcrypt real, asi que no sirven para
-- loguearse. HU-5.1 (registro) todavia no esta en esta rama, asi que tampoco hay un endpoint
-- para crear estos usuarios via API -- se insertan a mano, con un hash bcrypt real generado
-- con el mismo bcrypt (cost 10) que usa AuthService.
--
-- Ejecutar DESPUES de init.sql y seed.sql. No se auto-ejecuta con Docker (solo init.sql en
-- /docker-entrypoint-initdb.d/ corre solo); este se corre a mano, igual que seed.sql.

INSERT INTO usuario (nombre_completo, email, password_hash, rol, nivel_ingles, activo)
VALUES (
  'Docente Prueba Auth',
  'docente_test@unicauca.edu.co',
  '$2b$10$X7qjmbCpNn6wql9maquCQO9q4M5EiX4T3QcWiTqV688CUWzeHaAZC', -- password en texto plano: Docente123!
  'docente',
  NULL,
  true
);

INSERT INTO usuario (nombre_completo, email, password_hash, rol, nivel_ingles, activo)
VALUES (
  'Estudiante Prueba Auth',
  'estudiante_test@unicauca.edu.co',
  '$2b$10$kSTAmQVO/nuQL/0A1MPQOOk4..NDOp9h2qyQvOFfIQePB2cFuN4HO', -- password en texto plano: Estudiante123!
  'estudiante',
  'B1',
  true
);

-- Verificacion rapida
SELECT id_usuario, nombre_completo, email, rol FROM usuario WHERE email LIKE '%_test@unicauca.edu.co';
