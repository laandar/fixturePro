-- Crear tabla pagos_multas si no existe
CREATE TABLE IF NOT EXISTS "pagos_multas" (
    "id" serial PRIMARY KEY,
    "torneo_id" integer NOT NULL,
    "equipo_id" integer NOT NULL,
    "jornada" integer,
    "monto_centavos" integer NOT NULL,
    "descripcion" text,
    "referencia" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "pagos_multas_torneo_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "pagos_multas_equipo_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Crear tabla cargos_manuales si no existe
CREATE TABLE IF NOT EXISTS "cargos_manuales" (
    "id" serial PRIMARY KEY,
    "torneo_id" integer NOT NULL,
    "equipo_id" integer NOT NULL,
    "jornada_aplicacion" integer NOT NULL,
    "monto_centavos" integer NOT NULL,
    "descripcion" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "cargos_manuales_torneo_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "cargos_manuales_equipo_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);


