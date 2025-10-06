CREATE TABLE "cambios_jugadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"encuentro_id" integer NOT NULL,
	"jugador_sale_id" integer NOT NULL,
	"jugador_entra_id" integer NOT NULL,
	"equipo_id" integer NOT NULL,
	"minuto" integer NOT NULL,
	"tiempo" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_encuentro_id_encuentros_id_fk" FOREIGN KEY ("encuentro_id") REFERENCES "public"."encuentros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_jugador_sale_id_jugadores_id_fk" FOREIGN KEY ("jugador_sale_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_jugador_entra_id_jugadores_id_fk" FOREIGN KEY ("jugador_entra_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;