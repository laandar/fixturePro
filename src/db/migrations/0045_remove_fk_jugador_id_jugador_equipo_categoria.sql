-- Eliminar la foreign key constraint de jugador_id en jugador_equipo_categoria
-- porque ahora almacenamos la cédula en lugar del ID del jugador
ALTER TABLE "jugador_equipo_categoria" DROP CONSTRAINT IF EXISTS "jugador_equipo_categoria_jugador_id_jugadores_id_fk";

