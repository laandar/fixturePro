-- Migración: Crear tabla temporadas y agregar campo temporada_id a torneos
-- Fecha: 2025-01-XX
-- Descripción: Crea la tabla temporadas para agrupar torneos por campeonato/año y agrega el campo temporada_id a la tabla torneos

-- Crear tabla temporadas
CREATE TABLE IF NOT EXISTS temporadas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentarios en las columnas (opcional, para documentación)
COMMENT ON TABLE temporadas IS 'Tabla para almacenar temporadas/campeonatos que agrupan torneos por año';
COMMENT ON COLUMN temporadas.nombre IS 'Nombre de la temporada (ej: 2025-2026, 2026-2027)';
COMMENT ON COLUMN temporadas.descripcion IS 'Descripción opcional de la temporada';
COMMENT ON COLUMN temporadas.fecha_inicio IS 'Fecha de inicio de la temporada';
COMMENT ON COLUMN temporadas.fecha_fin IS 'Fecha de fin de la temporada';
COMMENT ON COLUMN temporadas.activa IS 'Indica si la temporada está activa o no';

-- Agregar columna temporada_id a la tabla torneos
ALTER TABLE torneos
ADD COLUMN IF NOT EXISTS temporada_id INTEGER;

-- Agregar foreign key constraint
ALTER TABLE torneos
ADD CONSTRAINT fk_torneos_temporada_id 
FOREIGN KEY (temporada_id) 
REFERENCES temporadas(id) 
ON DELETE SET NULL;

-- Comentario en la columna
COMMENT ON COLUMN torneos.temporada_id IS 'Referencia a la temporada/campeonato al que pertenece el torneo';

-- Crear índice para mejorar las consultas por temporada
CREATE INDEX IF NOT EXISTS idx_torneos_temporada_id ON torneos(temporada_id);
