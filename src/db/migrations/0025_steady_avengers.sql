-- Eliminar la restricción de clave foránea
ALTER TABLE "historial_jugadores" DROP CONSTRAINT "historial_jugadores_equipo_id_equipos_id_fk";--> statement-breakpoint
-- Eliminar la columna equipo_id
ALTER TABLE "historial_jugadores" DROP COLUMN "equipo_id";--> statement-breakpoint
-- Agregar la nueva columna equipo como texto
ALTER TABLE "historial_jugadores" ADD COLUMN "equipo" text;
