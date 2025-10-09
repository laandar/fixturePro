'use client'
import { Card, Form, Row, Col, Button, Alert } from 'react-bootstrap'
import { TbSignature } from 'react-icons/tb'
import { FaPen, FaSave } from 'react-icons/fa'
import { useGestionJugadores } from './GestionJugadoresContext'
import SignaturePad from '@/components/SignaturePad'
import SignaturePreview from '@/components/SignaturePreview'
import { useState } from 'react'
import './TabPaneFirmas.css'

type SignatureField = 'vocal' | 'arbitro' | 'capitanLocal' | 'capitanVisitante'

const TabPaneFirmas = () => {
    const { firmas, setFirmas, equipos, estadoEncuentro, isAdmin, handleSaveFirmas, isSaving, jugadoresParticipantesA, jugadoresParticipantesB, jugadoresParticipantes, handleDesignarCapitan } = useGestionJugadores()
    const [showSignaturePad, setShowSignaturePad] = useState(false)
    const [currentSignatureField, setCurrentSignatureField] = useState<SignatureField | null>(null)
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    
    const equipoLocal = equipos.find(e => e.id === 1)
    const equipoVisitante = equipos.find(e => e.id === 2)
    
    const isEncuentroFinalizado = estadoEncuentro === 'finalizado'
    const shouldDisableActions = isEncuentroFinalizado && !isAdmin

    const openSignaturePad = (field: SignatureField) => {
        setCurrentSignatureField(field)
        setShowSignaturePad(true)
    }

    const handleSignatureSave = (signature: string) => {
        if (!currentSignatureField) return

        switch (currentSignatureField) {
            case 'vocal':
                setFirmas({ ...firmas, vocalFirma: signature })
                break
            case 'arbitro':
                setFirmas({ ...firmas, arbitroFirma: signature })
                break
            case 'capitanLocal':
                setFirmas({ ...firmas, capitanLocalFirma: signature })
                break
            case 'capitanVisitante':
                setFirmas({ ...firmas, capitanVisitanteFirma: signature })
                break
        }

        setShowSignaturePad(false)
        setCurrentSignatureField(null)
    }

    const getSignatureTitle = (field: SignatureField): string => {
        switch (field) {
            case 'vocal':
                return 'Firma del Vocal'
            case 'arbitro':
                return 'Firma del Árbitro'
            case 'capitanLocal':
                return `Firma del Capitán ${equipoLocal?.nombre || 'Local'}`
            case 'capitanVisitante':
                return `Firma del Capitán ${equipoVisitante?.nombre || 'Visitante'}`
        }
    }

    const getCurrentSignature = (field: SignatureField): string => {
        switch (field) {
            case 'vocal':
                return firmas.vocalFirma
            case 'arbitro':
                return firmas.arbitroFirma
            case 'capitanLocal':
                return firmas.capitanLocalFirma
            case 'capitanVisitante':
                return firmas.capitanVisitanteFirma
        }
    }

    // Función para obtener el capitán actual de un equipo
    const getCurrentCaptain = (team: 'A' | 'B') => {
        const players = team === 'A' ? jugadoresParticipantesA : jugadoresParticipantesB
        return players.find(player => {
            // Buscar en jugadoresParticipantes si es capitán
            return jugadoresParticipantes.some(jp => 
                jp.jugador_id === player.id && 
                jp.es_capitan === true &&
                ((team === 'A' && jp.equipo_tipo === 'local') || 
                 (team === 'B' && jp.equipo_tipo === 'visitante'))
            )
        })
    }

    // Función para manejar el cambio de capitán
    const handleCaptainChange = async (team: 'A' | 'B', newCaptainId: number) => {
        const newCaptain = (team === 'A' ? jugadoresParticipantesA : jugadoresParticipantesB)
            .find(player => player.id === newCaptainId)
        
        if (newCaptain) {
            try {
                // Designar al nuevo capitán en la base de datos
                const result = await handleDesignarCapitan(newCaptain, team)
                
                if (result.success) {
                    // Actualizar el nombre en el formulario de firmas
                    if (team === 'A') {
                        setFirmas({ ...firmas, capitanLocalNombre: newCaptain.apellido_nombre })
                    } else {
                        setFirmas({ ...firmas, capitanVisitanteNombre: newCaptain.apellido_nombre })
                    }
                    setSaveMessage({ type: 'success', text: `${newCaptain.apellido_nombre} ha sido designado como capitán` })
                } else {
                    setSaveMessage({ type: 'error', text: result.error || 'Error al designar capitán' })
                }
            } catch (error) {
                setSaveMessage({ type: 'error', text: 'Error al designar capitán' })
            }
        }
    }

    const handleSave = async () => {
        try {
            setSaveMessage(null)
            const result = await handleSaveFirmas()
            
            if (result.success) {
                // Actualizar la fecha local con la fecha actual
                setFirmas({ ...firmas, fechaFirma: new Date().toISOString() })
                setSaveMessage({ type: 'success', text: 'Firmas guardadas exitosamente' })
                setTimeout(() => setSaveMessage(null), 3000)
            } else {
                setSaveMessage({ type: 'error', text: result.error || 'Error al guardar las firmas' })
            }
        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Error al guardar las firmas' })
        }
    }


    return (
        <>
        <Card>
            <Card.Header>
                <h5 className="mb-0 d-flex align-items-center">
                    <TbSignature className="me-2" /> Firmas de Autoridades
                </h5>
            </Card.Header>
            <Card.Body>
                    {saveMessage && (
                        <Alert variant={saveMessage.type === 'success' ? 'success' : 'danger'} dismissible onClose={() => setSaveMessage(null)}>
                            {saveMessage.text}
                        </Alert>
                    )}
                    
                <Form>
                        {/* Vocal */}
                        <div className="firma-section mb-4">
                            <div className="section-header">
                                <h5 className="mb-0 text-primary fw-bold">👤 Vocal</h5>
                            </div>
                            <Row className="mt-3">
                                <Col md={12} lg={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Nombre Completo</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            value={firmas.vocalNombre} 
                                            onChange={e => setFirmas({ ...firmas, vocalNombre: e.target.value })} 
                                            disabled={shouldDisableActions}
                                            placeholder="Ingrese el nombre del vocal"
                                        />
                            </Form.Group>
                        </Col>
                                <Col md={12} lg={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Firma Digital</Form.Label>
                                        <div className="d-flex align-items-center gap-2">
                                            <Button 
                                                variant={firmas.vocalFirma ? "success" : "outline-primary"}
                                                onClick={() => openSignaturePad('vocal')}
                                                disabled={shouldDisableActions}
                                                className="flex-shrink-0"
                                            >
                                                <FaPen className="me-2" />
                                                {firmas.vocalFirma ? '✓ Firmado' : 'Firmar'}
                                            </Button>
                                            <SignaturePreview signature={firmas.vocalFirma || null} label="Firma Vocal" />
                                        </div>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Informe del Vocal</Form.Label>
                                        <Form.Control 
                                            as="textarea" 
                                            rows={4}
                                            value={firmas.vocalInforme} 
                                            onChange={e => setFirmas({ ...firmas, vocalInforme: e.target.value })} 
                                            disabled={shouldDisableActions}
                                            placeholder="Escriba aquí el informe detallado del vocal sobre el desarrollo del encuentro..."
                                            className="informe-textarea"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>

                        <hr className="my-4" />

                        {/* Árbitro */}
                        <div className="firma-section mb-4">
                            <div className="section-header">
                                <h5 className="mb-0 text-primary fw-bold">⚽ Árbitro</h5>
                            </div>
                            <Row className="mt-3">
                                <Col md={12} lg={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Nombre Completo</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            value={firmas.arbitroNombre} 
                                            onChange={e => setFirmas({ ...firmas, arbitroNombre: e.target.value })} 
                                            disabled={shouldDisableActions}
                                            placeholder="Ingrese el nombre del árbitro"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={12} lg={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Firma Digital</Form.Label>
                                        <div className="d-flex align-items-center gap-2">
                                            <Button 
                                                variant={firmas.arbitroFirma ? "success" : "outline-primary"}
                                                onClick={() => openSignaturePad('arbitro')}
                                                disabled={shouldDisableActions}
                                                className="flex-shrink-0"
                                            >
                                                <FaPen className="me-2" />
                                                {firmas.arbitroFirma ? '✓ Firmado' : 'Firmar'}
                                            </Button>
                                            <SignaturePreview signature={firmas.arbitroFirma || null} label="Firma Árbitro" />
                                        </div>
                            </Form.Group>
                        </Col>
                            </Row>
                            <Row>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-semibold">Informe del Árbitro</Form.Label>
                                        <Form.Control 
                                            as="textarea" 
                                            rows={4}
                                            value={firmas.arbitroInforme} 
                                            onChange={e => setFirmas({ ...firmas, arbitroInforme: e.target.value })} 
                                            disabled={shouldDisableActions}
                                            placeholder="Escriba aquí el informe detallado del árbitro sobre el desarrollo del encuentro..."
                                            className="informe-textarea"
                                        />
                            </Form.Group>
                        </Col>
                    </Row>
                        </div>

                        <hr className="my-4" />

                        {/* Capitanes */}
                        <div className="firma-section mb-4">
                            <div className="section-header">
                                <h5 className="mb-0 text-primary fw-bold">🏆 Capitanes</h5>
                            </div>
                            
                            {/* Grid de dos columnas para capitanes */}
                            <Row className="mt-3">
                                {/* Capitán Local */}
                                <Col lg={6}>
                                    <div className="capitan-card">
                                        <h6 className="text-secondary mb-3 fw-semibold">
                                            {equipoLocal?.nombre || 'Equipo Local'}
                                        </h6>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-semibold small">Seleccionar Capitán</Form.Label>
                                            <Form.Select 
                                                value={getCurrentCaptain('A')?.id || ''} 
                                                onChange={e => handleCaptainChange('A', parseInt(e.target.value))} 
                                                disabled={shouldDisableActions || jugadoresParticipantesA.length === 0}
                                                size="sm"
                                            >
                                                <option value="">
                                                    {jugadoresParticipantesA.length === 0 ? 'No hay jugadores' : 'Seleccionar capitán...'}
                                                </option>
                                                {jugadoresParticipantesA.map(jugador => (
                                                    <option key={jugador.id} value={jugador.id}>
                                                        {jugador.apellido_nombre}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                            {getCurrentCaptain('A') && (
                                                <div className="mt-2">
                                                    <small className="text-muted">
                                                        Capitán actual: <strong>{getCurrentCaptain('A')?.apellido_nombre}</strong>
                                                    </small>
                                                </div>
                                            )}
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold small">Firma Digital</Form.Label>
                                            <div className="d-flex flex-column gap-2">
                                                <Button 
                                                    variant={firmas.capitanLocalFirma ? "success" : "outline-primary"}
                                                    size="sm"
                                                    onClick={() => openSignaturePad('capitanLocal')}
                                                    disabled={shouldDisableActions}
                                                    className="w-100"
                                                >
                                                    <FaPen className="me-2" />
                                                    {firmas.capitanLocalFirma ? '✓ Firmado' : 'Firmar'}
                                                </Button>
                                                {firmas.capitanLocalFirma && (
                                                    <div className="text-center">
                                                        <SignaturePreview signature={firmas.capitanLocalFirma || null} label="Firma Capitán Local" />
                                                    </div>
                                                )}
                                            </div>
                                        </Form.Group>
                                    </div>
                                </Col>

                                {/* Capitán Visitante */}
                                <Col lg={6}>
                                    <div className="capitan-card">
                                        <h6 className="text-secondary mb-3 fw-semibold">
                                            {equipoVisitante?.nombre || 'Equipo Visitante'}
                                        </h6>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-semibold small">Seleccionar Capitán</Form.Label>
                                            <Form.Select 
                                                value={getCurrentCaptain('B')?.id || ''} 
                                                onChange={e => handleCaptainChange('B', parseInt(e.target.value))} 
                                                disabled={shouldDisableActions || jugadoresParticipantesB.length === 0}
                                                size="sm"
                                            >
                                                <option value="">
                                                    {jugadoresParticipantesB.length === 0 ? 'No hay jugadores' : 'Seleccionar capitán...'}
                                                </option>
                                                {jugadoresParticipantesB.map(jugador => (
                                                    <option key={jugador.id} value={jugador.id}>
                                                        {jugador.apellido_nombre}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                            {getCurrentCaptain('B') && (
                                                <div className="mt-2">
                                                    <small className="text-muted">
                                                        Capitán actual: <strong>{getCurrentCaptain('B')?.apellido_nombre}</strong>
                                                    </small>
                                                </div>
                                            )}
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold small">Firma Digital</Form.Label>
                                            <div className="d-flex flex-column gap-2">
                                                <Button 
                                                    variant={firmas.capitanVisitanteFirma ? "success" : "outline-primary"}
                                                    size="sm"
                                                    onClick={() => openSignaturePad('capitanVisitante')}
                                                    disabled={shouldDisableActions}
                                                    className="w-100"
                                                >
                                                    <FaPen className="me-2" />
                                                    {firmas.capitanVisitanteFirma ? '✓ Firmado' : 'Firmar'}
                                                </Button>
                                                {firmas.capitanVisitanteFirma && (
                                                    <div className="text-center">
                                                        <SignaturePreview signature={firmas.capitanVisitanteFirma || null} label="Firma Capitán Visitante" />
                                                    </div>
                                                )}
                                            </div>
                                        </Form.Group>
                                    </div>
                                </Col>
                            </Row>
                        </div>

                        {/* Mostrar fecha de firma si ya existe */}
                        {firmas.fechaFirma && (
                            <>
                                <hr />
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                        <Form.Label>Fecha de Firma</Form.Label>
                                            <Form.Control 
                                                type="text" 
                                                value={new Date(firmas.fechaFirma).toLocaleDateString('es-ES', { 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })} 
                                                disabled
                                                readOnly
                                            />
                                          
                    </Form.Group>
                                    </Col>
                                </Row>
                            </>
                        )}

                </Form>
            </Card.Body>
        </Card>

            {/* Botón Flotante para Guardar */}
            <div className="floating-save-button">
                <Button 
                    variant="success"
                    size="lg"
                    onClick={handleSave}
                    disabled={shouldDisableActions || isSaving}
                    className="shadow-lg fw-bold"
                >
                    <FaSave className="me-2" />
                    {isSaving ? 'Guardando...' : 'Guardar Firmas'}
                </Button>
            </div>

            {currentSignatureField && (
                <SignaturePad
                    show={showSignaturePad}
                    onClose={() => {
                        setShowSignaturePad(false)
                        setCurrentSignatureField(null)
                    }}
                    onSave={handleSignatureSave}
                    title={getSignatureTitle(currentSignatureField)}
                    initialSignature={getCurrentSignature(currentSignatureField)}
                />
            )}

        </>
    )
}

export default TabPaneFirmas
