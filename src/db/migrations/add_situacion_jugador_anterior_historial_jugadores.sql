-- Migración: Agregar campo situacion_jugador_anterior a la tabla historial_jugadores
-- Fecha: 2025-01-XX
-- Descripción: Agrega el campo situacion_jugador_anterior para almacenar la situación del jugador anterior (PASE o PRÉSTAMO) desde donde se cambió

ALTER TABLE historial_jugadores
ADD COLUMN IF NOT EXISTS situacion_jugador_anterior TEXT;

COMMENT ON COLUMN historial_jugadores.situacion_jugador_anterior IS 'Situación del jugador anterior (PASE o PRÉSTAMO) desde donde se cambió al momento de crear el registro del historial';
