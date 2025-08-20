import { pgTable, serial, text, varchar, timestamp, boolean, integer, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla de categorías
export const categorias = pgTable('categorias', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  permite_revancha: boolean('permite_revancha').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de entrenadores
export const entrenadores = pgTable('entrenadores', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de equipos
export const equipos = pgTable('equipos', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  categoria_id: integer('categoria_id').references(() => categorias.id),
  entrenador_id: integer('entrenador_id').references(() => entrenadores.id),
  imagen_equipo: text('imagen_equipo'),
  estado: boolean('estado').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de jugadores
export const jugadores = pgTable('jugadores', {
  id: serial('id').primaryKey(),
  cedula: varchar('cedula', { length: 20 }).notNull().unique(),
  apellido_nombre: text('apellido_nombre').notNull(),
  nacionalidad: text('nacionalidad').notNull(),
  liga: text('liga').notNull(),
  categoria_id: integer('categoria_id').references(() => categorias.id),
  equipo_id: integer('equipo_id').references(() => equipos.id),
  foto: text('foto'), // Campo para almacenar la URL o ruta de la foto
  estado: boolean('estado').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de torneos
export const torneos = pgTable('torneos', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  categoria_id: integer('categoria_id').references(() => categorias.id),
  fecha_inicio: date('fecha_inicio').notNull(),
  fecha_fin: date('fecha_fin').notNull(),
  estado: text('estado').default('planificado'), // planificado, en_curso, finalizado, cancelado
  tipo_torneo: text('tipo_torneo').default('liga'), // liga, eliminacion, grupos
  permite_revancha: boolean('permite_revancha').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de equipos participantes en torneos
export const equiposTorneo = pgTable('equipos_torneo', {
  id: serial('id').primaryKey(),
  torneo_id: integer('torneo_id').references(() => torneos.id).notNull(),
  equipo_id: integer('equipo_id').references(() => equipos.id).notNull(),
  grupo: text('grupo'), // Para torneos por grupos
  posicion: integer('posicion'), // Posición en el grupo o tabla general
  puntos: integer('puntos').default(0),
  partidos_jugados: integer('partidos_jugados').default(0),
  partidos_ganados: integer('partidos_ganados').default(0),
  partidos_empatados: integer('partidos_empatados').default(0),
  partidos_perdidos: integer('partidos_perdidos').default(0),
  goles_favor: integer('goles_favor').default(0),
  goles_contra: integer('goles_contra').default(0),
  diferencia_goles: integer('diferencia_goles').default(0),
  estado: text('estado').default('activo'), // activo, eliminado, descalificado
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de encuentros/partidos
export const encuentros = pgTable('encuentros', {
  id: serial('id').primaryKey(),
  torneo_id: integer('torneo_id').references(() => torneos.id).notNull(),
  equipo_local_id: integer('equipo_local_id').references(() => equipos.id).notNull(),
  equipo_visitante_id: integer('equipo_visitante_id').references(() => equipos.id).notNull(),
  fecha_programada: timestamp('fecha_programada'),
  fecha_jugada: timestamp('fecha_jugada'),
  cancha: text('cancha'),
  arbitro: text('arbitro'),
  estado: text('estado').default('programado'), // programado, en_curso, finalizado, cancelado, aplazado
  goles_local: integer('goles_local'),
  goles_visitante: integer('goles_visitante'),
  tiempo_extra: boolean('tiempo_extra').default(false),
  penales_local: integer('penales_local'),
  penales_visitante: integer('penales_visitante'),
  observaciones: text('observaciones'),
  jornada: integer('jornada'), // Número de jornada/fecha
  fase: text('fase').default('regular'), // regular, octavos, cuartos, semifinal, final
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabla de canchas
export const canchas = pgTable('canchas', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  ubicacion: text('ubicacion'),
  tipo: text('tipo'), // futbol, futsal, basquet, tenis, voley, otro
  capacidad: integer('capacidad'),
  descripcion: text('descripcion'),
  estado: boolean('estado').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relaciones
export const categoriasRelations = relations(categorias, ({ many }) => ({
  equipos: many(equipos),
  jugadores: many(jugadores),
}));

export const entrenadoresRelations = relations(entrenadores, ({ many }) => ({
  equipos: many(equipos),
}));

export const jugadoresRelations = relations(jugadores, ({ one }) => ({
  categoria: one(categorias, {
    fields: [jugadores.categoria_id],
    references: [categorias.id],
  }),
  equipo: one(equipos, {
    fields: [jugadores.equipo_id],
    references: [equipos.id],
  }),
}));

// Relaciones para torneos
export const torneosRelations = relations(torneos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [torneos.categoria_id],
    references: [categorias.id],
  }),
  equiposTorneo: many(equiposTorneo),
  encuentros: many(encuentros),
}));

export const equiposTorneoRelations = relations(equiposTorneo, ({ one }) => ({
  torneo: one(torneos, {
    fields: [equiposTorneo.torneo_id],
    references: [torneos.id],
  }),
  equipo: one(equipos, {
    fields: [equiposTorneo.equipo_id],
    references: [equipos.id],
  }),
}));

export const encuentrosRelations = relations(encuentros, ({ one }) => ({
  torneo: one(torneos, {
    fields: [encuentros.torneo_id],
    references: [torneos.id],
  }),
  equipoLocal: one(equipos, {
    fields: [encuentros.equipo_local_id],
    references: [equipos.id],
  }),
  equipoVisitante: one(equipos, {
    fields: [encuentros.equipo_visitante_id],
    references: [equipos.id],
  }),
}));

// Relaciones adicionales para equipos
export const equiposRelations = relations(equipos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [equipos.categoria_id],
    references: [categorias.id],
  }),
  entrenador: one(entrenadores, {
    fields: [equipos.entrenador_id],
    references: [entrenadores.id],
  }),
  jugadores: many(jugadores),
  equiposTorneo: many(equiposTorneo),
  encuentrosLocal: many(encuentros, { relationName: 'equipoLocal' }),
  encuentrosVisitante: many(encuentros, { relationName: 'equipoVisitante' }),
}));