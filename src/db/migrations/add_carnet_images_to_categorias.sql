-- Migración: Agregar campos de imágenes del carnet a la tabla categorias
-- Fecha: 2025-01-XX
-- Descripción: Agrega campos para almacenar las rutas de las imágenes frontal y trasera del carnet por categoría

-- Agregar columna para imagen frontal del carnet
ALTER TABLE categorias
ADD COLUMN IF NOT EXISTS imagen_carnet_frontal TEXT;

-- Agregar columna para imagen trasera del carnet
ALTER TABLE categorias
ADD COLUMN IF NOT EXISTS imagen_carnet_trasera TEXT;

-- Comentarios en las columnas (opcional, para documentación)
COMMENT ON COLUMN categorias.imagen_carnet_frontal IS 'Ruta de la imagen frontal del carnet para esta categoría. Guardada en public/carnets/';
COMMENT ON COLUMN categorias.imagen_carnet_trasera IS 'Ruta de la imagen trasera del carnet para esta categoría. Guardada en public/carnets/';

