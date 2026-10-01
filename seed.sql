-- seed.sql
-- Datos mínimos de prueba para poder ejercitar los endpoints de HE-01 y HE-02
-- (POST /decks, POST /decks/:id/cards, POST /cards/check-duplicate, curaduría, contexto,
-- analíticas). Ejecutar DESPUÉS de que init.sql haya creado las tablas. No se auto-ejecuta con
-- Docker (solo init.sql en /docker-entrypoint-initdb.d/ se ejecuta solo); este se corre a mano.

-- 1 docente
INSERT INTO usuario (nombre_completo, email, password_hash, rol, nivel_ingles, activo)
VALUES ('Ana Docente', 'ana.docente@unicauca.edu.co', 'hash_temporal', 'docente', NULL, true);

-- 3 estudiantes (el 3ro es necesario para el test "HU-003 / CA-1.3.2 - Repetir palabra con
-- OTRA definición" de la colección Postman, que simula a un tercer estudiante distinto
-- proponiendo una acepción nueva sobre una palabra que ya crearon otros dos).
INSERT INTO usuario (nombre_completo, email, password_hash, rol, nivel_ingles, activo)
VALUES
  ('Juan Estudiante', 'juan.estudiante@unicauca.edu.co', 'hash_temporal', 'estudiante', 'B1', true),
  ('Maria Estudiante', 'maria.estudiante@unicauca.edu.co', 'hash_temporal', 'estudiante', 'B2', true),
  ('Carlos Estudiante', 'carlos.estudiante@unicauca.edu.co', 'hash_temporal', 'estudiante', 'A2', true);

-- Cuentas reales del equipo para probar el login con Google (HU-5.4). El login ya no usa
-- contraseña ni crea usuarios: el correo de Google tiene que existir aquí, con su rol.
-- password_hash es NOT NULL en el DER pero no interviene en el login con Google.
-- nombre_completo de los estudiantes es un placeholder (solo se conoce el correo).
INSERT INTO usuario (nombre_completo, email, password_hash, rol, nivel_ingles, activo)
VALUES
  ('William Serna', 'wsernamunoz@gmail.com', 'hash_temporal', 'docente', NULL, true),
  ('ksandoval', 'ksandoval@unicauca.edu.co', 'hash_temporal', 'estudiante', NULL, true),
  ('manmeneses', 'manmeneses@unicauca.edu.co', 'hash_temporal', 'estudiante', NULL, true),
  ('thaliabernal', 'thaliabernal@unicauca.edu.co', 'hash_temporal', 'estudiante', NULL, true);

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

-- 3 inscripciones (los 3 estudiantes matriculados en el curso recién creado).
-- Con una base de datos recién creada, quedan como id_inscripcion 1 (Juan), 2 (María) y
-- 3 (Carlos) — esos son los ids que usa la colección de Postman "Sprint 1 (HE1 y HE2)".
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
  ),
  (
    (SELECT id_curso FROM curso WHERE nombre = 'Literatura Anglófona'),
    (SELECT id_usuario FROM usuario WHERE email = 'carlos.estudiante@unicauca.edu.co'),
    CURRENT_DATE,
    'activa'
  );

-- =========================================================
-- Mazos y palabras del plan de clase real del curso (English Literature 2026-2, prof. Angela
-- Castro): un mazo por libro, con la semana y la fecha de la clase en que se lee.
--
-- - Las palabras son vocabulario temático de cada lectura (no citas textuales de los libros)
--   y los ejemplos son frases propias.
-- - Fechas pensadas para probar el repaso (HU-4.1) con hoy ≈ 2026-09-30: los mazos de agosto y
--   septiembre ya cerraron (siguen en el repaso, es acumulativo); "Fear of Stones" está abierto
--   y tiene palabras pendientes de revisión y una coautoría; los de octubre/noviembre aún no
--   llegan a su fecha_apertura, así que no salen en el repaso y van sin palabras.
-- - Todo se busca por nombre/correo (no por id), así que este bloque también se puede correr a
--   mano sobre una base que ya tenga el curso y los estudiantes de arriba.
-- =========================================================
INSERT INTO mazo (curso_id, docente_id, nombre_lectura, autor, semana, estado, fecha_apertura, fecha_cierre)
SELECT c.id_curso, c.docente_id, m.nombre_lectura, m.autor, m.semana, m.estado, m.fecha_apertura::date, m.fecha_cierre::date
FROM curso c
CROSS JOIN (VALUES
  ('Stitch by Stitch',                 'Ridlon',                          1,  'cerrado', '2026-08-06', '2026-08-12'),
  ('Just Ask!',                        'Sonia Sotomayor',                 2,  'cerrado', '2026-08-13', '2026-08-26'),
  ('Once Upon a Thread',               'Dee',                             4,  'cerrado', '2026-08-27', '2026-09-02'),
  ('Violeta Parra (Anti-princesas)',   'Nadia Fink & Pitu Saá',           6,  'cerrado', '2026-09-10', '2026-09-16'),
  ('Patchwork',                        'Matt de la Peña & Corinna Luyken', 7,  'cerrado', '2026-09-17', '2026-09-23'),
  ('Fear of Stones and Other Stories', 'Kei Miller',                      8,  'abierto', '2026-09-24', '2026-10-07'),
  ('Where Are You From?',              'Yamile Saied Méndez & Jaime Kim', 12, 'abierto', '2026-10-22', '2026-10-28'),
  ('We Are Water Protectors',          'Carole Lindstrom',                13, 'abierto', '2026-10-29', '2026-11-04'),
  ('The Composition',                  'Antonio Skármeta',                15, 'abierto', '2026-11-12', '2026-11-18')
) AS m(nombre_lectura, autor, semana, estado, fecha_apertura, fecha_cierre)
WHERE c.nombre = 'Literatura Anglófona';

-- Tarjetas + su aporte 'creada'. El autor rota entre los 3 estudiantes de prueba.
-- La palabra va normalizada (minúsculas), como la guarda DeduplicacionService.
WITH datos (nombre_lectura, palabra, traduccion, definicion, ejemplo, estado, autor_email) AS (
  VALUES
  -- Semana 1 · Stitch by Stitch
  ('Stitch by Stitch', 'needle', 'aguja', 'A thin pointed tool with a hole at one end, used for sewing.', 'She threaded the needle with red cotton.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Stitch by Stitch', 'thread', 'hilo', 'A long, thin strand of cotton or another fiber used for sewing.', 'He chose a blue thread to fix his shirt.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Stitch by Stitch', 'stitch', 'puntada', 'A single loop of thread made by passing a needle through fabric.', 'Grandma taught me how to make a small, even stitch.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  ('Stitch by Stitch', 'fabric', 'tela', 'Material made by weaving or knitting fibers together.', 'The quilt was made from old pieces of fabric.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Stitch by Stitch', 'thimble', 'dedal', 'A small metal cap worn on the finger to push the needle while sewing.', 'She wore a silver thimble to protect her finger.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Stitch by Stitch', 'mend', 'remendar', 'To repair something that is torn or broken.', 'We mended the hole in my jacket together.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  -- Semanas 2-3 · Just Ask!
  ('Just Ask!', 'different', 'diferente', 'Not the same as another person or thing.', 'Every plant in the garden is different, and that makes it beautiful.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Just Ask!', 'curious', 'curioso', 'Wanting to know or learn about something.', 'If you are curious about my wheelchair, just ask.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Just Ask!', 'wheelchair', 'silla de ruedas', 'A chair with wheels used by people who cannot walk easily.', 'He races down the garden path in his wheelchair.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  ('Just Ask!', 'allergy', 'alergia', 'A condition that makes a person ill after eating, touching or breathing something.', 'He has a nut allergy, so he checks every snack.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Just Ask!', 'ability', 'habilidad', 'The skill or power to do something.', 'Each child in the story has a special ability.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Just Ask!', 'include', 'incluir', 'To make someone part of a group or activity.', 'We always include everyone in our games.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  -- Semana 4 · Once Upon a Thread
  ('Once Upon a Thread', 'spindle', 'huso', 'A thin rod used to twist fibers into thread when spinning.', 'In the old tale, the princess pricked her finger on a spindle.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Once Upon a Thread', 'weave', 'tejer', 'To make cloth by crossing threads over and under each other.', 'The weaver could weave a whole story into a blanket.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Once Upon a Thread', 'tale', 'cuento', 'A story, especially one about imaginary events.', 'My grandmother told us a tale before bed.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  ('Once Upon a Thread', 'spool', 'carrete', 'A small cylinder on which thread is wound.', 'A spool of golden thread rolled under the table.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Once Upon a Thread', 'tangle', 'enredo', 'A confused mass of threads or hair twisted together.', 'The kitten turned the yarn into a big tangle.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Once Upon a Thread', 'loom', 'telar', 'A machine or frame used for weaving cloth.', 'The old loom in the attic still worked.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  -- Semana 6 · Violeta Parra (Anti-princesas)
  ('Violeta Parra (Anti-princesas)', 'songwriter', 'compositora', 'A person who writes songs.', 'Violeta Parra was a Chilean songwriter and folk singer.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Violeta Parra (Anti-princesas)', 'folk', 'folclórico', 'Traditional music or art that comes from the ordinary people of a region.', 'She travelled across Chile collecting folk songs.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Violeta Parra (Anti-princesas)', 'embroidery', 'bordado', 'Decoration sewn onto fabric with colored thread.', 'Her embroidery showed scenes of everyday life.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  ('Violeta Parra (Anti-princesas)', 'tapestry', 'tapiz', 'A heavy cloth with pictures woven or sewn into it.', 'Her tapestries were exhibited in Paris.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Violeta Parra (Anti-princesas)', 'guitar', 'guitarra', 'A musical instrument with six strings played with the fingers.', 'She sang about her country while playing the guitar.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Violeta Parra (Anti-princesas)', 'princess', 'princesa', 'The daughter of a king or queen.', 'This book tells the story of a real woman, not a fairy-tale princess.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  -- Semana 7 · Patchwork
  ('Patchwork', 'patchwork', 'trabajo de retazos', 'Needlework in which small pieces of different fabrics are sewn together.', 'Our lives are like a patchwork of many colors.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Patchwork', 'become', 'llegar a ser', 'To begin to be something.', 'You might become a dancer, a scientist or a poet.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Patchwork', 'dream', 'sueño', 'Something you hope to do or achieve in the future.', 'Never stop following your dream.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  ('Patchwork', 'quilt', 'colcha', 'A warm bed cover made of layers of fabric sewn together.', 'The quilt kept every piece of the family story.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Patchwork', 'possibility', 'posibilidad', 'Something that might happen or be true.', 'Every child holds a world of possibility.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Patchwork', 'piece', 'pedazo', 'A part of something.', 'Each piece is different, but together they make something beautiful.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  -- Semanas 8-9 · Fear of Stones and Other Stories (mazo abierto: hay pendientes)
  ('Fear of Stones and Other Stories', 'stone', 'piedra', 'A small piece of rock.', 'The boy kept a smooth stone in his pocket.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Fear of Stones and Other Stories', 'fear', 'miedo', 'The unpleasant feeling you have when you think you are in danger.', 'Her fear disappeared when she heard her mother''s voice.', 'revisado_docente', 'maria.estudiante@unicauca.edu.co'),
  ('Fear of Stones and Other Stories', 'island', 'isla', 'A piece of land completely surrounded by water.', 'Jamaica is an island in the Caribbean Sea.', 'revisado_docente', 'carlos.estudiante@unicauca.edu.co'),
  ('Fear of Stones and Other Stories', 'belong', 'pertenecer', 'To feel happy and comfortable in a place or group.', 'He never felt he could belong in that town.', 'revisado_docente', 'juan.estudiante@unicauca.edu.co'),
  ('Fear of Stones and Other Stories', 'gossip', 'chisme', 'Talk about other people''s private lives, often unkind or untrue.', 'The gossip spread quickly through the small village.', 'pendiente_revision', 'maria.estudiante@unicauca.edu.co'),
  ('Fear of Stones and Other Stories', 'secret', 'secreto', 'Something known by only a few people and not told to others.', 'She kept her secret for many years.', 'pendiente_revision', 'carlos.estudiante@unicauca.edu.co')
),
nuevas AS (
  INSERT INTO tarjeta (mazo_id, palabra, traduccion, definicion, ejemplo, estado, fecha_creacion, fecha_revision)
  SELECT m.id_mazo, d.palabra, d.traduccion, d.definicion, d.ejemplo, d.estado,
         m.fecha_apertura + INTERVAL '2 days',
         CASE WHEN d.estado = 'revisado_docente' THEN m.fecha_apertura + INTERVAL '4 days' END
  FROM datos d
  JOIN mazo m ON m.nombre_lectura = d.nombre_lectura
  RETURNING id_tarjeta, mazo_id, palabra, traduccion, definicion, ejemplo, fecha_creacion
)
INSERT INTO aporte (tarjeta_id, inscripcion_id, traduccion_aportada, definicion_aportada, ejemplo_aportado, tipo_aporte, fecha_aporte)
SELECT n.id_tarjeta, i.id_inscripcion, n.traduccion, n.definicion, n.ejemplo, 'creada', n.fecha_creacion
FROM nuevas n
JOIN mazo m ON m.id_mazo = n.mazo_id
JOIN datos d ON d.nombre_lectura = m.nombre_lectura AND d.palabra = n.palabra
JOIN usuario u ON u.email = d.autor_email
JOIN inscripcion i ON i.estudiante_id = u.id_usuario AND i.curso_id = m.curso_id;

-- Una coautoría pendiente (misma información) sobre una palabra ya aprobada: otro estudiante
-- registró "island" en "Fear of Stones" después de que la docente la aprobara.
INSERT INTO aporte (tarjeta_id, inscripcion_id, traduccion_aportada, definicion_aportada, ejemplo_aportado, tipo_aporte, fecha_aporte)
SELECT t.id_tarjeta, i.id_inscripcion, t.traduccion, t.definicion, t.ejemplo, 'coautoria', t.fecha_revision + INTERVAL '1 day'
FROM tarjeta t
JOIN mazo m ON m.id_mazo = t.mazo_id AND m.nombre_lectura = 'Fear of Stones and Other Stories'
JOIN usuario u ON u.email = 'juan.estudiante@unicauca.edu.co'
JOIN inscripcion i ON i.estudiante_id = u.id_usuario AND i.curso_id = m.curso_id
WHERE t.palabra = 'island';

-- Verificación rápida: muestra los ids que quedaron, para usarlos en requests.http / Postman
SELECT id_usuario, nombre_completo, rol FROM usuario;
SELECT id_curso, nombre, docente_id FROM curso;
SELECT id_inscripcion, curso_id, estudiante_id FROM inscripcion;
SELECT m.semana, m.nombre_lectura, m.estado, m.fecha_apertura, COUNT(t.id_tarjeta) AS tarjetas
FROM mazo m LEFT JOIN tarjeta t ON t.mazo_id = m.id_mazo
GROUP BY m.id_mazo ORDER BY m.semana;
