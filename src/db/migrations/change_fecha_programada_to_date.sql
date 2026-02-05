-- Cambiar fecha_programada de timestamp a date
-- Así se guarda solo el día (YYYY-MM-DD) y se evitan problemas de zona horaria.

-- Columna actual: timestamp (sin time zone) → tomar la parte fecha
ALTER TABLE encuentros
  ALTER COLUMN fecha_programada TYPE date
  USING fecha_programada::date;

-- Si en tu BD la columna es timestamptz (con time zone), usa esta versión en su lugar:
-- ALTER TABLE encuentros
--   ALTER COLUMN fecha_programada TYPE date
--   USING (fecha_programada AT TIME ZONE 'UTC')::date;
