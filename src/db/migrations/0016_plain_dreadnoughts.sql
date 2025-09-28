CREATE TABLE "jugadores_participantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"encuentro_id" integer NOT NULL,
	"jugador_id" integer NOT NULL,
	"equipo_tipo" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "jugadores_participantes" ADD CONSTRAINT "jugadores_participantes_encuentro_id_encuentros_id_fk" FOREIGN KEY ("encuentro_id") REFERENCES "public"."encuentros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jugadores_participantes" ADD CONSTRAINT "jugadores_participantes_jugador_id_jugadores_id_fk" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;