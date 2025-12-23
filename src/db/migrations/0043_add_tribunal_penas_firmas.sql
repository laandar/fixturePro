-- Migration: Add Tribunal de Penas fields to firmas_encuentros table
-- Created: 2024

ALTER TABLE "firmas_encuentros" 
ADD COLUMN IF NOT EXISTS "tribunal_informe" text,
ADD COLUMN IF NOT EXISTS "tribunal_presidente_firma" text,
ADD COLUMN IF NOT EXISTS "tribunal_secretario_firma" text,
ADD COLUMN IF NOT EXISTS "tribunal_vocal_firma" text;

