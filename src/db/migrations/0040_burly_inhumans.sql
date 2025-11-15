ALTER TABLE "pagos_multas" ADD COLUMN IF NOT EXISTS "anulado" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pagos_multas" ADD COLUMN IF NOT EXISTS "motivo_anulacion" text;