import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { equipos, categorias, entrenadores } from './schema';

// Tipos para selección (lectura)
export type Equipo = InferSelectModel<typeof equipos>;
export type Categoria = InferSelectModel<typeof categorias>;
export type Entrenador = InferSelectModel<typeof entrenadores>;

// Tipos para inserción (creación)
export type NewEquipo = InferInsertModel<typeof equipos>;
export type NewCategoria = InferInsertModel<typeof categorias>;
export type NewEntrenador = InferInsertModel<typeof entrenadores>;

// Tipos para equipos con relaciones
export interface EquipoWithRelations extends Equipo {
  categoria: Categoria | null;
  entrenador: Entrenador | null;
}

export interface CategoriaWithEquipos extends Categoria {
  equipos?: Equipo[];
}

export interface EntrenadorWithEquipos extends Entrenador {
  equipos?: Equipo[];
} 