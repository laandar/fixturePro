CREATE TABLE "equipos_descansan" (
	"id" serial PRIMARY KEY NOT NULL,
	"torneo_id" integer NOT NULL,
	"equipo_id" integer NOT NULL,
	"jornada" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "equipos_descansan" ADD CONSTRAINT "equipos_descansan_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipos_descansan" ADD CONSTRAINT "equipos_descansan_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;