CREATE TABLE "tarjetas" (
	"id" serial PRIMARY KEY NOT NULL,
	"encuentro_id" integer NOT NULL,
	"jugador_id" integer NOT NULL,
	"equipo_id" integer NOT NULL,
	"minuto" integer NOT NULL,
	"tiempo" text NOT NULL,
	"tipo" text NOT NULL,
	"motivo" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_encuentro_id_encuentros_id_fk" FOREIGN KEY ("encuentro_id") REFERENCES "public"."encuentros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_jugador_id_jugadores_id_fk" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;