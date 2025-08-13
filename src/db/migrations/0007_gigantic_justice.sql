CREATE TABLE "encuentros" (
	"id" serial PRIMARY KEY NOT NULL,
	"torneo_id" integer NOT NULL,
	"equipo_local_id" integer NOT NULL,
	"equipo_visitante_id" integer NOT NULL,
	"fecha_programada" timestamp,
	"fecha_jugada" timestamp,
	"cancha" text,
	"arbitro" text,
	"estado" text DEFAULT 'programado',
	"goles_local" integer,
	"goles_visitante" integer,
	"tiempo_extra" boolean DEFAULT false,
	"penales_local" integer,
	"penales_visitante" integer,
	"observaciones" text,
	"jornada" integer,
	"fase" text DEFAULT 'regular',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipos_torneo" (
	"id" serial PRIMARY KEY NOT NULL,
	"torneo_id" integer NOT NULL,
	"equipo_id" integer NOT NULL,
	"grupo" text,
	"posicion" integer,
	"puntos" integer DEFAULT 0,
	"partidos_jugados" integer DEFAULT 0,
	"partidos_ganados" integer DEFAULT 0,
	"partidos_empatados" integer DEFAULT 0,
	"partidos_perdidos" integer DEFAULT 0,
	"goles_favor" integer DEFAULT 0,
	"goles_contra" integer DEFAULT 0,
	"diferencia_goles" integer DEFAULT 0,
	"estado" text DEFAULT 'activo',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "torneos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"categoria_id" integer,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"estado" text DEFAULT 'planificado',
	"tipo_torneo" text DEFAULT 'liga',
	"permite_revancha" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "encuentros" ADD CONSTRAINT "encuentros_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encuentros" ADD CONSTRAINT "encuentros_equipo_local_id_equipos_id_fk" FOREIGN KEY ("equipo_local_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encuentros" ADD CONSTRAINT "encuentros_equipo_visitante_id_equipos_id_fk" FOREIGN KEY ("equipo_visitante_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipos_torneo" ADD CONSTRAINT "equipos_torneo_torneo_id_torneos_id_fk" FOREIGN KEY ("torneo_id") REFERENCES "public"."torneos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipos_torneo" ADD CONSTRAINT "equipos_torneo_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;