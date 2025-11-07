'use client'
import { useState } from 'react'
import { Card, CardHeader, CardBody, Row, Col, Badge, Button, Table, Modal, Form, FormControl } from 'react-bootstrap'
import { useGestionJugadores } from './GestionJugadoresContext'

const TabPanePagos = () => {
    const { nombreEquipoA, nombreEquipoB, saldoLocalCents, saldoVisitanteCents, registrarPago, estadoEncuentro, isAdmin, detalleValores } = useGestionJugadores()
    const isEncuentroFinalizado = estadoEncuentro === 'finalizado'
    const disabled = isEncuentroFinalizado && !isAdmin()

    const [showPagoModal, setShowPagoModal] = useState(false)
    const [equipoSeleccionado, setEquipoSeleccionado] = useState<'local' | 'visitante' | null>(null)
    const [montoPago, setMontoPago] = useState<string>('')
    const [descripcionPago, setDescripcionPago] = useState<string>('')
    const [errorPago, setErrorPago] = useState<string | null>(null)

    const abrirModalPago = (equipo: 'local' | 'visitante') => {
        setEquipoSeleccionado(equipo)
        setMontoPago('')
        setDescripcionPago('')
        setErrorPago(null)
        setShowPagoModal(true)
    }

    const cerrarModalPago = () => {
        setShowPagoModal(false)
        setEquipoSeleccionado(null)
        setMontoPago('')
        setDescripcionPago('')
        setErrorPago(null)
    }

    const confirmarPago = async () => {
        if (!equipoSeleccionado) return
        
        setErrorPago(null)
        const monto = parseFloat(montoPago)
        if (isNaN(monto) || monto <= 0) {
            setErrorPago('El monto debe ser mayor a 0')
            return
        }
        
        try {
            await registrarPago(equipoSeleccionado, monto, descripcionPago)
            cerrarModalPago()
        } catch (error) {
            setErrorPago(error instanceof Error ? error.message : 'Error al registrar el pago')
        }
    }

    const nombreEquipoSeleccionado = equipoSeleccionado === 'local' ? nombreEquipoA : nombreEquipoB

    const totalCents = (saldoLocalCents || 0) + (saldoVisitanteCents || 0)

    return (
        <div>
            <Row className="mb-3">
                <Col md={4}>
                    <Card>
                        <CardHeader className="d-flex justify-content-between align-items-center">
                            <span>{nombreEquipoA}</span>
                            <Badge bg={saldoLocalCents > 0 ? 'warning' : 'success'} className={saldoLocalCents > 0 ? 'text-dark' : ''}>
                                ${ (saldoLocalCents/100).toFixed(2) }
                            </Badge>
                        </CardHeader>
                        <CardBody>
                            <Button variant="outline-success" size="sm" onClick={() => abrirModalPago('local')} disabled={disabled}>
                                Abonar {nombreEquipoA}
                            </Button>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card>
                        <CardHeader className="d-flex justify-content-between align-items-center">
                            <span>{nombreEquipoB}</span>
                            <Badge bg={saldoVisitanteCents > 0 ? 'warning' : 'success'} className={saldoVisitanteCents > 0 ? 'text-dark' : ''}>
                                ${ (saldoVisitanteCents/100).toFixed(2) }
                            </Badge>
                        </CardHeader>
                        <CardBody>
                            <Button variant="outline-success" size="sm" onClick={() => abrirModalPago('visitante')} disabled={disabled}>
                                Abonar {nombreEquipoB}
                            </Button>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card>
                        <CardHeader className="d-flex justify-content-between align-items-center">
                            <span>Total del Partido</span>
                            <Badge bg={totalCents > 0 ? 'warning' : 'success'} className={totalCents > 0 ? 'text-dark' : ''}>
                                ${ (totalCents/100).toFixed(2) }
                            </Badge>
                        </CardHeader>
                        <CardBody>
                            <small className="text-muted">Incluye saldos pendientes acumulados.</small>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Detalle por equipo */}
            {detalleValores && (
                <Row className="mt-3">
                    {[{key:'local', nombre:nombreEquipoA}, {key:'visitante', nombre:nombreEquipoB}].map(({key, nombre}) => {
                        const det = detalleValores[key]
                        if (!det) return null
                        return (
                            <Col md={6} key={key}>
                                <Card className="h-100">
                                    <CardHeader>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <strong>Detalle - {nombre}</strong>
                                            {det.saldoCents > 0 && (
                                                <Badge bg="warning" text="dark" className="fs-6">
                                                    ${(det.saldoCents/100).toFixed(2)}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardBody>
                                        {/* Tabla de conceptos */}
                                        <div className="table-responsive mb-3">
                                            <Table bordered size="sm" className="mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Concepto</th>
                                                        <th className="text-end" style={{width: '120px'}}>Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Tarjetas amarillas */}
                                                    <tr className={det.amarillas > 0 ? '' : 'text-muted'}>
                                                        <td>
                                                            Amarillas: {det.amarillas} × ${det.valorAmarilla.toFixed(2)}
                                                        </td>
                                                        <td className="text-end">
                                                            ${(det.importeAmarillasCents/100).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                    {/* Tarjetas rojas */}
                                                    <tr className={det.rojas > 0 ? '' : 'text-muted'}>
                                                        <td>
                                                            Rojas: {det.rojas} × ${det.valorRoja.toFixed(2)}
                                                        </td>
                                                        <td className="text-end">
                                                            ${(det.importeRojasCents/100).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                    {/* Cargos manuales */}
                                                    <tr className={det.sumaCargosCents > 0 ? '' : 'text-muted'}>
                                                        <td>
                                                            Cargos manuales
                                                            {det.cargos.length > 0 && (
                                                                <span className="text-muted ms-2">({det.cargos.length})</span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            ${(det.sumaCargosCents/100).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                    {/* Separador */}
                                                    <tr>
                                                        <td colSpan={2} className="p-0">
                                                            <hr className="my-2" />
                                                        </td>
                                                    </tr>
                                                    {/* Total importe */}
                                                    <tr className="table-secondary">
                                                        <td className="fw-bold">Total a pagar</td>
                                                        <td className="text-end fw-bold">
                                                            ${(det.importeCents/100).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                    {/* Pagos */}
                                                    <tr className={det.sumaPagosCents > 0 ? '' : 'text-muted'}>
                                                        <td>
                                                            Pagos realizados
                                                            {det.pagos.length > 0 && (
                                                                <span className="text-muted ms-2">({det.pagos.length})</span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            ${(det.sumaPagosCents/100).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                    {/* Separador final */}
                                                    <tr>
                                                        <td colSpan={2} className="p-0">
                                                            <hr className="my-2 border-2" />
                                                        </td>
                                                    </tr>
                                                    {/* Saldo final */}
                                                    <tr className={det.saldoCents > 0 ? 'table-warning' : ''}>
                                                        <td className="fw-bold">Saldo pendiente</td>
                                                        <td className="text-end fw-bold">
                                                            ${(det.saldoCents/100).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </div>

                                        {/* Detalle de cargos manuales */}
                                        {det.cargos.length > 0 && (
                                            <div className="mb-3">
                                                <div className="mb-2 pb-2 border-bottom">
                                                    <strong className="text-uppercase small">Cargos Manuales ({det.cargos.length})</strong>
                                                </div>
                                                <div className="border rounded p-3 bg-light bg-opacity-50">
                                                    {det.cargos.map((c: any, idx: number) => (
                                                        <div key={idx} className={idx < det.cargos.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}>
                                                            <div className="d-flex justify-content-between align-items-start">
                                                                <div className="flex-grow-1">
                                                                    <div className="mb-1">
                                                                        <span className="badge bg-secondary me-2">
                                                                            {c.jornada != null ? `Jornada ${c.jornada}` : 'Global'}
                                                                        </span>
                                                                    </div>
                                                                    {c.descripcion && (
                                                                        <div className="text-muted small">
                                                                            {c.descripcion}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-end ms-3">
                                                                    <div className="fw-bold">
                                                                        ${((c.monto_centavos||0)/100).toFixed(2)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Mensaje si no hay detalles */}
                                        {det.cargos.length === 0 && (
                                            <div className="text-center text-muted py-3">
                                                <small>No hay cargos registrados</small>
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            </Col>
                        )
                    })}
                </Row>
            )}

            {/* Modal de pago */}
            <Modal show={showPagoModal} onHide={cerrarModalPago}>
                <Modal.Header closeButton>
                    <Modal.Title>Registrar Pago - {nombreEquipoSeleccionado}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {errorPago && (
                        <div className="alert alert-danger" role="alert">
                            {errorPago}
                        </div>
                    )}
                    <Form>
                        <div className="mb-3">
                            <label className="form-label">Monto (USD) *</label>
                            <FormControl
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={montoPago}
                                onChange={(e) => {
                                    setMontoPago(e.target.value)
                                    setErrorPago(null)
                                }}
                                placeholder="Ingrese el monto a abonar"
                                isInvalid={!!montoPago && (isNaN(parseFloat(montoPago)) || parseFloat(montoPago) <= 0)}
                            />
                            {montoPago && (isNaN(parseFloat(montoPago)) || parseFloat(montoPago) <= 0) && (
                                <div className="invalid-feedback">El monto debe ser mayor a 0</div>
                            )}
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Descripción (opcional)</label>
                            <FormControl
                                as="textarea"
                                rows={3}
                                value={descripcionPago}
                                onChange={(e) => setDescripcionPago(e.target.value)}
                                placeholder="Ingrese una descripción del pago"
                            />
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={cerrarModalPago}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={confirmarPago}
                        disabled={!montoPago || isNaN(parseFloat(montoPago)) || parseFloat(montoPago) <= 0}
                    >
                        Registrar Pago
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default TabPanePagos


