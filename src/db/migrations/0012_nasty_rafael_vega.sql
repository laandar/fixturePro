CREATE TABLE "horarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"hora_inicio" text NOT NULL,
	"hora_fin" text NOT NULL,
	"duracion_minutos" integer DEFAULT 90,
	"color" text DEFAULT '#007bff',
	"activo" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "encuentros" ADD COLUMN "horario_id" integer;--> statement-breakpoint
ALTER TABLE "encuentros" ADD CONSTRAINT "encuentros_horario_id_horarios_id_fk" FOREIGN KEY ("horario_id") REFERENCES "public"."horarios"("id") ON DELETE no action ON UPDATE no action;