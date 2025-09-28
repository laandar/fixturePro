import { createContext, useContext } from 'react';
import type { JugadorWithEquipo, Equipo, Categoria, PlayerChange, CardType, Goal, Signature, JugadorParticipante } from '@/db/types';

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
    showSelectionModalA: boolean;
    setShowSelectionModalA: (show: boolean) => void;
    showSelectionModalB: boolean;
    setShowSelectionModalB: (show: boolean) => void;
    cambios: PlayerChange[];
    showCambioModal: boolean;
    setShowCambioModal: (show: boolean) => void;
    nuevoCambio: Partial<PlayerChange>;
    setNuevoCambio: (cambio: Partial<PlayerChange>) => void;
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
    jugadoresParticipantes: JugadorParticipante[];
    setJugadoresParticipantes: (jugadores: JugadorParticipante[]) => void;
    isSaving: boolean;
    loadData: () => Promise<void>;
    loadJugadoresParticipantes: () => Promise<void>;
    saveJugadoresParticipantes: () => Promise<void>;
    loadGolesExistentes: () => Promise<void>;
    loadTarjetasExistentes: () => Promise<void>;
    handleTogglePlayerSelection: (jugador: JugadorWithEquipo, equipo: 'A' | 'B') => void;
    handleSelectAllPlayers: (equipo: 'A' | 'B') => void;
    handleClearAllPlayers: (equipo: 'A' | 'B') => void;
    handleAddCambio: () => void;
    handleDeleteCambio: (id: string) => void;
    handleAddTarjeta: () => void;
    handleDeleteTarjeta: (id: string) => void;
    handleQuickSanction: (jugador: JugadorWithEquipo, tipo: 'amarilla' | 'roja') => void;
    handleAddGol: () => void;
    handleDeleteGol: (id: string) => void;
    handleQuickGoal: (jugador: JugadorWithEquipo, tipo: 'gol' | 'penal') => void;
}

export const GestionJugadoresContext = createContext<GestionJugadoresState | undefined>(undefined);

export const useGestionJugadores = () => {
    const context = useContext(GestionJugadoresContext);
    if (!context) {
        throw new Error('useGestionJugadores must be used within a GestionJugadoresProvider');
    }
    return context;
};
