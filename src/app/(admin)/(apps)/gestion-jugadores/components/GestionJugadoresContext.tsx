import { createContext, useContext } from 'react';
import type { JugadorWithEquipo, Equipo, Categoria, PlayerChange, CardType, Goal, Signature, JugadorParticipante, NewCambioJugador } from '@/db/types';

export interface GestionJugadoresState {
    jugadores: JugadorWithEquipo[];
    equipos: Equipo[];
    categorias: Categoria[];
    loading: boolean;
    error: string | null;
    jugadoresEquipoA: JugadorWithEquipo[];
    jugadoresEquipoB: JugadorWithEquipo[];
    jugadoresParticipantesA: JugadorWithEquipo[];
    jugadoresParticipantesB: JugadorWithEquipo[];
    nombreEquipoA: string;
    nombreEquipoB: string;
    torneoId: number | null;
    equipoLocalId: number | null;
    equipoVisitanteId: number | null;
    jornada: number | null;
    estadoEncuentro: string | null;
    isAdmin: () => boolean;
    showSelectionModalA: boolean;
    setShowSelectionModalA: (show: boolean) => void;
    showSelectionModalB: boolean;
    setShowSelectionModalB: (show: boolean) => void;
    cambios: PlayerChange[];
    tarjetas: CardType[];
    showTarjetaModal: boolean;
    setShowTarjetaModal: (show: boolean) => void;
    nuevaTarjeta: Partial<CardType>;
    setNuevaTarjeta: (tarjeta: Partial<CardType>) => void;
    goles: Goal[];
    showGolModal: boolean;
    setShowGolModal: (show: boolean) => void;
    nuevoGol: Partial<Goal>;
    setNuevoGol: (gol: Partial<Goal>) => void;
    firmas: Signature;
    setFirmas: (firmas: Signature) => void;
    handleSaveFirmas: () => Promise<{ success: boolean; error?: string }>;
    jugadoresParticipantes: JugadorParticipante[];
    setJugadoresParticipantes: (jugadores: JugadorParticipante[]) => void;
    isSaving: boolean;
    loadData: () => Promise<void>;
    loadJugadoresParticipantes: () => Promise<void>;
    saveJugadoresParticipantes: () => Promise<void>;
    loadGolesExistentes: () => Promise<void>;
    loadTarjetasExistentes: () => Promise<void>;
    loadEstadoEncuentro: () => Promise<void>;
    refreshEstadoEncuentro: () => Promise<void>;
    refreshAllData: () => Promise<void>;
    handleTogglePlayerSelection: (jugador: JugadorWithEquipo, equipo: 'A' | 'B') => void;
    handleSelectAllPlayers: (equipo: 'A' | 'B') => void;
    handleClearAllPlayers: (equipo: 'A' | 'B') => void;
    handleDeleteCambio: (id: string) => void;
    handleAddTarjeta: () => void;
    handleDeleteTarjeta: (id: string) => void;
    handleQuickSanction: (jugador: JugadorWithEquipo, tipo: 'amarilla' | 'roja') => void;
    handleDesignarCapitan: (jugador: JugadorWithEquipo, equipo: 'A' | 'B') => Promise<{ success: boolean; error?: string }>;
    handleAddGol: () => void;
    handleDeleteGol: (id: string) => void;
    handleQuickGoal: (jugador: JugadorWithEquipo, tipo: 'gol' | 'penal') => void;
    saveCambiosJugadores: () => Promise<void>;
    saveCambioJugador: (cambio: {sale: JugadorWithEquipo, entra: JugadorWithEquipo, equipo: 'A' | 'B'}) => Promise<void>;
  realizarCambioJugadorCompleto: (cambio: {sale: JugadorWithEquipo, entra: JugadorWithEquipo, equipo: 'A' | 'B'}) => Promise<any>;
    addCambioJugador: (cambio: {sale: JugadorWithEquipo, entra: JugadorWithEquipo, equipo: 'A' | 'B', id?: number}) => void;
    loadCambiosJugadores: () => Promise<void>;
  handlePlayerChange: (jugadorSale: JugadorWithEquipo, jugadorEntra: JugadorWithEquipo, equipo: 'A' | 'B', cambioId?: number) => Promise<void>;
  deshacerCambioJugador: (cambioId: number, jugadorEntraId: number, encuentroId: number) => Promise<void>;
  cambiosJugadores: Array<{id?: number, sale: JugadorWithEquipo, entra: JugadorWithEquipo, timestamp: Date, equipo: 'A' | 'B'}>;
  setCambiosJugadores: React.Dispatch<React.SetStateAction<Array<{id?: number, sale: JugadorWithEquipo, entra: JugadorWithEquipo, timestamp: Date, equipo: 'A' | 'B'}>>>;
}

export const GestionJugadoresContext = createContext<GestionJugadoresState | undefined>(undefined);

export const useGestionJugadores = () => {
    const context = useContext(GestionJugadoresContext);
    if (!context) {
        throw new Error('useGestionJugadores must be used within a GestionJugadoresProvider');
    }
    return context;
};
