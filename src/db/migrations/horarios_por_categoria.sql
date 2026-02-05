-- Horarios por categoría: cambiar torneo_id por categoria_id
-- 1. Añadir columna categoria_id
ALTER TABLE horarios ADD COLUMN IF NOT EXISTS categoria_id INTEGER REFERENCES categorias(id) ON DELETE CASCADE;

-- 2. Rellenar categoria_id desde el torneo de cada horario
UPDATE horarios SET categoria_id = (SELECT categoria_id FROM torneos WHERE torneos.id = horarios.torneo_id) WHERE torneo_id IS NOT NULL;

-- 2b. Por si algún torneo no tenía categoria_id, asignar primera categoría (opcional)
UPDATE horarios SET categoria_id = (SELECT id FROM categorias LIMIT 1) WHERE categoria_id IS NULL;

-- 3. Marcar categoria_id como NOT NULL
ALTER TABLE horarios ALTER COLUMN categoria_id SET NOT NULL;

-- 4. Eliminar la FK y la columna torneo_id
ALTER TABLE horarios DROP CONSTRAINT IF EXISTS horarios_torneo_id_torneos_id_fk;
ALTER TABLE horarios DROP CONSTRAINT IF EXISTS horarios_torneo_id_fkey;
ALTER TABLE horarios DROP COLUMN IF EXISTS torneo_id;
