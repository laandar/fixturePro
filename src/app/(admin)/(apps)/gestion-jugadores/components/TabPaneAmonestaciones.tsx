'use client'
import { Card, Button, Table, Badge } from 'react-bootstrap'
import { TbSquare, TbPlus, TbTrash } from 'react-icons/tb'
import { useGestionJugadores } from './GestionJugadoresContext'

const TabPaneAmonestaciones = () => {
    const { tarjetas, setShowTarjetaModal, handleDeleteTarjeta } = useGestionJugadores()

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
                                    <td>{t.jugador}</td>
                                    <td>{t.equipo}</td>
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
