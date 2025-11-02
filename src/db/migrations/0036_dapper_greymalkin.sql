CREATE TABLE "movimientos_economicos" (
	"id" serial PRIMARY KEY NOT NULL,
	"torneo_id" integer NOT NULL,
	"equipo_id" integer NOT NULL,
	"jornada" integer,
	"concepto" text,
	"monto" integer NOT NULL,
	"tipo" text NOT NULL,
	"estado" text DEFAULT 'aplicado',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "movimientos_economicos" ADD CONSTRAINT "movimientos_economicos_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_economicos" ADD CONSTRAINT "movimientos_economicos_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;