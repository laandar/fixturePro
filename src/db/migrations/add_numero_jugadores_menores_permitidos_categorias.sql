-- Migración: Agregar campo numero_jugadores_menores_permitidos a la tabla categorias
-- Fecha: 2024-12-XX
-- Descripción: Agrega el campo numero_jugadores_menores_permitidos para definir el límite de jugadores menores a la edad mínima permitidos por equipo en una categoría.

ALTER TABLE categorias
ADD COLUMN IF NOT EXISTS numero_jugadores_menores_permitidos INTEGER;

COMMENT ON COLUMN categorias.numero_jugadores_menores_permitidos IS 'Número máximo de jugadores menores a la edad mínima permitidos por equipo en esta categoría. NULL significa que no se permiten jugadores menores.';
