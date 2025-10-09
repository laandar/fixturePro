'use client'
import { Card, Button, Table, Badge } from 'react-bootstrap'
import { TbSoccerField, TbPlus, TbTrash } from 'react-icons/tb'
import { useGestionJugadores } from './GestionJugadoresContext'

const TabPaneGoles = () => {
    const { goles, setShowGolModal, handleDeleteGol, estadoEncuentro, isAdmin } = useGestionJugadores()
    
    const isEncuentroFinalizado = estadoEncuentro === 'finalizado';
    const shouldDisableActions = isEncuentroFinalizado && !isAdmin;

    return (
        <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 d-flex align-items-center">
                    <TbSoccerField className="me-2" /> Goles
                </h5>
                <Button variant="success" onClick={() => setShowGolModal(true)} disabled={shouldDisableActions}>
                    <TbPlus className="me-1" /> Añadir Gol
                </Button>
            </Card.Header>
            <Card.Body>
                {goles.length > 0 ? (
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
                                    <td>{g.jugador}</td>
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
                ) : (
                    <div className="text-center text-muted py-5">
                        <TbSoccerField size={48} className="mb-3" />
                        <p>No hay goles registrados.</p>
                    </div>
                )}
            </Card.Body>
        </Card>
    )
}

export default TabPaneGoles
