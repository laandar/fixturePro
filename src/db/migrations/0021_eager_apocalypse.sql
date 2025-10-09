CREATE TABLE "firmas_encuentros" (
	"id" serial PRIMARY KEY NOT NULL,
	"encuentro_id" integer NOT NULL,
	"vocal_nombre" text,
	"vocal_firma" text,
	"arbitro_nombre" text,
	"arbitro_firma" text,
	"capitan_local_nombre" text,
	"capitan_local_firma" text,
	"capitan_visitante_nombre" text,
	"capitan_visitante_firma" text,
	"fecha_firma" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "firmas_encuentros_encuentro_id_unique" UNIQUE("encuentro_id")
);
--> statement-breakpoint
ALTER TABLE "firmas_encuentros" ADD CONSTRAINT "firmas_encuentros_encuentro_id_encuentros_id_fk" FOREIGN KEY ("encuentro_id") REFERENCES "public"."encuentros"("id") ON DELETE no action ON UPDATE no action;