-- Agregar nuevos campos a la tabla jugadores
ALTER TABLE "jugadores" ADD COLUMN "sexo" text CHECK ("sexo" IN ('masculino', 'femenino', 'otro'));
ALTER TABLE "jugadores" ADD COLUMN "numero_jugador" integer;
ALTER TABLE "jugadores" ADD COLUMN "telefono" text;
ALTER TABLE "jugadores" ADD COLUMN "provincia" text;
ALTER TABLE "jugadores" ADD COLUMN "direccion" text;
ALTER TABLE "jugadores" ADD COLUMN "historia" text;
ALTER TABLE "jugadores" ADD COLUMN "foraneo" boolean DEFAULT false;
