import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { equipos, categorias, entrenadores, jugadores, torneos, equiposTorneo, encuentros, canchas } from './schema';

// Tipos para selección (lectura)
export type Equipo = InferSelectModel<typeof equipos>;
export type Categoria = InferSelectModel<typeof categorias>;
export type Entrenador = InferSelectModel<typeof entrenadores>;
export type Jugador = InferSelectModel<typeof jugadores>;
export type Torneo = InferSelectModel<typeof torneos>;
export type EquipoTorneo = InferSelectModel<typeof equiposTorneo>;
export type Encuentro = InferSelectModel<typeof encuentros>;
export type Cancha = InferSelectModel<typeof canchas>;

// Tipos para inserción
export type NewEquipo = InferInsertModel<typeof equipos>;
export type NewCategoria = InferInsertModel<typeof categorias>;
export type NewEntrenador = InferInsertModel<typeof entrenadores>;
export type NewJugador = InferInsertModel<typeof jugadores>;
export type NewTorneo = InferInsertModel<typeof torneos>;
export type NewEquipoTorneo = InferInsertModel<typeof equiposTorneo>;
export type NewEncuentro = InferInsertModel<typeof encuentros>;
export type NewCancha = InferInsertModel<typeof canchas>;

// Tipos para equipos con relaciones
export interface EquipoWithRelations extends Equipo {
  categoria: Categoria | null;
  entrenador: Entrenador | null;
  jugadores?: Jugador[];
}

export interface CategoriaWithEquipos extends Categoria {
  equipos?: Equipo[];
  jugadores?: Jugador[];
}

export interface EntrenadorWithEquipos extends Entrenador {
  equipos?: Equipo[];
}

export interface JugadorWithEquipo extends Jugador {
  categoria: Categoria | null;
  equipo: Equipo | null;
  amarillas?: number;
  rojas?: number;
  goles?: number;
}

// Tipos para torneos con relaciones
export interface TorneoWithRelations extends Torneo {
  categoria: Categoria | null;
  equiposTorneo?: EquipoTorneoWithRelations[];
  encuentros?: EncuentroWithRelations[];
}

export interface EquipoTorneoWithRelations extends EquipoTorneo {
  torneo: Torneo | null;
  equipo: EquipoWithRelations | null;
}

export interface EncuentroWithRelations extends Encuentro {
  torneo: Torneo | null;
  equipoLocal: EquipoWithRelations | null;
  equipoVisitante: EquipoWithRelations | null;
}

// Tipos para fixture
export interface FixtureJornada {
  jornada: number;
  encuentros: EncuentroWithRelations[];
  equipoQueDescansa?: EquipoWithRelations; // Equipo que no participa en esta jornada
}

export interface FixtureCompleto {
  torneo: TorneoWithRelations;
  jornadas: FixtureJornada[];
  equiposDescansan?: Record<number, number>; // jornada -> equipo_id que descansa
} 

// Tipos para gestión de partidos
export type PlayerChange = {
    id: string
    equipoA: string
    jugadorSale: string
    jugadorEntra: string
    minuto: number
    tiempo: 'primer' | 'segundo'
}

export type CardType = {
    id: string
    jugador: string
    equipo: string
    tipo: 'amarilla' | 'roja'
    minuto: number
    tiempo: 'primer' | 'segundo'
    motivo: string
}

export type Goal = {
    id: string
    jugador: string
    equipo: string
    minuto: number
    tiempo: 'primer' | 'segundo'
    tipo: 'gol' | 'penal' | 'autogol'
}

export type Signature = {
    vocal: string
    arbitro: string
    capitanA: string
    capitanB: string
    fechaFirma: string
}