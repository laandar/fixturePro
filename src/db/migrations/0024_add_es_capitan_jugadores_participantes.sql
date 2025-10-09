-- Agregar campo es_capitan a la tabla jugadores_participantes
ALTER TABLE "jugadores_participantes" ADD COLUMN "es_capitan" boolean DEFAULT false;
