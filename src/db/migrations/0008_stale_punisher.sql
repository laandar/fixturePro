CREATE TABLE "canchas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"ubicacion" text,
	"tipo" text,
	"capacidad" integer,
	"descripcion" text,
	"estado" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
