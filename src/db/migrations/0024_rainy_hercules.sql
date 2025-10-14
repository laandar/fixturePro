CREATE TABLE "historial_jugadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"jugador_id" integer NOT NULL,
	"liga" text NOT NULL,
	"equipo_id" integer,
	"numero" integer,
	"nombre_calificacion" text,
	"disciplina" text,
	"fecha_calificacion" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "historial_jugadores" ADD CONSTRAINT "historial_jugadores_jugador_id_jugadores_id_fk" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_jugadores" ADD CONSTRAINT "historial_jugadores_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;