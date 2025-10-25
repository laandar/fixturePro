-- Migración para convertir jugadores.id de integer a varchar
-- Paso 1: Eliminar todas las claves foráneas que referencian jugadores.id

-- Eliminar claves foráneas de jugador_equipo_categoria
ALTER TABLE "jugador_equipo_categoria" DROP CONSTRAINT IF EXISTS "jugador_equipo_categoria_jugador_id_jugadores_id_fk";

-- Eliminar claves foráneas de goles
ALTER TABLE "goles" DROP CONSTRAINT IF EXISTS "goles_jugador_id_jugadores_id_fk";

-- Eliminar claves foráneas de tarjetas
ALTER TABLE "tarjetas" DROP CONSTRAINT IF EXISTS "tarjetas_jugador_id_jugadores_id_fk";

-- Eliminar claves foráneas de jugadores_participantes
ALTER TABLE "jugadores_participantes" DROP CONSTRAINT IF EXISTS "jugadores_participantes_jugador_id_jugadores_id_fk";

-- Eliminar claves foráneas de cambios_jugadores
ALTER TABLE "cambios_jugadores" DROP CONSTRAINT IF EXISTS "cambios_jugadores_jugador_sale_id_jugadores_id_fk";
ALTER TABLE "cambios_jugadores" DROP CONSTRAINT IF EXISTS "cambios_jugadores_jugador_entra_id_jugadores_id_fk";

-- Eliminar claves foráneas de historial_jugadores
ALTER TABLE "historial_jugadores" DROP CONSTRAINT IF EXISTS "historial_jugadores_jugador_id_jugadores_id_fk";

-- Paso 2: Cambiar los tipos de datos de las columnas
-- Cambiar jugadores.id de integer a varchar
ALTER TABLE "jugadores" ALTER COLUMN "id" TYPE varchar(255) USING id::varchar;

-- Cambiar jugador_equipo_categoria.jugador_id
ALTER TABLE "jugador_equipo_categoria" ALTER COLUMN "jugador_id" TYPE varchar(255) USING jugador_id::varchar;

-- Cambiar goles.jugador_id
ALTER TABLE "goles" ALTER COLUMN "jugador_id" TYPE varchar(255) USING jugador_id::varchar;

-- Cambiar tarjetas.jugador_id
ALTER TABLE "tarjetas" ALTER COLUMN "jugador_id" TYPE varchar(255) USING jugador_id::varchar;

-- Cambiar jugadores_participantes.jugador_id
ALTER TABLE "jugadores_participantes" ALTER COLUMN "jugador_id" TYPE varchar(255) USING jugador_id::varchar;

-- Cambiar cambios_jugadores.jugador_sale_id y jugador_entra_id
ALTER TABLE "cambios_jugadores" ALTER COLUMN "jugador_sale_id" TYPE varchar(255) USING jugador_sale_id::varchar;
ALTER TABLE "cambios_jugadores" ALTER COLUMN "jugador_entra_id" TYPE varchar(255) USING jugador_entra_id::varchar;

-- Cambiar historial_jugadores.jugador_id
ALTER TABLE "historial_jugadores" ALTER COLUMN "jugador_id" TYPE varchar(255) USING jugador_id::varchar;

-- Paso 3: Recrear las claves foráneas
-- Recrear clave foránea en jugador_equipo_categoria
ALTER TABLE "jugador_equipo_categoria" ADD CONSTRAINT "jugador_equipo_categoria_jugador_id_jugadores_id_fk" 
FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;

-- Recrear clave foránea en goles
ALTER TABLE "goles" ADD CONSTRAINT "goles_jugador_id_jugadores_id_fk" 
FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;

-- Recrear clave foránea en tarjetas
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_jugador_id_jugadores_id_fk" 
FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;

-- Recrear clave foránea en jugadores_participantes
ALTER TABLE "jugadores_participantes" ADD CONSTRAINT "jugadores_participantes_jugador_id_jugadores_id_fk" 
FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;

-- Recrear claves foráneas en cambios_jugadores
ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_jugador_sale_id_jugadores_id_fk" 
FOREIGN KEY ("jugador_sale_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "cambios_jugadores" ADD CONSTRAINT "cambios_jugadores_jugador_entra_id_jugadores_id_fk" 
FOREIGN KEY ("jugador_entra_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;

-- Recrear clave foránea en historial_jugadores
ALTER TABLE "historial_jugadores" ADD CONSTRAINT "historial_jugadores_jugador_id_jugadores_id_fk" 
FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE no action ON UPDATE no action;
