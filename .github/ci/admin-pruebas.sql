-- Administrador de PRUEBA para los workflows de seguridad (dast-zap.yml y fuzzing-schemathesis.yml).
-- seed.sql no trae ningun usuario con rol "administrador" (HU-023); sin esta fila no se puede firmar
-- un token de administrador que corresponda a una cuenta real, y las salvaguardas de /admin/*
-- (ADMIN_SELF_CHANGE, ADMIN_LAST_ADMIN) no se pueden probar.
-- Solo se ejecuta en la base DESECHABLE de CI (PostgreSQL de servicio). Nunca contra una base real.
INSERT INTO usuario (nombre_completo, email, password_hash, rol, nivel_ingles, activo)
VALUES ('Admin Pruebas', 'admin.pruebas@unicauca.edu.co', 'hash_temporal', 'administrador', NULL, true)
ON CONFLICT (email) DO NOTHING;
