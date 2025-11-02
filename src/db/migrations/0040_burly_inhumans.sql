ALTER TABLE "pagos_multas" ADD COLUMN "anulado" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pagos_multas" ADD COLUMN "motivo_anulacion" text;