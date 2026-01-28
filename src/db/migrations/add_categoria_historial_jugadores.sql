-- Migración: Agregar campo categoria a la tabla historial_jugadores
-- Fecha: 2025-01-XX
-- Descripción: Agrega el campo categoria para validar calificaciones por temporada y categoría

-- Agregar columna categoria a la tabla historial_jugadores
ALTER TABLE historial_jugadores
ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Comentario en la columna
COMMENT ON COLUMN historial_jugadores.categoria IS 'Nombre de la categoría del jugador al momento de la calificación';

-- Actualizar el índice único para incluir categoria
-- Primero eliminar el índice anterior si existe
DROP INDEX IF EXISTS idx_historial_jugadores_jugador_temporada;

-- Crear nuevo índice único compuesto para evitar calificaciones duplicadas en la misma temporada y categoría
CREATE UNIQUE INDEX IF NOT EXISTS idx_historial_jugadores_jugador_temporada_categoria 
ON historial_jugadores(jugador_id, temporada_id, categoria) 
WHERE temporada_id IS NOT NULL AND categoria IS NOT NULL;
