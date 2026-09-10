-- init.sql
-- Se ejecuta automáticamente la primera vez que se crea el contenedor de PostgreSQL
-- (montado en docker-entrypoint-initdb.d/). Basado en el DER oficial del proyecto.

-- =========================================================
-- 1. USUARIO (no depende de nadie)
-- =========================================================
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL,
    nivel_ingles VARCHAR(10),
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 2. CURSO (depende de usuario, vía docente_id)
-- =========================================================
CREATE TABLE curso (
    id_curso SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    docente_id INT NOT NULL,
    estado VARCHAR(30) NOT NULL,
    CONSTRAINT fk_curso_docente FOREIGN KEY (docente_id) REFERENCES usuario(id_usuario)
);

-- =========================================================
-- 3. INSCRIPCION (depende de curso y usuario)
-- =========================================================
CREATE TABLE inscripcion (
    id_inscripcion SERIAL PRIMARY KEY,
    curso_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    fecha_inscripcion DATE NOT NULL,
    estado VARCHAR(30) NOT NULL,
    CONSTRAINT fk_inscripcion_curso FOREIGN KEY (curso_id) REFERENCES curso(id_curso),
    CONSTRAINT fk_inscripcion_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuario(id_usuario),
    CONSTRAINT uq_inscripcion_curso_estudiante UNIQUE (curso_id, estudiante_id)
);
-- =========================================================
-- 4. MAZO (depende de curso y de usuario/docente)
-- docente_id es redundante con curso.docente_id (mazo.curso_id -> curso.docente_id ya da el
-- mismo dato), pero el equipo confirmó mantenerlo duplicado aquí por conveniencia de consulta.
-- Decisión confirmada, ya no es un pendiente.
-- =========================================================
CREATE TABLE mazo (
    id_mazo SERIAL PRIMARY KEY,
    curso_id INT NOT NULL,
    docente_id INT NOT NULL,
    nombre_lectura VARCHAR(200) NOT NULL,
    autor VARCHAR(150) NOT NULL,
    semana INT NOT NULL,
    variante_regional_predeterminada VARCHAR(100),
    estado VARCHAR(30) NOT NULL,
    fecha_apertura DATE NOT NULL,
    fecha_cierre DATE NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_mazo_curso FOREIGN KEY (curso_id) REFERENCES curso(id_curso),
    CONSTRAINT fk_mazo_docente FOREIGN KEY (docente_id) REFERENCES usuario(id_usuario)
);

-- =========================================================
-- 5. TARJETA (depende de mazo)
-- =========================================================
CREATE TABLE tarjeta (
    id_tarjeta SERIAL PRIMARY KEY,
    mazo_id INT NOT NULL,
    palabra VARCHAR(150) NOT NULL,
    traduccion VARCHAR(255) NOT NULL,
    definicion TEXT NOT NULL,
    ejemplo VARCHAR(150),
    estado VARCHAR(30) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_revision TIMESTAMP,
    CONSTRAINT fk_tarjeta_mazo FOREIGN KEY (mazo_id) REFERENCES mazo(id_mazo),
    CONSTRAINT uq_tarjeta_mazo_palabra UNIQUE (mazo_id, palabra)
);

-- =========================================================
-- 6. APORTE (depende de tarjeta e inscripcion)
-- =========================================================
CREATE TABLE aporte (
    id_aporte SERIAL PRIMARY KEY,
    tarjeta_id INT NOT NULL,
    inscripcion_id INT NOT NULL,
    traduccion_aportada VARCHAR(255) NOT NULL,
    definicion_aportada TEXT NOT NULL,
    ejemplo_aportado VARCHAR(150),
    tipo_aporte VARCHAR(40) NOT NULL,
    fecha_aporte TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_aporte_tarjeta FOREIGN KEY (tarjeta_id) REFERENCES tarjeta(id_tarjeta),
    CONSTRAINT fk_aporte_inscripcion FOREIGN KEY (inscripcion_id) REFERENCES inscripcion(id_inscripcion)
);

-- =========================================================
-- 7. ETIQUETA_CONTEXTO (depende de tarjeta)
-- =========================================================
CREATE TABLE etiqueta_contexto (
    id_etiqueta SERIAL PRIMARY KEY,
    tarjeta_id INT NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    valor VARCHAR(150) NOT NULL,
    fecha_asignacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_etiqueta_tarjeta FOREIGN KEY (tarjeta_id) REFERENCES tarjeta(id_tarjeta)
);

-- =========================================================
-- 8. PROGRESO_ESTUDIO (depende de inscripcion y tarjeta)
-- =========================================================
CREATE TABLE progreso_estudio (
    id_progreso SERIAL PRIMARY KEY,
    inscripcion_id INT NOT NULL,
    tarjeta_id INT NOT NULL,
    factor_facilidad DECIMAL,
    intervalo_dias INT,
    repeticiones INT DEFAULT 0,
    ultima_valoracion VARCHAR(30),
    fecha_ultimo_repaso TIMESTAMP,
    fecha_proximo_repaso TIMESTAMP,
    CONSTRAINT fk_progreso_inscripcion FOREIGN KEY (inscripcion_id) REFERENCES inscripcion(id_inscripcion),
    CONSTRAINT fk_progreso_tarjeta FOREIGN KEY (tarjeta_id) REFERENCES tarjeta(id_tarjeta),
    CONSTRAINT uq_progreso_inscripcion_tarjeta UNIQUE (inscripcion_id, tarjeta_id)
);

-- =========================================================
-- 9. QUIZ (depende de curso)
-- =========================================================
CREATE TABLE quiz (
    id_quiz SERIAL PRIMARY KEY,
    curso_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    semana_corte INT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_apertura TIMESTAMP,
    fecha_cierre TIMESTAMP,
    tiempo_limite_min INT,
    estado VARCHAR(30) NOT NULL,
    CONSTRAINT fk_quiz_curso FOREIGN KEY (curso_id) REFERENCES curso(id_curso)
);

-- =========================================================
-- 10. QUIZ_MAZO (tabla puente, llave compuesta)
-- =========================================================
CREATE TABLE quiz_mazo (
    quiz_id INT NOT NULL,
    mazo_id INT NOT NULL,
    PRIMARY KEY (quiz_id, mazo_id),
    CONSTRAINT fk_quizmazo_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id_quiz),
    CONSTRAINT fk_quizmazo_mazo FOREIGN KEY (mazo_id) REFERENCES mazo(id_mazo)
);

-- =========================================================
-- 11. PREGUNTA_QUIZ (depende de quiz y tarjeta)
-- =========================================================
CREATE TABLE pregunta_quiz (
    id_pregunta SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL,
    tarjeta_id INT NOT NULL,
    tipo_pregunta VARCHAR(50) NOT NULL,
    enunciado TEXT NOT NULL,
    opcion_a VARCHAR(255),
    opcion_b VARCHAR(255),
    opcion_c VARCHAR(255),
    opcion_d VARCHAR(255),
    respuesta_correcta VARCHAR(255) NOT NULL,
    orden INT,
    CONSTRAINT fk_pregunta_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id_quiz),
    CONSTRAINT fk_pregunta_tarjeta FOREIGN KEY (tarjeta_id) REFERENCES tarjeta(id_tarjeta)
);

-- =========================================================
-- 12. RESULTADO_QUIZ (depende de quiz y usuario)
-- =========================================================
CREATE TABLE resultado_quiz (
    id_resultado SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    fecha_inicio TIMESTAMP,
    fecha_envio TIMESTAMP,
    puntaje_obtenido DECIMAL,
    puntaje_maximo DECIMAL,
    calificacion DECIMAL,
    tiempo_empleado_seg INT,
    CONSTRAINT fk_resultado_quiz FOREIGN KEY (quiz_id) REFERENCES quiz(id_quiz),
    CONSTRAINT fk_resultado_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuario(id_usuario),
    CONSTRAINT uq_resultado_quiz_estudiante UNIQUE (quiz_id, estudiante_id)
);

-- =========================================================
-- 13. RESPUESTA_QUIZ (depende de resultado_quiz y pregunta_quiz)
-- =========================================================
CREATE TABLE respuesta_quiz (
    id_respuesta SERIAL PRIMARY KEY,
    resultado_id INT NOT NULL,
    pregunta_id INT NOT NULL,
    respuesta_estudiante VARCHAR(255),
    es_correcta BOOLEAN,
    puntaje_obtenido DECIMAL,
    CONSTRAINT fk_respuesta_resultado FOREIGN KEY (resultado_id) REFERENCES resultado_quiz(id_resultado),
    CONSTRAINT fk_respuesta_pregunta FOREIGN KEY (pregunta_id) REFERENCES pregunta_quiz(id_pregunta),
    CONSTRAINT uq_respuesta_resultado_pregunta UNIQUE (resultado_id, pregunta_id)
);

-- =========================================================
-- 14. WORDNET_CACHE (independiente, sin relaciones — ver nota abajo)
-- PENDIENTE DE CONFIRMACIÓN CON EL EQUIPO: esta tabla no está en el DBML
-- oficial todavía, se propuso en conversación pero falta que el equipo
-- la valide/agregue formalmente al diagrama antes de la entrega.
-- =========================================================
CREATE TABLE wordnet_cache (
    id_cache SERIAL PRIMARY KEY,
    palabra VARCHAR(150) NOT NULL,
    sentido INT NOT NULL DEFAULT 1,
    definicion TEXT,
    sinonimos TEXT,
    hiperonimos TEXT,
    hiponimos TEXT,
    fuente VARCHAR(20) NOT NULL,
    confirmado_por_estudiante BOOLEAN NOT NULL DEFAULT false,
    fecha_consulta TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wordnetcache_palabra_sentido UNIQUE (palabra, sentido)
);
