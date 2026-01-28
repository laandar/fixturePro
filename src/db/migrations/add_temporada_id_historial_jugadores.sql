-- Migración: Agregar campo temporada_id a la tabla historial_jugadores
-- Fecha: 2025-01-XX
-- Descripción: Agrega el campo temporada_id para asociar las calificaciones de jugadores a una temporada específica

-- Agregar columna temporada_id a la tabla historial_jugadores
ALTER TABLE historial_jugadores
ADD COLUMN IF NOT EXISTS temporada_id INTEGER;

-- Agregar foreign key constraint
ALTER TABLE historial_jugadores
ADD CONSTRAINT fk_historial_jugadores_temporada_id 
FOREIGN KEY (temporada_id) 
REFERENCES temporadas(id) 
ON DELETE SET NULL;

-- Crear índice para mejorar las consultas por temporada
CREATE INDEX IF NOT EXISTS idx_historial_jugadores_temporada_id ON historial_jugadores(temporada_id);

-- Crear índice único compuesto para evitar calificaciones duplicadas en la misma temporada
CREATE UNIQUE INDEX IF NOT EXISTS idx_historial_jugadores_jugador_temporada 
ON historial_jugadores(jugador_id, temporada_id) 
WHERE temporada_id IS NOT NULL;

-- Comentario en la columna
COMMENT ON COLUMN historial_jugadores.temporada_id IS 'Referencia a la temporada en la que se calificó al jugador';
