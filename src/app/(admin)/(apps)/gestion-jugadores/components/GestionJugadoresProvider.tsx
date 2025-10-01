'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Modal, Button, Form, Row, Col } from 'react-bootstrap'
import { GestionJugadoresContext, type GestionJugadoresState } from './GestionJugadoresContext'
import { getJugadores } from '../../jugadores/actions'
import { getEquipos } from '../../equipos/actions'
import { getCategorias } from '../../categorias/actions'
import { getJugadoresParticipantes, saveJugadoresParticipantes as saveJugadoresParticipantesAction, getGolesEncuentro, getTarjetasEncuentro } from '../actions'
import type { JugadorWithEquipo, Equipo, Categoria, PlayerChange, CardType, Goal, Signature, JugadorParticipante, NewJugadorParticipante } from '@/db/types'

export const GestionJugadoresProvider = ({ children }: { children: React.ReactNode }) => {
    const isInitialLoad = useRef(true)
    const searchParams = useSearchParams()
    const torneo = searchParams?.get('torneo') || null
    const jornada = searchParams?.get('jornada') || null
    const equipoLocalId = searchParams?.get('equipoLocalId') || null
    const equipoVisitanteId = searchParams?.get('equipoVisitanteId') || null
    const nombreEquipoLocal = searchParams?.get('nombreEquipoLocal') || null
    const nombreEquipoVisitante = searchParams?.get('nombreEquipoVisitante') || null
    
    // Convertir a números
    const torneoId = torneo ? parseInt(torneo) : null
    const jornadaNum = jornada ? parseInt(jornada) : null
    const equipoLocalIdNum = equipoLocalId ? parseInt(equipoLocalId) : null
    const equipoVisitanteIdNum = equipoVisitanteId ? parseInt(equipoVisitanteId) : null
    
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

    const [jugadoresParticipantes, setJugadoresParticipantes] = useState<JugadorParticipante[]>([])
    const [isSaving, setIsSaving] = useState(false)

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

    const loadGolesExistentes = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual
            const { getEncuentrosByTorneo } = await import('../../torneos/actions')
            const encuentros = await getEncuentrosByTorneo(torneoId)
            const encuentro = encuentros.find(e => 
                e.equipo_local_id === equipoLocalIdNum && 
                e.equipo_visitante_id === equipoVisitanteIdNum && 
                e.jornada === jornadaNum
            )

            if (encuentro) {
                const golesExistentes = await getGolesEncuentro(encuentro.id)
                console.log('Goles existentes cargados:', golesExistentes)
                
                // Obtener nombres de equipos desde la BD
                const equipoLocal = equipos.find(e => e.id === equipoLocalIdNum)
                const equipoVisitante = equipos.find(e => e.id === equipoVisitanteIdNum)
                const nombreEquipoLocal = equipoLocal?.nombre || 'Equipo Local'
                const nombreEquipoVisitante = equipoVisitante?.nombre || 'Equipo Visitante'
                
                // Convertir goles de BD a formato de contexto
                const golesFormateados: Goal[] = golesExistentes.map(gol => ({
                    id: gol.id.toString(),
                    jugador: gol.jugador_id.toString(),
                    equipo: gol.equipo_id === equipoLocalIdNum ? nombreEquipoLocal : nombreEquipoVisitante,
                    minuto: gol.minuto || 0,
                    tiempo: gol.tiempo || 'primer',
                    tipo: gol.tipo || 'normal'
                }))
                
                setGoles(golesFormateados)
                console.log('Goles formateados para contexto:', golesFormateados)
            }
        } catch (err) {
            console.error('Error al cargar goles existentes:', err)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, equipos])

    const loadTarjetasExistentes = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual
            const { getEncuentrosByTorneo } = await import('../../torneos/actions')
            const encuentros = await getEncuentrosByTorneo(torneoId)
            const encuentro = encuentros.find(e => 
                e.equipo_local_id === equipoLocalIdNum && 
                e.equipo_visitante_id === equipoVisitanteIdNum && 
                e.jornada === jornadaNum
            )

            if (encuentro) {
                const tarjetasExistentes = await getTarjetasEncuentro(encuentro.id)
                console.log('Tarjetas existentes cargadas:', tarjetasExistentes)
                
                // Obtener nombres de equipos desde la BD
                const equipoLocal = equipos.find(e => e.id === equipoLocalIdNum)
                const equipoVisitante = equipos.find(e => e.id === equipoVisitanteIdNum)
                const nombreEquipoLocal = equipoLocal?.nombre || 'Equipo Local'
                const nombreEquipoVisitante = equipoVisitante?.nombre || 'Equipo Visitante'
                
                // Convertir tarjetas de BD a formato de contexto
                const tarjetasFormateadas: CardType[] = tarjetasExistentes.map(tarjeta => ({
                    id: tarjeta.id.toString(),
                    jugador: tarjeta.jugador_id.toString(),
                    equipo: tarjeta.equipo_id === equipoLocalIdNum ? nombreEquipoLocal : nombreEquipoVisitante,
                    minuto: tarjeta.minuto || 0,
                    tiempo: tarjeta.tiempo || 'primer',
                    tipo: tarjeta.tipo || 'amarilla',
                    motivo: tarjeta.motivo || ''
                }))
                
                setTarjetas(tarjetasFormateadas)
                console.log('Tarjetas formateadas para contexto:', tarjetasFormateadas)
            }
        } catch (err) {
            console.error('Error al cargar tarjetas existentes:', err)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, equipos])

    const loadJugadoresParticipantes = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual
            const { getEncuentrosByTorneo } = await import('../../torneos/actions')
            const encuentros = await getEncuentrosByTorneo(torneoId)
            const encuentro = encuentros.find(e => 
                e.equipo_local_id === equipoLocalIdNum && 
                e.equipo_visitante_id === equipoVisitanteIdNum && 
                e.jornada === jornadaNum
            )

            if (encuentro) {
                const participantes = await getJugadoresParticipantes(encuentro.id)
                setJugadoresParticipantes(participantes)

                console.log('Cargando jugadores participantes:', {
                    encuentroId: encuentro.id,
                    totalParticipantes: participantes.length,
                    participantes
                })

                // Cargar jugadores participantes en los estados locales
                const participantesLocal = participantes.filter(p => p.equipo_tipo === 'local')
                const participantesVisitante = participantes.filter(p => p.equipo_tipo === 'visitante')

                console.log('Participantes filtrados:', {
                    participantesLocal: participantesLocal.length,
                    participantesVisitante: participantesVisitante.length
                })

                const jugadoresLocal = jugadores.filter(j => 
                    participantesLocal.some(p => p.jugador_id === j.id)
                )
                const jugadoresVisitante = jugadores.filter(j => 
                    participantesVisitante.some(p => p.jugador_id === j.id)
                )

                console.log('Jugadores encontrados:', {
                    jugadoresLocal: jugadoresLocal.length,
                    jugadoresVisitante: jugadoresVisitante.length
                })

                setJugadoresParticipantesA(jugadoresLocal)
                setJugadoresParticipantesB(jugadoresVisitante)
                
                // Marcar que la carga inicial está completa
                isInitialLoad.current = false
            }
        } catch (err) {
            console.error('Error al cargar jugadores participantes:', err)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, jugadores])

    const saveJugadoresParticipantes = useCallback(async () => {
        console.log('saveJugadoresParticipantes - Inicio', {
            torneoId,
            equipoLocalIdNum,
            equipoVisitanteIdNum,
            jornadaNum,
            isSaving,
            jugadoresA: jugadoresParticipantesA.length,
            jugadoresB: jugadoresParticipantesB.length
        })

        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            console.error('Faltan parámetros para guardar:', {
                torneoId,
                equipoLocalIdNum,
                equipoVisitanteIdNum,
                jornadaNum
            })
            return
        }

        if (isSaving) {
            console.log('Ya se está guardando, saltando...')
            return
        }

        try {
            setIsSaving(true)
            
            // Obtener el encuentro actual
            const { getEncuentrosByTorneo } = await import('../../torneos/actions')
            const encuentros = await getEncuentrosByTorneo(torneoId)
            
            console.log('Encuentros encontrados:', encuentros.length)
            console.log('Buscando encuentro con:', {
                equipo_local_id: equipoLocalIdNum,
                equipo_visitante_id: equipoVisitanteIdNum,
                jornada: jornadaNum
            })
            
            const encuentro = encuentros.find(e => 
                e.equipo_local_id === equipoLocalIdNum && 
                e.equipo_visitante_id === equipoVisitanteIdNum && 
                e.jornada === jornadaNum
            )

            if (!encuentro) {
                console.error('No se encontró el encuentro!')
                console.log('Encuentros disponibles:', encuentros.map(e => ({
                    id: e.id,
                    local: e.equipo_local_id,
                    visitante: e.equipo_visitante_id,
                    jornada: e.jornada
                })))
                return
            }

            console.log('Encuentro encontrado:', encuentro.id)

            const jugadoresData: NewJugadorParticipante[] = [
                ...jugadoresParticipantesA.map(j => ({
                    encuentro_id: encuentro.id,
                    jugador_id: j.id,
                    equipo_tipo: 'local' as const
                })),
                ...jugadoresParticipantesB.map(j => ({
                    encuentro_id: encuentro.id,
                    jugador_id: j.id,
                    equipo_tipo: 'visitante' as const
                }))
            ]

            console.log('Guardando jugadores participantes:', {
                encuentroId: encuentro.id,
                jugadoresLocal: jugadoresParticipantesA.length,
                jugadoresVisitante: jugadoresParticipantesB.length,
                totalJugadores: jugadoresData.length,
                jugadoresData
            })

            const result = await saveJugadoresParticipantesAction(encuentro.id, jugadoresData)
            console.log('Resultado del guardado:', result)
            console.log('✅ Jugadores participantes guardados exitosamente')
        } catch (err) {
            console.error('❌ Error al guardar jugadores participantes:', err)
        } finally {
            setIsSaving(false)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, jugadoresParticipantesA, jugadoresParticipantesB, isSaving])

    useEffect(() => {
        loadData()
        // Debug: mostrar información de parámetros de URL
        console.log('🔍 Parámetros recibidos de la URL:', {
            torneo,
            jornada,
            equipoLocalId,
            equipoVisitanteId,
            nombreEquipoLocal,
            nombreEquipoVisitante,
            torneoIdNum: torneoId,
            jornadaNum,
            equipoLocalIdNum,
            equipoVisitanteIdNum
        })
    }, [loadData, torneo, jornada, equipoLocalId, equipoVisitanteId, nombreEquipoLocal, nombreEquipoVisitante, torneoId, jornadaNum, equipoLocalIdNum, equipoVisitanteIdNum])

    // Cargar jugadores participantes cuando cambien los parámetros del encuentro
    useEffect(() => {
        if (jugadores.length > 0) {
            loadJugadoresParticipantes()
        }
    }, [loadJugadoresParticipantes, jugadores.length])

    // Cargar goles y tarjetas existentes cuando cambien los parámetros del encuentro
    useEffect(() => {
        if (torneoId && equipoLocalIdNum && equipoVisitanteIdNum && jornadaNum && jugadores.length > 0) {
            loadGolesExistentes()
            loadTarjetasExistentes()
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, jugadores.length, loadGolesExistentes, loadTarjetasExistentes])

    // Determinar jugadores de los equipos según la URL o valores por defecto
    const jugadoresEquipoA = jugadores.filter(j => {
        if (equipoLocalIdNum && j.equipo?.id) {
            return j.equipo.id === equipoLocalIdNum
        } else if (nombreEquipoLocal && j.equipo?.nombre) {
            return j.equipo.nombre === nombreEquipoLocal
        }
        // Si no hay parámetros en la URL, intentamos buscar equipo local de la BD o fallback
        return j.equipo?.nombre === 'UDEF' || (equipos.length > 0 && j.equipo?.id === equipos[0]?.id)
    })
    
    const jugadoresEquipoB = jugadores.filter(j => {
        if (equipoVisitanteIdNum && j.equipo?.id) {
            return j.equipo.id === equipoVisitanteIdNum
        } else if (nombreEquipoVisitante && j.equipo?.nombre) {
            return j.equipo.nombre === nombreEquipoVisitante
        }
        // Si no hay parámetros en la URL, intentamos buscar equipo visitante de la BD o fallback
        return j.equipo?.nombre === '9 Octubre' || (equipos.length > 1 && j.equipo?.id === equipos[1]?.id)
    })

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
        const jugadorIdStr = jugador.id.toString()
        const tarjetasJugador = tarjetas.filter(t => t.jugador === jugadorIdStr)
        const amarillas = tarjetasJugador.filter(t => t.tipo === 'amarilla').length
        const rojas = tarjetasJugador.filter(t => t.tipo === 'roja').length
        
        // Agregar la tarjeta solicitada
        const newCard: CardType = {
            id: Date.now().toString(),
            jugador: jugador.id.toString(),
            equipo: jugador.equipo?.nombre || '',
            tipo,
            minuto: 0,
            tiempo: 'primer',
            motivo: 'Sanción rápida'
        }
        
        let nuevasTarjetas = [...tarjetas, newCard]
        
        // Si se está agregando una amarilla y ya tiene 1 amarilla, agregar también una roja por doble amarilla
        if (tipo === 'amarilla' && amarillas === 1) {
            const rojaDobleAmarilla: CardType = {
                id: (Date.now() + 1).toString(),
                jugador: jugador.id.toString(),
                equipo: jugador.equipo?.nombre || '',
                tipo: 'roja',
                minuto: 0,
                tiempo: 'primer',
                motivo: 'Doble amarilla (expulsión automática)'
            }
            nuevasTarjetas = [...nuevasTarjetas, rojaDobleAmarilla]
        }
        
        setTarjetas(nuevasTarjetas)
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
        nombreEquipoA: nombreEquipoLocal || 'Equipo A',
        nombreEquipoB: nombreEquipoVisitante || 'Equipo B',
        torneoId,
        equipoLocalId: equipoLocalIdNum,
        equipoVisitanteId: equipoVisitanteIdNum,
        jornada: jornadaNum,
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
        jugadoresParticipantes,
        setJugadoresParticipantes,
        isSaving,
        loadData,
        loadJugadoresParticipantes,
        saveJugadoresParticipantes,
        loadGolesExistentes,
        loadTarjetasExistentes,
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
