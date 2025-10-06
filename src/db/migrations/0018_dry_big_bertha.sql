ALTER TABLE "categorias" ADD COLUMN "estado" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "usuario_id" integer;--> statement-breakpoint
ALTER TABLE "categorias" DROP COLUMN "permite_revancha";