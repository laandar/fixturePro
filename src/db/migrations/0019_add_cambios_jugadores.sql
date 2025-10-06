-- Crear tabla para cambios de jugadores
CREATE TABLE IF NOT EXISTS "cambios_jugadores" (
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

-- Agregar foreign keys
DO $$ BEGIN
 ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_encuentro_id_encuentros_id_fk" FOREIGN KEY ("encuentro_id") REFERENCES "encuentros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_jugador_sale_id_jugadores_id_fk" FOREIGN KEY ("jugador_sale_id") REFERENCES "jugadores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_jugador_entra_id_jugadores_id_fk" FOREIGN KEY ("jugador_entra_id") REFERENCES "jugadores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
