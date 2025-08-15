'use client'
import { Card, Button, Table, Badge } from 'react-bootstrap'
import { TbSwitchHorizontal, TbPlus, TbTrash } from 'react-icons/tb'
import { useGestionJugadores } from './GestionJugadoresContext'

const TabPaneCambios = () => {
    const { equipos, jugadores, cambios, setShowCambioModal, handleDeleteCambio } = useGestionJugadores()

    return (
        <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 d-flex align-items-center">
                    <TbSwitchHorizontal className="me-2" /> Cambios de Jugadores
                </h5>
                <Button variant="primary" onClick={() => setShowCambioModal(true)}>
                    <TbPlus className="me-1" /> Añadir Cambio
                </Button>
            </Card.Header>
            <Card.Body>
                {cambios.length > 0 ? (
                    <Table responsive striped hover size="sm">
                        <thead>
                            <tr>
                                <th>Equipo</th>
                                <th>Sale</th>
                                <th>Entra</th>
                                <th>Minuto</th>
                                <th>Tiempo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cambios.map(cambio => {
                                const equipo = equipos.find(e => e.id.toString() === cambio.equipoA)
                                const jugadorSale = jugadores.find(j => j.id.toString() === cambio.jugadorSale)
                                const jugadorEntra = jugadores.find(j => j.id.toString() === cambio.jugadorEntra)

                                return (
                                    <tr key={cambio.id}>
                                        <td>{equipo?.nombre || 'N/A'}</td>
                                        <td>{jugadorSale?.apellido_nombre}</td>
                                        <td>{jugadorEntra?.apellido_nombre}</td>
                                        <td>{cambio.minuto}'</td>
                                        <td>
                                            <Badge bg={cambio.tiempo === 'primer' ? 'info' : 'light'}>
                                                {cambio.tiempo === 'primer' ? '1er Tiempo' : '2do Tiempo'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteCambio(cambio.id)}>
                                                <TbTrash />
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </Table>
                ) : (
                    <div className="text-center text-muted py-5">
                        <TbSwitchHorizontal size={48} className="mb-3" />
                        <p>No hay cambios registrados.</p>
                    </div>
                )}
            </Card.Body>
        </Card>
    )
}

export default TabPaneCambios
