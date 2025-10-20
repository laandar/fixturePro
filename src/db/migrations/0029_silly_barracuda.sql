ALTER TABLE "categorias" ADD COLUMN "edad_minima_anos" integer;--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "edad_minima_meses" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "edad_maxima_anos" integer;--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "edad_maxima_meses" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "jugadores" ADD COLUMN "fecha_nacimiento" date;