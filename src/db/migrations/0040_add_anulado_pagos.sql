-- Agregar campos de anulación a pagos_multas
ALTER TABLE "pagos_multas" 
ADD COLUMN IF NOT EXISTS "anulado" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "motivo_anulacion" text;

