-- Migración: Agregar campo numero_jugadores_permitidos a la tabla categorias
-- Fecha: 2025-01-XX
-- Descripción: Agrega el campo numero_jugadores_permitidos para almacenar el número máximo de jugadores permitidos por equipo en cada categoría

-- Agregar columna para número de jugadores permitidos
ALTER TABLE categorias
ADD COLUMN IF NOT EXISTS numero_jugadores_permitidos INTEGER;

-- Comentario en la columna (opcional, para documentación)
COMMENT ON COLUMN categorias.numero_jugadores_permitidos IS 'Número máximo de jugadores permitidos por equipo en esta categoría';
