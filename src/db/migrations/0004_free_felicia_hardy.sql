CREATE TABLE "jugadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"cedula" varchar(20) NOT NULL,
	"apellido_nombre" text NOT NULL,
	"nacionalidad" text NOT NULL,
	"liga" text NOT NULL,
	"equipo_id" integer,
	"estado" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "jugadores_cedula_unique" UNIQUE("cedula")
);
--> statement-breakpoint
ALTER TABLE "jugadores" ADD CONSTRAINT "jugadores_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;