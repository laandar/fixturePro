-- Migración: Agregar campo situacion_jugador a la tabla jugador_equipo_categoria
-- Fecha: 2025-01-XX
-- Descripción: Agrega el campo situacion_jugador para almacenar PASE o PRESTAMO

-- Agregar columna para situación del jugador
ALTER TABLE jugador_equipo_categoria
ADD COLUMN IF NOT EXISTS situacion_jugador TEXT;

-- Comentario en la columna (opcional, para documentación)
COMMENT ON COLUMN jugador_equipo_categoria.situacion_jugador IS 'Situación del jugador: PASE o PRESTAMO';
