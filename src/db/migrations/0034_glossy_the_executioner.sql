CREATE TABLE "equipo_categoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipo_id" integer NOT NULL,
	"categoria_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jugador_equipo_categoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"jugador_id" integer NOT NULL,
	"equipo_categoria_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "equipos" DROP CONSTRAINT "equipos_categoria_id_categorias_id_fk";
--> statement-breakpoint
ALTER TABLE "jugadores" DROP CONSTRAINT "jugadores_categoria_id_categorias_id_fk";
--> statement-breakpoint
ALTER TABLE "jugadores" DROP CONSTRAINT "jugadores_equipo_id_equipos_id_fk";
--> statement-breakpoint
ALTER TABLE "equipo_categoria" ADD CONSTRAINT "equipo_categoria_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipo_categoria" ADD CONSTRAINT "equipo_categoria_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jugador_equipo_categoria" ADD CONSTRAINT "jugador_equipo_categoria_jugador_id_jugadores_id_fk" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jugador_equipo_categoria" ADD CONSTRAINT "jugador_equipo_categoria_equipo_categoria_id_equipo_categoria_id_fk" FOREIGN KEY ("equipo_categoria_id") REFERENCES "public"."equipo_categoria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_equipo_categoria" ON "equipo_categoria" USING btree ("equipo_id","categoria_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_jugador_equipo_categoria" ON "jugador_equipo_categoria" USING btree ("jugador_id","equipo_categoria_id");--> statement-breakpoint
ALTER TABLE "equipos" DROP COLUMN "categoria_id";--> statement-breakpoint
ALTER TABLE "jugadores" DROP COLUMN "categoria_id";--> statement-breakpoint
ALTER TABLE "jugadores" DROP COLUMN "equipo_id";