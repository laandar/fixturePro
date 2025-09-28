'use client'
import { Card, Button, Table, Badge } from 'react-bootstrap'
import { TbSquare, TbPlus, TbTrash } from 'react-icons/tb'
import { useGestionJugadores } from './GestionJugadoresContext'

const TabPaneAmonestaciones = () => {
    const { tarjetas, setShowTarjetaModal, handleDeleteTarjeta, jugadoresEquipoA, jugadoresEquipoB, jugadoresParticipantesA, jugadoresParticipantesB } = useGestionJugadores()

    // Función para obtener el nombre del jugador por ID
    const getJugadorNombre = (jugadorId: string) => {
        const allJugadores = [...jugadoresParticipantesA, ...jugadoresParticipantesB]
        const jugador = allJugadores.find(j => j.id.toString() === jugadorId)
        return jugador ? jugador.apellido_nombre : `Jugador ${jugadorId}`
    }

    // Función para obtener el equipo del jugador por ID
    const getJugadorEquipo = (jugadorId: string) => {
        const jugadorA = jugadoresParticipantesA.find(j => j.id.toString() === jugadorId)
        if (jugadorA) return jugadorA.equipo?.nombre || 'Equipo A'
        
        const jugadorB = jugadoresParticipantesB.find(j => j.id.toString() === jugadorId)
        if (jugadorB) return jugadorB.equipo?.nombre || 'Equipo B'
        
        return 'Equipo desconocido'
    }

    // Función para obtener estadísticas de tarjetas por jugador
    const getEstadisticasJugador = (jugadorId: string) => {
        const tarjetasJugador = tarjetas.filter(t => t.jugador === jugadorId)
        const amarillas = tarjetasJugador.filter(t => t.tipo === 'amarilla').length
        const rojas = tarjetasJugador.filter(t => t.tipo === 'roja').length
        const expulsado = rojas > 0 || amarillas >= 2
        
        return { amarillas, rojas, expulsado, total: tarjetasJugador.length }
    }

    // Agrupar tarjetas por jugador para mostrar estadísticas
    const jugadoresConTarjetas = [...new Set(tarjetas.map(t => t.jugador))].map(jugadorId => {
        const estadisticas = getEstadisticasJugador(jugadorId)
        return {
            jugadorId,
            nombre: getJugadorNombre(jugadorId),
            equipo: getJugadorEquipo(jugadorId),
            ...estadisticas
        }
    }).filter(j => j.total > 0)

    return (
        <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 d-flex align-items-center">
                    <TbSquare className="me-2" /> Amonestaciones
                </h5>
                <Button variant="warning" onClick={() => setShowTarjetaModal(true)}>
                    <TbPlus className="me-1" /> Añadir Tarjeta
                </Button>
            </Card.Header>
            <Card.Body>
                {tarjetas.length > 0 ? (
                    <>
                        {/* Estadísticas por jugador */}
                        <div className="mb-4">
                            <h6 className="mb-3">Resumen por Jugador</h6>
                            <div className="row">
                                {jugadoresConTarjetas.map(jugador => (
                                    <div key={jugador.jugadorId} className="col-md-6 mb-3">
                                        <div className={`card ${jugador.expulsado ? 'border-danger' : 'border-warning'}`}>
                                            <div className="card-body p-3">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <h6 className="mb-1">{jugador.nombre}</h6>
                                                        <small className="text-muted">{jugador.equipo}</small>
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        {jugador.amarillas > 0 && (
                                                            <Badge bg="warning" className="text-dark">
                                                                {jugador.amarillas} 🟨
                                                            </Badge>
                                                        )}
                                                        {jugador.rojas > 0 && (
                                                            <Badge bg="danger">
                                                                {jugador.rojas} 🟥
                                                            </Badge>
                                                        )}
                                                        {jugador.amarillas >= 2 && jugador.rojas === 0 && (
                                                            <Badge bg="danger">
                                                                1 🟥 (doble amarilla)
                                                            </Badge>
                                                        )}
                                                        {jugador.expulsado && (
                                                            <Badge bg="danger">
                                                                Expulsado
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tabla detallada de tarjetas */}
                        <h6 className="mb-3">Detalle de Tarjetas</h6>
                        <Table responsive striped hover size="sm">
                            <thead>
                                <tr>
                                    <th>Jugador</th>
                                    <th>Equipo</th>
                                    <th>Tipo</th>
                                    <th>Minuto</th>
                                    <th>Tiempo</th>
                                    <th>Motivo</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tarjetas.map(t => (
                                    <tr key={t.id}>
                                        <td>{getJugadorNombre(t.jugador)}</td>
                                        <td>{getJugadorEquipo(t.jugador)}</td>
                                        <td>
                                            <Badge bg={t.tipo === 'amarilla' ? 'warning' : 'danger'}>
                                                {t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                                            </Badge>
                                        </td>
                                        <td>{t.minuto}'</td>
                                        <td>
                                            <Badge bg={t.tiempo === 'primer' ? 'info' : 'light'}>
                                                {t.tiempo === 'primer' ? '1er Tiempo' : '2do Tiempo'}
                                            </Badge>
                                        </td>
                                        <td>{t.motivo}</td>
                                        <td>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteTarjeta(t.id)}>
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
