'use client'
import { Card, Button, Table, Badge, Alert } from 'react-bootstrap'
import { TbSoccerField, TbPlus, TbTrash, TbTrophy } from 'react-icons/tb'
import { useGestionJugadores } from './GestionJugadoresContext'
import { useState, useEffect } from 'react'
const TabPaneGoles = () => {
    const { goles, setShowGolModal, handleDeleteGol, estadoEncuentro, isAdmin, torneoId, equipoLocalId, equipoVisitanteId, jornada, nombreEquipoA, nombreEquipoB, getEncuentroActual, jugadoresParticipantesA, jugadoresParticipantesB } = useGestionJugadores()
    const [encuentro, setEncuentro] = useState<any>(null)
    const [isWO, setIsWO] = useState(false)
    
    const isEncuentroFinalizado = estadoEncuentro === 'finalizado';
    const shouldDisableActions = isEncuentroFinalizado && !isAdmin();

    // Resolver nombre y número del jugador por ID (g.jugador es jugador_id en el contexto)
    const getJugadorDisplay = (jugadorId: string) => {
        const allJugadores = [...jugadoresParticipantesA, ...jugadoresParticipantesB]
        const jugador = allJugadores.find(j => j.id.toString() === jugadorId)
        if (!jugador) return `Jugador ${jugadorId}`
        const num = (jugador as { numero_jugador?: number }).numero_jugador
        if (typeof num === 'number') return `Nº ${num} – ${jugador.apellido_nombre}`
        return jugador.apellido_nombre
    }

    // Cargar datos del encuentro
    useEffect(() => {
        const loadEncuentro = async () => {
            if (!torneoId || !equipoLocalId || !equipoVisitanteId || !jornada) return
            
            try {
                // Obtener el encuentro desde localStorage usando el helper del contexto
                const encuentroEncontrado = await getEncuentroActual()
                
                if (encuentroEncontrado) {
                    setEncuentro(encuentroEncontrado)
                    const esWO = encuentroEncontrado.observaciones?.includes('WO') || encuentroEncontrado.observaciones?.includes('Walkover') || false
                    setIsWO(esWO)
                    
                    console.log('🔍 TabPaneGoles - Encuentro cargado:', {
                        id: encuentroEncontrado.id,
                        golesLocal: encuentroEncontrado.goles_local,
                        golesVisitante: encuentroEncontrado.goles_visitante,
                        observaciones: encuentroEncontrado.observaciones,
                        esWO
                    })
                }
            } catch (error) {
                console.error('Error al cargar encuentro:', error)
            }
        }
        
        loadEncuentro()
    }, [torneoId, equipoLocalId, equipoVisitanteId, jornada, getEncuentroActual])

    return (
        <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 d-flex align-items-center">
                    <TbSoccerField className="me-2" /> Goles
                </h5>
               
            </Card.Header>
            <Card.Body>
                {/* Mostrar resultado WO si aplica */}
                {isWO && encuentro && (
                    <Alert variant="warning" className="mb-4">
                        <div className="d-flex align-items-center mb-3">
                            <TbTrophy className="me-2" size={24} />
                            <h6 className="mb-0">Resultado por WO (Walkover)</h6>
                        </div>
                        <div className="text-center">
                            <div className="d-flex justify-content-center align-items-center gap-4">
                                <div className="text-center">
                                    <h4 className="mb-1">{encuentro.goles_local || 0}</h4>
                                    <small className="text-muted">{nombreEquipoA}</small>
                                </div>
                                <div className="text-muted">-</div>
                                <div className="text-center">
                                    <h4 className="mb-1">{encuentro.goles_visitante || 0}</h4>
                                    <small className="text-muted">{nombreEquipoB}</small>
                                </div>
                            </div>
                            <small className="text-muted d-block mt-2">
                                Los goles individuales fueron eliminados y se aplicó el resultado configurado.
                            </small>
                        </div>
                    </Alert>
                )}

                {/* Mostrar goles individuales si no es WO */}
                {!isWO && goles.length > 0 ? (
                    <Table responsive striped hover size="sm">
                        <thead>
                            <tr>
                                <th>Jugador</th>
                                <th>Equipo</th>
                                <th>Tipo</th>
                                <th>Minuto</th>
                                <th>Tiempo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {goles.map(g => (
                                <tr key={g.id}>
                                    <td>{getJugadorDisplay(g.jugador)}</td>
                                    <td>{g.equipo}</td>
                                    <td>
                                        <Badge bg={g.tipo === 'autogol' ? 'dark' : 'success'}>
                                            {g.tipo.charAt(0).toUpperCase() + g.tipo.slice(1)}
                                        </Badge>
                                    </td>
                                    <td>{g.minuto}'</td>
                                    <td>
                                        <Badge bg={g.tiempo === 'primer' ? 'info' : 'light'}>
                                            {g.tiempo === 'primer' ? '1er Tiempo' : '2do Tiempo'}
                                        </Badge>
                                    </td>
                                    <td>
                                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteGol(g.id)} disabled={shouldDisableActions}>
                                            <TbTrash />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : !isWO ? (
                    <div className="text-center text-muted py-5">
                        <TbSoccerField size={48} className="mb-3" />
                        <p>No hay goles registrados.</p>
                    </div>
                ) : null}
            </Card.Body>
        </Card>
    )
}

export default TabPaneGoles
