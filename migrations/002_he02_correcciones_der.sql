-- ============================================================================
-- Migración 002 — Correcciones al DER necesarias para cerrar HE-02
-- (Supervisión y Curaduría Pedagógica Docente)
--
-- ESTADO: PROPUESTA — pendiente de aprobación del equipo en Slack.
-- NO se fusionó en init.sql todavía (init.sql refleja el DER oficial vigente).
--
-- Cómo aplicarla en una BD ya creada:
--   docker exec -i <contenedor_pg> psql -U <user> -d <db> < migrations/002_he02_correcciones_der.sql
--
-- Es idempotente (IF NOT EXISTS / IF EXISTS): se puede correr varias veces sin romper nada.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. tarjeta.motivo_rechazo   — CA-2.1.3
--    "cuando selecciona Rechazar e ingresa una observación, la tarjeta cambia a
--     estado 'rechazada'". Hoy no hay dónde guardar esa observación.
-- ----------------------------------------------------------------------------
ALTER TABLE tarjeta
    ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;

COMMENT ON COLUMN tarjeta.motivo_rechazo IS
    'Observación que deja la docente al rechazar la tarjeta (CA-2.1.3). NULL mientras la tarjeta no haya sido rechazada.';

-- ----------------------------------------------------------------------------
-- 2. etiqueta_contexto: índice único (tarjeta_id, tipo)   — CA-2.2.1 / CA-2.2.2
--    Una tarjeta tiene a lo sumo UNA etiqueta por tipo (un solo "registro", una
--    sola "variante_dialectal"). Permite el UPSERT al reasignar y evita duplicados
--    cuando el mazo propaga su variante predeterminada.
--
--    OJO: si ya existen filas duplicadas (misma tarjeta_id + tipo), este índice
--    fallará. Limpiar antes con algo como:
--      DELETE FROM etiqueta_contexto e USING etiqueta_contexto d
--      WHERE e.tarjeta_id = d.tarjeta_id AND e.tipo = d.tipo
--        AND e.id_etiqueta < d.id_etiqueta;
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_etiqueta_contexto_tarjeta_tipo
    ON etiqueta_contexto (tarjeta_id, tipo);

-- ----------------------------------------------------------------------------
-- 3. Tabla notificacion   — CA-2.1.3
--    "...y se le notifica al estudiante aportante para su corrección."
--    Entidad nueva (no existe en el DER). Mínima: destinatario + mensaje + estado
--    de lectura. tarjeta_id es el contexto (opcional para futuros tipos de aviso).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion SERIAL PRIMARY KEY,
    usuario_id      INT  NOT NULL,               -- estudiante que recibe el aviso
    tarjeta_id      INT,                          -- tarjeta relacionada (rechazada)
    tipo            VARCHAR(40)  NOT NULL,         -- p.ej. 'tarjeta_rechazada'
    mensaje         TEXT NOT NULL,
    leida           BOOLEAN NOT NULL DEFAULT false,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_notificacion_tarjeta FOREIGN KEY (tarjeta_id) REFERENCES tarjeta(id_tarjeta)
);

CREATE INDEX IF NOT EXISTS ix_notificacion_usuario_no_leida
    ON notificacion (usuario_id) WHERE leida = false;

COMMIT;
