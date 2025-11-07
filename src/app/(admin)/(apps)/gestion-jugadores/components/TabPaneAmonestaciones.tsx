'use client'
import { Card, Button, Table, Badge } from 'react-bootstrap'
import { TbSquare, TbPlus, TbTrash } from 'react-icons/tb'
import { useGestionJugadores } from './GestionJugadoresContext'

const TabPaneAmonestaciones = () => {
    const { tarjetas, setShowTarjetaModal, handleDeleteTarjeta, jugadoresParticipantesA, jugadoresParticipantesB, estadoEncuentro, isAdmin, cargosManuales, nombreEquipoA, nombreEquipoB, equipoLocalId, equipoVisitanteId } = useGestionJugadores()

    const isEncuentroFinalizado = estadoEncuentro === 'finalizado';
    const shouldDisableActions = isEncuentroFinalizado && !isAdmin();

    // Función para obtener el nombre del jugador por ID
    const getJugadorNombre = (jugadorId: string) => {
        const allJugadores = [...jugadoresParticipantesA, ...jugadoresParticipantesB]
        const jugador = allJugadores.find(j => j.id.toString() === jugadorId)
        return jugador ? jugador.apellido_nombre : `Jugador ${jugadorId}`
    }

    // Función para obtener el equipo del jugador por ID
    const getJugadorEquipo = (jugadorId: string) => {
        const jugadorA = jugadoresParticipantesA.find(j => j.id.toString() === jugadorId)
        if (jugadorA) {
            const equipo = jugadorA.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo
            return equipo?.nombre || 'Equipo A'
        }
        
        const jugadorB = jugadoresParticipantesB.find(j => j.id.toString() === jugadorId)
        if (jugadorB) {
            const equipo = jugadorB.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo
            return equipo?.nombre || 'Equipo B'
        }
        
        return 'Equipo desconocido'
    }


    return (
        <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                    <h5 className="mb-0 d-flex align-items-center">
                        <TbSquare className="me-2" /> Amonestaciones
                    </h5>
                </div>
                
            </Card.Header>
            <Card.Body>
               
                {tarjetas.length > 0 ? (
                    <>
                        {/* Tabla detallada de tarjetas */}
                        <h6 className="mb-3">Detalle de Tarjetas</h6>
                        <Table responsive striped hover size="sm">
                            <thead>
                                <tr>
                                    <th>Jugador</th>
                                    <th>Equipo</th>
                                    <th>Tipo</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tarjetas
                                    .sort((a, b) => {
                                        // Ordenar primero por equipo, luego por jugador
                                        const equipoA = getJugadorEquipo(a.jugador)
                                        const equipoB = getJugadorEquipo(b.jugador)
                                        const jugadorA = getJugadorNombre(a.jugador)
                                        const jugadorB = getJugadorNombre(b.jugador)
                                        
                                        if (equipoA !== equipoB) {
                                            return equipoA.localeCompare(equipoB)
                                        }
                                        return jugadorA.localeCompare(jugadorB)
                                    })
                                    .map(t => (
                                    <tr key={t.id}>
                                        <td>{getJugadorNombre(t.jugador)}</td>
                                        <td>{getJugadorEquipo(t.jugador)}</td>
                                        <td>
                                            <Badge bg={t.tipo === 'amarilla' ? 'warning' : 'danger'}>
                                                {t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteTarjeta(t.id)} disabled={shouldDisableActions}>
                                                <TbTrash />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                ) : (
                    <div className="text-center text-muted py-5">
                        <TbSquare size={48} className="mb-3" />
                        <p>No hay tarjetas registradas.</p>
                    </div>
                )}
            </Card.Body>
        </Card>
    )
}

export default TabPaneAmonestaciones
