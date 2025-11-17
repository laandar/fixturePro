DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'horarios'
      AND column_name = 'torneo_id'
  ) THEN
    ALTER TABLE "horarios" ADD COLUMN "torneo_id" integer NOT NULL;
  END IF;
END;
$migration$;--> statement-breakpoint

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_name = ccu.table_name
    WHERE ccu.table_name = 'horarios'
      AND ccu.column_name = 'torneo_id'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'horarios_torneo_id_torneos_id_fk'
  ) THEN
    ALTER TABLE "horarios" ADD CONSTRAINT "horarios_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END;
$migration$;