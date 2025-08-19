'use client'
'use client'
import { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Form, Row, Col } from 'react-bootstrap'
import { GestionJugadoresContext, type GestionJugadoresState } from './GestionJugadoresContext'
import { getJugadores } from '../../jugadores/actions'
import { getEquipos } from '../../equipos/actions'
import { getCategorias } from '../../categorias/actions'
import type { JugadorWithEquipo, Equipo, Categoria, PlayerChange, CardType, Goal, Signature } from '@/db/types'

export const GestionJugadoresProvider = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [jugadores, setJugadores] = useState<JugadorWithEquipo[]>([])
    const [equipos, setEquipos] = useState<Equipo[]>([])
    const [categorias, setCategorias] = useState<Categoria[]>([])

    const [jugadoresParticipantesA, setJugadoresParticipantesA] = useState<JugadorWithEquipo[]>([])
    const [jugadoresParticipantesB, setJugadoresParticipantesB] = useState<JugadorWithEquipo[]>([])

    const [showSelectionModalA, setShowSelectionModalA] = useState(false)
    const [showSelectionModalB, setShowSelectionModalB] = useState(false)

    const [cambios, setCambios] = useState<PlayerChange[]>([])
    const [showCambioModal, setShowCambioModal] = useState(false)
    const [nuevoCambio, setNuevoCambio] = useState<Partial<PlayerChange>>({})

    const [tarjetas, setTarjetas] = useState<CardType[]>([])
    const [showTarjetaModal, setShowTarjetaModal] = useState(false)
    const [nuevaTarjeta, setNuevaTarjeta] = useState<Partial<CardType>>({})

    const [goles, setGoles] = useState<Goal[]>([])
    const [showGolModal, setShowGolModal] = useState(false)
    const [nuevoGol, setNuevoGol] = useState<Partial<Goal>>({})

    const [firmas, setFirmas] = useState<Signature>({ vocal: '', arbitro: '', capitanA: '', capitanB: '', fechaFirma: '' })

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const [jugadoresData, equiposData, categoriasData] = await Promise.all([
                getJugadores(),
                getEquipos(),
                getCategorias(),
            ])
            setJugadores(jugadoresData)
            setEquipos(equiposData)
            setCategorias(categoriasData)
        } catch (err) {
            setError('Failed to load data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const jugadoresEquipoA = jugadores.filter(j => j.equipo?.nombre === 'UDEF')
    const jugadoresEquipoB = jugadores.filter(j => j.equipo?.nombre === '9 Octubre')

    const handleTogglePlayerSelection = (jugador: JugadorWithEquipo, equipo: 'A' | 'B') => {
        const setter = equipo === 'A' ? setJugadoresParticipantesA : setJugadoresParticipantesB
        const participantes = equipo === 'A' ? jugadoresParticipantesA : jugadoresParticipantesB
        if (participantes.some(p => p.id === jugador.id)) {
            setter(participantes.filter(p => p.id !== jugador.id))
        } else {
            setter([...participantes, jugador])
        }
    }

    const handleSelectAllPlayers = (equipo: 'A' | 'B') => {
        const source = equipo === 'A' ? jugadoresEquipoA : jugadoresEquipoB
        const setter = equipo === 'A' ? setJugadoresParticipantesA : setJugadoresParticipantesB
        setter(source)
    }

    const handleClearAllPlayers = (equipo: 'A' | 'B') => {
        const setter = equipo === 'A' ? setJugadoresParticipantesA : setJugadoresParticipantesB
        setter([])
    }

    const handleAddCambio = () => {
        if (nuevoCambio.jugadorEntra && nuevoCambio.jugadorSale && nuevoCambio.minuto) {
            setCambios([...cambios, { ...nuevoCambio, id: Date.now().toString() } as PlayerChange])
            setNuevoCambio({})
            setShowCambioModal(false)
        }
    }

    const handleDeleteCambio = (id: string) => {
        setCambios(cambios.filter(c => c.id !== id))
    }

    const handleAddTarjeta = () => {
        if (nuevaTarjeta.jugador && nuevaTarjeta.tipo && nuevaTarjeta.minuto) {
            setTarjetas([...tarjetas, { ...nuevaTarjeta, id: Date.now().toString() } as CardType])
            setNuevaTarjeta({})
            setShowTarjetaModal(false)
        }
    }

    const handleDeleteTarjeta = (id: string) => {
        setTarjetas(tarjetas.filter(t => t.id !== id))
    }

        const handleQuickSanction = (jugador: JugadorWithEquipo, tipo: 'amarilla' | 'roja') => {
        const newCard: CardType = {
            id: Date.now().toString(),
            jugador: jugador.id.toString(),
            equipo: jugador.equipo?.nombre || '',
            tipo,
            minuto: 0, // Placeholder, maybe add a quick time input later
            tiempo: 'primer',
            motivo: 'Sanción rápida'
        }
        setTarjetas([...tarjetas, newCard])
    }

    const handleAddGol = () => {
        if (nuevoGol.jugador && nuevoGol.tipo && nuevoGol.minuto) {
            setGoles([...goles, { ...nuevoGol, id: Date.now().toString() } as Goal])
            setNuevoGol({})
            setShowGolModal(false)
        }
    }

    const handleDeleteGol = (id: string) => {
        setGoles(goles.filter(g => g.id !== id))
    }

        const handleQuickGoal = (jugador: JugadorWithEquipo, tipo: 'gol' | 'penal') => {
        const newGoal: Goal = {
            id: Date.now().toString(),
            jugador: jugador.id.toString(),
            equipo: jugador.equipo?.nombre || '',
            minuto: 0, // Placeholder
            tiempo: 'primer',
            tipo,
        }
        setGoles([...goles, newGoal])
    }

    const value: GestionJugadoresState = {
        jugadores,
        equipos,
        categorias,
        loading,
        error,
        jugadoresEquipoA,
        jugadoresEquipoB,
        jugadoresParticipantesA,
        jugadoresParticipantesB,
        showSelectionModalA,
        setShowSelectionModalA,
        showSelectionModalB,
        setShowSelectionModalB,
        cambios,
        showCambioModal,
        setShowCambioModal,
        nuevoCambio,
        setNuevoCambio,
        tarjetas,
        showTarjetaModal,
        setShowTarjetaModal,
        nuevaTarjeta,
        setNuevaTarjeta,
        goles,
        showGolModal,
        setShowGolModal,
        nuevoGol,
        setNuevoGol,
        firmas,
        setFirmas,
        loadData,
        handleTogglePlayerSelection,
        handleSelectAllPlayers,
        handleClearAllPlayers,
        handleAddCambio,
        handleDeleteCambio,
        handleAddTarjeta,
        handleDeleteTarjeta,
        handleQuickSanction,
        handleAddGol,
        handleDeleteGol,
        handleQuickGoal,
    }

    const jugadoresDisponiblesSale = nuevoCambio.equipoA === equipos[0]?.id.toString()
        ? jugadoresParticipantesA
        : jugadoresParticipantesB

    const jugadoresDisponiblesEntra = (nuevoCambio.equipoA === equipos[0]?.id.toString() ? jugadoresEquipoA : jugadoresEquipoB).filter(
        (j) => !(nuevoCambio.equipoA === equipos[0]?.id.toString() ? jugadoresParticipantesA : jugadoresParticipantesB).some(p => p.id === j.id)
    )

    return (
        <GestionJugadoresContext.Provider value={value}>
            {children}
            <Modal show={showCambioModal} onHide={() => setShowCambioModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Añadir Cambio</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={3}>Equipo</Form.Label>
                            <Col sm={9}>
                                <Form.Select
                                    value={nuevoCambio.equipoA || ''}
                                    onChange={(e) => setNuevoCambio({ ...nuevoCambio, equipoA: e.target.value, jugadorSale: undefined, jugadorEntra: undefined })}
                                >
                                    <option value="">Seleccione un equipo</option>
                                    {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                                </Form.Select>
                            </Col>
                        </Form.Group>
                        <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={3}>Sale</Form.Label>
                            <Col sm={9}>
                                <Form.Select
                                    value={nuevoCambio.jugadorSale || ''}
                                    onChange={(e) => setNuevoCambio({ ...nuevoCambio, jugadorSale: e.target.value })}
                                    disabled={!nuevoCambio.equipoA}
                                >
                                    <option value="">Seleccione jugador que sale</option>
                                    {jugadoresDisponiblesSale.map(j => <option key={j.id} value={j.id}>{j.apellido_nombre}</option>)}
                                </Form.Select>
                            </Col>
                        </Form.Group>
                        <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={3}>Entra</Form.Label>
                            <Col sm={9}>
                                <Form.Select
                                    value={nuevoCambio.jugadorEntra || ''}
                                    onChange={(e) => setNuevoCambio({ ...nuevoCambio, jugadorEntra: e.target.value })}
                                    disabled={!nuevoCambio.equipoA}
                                >
                                    <option value="">Seleccione jugador que entra</option>
                                    {jugadoresDisponiblesEntra.map(j => <option key={j.id} value={j.id}>{j.apellido_nombre}</option>)}
                                </Form.Select>
                            </Col>
                        </Form.Group>
                        <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={3}>Minuto</Form.Label>
                            <Col sm={9}>
                                <Form.Control
                                    type="number"
                                    placeholder="Minuto del cambio"
                                    value={nuevoCambio.minuto || ''}
                                    onChange={(e) => setNuevoCambio({ ...nuevoCambio, minuto: parseInt(e.target.value) })}
                                />
                            </Col>
                        </Form.Group>
                        <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={3}>Tiempo</Form.Label>
                            <Col sm={9}>
                                <Form.Select
                                    value={nuevoCambio.tiempo || 'primer'}
                                    onChange={(e) => setNuevoCambio({ ...nuevoCambio, tiempo: e.target.value as 'primer' | 'segundo' })}
                                >
                                    <option value="primer">1er Tiempo</option>
                                    <option value="segundo">2do Tiempo</option>
                                </Form.Select>
                            </Col>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCambioModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleAddCambio}>Guardar Cambio</Button>
                </Modal.Footer>
            </Modal>
        </GestionJugadoresContext.Provider>
    )
}
