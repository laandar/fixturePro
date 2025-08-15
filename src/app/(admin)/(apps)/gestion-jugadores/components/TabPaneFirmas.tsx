'use client'
import { Card, Form, Row, Col, Button } from 'react-bootstrap'
import { TbSignature } from 'react-icons/tb'
import { useGestionJugadores } from './GestionJugadoresContext'

const TabPaneFirmas = () => {
    const { firmas, setFirmas, equipos } = useGestionJugadores()
    const equipoA = equipos.find(e => e.id === 1)
    const equipoB = equipos.find(e => e.id === 2)

    return (
        <Card>
            <Card.Header>
                <h5 className="mb-0 d-flex align-items-center">
                    <TbSignature className="me-2" /> Firmas de Autoridades
                </h5>
            </Card.Header>
            <Card.Body>
                <Form>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Vocal</Form.Label>
                                <Form.Control type="text" value={firmas.vocal} onChange={e => setFirmas({ ...firmas, vocal: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Árbitro</Form.Label>
                                <Form.Control type="text" value={firmas.arbitro} onChange={e => setFirmas({ ...firmas, arbitro: e.target.value })} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Capitán {equipoA?.nombre}</Form.Label>
                                <Form.Control type="text" value={firmas.capitanA} onChange={e => setFirmas({ ...firmas, capitanA: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Capitán {equipoB?.nombre}</Form.Label>
                                <Form.Control type="text" value={firmas.capitanB} onChange={e => setFirmas({ ...firmas, capitanB: e.target.value })} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Fecha de Firma</Form.Label>
                        <Form.Control type="date" value={firmas.fechaFirma} onChange={e => setFirmas({ ...firmas, fechaFirma: e.target.value })} />
                    </Form.Group>
                    <Button variant="primary">Guardar Firmas</Button>
                </Form>
            </Card.Body>
        </Card>
    )
}

export default TabPaneFirmas
