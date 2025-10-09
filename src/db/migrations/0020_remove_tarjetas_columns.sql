-- Eliminar columnas minuto, tiempo y motivo de la tabla tarjetas
ALTER TABLE "tarjetas" DROP COLUMN IF EXISTS "minuto";
ALTER TABLE "tarjetas" DROP COLUMN IF EXISTS "tiempo";
ALTER TABLE "tarjetas" DROP COLUMN IF EXISTS "motivo";
