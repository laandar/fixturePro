-- Agregar columnas de informes a la tabla firmas_encuentros
ALTER TABLE "firmas_encuentros" ADD COLUMN "vocal_informe" text;
--> statement-breakpoint
ALTER TABLE "firmas_encuentros" ADD COLUMN "arbitro_informe" text;

