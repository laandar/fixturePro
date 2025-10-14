CREATE TABLE "configuraciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"clave" text NOT NULL,
	"valor" text NOT NULL,
	"tipo" text NOT NULL,
	"categoria" text NOT NULL,
	"descripcion" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "configuraciones_clave_unique" UNIQUE("clave")
);
