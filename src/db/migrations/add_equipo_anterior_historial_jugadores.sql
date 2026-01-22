-- Migración: Agregar campo equipo_anterior a la tabla historial_jugadores
-- Fecha: 2025-01-XX
-- Descripción: Agrega el campo equipo_anterior para almacenar el equipo desde donde se cambió el jugador

ALTER TABLE historial_jugadores
ADD COLUMN IF NOT EXISTS equipo_anterior TEXT;

COMMENT ON COLUMN historial_jugadores.equipo_anterior IS 'Equipo anterior desde donde se cambió el jugador al momento de crear el registro del historial';
