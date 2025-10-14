-- Crear tabla de configuraciones del sistema
CREATE TABLE "configuraciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"clave" text NOT NULL UNIQUE,
	"valor" text NOT NULL,
	"tipo" text NOT NULL,
	"categoria" text NOT NULL,
	"descripcion" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

