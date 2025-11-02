CREATE TABLE IF NOT EXISTS "pagos_multas" (
	"id" serial PRIMARY KEY NOT NULL,
	"torneo_id" integer NOT NULL,
	"equipo_id" integer NOT NULL,
	"jornada" integer,
	"monto_centavos" integer NOT NULL,
	"descripcion" text,
	"referencia" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE IF EXISTS "movimientos_economicos" CASCADE;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pagos_multas_torneo_id_torneos_id_fk'
    ) THEN
        ALTER TABLE "pagos_multas" ADD CONSTRAINT "pagos_multas_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pagos_multas_equipo_id_equipos_id_fk'
    ) THEN
        ALTER TABLE "pagos_multas" ADD CONSTRAINT "pagos_multas_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;