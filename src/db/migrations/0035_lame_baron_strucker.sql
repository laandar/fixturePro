ALTER TABLE "cambios_jugadores" ALTER COLUMN "jugador_sale_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "cambios_jugadores" ALTER COLUMN "jugador_entra_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "goles" ALTER COLUMN "jugador_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "historial_jugadores" ALTER COLUMN "jugador_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "jugador_equipo_categoria" ALTER COLUMN "jugador_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "jugadores" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "jugadores_participantes" ALTER COLUMN "jugador_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "tarjetas" ALTER COLUMN "jugador_id" SET DATA TYPE varchar(255);