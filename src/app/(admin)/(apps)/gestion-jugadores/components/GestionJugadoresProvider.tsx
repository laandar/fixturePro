'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Modal, Button, Form, Row, Col } from 'react-bootstrap'
import { GestionJugadoresContext, type GestionJugadoresState } from './GestionJugadoresContext'
import { getJugadores } from '../../jugadores/actions'
import { getEquipos } from '../../equipos/actions'
import { getCategorias } from '../../categorias/actions'
import { getJugadoresParticipantes, saveJugadoresParticipantes as saveJugadoresParticipantesAction, getGolesEncuentro, getTarjetasEncuentro, saveCambiosEncuentro, saveCambioJugador as saveCambioJugadorAction, getCambiosEncuentro, realizarCambioJugadorCompleto as realizarCambioJugadorCompletoAction, deshacerCambioJugador as deshacerCambioJugadorAction, designarCapitan } from '../actions'
import type { JugadorWithEquipo, Equipo, Categoria, PlayerChange, CardType, Goal, Signature, JugadorParticipante, NewJugadorParticipante, NewCambioJugador } from '@/db/types'

export const GestionJugadoresProvider = ({ children }: { children: React.ReactNode }) => {
    const isInitialLoad = useRef(true)
    const searchParams = useSearchParams()
    
    // Intentar obtener parámetros del localStorage primero, luego de la URL como fallback
    const getParamFromStorageOrURL = (key: string) => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`gestion-jugadores-${key}`)
            if (stored) return stored
        }
        return searchParams?.get(key) || null
    }
    
    const torneo = getParamFromStorageOrURL('torneo')
    const jornada = getParamFromStorageOrURL('jornada')
    const equipoLocalId = getParamFromStorageOrURL('equipoLocalId')
    const equipoVisitanteId = getParamFromStorageOrURL('equipoVisitanteId')
    const nombreEquipoLocal = getParamFromStorageOrURL('nombreEquipoLocal')
    const nombreEquipoVisitante = getParamFromStorageOrURL('nombreEquipoVisitante')
    
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

    const [tarjetas, setTarjetas] = useState<CardType[]>([])
    const [showTarjetaModal, setShowTarjetaModal] = useState(false)
    const [nuevaTarjeta, setNuevaTarjeta] = useState<Partial<CardType>>({})

    const [goles, setGoles] = useState<Goal[]>([])
    const [showGolModal, setShowGolModal] = useState(false)
    const [nuevoGol, setNuevoGol] = useState<Partial<Goal>>({})

    const [firmas, setFirmas] = useState<Signature>({ 
        vocalNombre: '', 
        vocalFirma: '', 
        vocalInforme: '',
        arbitroNombre: '', 
        arbitroFirma: '', 
        arbitroInforme: '',
        capitanLocalNombre: '', 
        capitanLocalFirma: '', 
        capitanVisitanteNombre: '', 
        capitanVisitanteFirma: '', 
        fechaFirma: '' 
    })

    const [jugadoresParticipantes, setJugadoresParticipantes] = useState<JugadorParticipante[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [cambiosJugadores, setCambiosJugadores] = useState<Array<{id?: number, sale: JugadorWithEquipo, entra: JugadorWithEquipo, timestamp: Date, equipo: 'A' | 'B'}>>([])
    const [estadoEncuentro, setEstadoEncuentro] = useState<string | null>(null)
    
    // Verificar si el usuario es administrador (por ahora hardcodeado)
    const isAdmin = false; // TODO: Implementar sistema de roles y usuarios

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

    const loadEstadoEncuentro = useCallback(async () => {
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
                setEstadoEncuentro(encuentro.estado)
            }
        } catch (err) {
            console.error('Error al cargar estado del encuentro:', err)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum])

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
                    minuto: 0, // Ya no se almacena en BD
                    tiempo: 'primer', // Ya no se almacena en BD
                    tipo: tarjeta.tipo,
                    motivo: '' // Ya no se almacena en BD
                }))
                
                setTarjetas(tarjetasFormateadas)
                console.log('Tarjetas formateadas para contexto:', tarjetasFormateadas)
            }
        } catch (err) {
            console.error('Error al cargar tarjetas existentes:', err)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, equipos])

    const loadFirmasExistentes = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual
            const { getEncuentrosByTorneo } = await import('../../torneos/actions')
            const { getFirmasEncuentro } = await import('../actions')
            const encuentros = await getEncuentrosByTorneo(torneoId)
            const encuentro = encuentros.find(e => 
                e.equipo_local_id === equipoLocalIdNum && 
                e.equipo_visitante_id === equipoVisitanteIdNum && 
                e.jornada === jornadaNum
            )

            if (encuentro) {
                const firmasExistentes = await getFirmasEncuentro(encuentro.id)
                
                if (firmasExistentes) {
                    setFirmas({
                        vocalNombre: firmasExistentes.vocal_nombre || '',
                        vocalFirma: firmasExistentes.vocal_firma || '',
                        vocalInforme: firmasExistentes.vocal_informe || '',
                        arbitroNombre: firmasExistentes.arbitro_nombre || '',
                        arbitroFirma: firmasExistentes.arbitro_firma || '',
                        arbitroInforme: firmasExistentes.arbitro_informe || '',
                        capitanLocalNombre: firmasExistentes.capitan_local_nombre || '',
                        capitanLocalFirma: firmasExistentes.capitan_local_firma || '',
                        capitanVisitanteNombre: firmasExistentes.capitan_visitante_nombre || '',
                        capitanVisitanteFirma: firmasExistentes.capitan_visitante_firma || '',
                        fechaFirma: firmasExistentes.fecha_firma ? new Date(firmasExistentes.fecha_firma).toISOString().split('T')[0] : ''
                    })
                }
            }
        } catch (err) {
            // Error silencioso
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum])

    const loadCambiosJugadores = useCallback(async () => {
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

            if (!encuentro) {
                console.log('No se encontró el encuentro para cargar cambios')
                return
            }

            console.log('Cargando cambios de jugadores para encuentro:', encuentro.id)
            const cambiosBD = await getCambiosEncuentro(encuentro.id)
            console.log('Cambios encontrados en BD:', cambiosBD)

            if (cambiosBD.length === 0) {
                console.log('No hay cambios de jugadores en la BD')
                return
            }

            // Convertir cambios de BD a formato del contexto
            const cambiosFormateados = cambiosBD.map(cambio => {
                // Buscar los jugadores en la lista de jugadores cargados
                const jugadorSale = jugadores.find(j => j.id === cambio.jugador_sale_id)
                const jugadorEntra = jugadores.find(j => j.id === cambio.jugador_entra_id)
                
                if (!jugadorSale || !jugadorEntra) {
                    console.warn('No se encontraron jugadores para el cambio:', cambio)
                    return null
                }

                // Determinar el equipo basado en el equipo_id del cambio
                const equipo = cambio.equipo_id === equipoLocalIdNum ? 'A' : 'B'

                return {
                    id: cambio.id,
                    sale: jugadorSale,
                    entra: jugadorEntra,
                    timestamp: new Date(cambio.createdAt || Date.now()),
                    equipo: equipo as 'A' | 'B'
                }
            }).filter(Boolean) // Filtrar cambios nulos

            console.log('Cambios formateados para contexto:', cambiosFormateados)
            setCambiosJugadores(cambiosFormateados.filter((cambio): cambio is NonNullable<typeof cambio> => cambio !== null))
        } catch (err) {
            console.error('❌ Error al cargar cambios de jugadores:', err)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, jugadores])

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

    // Cargar goles, tarjetas y cambios existentes cuando cambien los parámetros del encuentro
    useEffect(() => {
        if (torneoId && equipoLocalIdNum && equipoVisitanteIdNum && jornadaNum && jugadores.length > 0) {
            loadGolesExistentes()
            loadTarjetasExistentes()
            loadCambiosJugadores()
            loadEstadoEncuentro()
            loadFirmasExistentes()
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, jugadores.length, loadGolesExistentes, loadTarjetasExistentes, loadCambiosJugadores, loadEstadoEncuentro, loadFirmasExistentes])

    // Polling para verificar cambios en el estado del encuentro cada 5 segundos
    // useEffect para polling del estado del encuentro - DESHABILITADO temporalmente
    // useEffect(() => {
    //     if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
    //         return
    //     }

    //     const interval = setInterval(() => {
    //         loadEstadoEncuentro()
    //     }, 5000) // Verificar cada 5 segundos

    //     return () => clearInterval(interval)
    // }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, loadEstadoEncuentro])

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

    const saveCambiosJugadores = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            console.error('Faltan parámetros para guardar cambios:', {
                torneoId,
                equipoLocalIdNum,
                equipoVisitanteIdNum,
                jornadaNum
            })
            return
        }

        if (cambiosJugadores.length === 0) {
            console.log('No hay cambios de jugadores para guardar')
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

            if (!encuentro) {
                console.error('No se encontró el encuentro para guardar cambios!')
                return
            }

            console.log('Guardando cambios de jugadores:', {
                encuentroId: encuentro.id,
                totalCambios: cambiosJugadores.length,
                cambiosJugadores
            })

            // Convertir cambios a formato de BD
            const cambiosData: NewCambioJugador[] = cambiosJugadores.map(cambio => ({
                encuentro_id: encuentro.id,
                jugador_sale_id: cambio.sale.id,
                jugador_entra_id: cambio.entra.id,
                equipo_id: cambio.equipo === 'A' ? equipoLocalIdNum! : equipoVisitanteIdNum!,
                minuto: 0, // Por ahora 0, se puede agregar un campo de minuto en el futuro
                tiempo: 'primer' as const
            }))

            const result = await saveCambiosEncuentro(encuentro.id, cambiosData)
            console.log('✅ Cambios de jugadores guardados exitosamente:', result)
        } catch (err) {
            console.error('❌ Error al guardar cambios de jugadores:', err)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, cambiosJugadores])

    const addCambioJugador = useCallback((cambio: {sale: JugadorWithEquipo, entra: JugadorWithEquipo, equipo: 'A' | 'B', id?: number}) => {
        const changeRecord = {
            ...cambio,
            timestamp: new Date()
        };
        setCambiosJugadores(prev => [...prev, changeRecord]);
    }, [])

    const handlePlayerChange = useCallback(async (jugadorSale: JugadorWithEquipo, jugadorEntra: JugadorWithEquipo, equipo: 'A' | 'B', cambioId?: number) => {
        console.log('Realizando cambio de jugador:', {
            jugadorSale: jugadorSale.apellido_nombre,
            jugadorEntra: jugadorEntra.apellido_nombre,
            equipo
        });

        // Registrar el cambio con ID si está disponible
        addCambioJugador({ sale: jugadorSale, entra: jugadorEntra, equipo, id: cambioId });

        // Recargar jugadores participantes desde la base de datos para reflejar el cambio
        try {
            await loadJugadoresParticipantes();
            console.log('✅ Jugadores participantes recargados correctamente después del cambio');
        } catch (err) {
            console.error('❌ Error al recargar jugadores participantes después del cambio:', err);
        }
    }, [addCambioJugador, loadJugadoresParticipantes])

    const realizarCambioJugadorCompleto = useCallback(async (cambio: {sale: JugadorWithEquipo, entra: JugadorWithEquipo, equipo: 'A' | 'B'}) => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            console.error('Faltan parámetros para realizar cambio completo:', {
                torneoId,
                equipoLocalIdNum,
                equipoVisitanteIdNum,
                jornadaNum
            })
            return
        }
        try {
            const { getEncuentrosByTorneo } = await import('../../torneos/actions')
            const encuentros = await getEncuentrosByTorneo(torneoId)
            const encuentro = encuentros.find(e => 
                e.equipo_local_id === equipoLocalIdNum && 
                e.equipo_visitante_id === equipoVisitanteIdNum && 
                e.jornada === jornadaNum
            )
            if (!encuentro) {
                console.error('No se encontró el encuentro para realizar cambio completo!')
                return
            }
            console.log('Realizando cambio completo de jugador:', {
                encuentroId: encuentro.id,
                jugadorSale: cambio.sale.apellido_nombre,
                jugadorEntra: cambio.entra.apellido_nombre,
                equipo: cambio.equipo
            })
            
            const cambioData: NewCambioJugador = {
                encuentro_id: encuentro.id,
                jugador_sale_id: cambio.sale.id,
                jugador_entra_id: cambio.entra.id,
                equipo_id: cambio.equipo === 'A' ? equipoLocalIdNum! : equipoVisitanteIdNum!,
                minuto: 0,
                tiempo: 'primer' as const
            }
            
            const jugadorEntraData: NewJugadorParticipante = {
                encuentro_id: encuentro.id,
                jugador_id: cambio.entra.id,
                equipo_tipo: cambio.equipo === 'A' ? 'local' : 'visitante'
            }
            
            const result = await realizarCambioJugadorCompletoAction(cambioData, jugadorEntraData)
            console.log('✅ Cambio completo de jugador realizado exitosamente:', result)
            return result; // Return the result to get the ID
        } catch (err) {
            console.error('❌ Error al realizar cambio completo de jugador:', err)
            throw err; // Re-throw to handle in the calling function
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum])

    const deshacerCambioJugador = useCallback(async (cambioId: number, jugadorEntraId: number, encuentroId: number) => {
        try {
            console.log('Deshaciendo cambio de jugador:', {
                cambioId,
                jugadorEntraId,
                encuentroId
            })
            
            const result = await deshacerCambioJugadorAction(cambioId, jugadorEntraId, encuentroId)
            console.log('✅ Cambio de jugador deshecho exitosamente:', result)
            
            // Actualizar estado local sin recargar toda la pantalla
            // 1. Remover el cambio de la lista local
            setCambiosJugadores(prev => prev.filter(cambio => cambio.id !== cambioId))
            
            // 2. Remover el jugador que entra de la lista de participantes
            setJugadoresParticipantesA(prev => prev.filter(jugador => jugador.id !== jugadorEntraId))
            setJugadoresParticipantesB(prev => prev.filter(jugador => jugador.id !== jugadorEntraId))
            
        } catch (err) {
            console.error('❌ Error al deshacer cambio de jugador:', err)
        }
    }, [])

    const handleSaveFirmas = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return { success: false, error: 'Faltan parámetros del encuentro' }
        }

        try {
            setIsSaving(true)
            
            // Obtener el encuentro actual
            const { getEncuentrosByTorneo } = await import('../../torneos/actions')
            const { saveFirmasEncuentro } = await import('../actions')
            const encuentros = await getEncuentrosByTorneo(torneoId)
            const encuentro = encuentros.find(e => 
                e.equipo_local_id === equipoLocalIdNum && 
                e.equipo_visitante_id === equipoVisitanteIdNum && 
                e.jornada === jornadaNum
            )

            if (!encuentro) {
                return { success: false, error: 'No se encontró el encuentro' }
            }

            // Preparar datos de firmas para guardar
            const firmasData = {
                encuentro_id: encuentro.id,
                vocal_nombre: firmas.vocalNombre,
                vocal_firma: firmas.vocalFirma,
                vocal_informe: firmas.vocalInforme,
                arbitro_nombre: firmas.arbitroNombre,
                arbitro_firma: firmas.arbitroFirma,
                arbitro_informe: firmas.arbitroInforme,
                capitan_local_nombre: firmas.capitanLocalNombre,
                capitan_local_firma: firmas.capitanLocalFirma,
                capitan_visitante_nombre: firmas.capitanVisitanteNombre,
                capitan_visitante_firma: firmas.capitanVisitanteFirma,
                fecha_firma: new Date() // Fecha actual del sistema
            }

            const result = await saveFirmasEncuentro(firmasData)
            
            if (result.success) {
                return { success: true }
            } else {
                return { success: false, error: 'Error al guardar firmas' }
            }
        } catch (err) {
            return { success: false, error: 'Error al guardar firmas' }
        } finally {
            setIsSaving(false)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, firmas])

    const handleDesignarCapitan = useCallback(async (jugador: JugadorWithEquipo, equipo: 'A' | 'B') => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return { success: false, error: 'Faltan parámetros del encuentro' }
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

            if (!encuentro) {
                return { success: false, error: 'No se encontró el encuentro' }
            }

            // Determinar el tipo de equipo
            const equipoTipo: 'local' | 'visitante' = equipo === 'A' ? 'local' : 'visitante'

            const result = await designarCapitan(encuentro.id, jugador.id, equipoTipo)
            
            if (result.success) {
                // Recargar los jugadores participantes para actualizar la UI
                await loadJugadoresParticipantes()
                return { success: true }
            } else {
                return { success: false, error: result.error || 'Error al designar capitán' }
            }
        } catch (err) {
            return { success: false, error: 'Error al designar capitán' }
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, loadJugadoresParticipantes])

    const saveCambioJugador = useCallback(async (cambio: {sale: JugadorWithEquipo, entra: JugadorWithEquipo, equipo: 'A' | 'B'}) => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            console.error('Faltan parámetros para guardar cambio:', {
                torneoId,
                equipoLocalIdNum,
                equipoVisitanteIdNum,
                jornadaNum
            })
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

            if (!encuentro) {
                console.error('No se encontró el encuentro para guardar cambio!')
                return
            }

            console.log('Guardando cambio de jugador:', {
                encuentroId: encuentro.id,
                jugadorSale: cambio.sale.apellido_nombre,
                jugadorEntra: cambio.entra.apellido_nombre,
                equipo: cambio.equipo
            })

            // Convertir cambio a formato de BD
            const cambioData: NewCambioJugador = {
                encuentro_id: encuentro.id,
                jugador_sale_id: cambio.sale.id,
                jugador_entra_id: cambio.entra.id,
                equipo_id: cambio.equipo === 'A' ? equipoLocalIdNum! : equipoVisitanteIdNum!,
                minuto: 0, // Por ahora 0, se puede agregar un campo de minuto en el futuro
                tiempo: 'primer' as const
            }

            const result = await saveCambioJugadorAction(cambioData)
            console.log('✅ Cambio de jugador guardado exitosamente:', result)
        } catch (err) {
            console.error('❌ Error al guardar cambio de jugador:', err)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum])

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
        estadoEncuentro,
        isAdmin,
        showSelectionModalA,
        setShowSelectionModalA,
        showSelectionModalB,
        setShowSelectionModalB,
        cambios,
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
        handleSaveFirmas,
        jugadoresParticipantes,
        setJugadoresParticipantes,
        isSaving,
        loadData,
        loadJugadoresParticipantes,
        saveJugadoresParticipantes,
        loadGolesExistentes,
        loadTarjetasExistentes,
        loadEstadoEncuentro,
        handleTogglePlayerSelection,
        handleSelectAllPlayers,
        handleClearAllPlayers,
        handleDeleteCambio,
        handleAddTarjeta,
        handleDeleteTarjeta,
        handleQuickSanction,
        handleDesignarCapitan,
        handleAddGol,
        handleDeleteGol,
        handleQuickGoal,
        saveCambiosJugadores,
        saveCambioJugador,
        realizarCambioJugadorCompleto,
        addCambioJugador,
        loadCambiosJugadores,
        handlePlayerChange,
        deshacerCambioJugador,
        cambiosJugadores,
        setCambiosJugadores,
    }


    return (
        <GestionJugadoresContext.Provider value={value}>
            {children}
        </GestionJugadoresContext.Provider>
    )
}
