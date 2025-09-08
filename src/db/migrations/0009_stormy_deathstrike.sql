CREATE TABLE "canchas_categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"cancha_id" integer NOT NULL,
	"categoria_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "canchas_categorias" ADD CONSTRAINT "canchas_categorias_cancha_id_canchas_id_fk" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canchas_categorias" ADD CONSTRAINT "canchas_categorias_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;