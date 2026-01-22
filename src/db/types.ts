import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { equipos, categorias, entrenadores, jugadores, torneos, equiposTorneo, encuentros, canchas, canchasCategorias, horarios, goles, tarjetas, jugadoresParticipantes, cambiosJugadores, firmasEncuentros, historialJugadores, configuraciones } from './schema';

// Tipos para selección (lectura)
export type Equipo = InferSelectModel<typeof equipos>;
export type Categoria = InferSelectModel<typeof categorias>;
export type Entrenador = InferSelectModel<typeof entrenadores>;
export type Jugador = InferSelectModel<typeof jugadores>;
export type Torneo = InferSelectModel<typeof torneos>;
export type EquipoTorneo = InferSelectModel<typeof equiposTorneo>;
export type Encuentro = InferSelectModel<typeof encuentros>;
export type Cancha = InferSelectModel<typeof canchas>;
export type CanchaCategoria = InferSelectModel<typeof canchasCategorias>;
export type Horario = InferSelectModel<typeof horarios>;
export type Gol = InferSelectModel<typeof goles>;
export type Tarjeta = InferSelectModel<typeof tarjetas>;
export type JugadorParticipante = InferSelectModel<typeof jugadoresParticipantes>;
export type CambioJugador = InferSelectModel<typeof cambiosJugadores>;
export type FirmaEncuentro = InferSelectModel<typeof firmasEncuentros>;
export type HistorialJugador = InferSelectModel<typeof historialJugadores>;
export type Configuracion = InferSelectModel<typeof configuraciones>;

// Tipos para inserción
export type NewEquipo = InferInsertModel<typeof equipos>;
export type NewCategoria = InferInsertModel<typeof categorias>;
export type NewEntrenador = InferInsertModel<typeof entrenadores>;
export type NewJugador = InferInsertModel<typeof jugadores>;
export type NewTorneo = InferInsertModel<typeof torneos>;
export type NewEquipoTorneo = InferInsertModel<typeof equiposTorneo>;
export type NewEncuentro = InferInsertModel<typeof encuentros>;
export type NewCancha = InferInsertModel<typeof canchas>;
export type NewCanchaCategoria = InferInsertModel<typeof canchasCategorias>;
export type NewHorario = InferInsertModel<typeof horarios>;
export type NewGol = InferInsertModel<typeof goles>;
export type NewTarjeta = InferInsertModel<typeof tarjetas>;
export type NewJugadorParticipante = InferInsertModel<typeof jugadoresParticipantes>;
export type NewCambioJugador = InferInsertModel<typeof cambiosJugadores>;
export type NewFirmaEncuentro = InferInsertModel<typeof firmasEncuentros>;
export type NewHistorialJugador = InferInsertModel<typeof historialJugadores>;
export type NewConfiguracion = InferInsertModel<typeof configuraciones>;

// Tipos para equipos con relaciones
export interface EquipoWithRelations extends Equipo {
  equiposCategoria?: {
    categoria: Categoria;
  }[];
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
  jugadoresEquipoCategoria?: {
    equipoCategoria: {
      id: number;
      equipo: Equipo;
      categoria: Categoria;
    };
  }[];
  equipo_categoria_id?: number | null;
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
  horario: Horario | null;
  goles?: Gol[];
  tarjetas?: Tarjeta[];
  jugadoresParticipantes?: JugadorParticipante[];
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

// Tipo para equipos que descansan
export interface EquipoDescansa {
  id: number;
  torneo_id: number;
  equipo_id: number;
  jornada: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipoDescansaWithRelations extends EquipoDescansa {
  equipo: EquipoWithRelations | null;
  torneo: TorneoWithRelations | null;
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
    vocalNombre: string
    vocalFirma: string
    vocalInforme: string
    arbitroNombre: string
    arbitroFirma: string
    arbitroInforme: string
    capitanLocalNombre: string
    capitanLocalFirma: string
    capitanVisitanteNombre: string
    capitanVisitanteFirma: string
    fechaFirma: string
    tribunalInforme?: string
    tribunalPresidenteFirma?: string
    tribunalSecretarioFirma?: string
    tribunalVocalFirma?: string
}

// Tipos para canchas con relaciones
export interface CanchaWithCategorias extends Cancha {
  categorias?: Categoria[];
}

export interface CategoriaWithCanchas extends Categoria {
  canchas?: Cancha[];
}

// Tipos para historial de jugadores con relaciones
export interface HistorialJugadorWithRelations extends HistorialJugador {
  jugador?: Jugador;
  situacion_jugador?: 'PASE' | 'PRÉSTAMO' | 'PRESTAMO' | null;
  // equipo_anterior y situacion_jugador_anterior ya están definidos en HistorialJugador
  // No es necesario redefinirlos aquí
}