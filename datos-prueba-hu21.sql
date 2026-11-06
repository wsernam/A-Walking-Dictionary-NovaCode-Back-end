-- Datos de prueba para HU-021 (reporte de resultados por quiz). Corre sobre la base con init.sql
-- y seed.sql. Crea 3 quices y deja los datos guardados (COMMIT). Imprime al final los ids que se
-- pegan en las variables de la colección de Postman.

BEGIN;

-- Quiz A: con resultados (curso 1, de la docente Ana)
INSERT INTO quiz (curso_id, titulo, semana_corte, fecha_apertura, fecha_cierre, tiempo_limite_min, estado)
SELECT id_curso, 'HU-021 quiz con resultados', 4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 20, 'cerrado'
FROM curso WHERE nombre = 'Literatura Anglófona'
RETURNING id_quiz AS quiz_ok \gset

INSERT INTO pregunta_quiz (quiz_id, tarjeta_id, tipo_pregunta, enunciado, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, orden)
SELECT :quiz_ok, t.id_tarjeta, 'opcion_multiple', 'Que significa "' || t.palabra || '"?', 'a', 'b', 'c', 'd', 'a', t.id_tarjeta
FROM tarjeta t WHERE t.id_tarjeta IN (1, 2);

-- Juan 4.5, Maria 3.5 y ksandoval 2.0 (NO está inscrito: prueba S2). Carlos no presenta.
INSERT INTO resultado_quiz (quiz_id, estudiante_id, fecha_inicio, fecha_envio, puntaje_obtenido, puntaje_maximo, calificacion, tiempo_empleado_seg)
SELECT :quiz_ok, u.id_usuario, NOW() - INTERVAL '1 day 1 hour', NOW() - INTERVAL '1 day', v.pun, 10, v.cal, v.seg
FROM (VALUES ('juan.estudiante@unicauca.edu.co', 9, 4.5, 760),
             ('maria.estudiante@unicauca.edu.co', 7, 3.5, 1085),
             ('ksandoval@unicauca.edu.co', 4, 2.0, 600)) AS v(email, pun, cal, seg)
JOIN usuario u ON u.email = v.email;

-- Pregunta 1: Juan bien, Maria mal, ksandoval mal. Pregunta 2: Juan mal, Maria mal, ksandoval sin responder (S5).
INSERT INTO respuesta_quiz (resultado_id, pregunta_id, respuesta_estudiante, es_correcta, puntaje_obtenido)
SELECT r.id_resultado, p.id_pregunta, 'x', v.ok, CASE WHEN v.ok THEN 1 ELSE 0 END
FROM (VALUES ('juan.estudiante@unicauca.edu.co', 1, true),
             ('maria.estudiante@unicauca.edu.co', 1, false),
             ('ksandoval@unicauca.edu.co', 1, false),
             ('juan.estudiante@unicauca.edu.co', 2, false),
             ('maria.estudiante@unicauca.edu.co', 2, false)) AS v(email, tarjeta, ok)
JOIN usuario u ON u.email = v.email
JOIN resultado_quiz r ON r.quiz_id = :quiz_ok AND r.estudiante_id = u.id_usuario
JOIN pregunta_quiz p ON p.quiz_id = :quiz_ok AND p.tarjeta_id = v.tarjeta;

-- Quiz B: sin resultados (mismo curso)
INSERT INTO quiz (curso_id, titulo, semana_corte, fecha_apertura, fecha_cierre, tiempo_limite_min, estado)
SELECT id_curso, 'HU-021 quiz sin resultados', 2, NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days', 20, 'programado'
FROM curso WHERE nombre = 'Literatura Anglófona'
RETURNING id_quiz AS quiz_vacio \gset

-- Quiz C: de OTRA docente (curso 'HU-021 curso de otra docente', docente = William Serna)
INSERT INTO curso (nombre, periodo, fecha_inicio, fecha_fin, docente_id, estado)
SELECT 'HU-021 curso de otra docente', '2026-2', '2026-08-01', '2026-12-15', id_usuario, 'activo'
FROM usuario WHERE email = 'wsernamunoz@gmail.com'
RETURNING id_curso AS curso_otro \gset

INSERT INTO quiz (curso_id, titulo, semana_corte, fecha_apertura, fecha_cierre, tiempo_limite_min, estado)
VALUES (:curso_otro, 'HU-021 quiz de otra docente', 1, NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days', 20, 'programado')
RETURNING id_quiz AS quiz_otra \gset

COMMIT;

\echo
\echo '=== Pegue estos ids en las variables de la colección de Postman ==='
SELECT :quiz_ok AS quiz_id, :quiz_vacio AS quiz_sin_resultados_id, :quiz_otra AS quiz_otra_docente_id;