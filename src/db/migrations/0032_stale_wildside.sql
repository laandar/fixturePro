-- Cambiar el tipo de columna id a integer (serial es un alias para integer con secuencia)
ALTER TABLE "jugadores" ALTER COLUMN "id" SET DATA TYPE integer;

-- Crear secuencia si no existe
CREATE SEQUENCE IF NOT EXISTS "jugadores_id_seq";

-- Asignar la secuencia a la columna id
ALTER TABLE "jugadores" ALTER COLUMN "id" SET DEFAULT nextval('jugadores_id_seq');

-- Establecer el valor actual de la secuencia
SELECT setval('jugadores_id_seq', COALESCE((SELECT MAX(id) FROM "jugadores"), 1), true);