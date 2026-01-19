-- Eliminar la columna numero_jugador de la tabla jugadores
-- El número de jugador ahora se almacena en la tabla jugador_equipo_categoria
ALTER TABLE "jugadores" DROP COLUMN IF EXISTS "numero_jugador";

