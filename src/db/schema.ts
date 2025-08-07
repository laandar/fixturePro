import { pgTable, serial, text, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
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

// Relaciones
export const categoriasRelations = relations(categorias, ({ many }) => ({
  equipos: many(equipos),
}));

export const entrenadoresRelations = relations(entrenadores, ({ many }) => ({
  equipos: many(equipos),
}));

export const equiposRelations = relations(equipos, ({ one }) => ({
  categoria: one(categorias, {
    fields: [equipos.categoria_id],
    references: [categorias.id],
  }),
  entrenador: one(entrenadores, {
    fields: [equipos.entrenador_id],
    references: [entrenadores.id],
  }),
}));