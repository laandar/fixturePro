'use client'
import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { GestionJugadoresContext, type GestionJugadoresState } from './GestionJugadoresContext'
import { getJugadoresActivosByEquipos } from '../../jugadores/actions'
import { getJugadoresParticipantes, saveJugadoresParticipantes as saveJugadoresParticipantesAction, getGolesEncuentro, getTarjetasEncuentro, saveCambiosEncuentro, saveCambioJugador as saveCambioJugadorAction, getCambiosEncuentro, realizarCambioJugadorCompleto as realizarCambioJugadorCompletoAction, deshacerCambioJugador as deshacerCambioJugadorAction, designarCapitan, saveGol, deleteGol, saveTarjeta, deleteTarjeta, getSaldosEquiposHastaJornada, registrarPagoMulta, getCargosManualesPorJornada, getDetalleValoresEquiposHastaJornada, getEncuentroById } from '../actions'
import type { JugadorWithEquipo, CardType, Goal, Signature, JugadorParticipante, NewJugadorParticipante, NewCambioJugador } from '@/db/types'
import { useAuth } from '@/hooks/useAuth'

const GestionJugadoresProviderInner = ({ children }: { children: React.ReactNode }) => {
    const isInitialLoad = useRef(true)
    const searchParams = useSearchParams()
    
    // Refs para rastrear qué se ha cargado y evitar ejecuciones múltiples
    const datosCargadosRef = useRef<string>('')
    const jugadoresParticipantesCargadosRef = useRef<string>('')
    const datosEncuentroCargadosRef = useRef<string>('')
    const saldosCargadosRef = useRef<string>('')
    const cargosCargadosRef = useRef<string>('')
    const detalleCargadoRef = useRef<string>('')
    const isLoadingRef = useRef<boolean>(false)
    const timeoutRefs = useRef<Record<string, NodeJS.Timeout | null>>({})
    
    // Estabilizar parámetros de búsqueda para evitar re-renders innecesarios
    const paramsKey = useMemo(() => {
        return searchParams?.toString() || ''
    }, [searchParams])
    
    // Estado para almacenar el encuentro cargado desde la BD
    const [encuentroData, setEncuentroData] = useState<{
        torneoId: number | null
        jornadaNum: number | null
        equipoLocalIdNum: number | null
        equipoVisitanteIdNum: number | null
        encuentroIdNum: number | null
        categoriaIdNum: number | null
        nombreEquipoLocal: string | null
        nombreEquipoVisitante: string | null
        estado: string | null
    } | null>(null)
    
    // Obtener encuentro desde la BD usando el encuentroId de query params
    useEffect(() => {
        const loadEncuentro = async () => {
            const encuentroId = searchParams?.get('encuentroId')
            if (!encuentroId) {
                return
            }
            
            try {
                const encuentro = await getEncuentroById(parseInt(encuentroId))
                if (encuentro) {
                    setEncuentroData({
                        torneoId: encuentro.torneo_id || null,
                        jornadaNum: encuentro.jornada || null,
                        equipoLocalIdNum: encuentro.equipo_local_id || null,
                        equipoVisitanteIdNum: encuentro.equipo_visitante_id || null,
                        encuentroIdNum: encuentro.id || null,
                        categoriaIdNum: encuentro.torneo?.categoria_id || null,
                        nombreEquipoLocal: encuentro.equipoLocal?.nombre || null,
                        nombreEquipoVisitante: encuentro.equipoVisitante?.nombre || null,
                        estado: encuentro.estado || null
                    })
                    
                    // Actualizar el estado del encuentro si está disponible
                    if (encuentro.estado) {
                        setEstadoEncuentro(encuentro.estado)
                    }
                }
            } catch (error) {
                console.error('Error al cargar encuentro desde BD:', error)
            }
        }
        
        loadEncuentro()
    }, [searchParams])
    
    // Usar datos del encuentro o valores por defecto
    const params = useMemo(() => {
        if (!encuentroData) {
            return {
                torneo: null,
                jornada: null,
                equipoLocalId: null,
                equipoVisitanteId: null,
                nombreEquipoLocal: null,
                nombreEquipoVisitante: null,
                encuentroId: null,
                categoriaId: null,
                torneoId: null,
                jornadaNum: null,
                equipoLocalIdNum: null,
                equipoVisitanteIdNum: null,
                encuentroIdNum: null,
                categoriaIdNum: null
            }
        }
        
        return {
            torneo: encuentroData.torneoId?.toString() || null,
            jornada: encuentroData.jornadaNum?.toString() || null,
            equipoLocalId: encuentroData.equipoLocalIdNum?.toString() || null,
            equipoVisitanteId: encuentroData.equipoVisitanteIdNum?.toString() || null,
            nombreEquipoLocal: encuentroData.nombreEquipoLocal || null,
            nombreEquipoVisitante: encuentroData.nombreEquipoVisitante || null,
            encuentroId: encuentroData.encuentroIdNum?.toString() || null,
            categoriaId: encuentroData.categoriaIdNum?.toString() || null,
            torneoId: encuentroData.torneoId || null,
            jornadaNum: encuentroData.jornadaNum || null,
            equipoLocalIdNum: encuentroData.equipoLocalIdNum || null,
            equipoVisitanteIdNum: encuentroData.equipoVisitanteIdNum || null,
            encuentroIdNum: encuentroData.encuentroIdNum || null,
            categoriaIdNum: encuentroData.categoriaIdNum || null
        }
    }, [encuentroData])
    
    const {
        torneo,
        jornada,
        equipoLocalId,
        equipoVisitanteId,
        nombreEquipoLocal,
        nombreEquipoVisitante,
        encuentroId,
        categoriaId,
        torneoId,
        jornadaNum,
        equipoLocalIdNum,
        equipoVisitanteIdNum,
        encuentroIdNum,
        categoriaIdNum
    } = params
    
    // Helper para obtener el encuentro actual desde la BD usando el encuentroId
    const getEncuentroActual = useCallback(async () => {
        if (!encuentroIdNum) {
            return null
        }
        
        try {
            // Consultar la BD directamente usando el encuentroId
            const encuentro = await getEncuentroById(encuentroIdNum)
            return encuentro
        } catch (error) {
            console.error('Error al obtener encuentro actual:', error)
            return null
        }
    }, [encuentroIdNum])
    
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [jugadores, setJugadores] = useState<JugadorWithEquipo[]>([])

    const [jugadoresParticipantesA, setJugadoresParticipantesA] = useState<JugadorWithEquipo[]>([])
    const [jugadoresParticipantesB, setJugadoresParticipantesB] = useState<JugadorWithEquipo[]>([])

    const [showSelectionModalA, setShowSelectionModalA] = useState(false)
    const [showSelectionModalB, setShowSelectionModalB] = useState(false)


    const [tarjetas, setTarjetas] = useState<CardType[]>([])
    const [showTarjetaModal, setShowTarjetaModal] = useState(false)
    const [nuevaTarjeta, setNuevaTarjeta] = useState<Partial<CardType>>({})
    const [saldoLocalCents, setSaldoLocalCents] = useState<number>(0)
    const [saldoVisitanteCents, setSaldoVisitanteCents] = useState<number>(0)
    const [cargosManuales, setCargosManuales] = useState<Array<{equipo_id:number,monto_centavos:number,descripcion:string|null}>>([])
    const [detalleValores, setDetalleValores] = useState<any>(null)

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
    const [torneoCategoriaId, setTorneoCategoriaId] = useState<number | null>(null)
    
    // Usar el hook useAuth para obtener información del usuario actual
    const { isAdmin } = useAuth()

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            
            // Obtener categoria_id del torneo desde query params (sin consulta a BD)
            let torneoCategoriaIdValue: number | null = categoriaIdNum
            if (torneoCategoriaIdValue) {
                setTorneoCategoriaId(torneoCategoriaIdValue)
            }
            
            // Obtener jugadores solo de los equipos participantes del encuentro (optimizado)
            let jugadoresData: JugadorWithEquipo[] = []
            if (equipoLocalIdNum && equipoVisitanteIdNum) {
                // Obtener jugadores de ambos equipos participantes
                jugadoresData = await getJugadoresActivosByEquipos(
                    [equipoLocalIdNum, equipoVisitanteIdNum],
                    torneoCategoriaIdValue || undefined
                )
            }
            // Si no hay equipos, jugadoresData queda vacío (sin fallback)
            
            // Los jugadores ya están filtrados por equipos y categoría, no necesitamos filtrar nuevamente
            const jugadoresFiltrados = jugadoresData
            
            setJugadores(jugadoresFiltrados)
        } catch (err) {
            setError('Failed to load data')
        } finally {
            setLoading(false)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, categoriaIdNum])


    const loadGolesExistentes = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()

            if (encuentro) {
                const golesExistentes = await getGolesEncuentro(encuentro.id)
                console.log('Goles existentes cargados:', golesExistentes)
                
                // Usar nombres de equipos desde localStorage/parámetros (ya disponibles)
                const nombreLocal = nombreEquipoLocal || 'Equipo Local'
                const nombreVisitante = nombreEquipoVisitante || 'Equipo Visitante'
                
                // Convertir goles de BD a formato de contexto
                const golesFormateados: Goal[] = golesExistentes.map(gol => ({
                    id: gol.id.toString(),
                    jugador: gol.jugador_id.toString(),
                    equipo: gol.equipo_id === equipoLocalIdNum ? nombreLocal : nombreVisitante,
                    minuto: gol.minuto || 0,
                    tiempo: gol.tiempo || 'primer',
                    tipo: gol.tipo || 'normal'
                }))
                
                setGoles(golesFormateados)
            }
        } catch (err) {
            console.error('Error al cargar goles existentes:', err)
        }
    }, [getEncuentroActual, equipoLocalIdNum, equipoVisitanteIdNum, nombreEquipoLocal, nombreEquipoVisitante])

    const loadTarjetasExistentes = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()

            if (encuentro) {
                const tarjetasExistentes = await getTarjetasEncuentro(encuentro.id)
                
                // Usar nombres de equipos desde localStorage/parámetros (ya disponibles)
                const nombreLocal = nombreEquipoLocal || 'Equipo Local'
                const nombreVisitante = nombreEquipoVisitante || 'Equipo Visitante'
                
                // Convertir tarjetas de BD a formato de contexto
                const tarjetasFormateadas: CardType[] = tarjetasExistentes.map(tarjeta => ({
                    id: tarjeta.id.toString(),
                    jugador: tarjeta.jugador_id.toString(),
                    equipo: tarjeta.equipo_id === equipoLocalIdNum ? nombreLocal : nombreVisitante,
                    minuto: 0, // Ya no se almacena en BD
                    tiempo: 'primer', // Ya no se almacena en BD
                    tipo: tarjeta.tipo,
                    motivo: '' // Ya no se almacena en BD
                }))
                
                setTarjetas(tarjetasFormateadas)
            }
        } catch (err) {
            console.error('Error al cargar tarjetas existentes:', err)
        }
    }, [getEncuentroActual, equipoLocalIdNum, equipoVisitanteIdNum, nombreEquipoLocal, nombreEquipoVisitante])

    const reloadSaldos = useCallback(async () => {
        try {
            if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) return
            const { localCents, visitanteCents } = await getSaldosEquiposHastaJornada(torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum)
            setSaldoLocalCents(localCents)
            setSaldoVisitanteCents(visitanteCents)
        } catch (e) {
            // silencioso
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum])

    useEffect(() => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        const key = `saldos-${torneoId}-${equipoLocalIdNum}-${equipoVisitanteIdNum}-${jornadaNum}`
        
        // Si ya se cargaron, no hacer nada
        if (saldosCargadosRef.current === key) {
            return
        }

        // Cancelar timeout anterior si existe
        const timeoutKey = 'saldos'
        if (timeoutRefs.current[timeoutKey]) {
            clearTimeout(timeoutRefs.current[timeoutKey])
        }

        const loadData = async () => {
            try {
                await reloadSaldos()
                saldosCargadosRef.current = key
            } catch (err) {
                console.error('Error al cargar saldos:', err)
            }
        }

        // Debounce para evitar ejecuciones múltiples
        timeoutRefs.current[timeoutKey] = setTimeout(() => {
            loadData()
        }, 300)

        return () => {
            if (timeoutRefs.current[timeoutKey]) {
                clearTimeout(timeoutRefs.current[timeoutKey])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum])

    useEffect(() => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        const key = `cargos-${torneoId}-${equipoLocalIdNum}-${equipoVisitanteIdNum}-${jornadaNum}`
        
        // Si ya se cargaron, no hacer nada
        if (cargosCargadosRef.current === key) {
            return
        }

        // Cancelar timeout anterior si existe
        const timeoutKey = 'cargos'
        if (timeoutRefs.current[timeoutKey]) {
            clearTimeout(timeoutRefs.current[timeoutKey])
        }

        const loadCargos = async () => {
            try {
                const rows = await getCargosManualesPorJornada(torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum)
                setCargosManuales(rows as any)
                cargosCargadosRef.current = key
            } catch (err) {
                console.error('Error al cargar cargos:', err)
            }
        }

        // Debounce para evitar ejecuciones múltiples
        timeoutRefs.current[timeoutKey] = setTimeout(() => {
            loadCargos()
        }, 300)

        return () => {
            if (timeoutRefs.current[timeoutKey]) {
                clearTimeout(timeoutRefs.current[timeoutKey])
            }
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum])

    useEffect(() => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        const key = `detalle-${torneoId}-${equipoLocalIdNum}-${equipoVisitanteIdNum}-${jornadaNum}-${tarjetas.length}`
        
        // Si ya se cargaron, no hacer nada
        if (detalleCargadoRef.current === key) {
            return
        }

        // Cancelar timeout anterior si existe
        const timeoutKey = 'detalle'
        if (timeoutRefs.current[timeoutKey]) {
            clearTimeout(timeoutRefs.current[timeoutKey])
        }

        const loadDetalle = async () => {
            try {
                const det = await getDetalleValoresEquiposHastaJornada(torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum)
                setDetalleValores(det)
                detalleCargadoRef.current = key
            } catch (err) {
                console.error('Error al cargar detalle:', err)
            }
        }

        // Debounce para evitar ejecuciones múltiples
        timeoutRefs.current[timeoutKey] = setTimeout(() => {
            loadDetalle()
        }, 300)

        return () => {
            if (timeoutRefs.current[timeoutKey]) {
                clearTimeout(timeoutRefs.current[timeoutKey])
            }
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, tarjetas.length])

    const loadFirmasExistentes = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual usando el helper con caché
            const { getFirmasEncuentro } = await import('../actions')
            const encuentro = await getEncuentroActual()

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
    }, [getEncuentroActual])

    const loadCambiosJugadores = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()

            if (!encuentro) {
                return
            }

            const cambiosBD = await getCambiosEncuentro(encuentro.id)

            if (cambiosBD.length === 0) {
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
    }, [getEncuentroActual, jugadores])

    const loadJugadoresParticipantes = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()

            if (encuentro) {
                const participantes = await getJugadoresParticipantes(encuentro.id)
                setJugadoresParticipantes(participantes)

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
    }, [getEncuentroActual, jugadores])

    const saveJugadoresParticipantes = useCallback(async () => {
        
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        if (isSaving) {
            return
        }

        try {
            setIsSaving(true)
            
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()

            if (!encuentro) {
                return
            }

            

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

           

            const result = await saveJugadoresParticipantesAction(encuentro.id, jugadoresData)
        } catch (err) {
            console.error('❌ Error al guardar jugadores participantes:', err)
        } finally {
            setIsSaving(false)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, jugadoresParticipantesA, jugadoresParticipantesB, isSaving])

    // Cargar datos iniciales solo cuando cambien los parámetros esenciales
    useEffect(() => {
        if (isInitialLoad.current) {
            isInitialLoad.current = false
        }
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [torneoId])

    // Cargar jugadores participantes cuando cambien los parámetros del encuentro
    useEffect(() => {
        if (!jugadores.length || !torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        const key = `jugadores-participantes-${torneoId}-${equipoLocalIdNum}-${equipoVisitanteIdNum}-${jornadaNum}-${jugadores.length}`
        
        // Si ya se cargaron, no hacer nada
        if (jugadoresParticipantesCargadosRef.current === key) {
            return
        }

        // Cancelar timeout anterior si existe
        const timeoutKey = 'jugadores-participantes'
        if (timeoutRefs.current[timeoutKey]) {
            clearTimeout(timeoutRefs.current[timeoutKey])
        }

        // Si ya está cargando, no hacer nada
        if (isLoadingRef.current) {
            return
        }

        const loadData = async () => {
            isLoadingRef.current = true
            try {
                await loadJugadoresParticipantes()
                jugadoresParticipantesCargadosRef.current = key
            } catch (err) {
                console.error('Error al cargar jugadores participantes:', err)
            } finally {
                isLoadingRef.current = false
            }
        }

        // Debounce para evitar ejecuciones múltiples
        timeoutRefs.current[timeoutKey] = setTimeout(() => {
            loadData()
        }, 300)

        return () => {
            if (timeoutRefs.current[timeoutKey]) {
                clearTimeout(timeoutRefs.current[timeoutKey])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, jugadores.length])

    // Cargar goles, tarjetas y cambios existentes cuando cambien los parámetros del encuentro
    useEffect(() => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum || !jugadores.length) {
            return
        }

        const key = `datos-encuentro-${torneoId}-${equipoLocalIdNum}-${equipoVisitanteIdNum}-${jornadaNum}-${jugadores.length}`
        
        // Si ya se cargaron, no hacer nada
        if (datosEncuentroCargadosRef.current === key) {
            return
        }

        // Cancelar timeout anterior si existe
        const timeoutKey = 'datos-encuentro'
        if (timeoutRefs.current[timeoutKey]) {
            clearTimeout(timeoutRefs.current[timeoutKey])
        }

        // Si ya está cargando, no hacer nada
        if (isLoadingRef.current) {
            return
        }

        const loadData = async () => {
            isLoadingRef.current = true
            try {
                await Promise.all([
                    loadGolesExistentes(),
                    loadTarjetasExistentes(),
                    loadCambiosJugadores(),
                    loadEstadoEncuentro(),
                    loadFirmasExistentes()
                ])
                datosEncuentroCargadosRef.current = key
            } catch (err) {
                console.error('Error al cargar datos del encuentro:', err)
            } finally {
                isLoadingRef.current = false
            }
        }

        // Debounce para evitar ejecuciones múltiples
        timeoutRefs.current[timeoutKey] = setTimeout(() => {
            loadData()
        }, 300)

        return () => {
            if (timeoutRefs.current[timeoutKey]) {
                clearTimeout(timeoutRefs.current[timeoutKey])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, jugadores.length])

    const loadEstadoEncuentro = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) {
            return
        }

        try {
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()

            if (encuentro) {
                const nuevoEstado = encuentro.estado || null
                
                // Usar setState con función para obtener el estado anterior sin depender de él
                setEstadoEncuentro(prevEstado => {
                    // Si el estado no cambió, no hacer nada
                    if (prevEstado === nuevoEstado) {
                        return prevEstado
                    }
                    
                    const estadoAnterior = prevEstado
                    console.log(`🔄 Estado del encuentro cambió: ${estadoAnterior} → ${nuevoEstado}`)
                    
                    // Si se cambió de pendiente a finalizado, procesar estadísticas pendientes
                    if (estadoAnterior === 'pendiente' && nuevoEstado === 'finalizado') {
                        console.log('🏁 Cambio de pendiente a finalizado: procesando estadísticas pendientes...')
                        // Recargar todos los datos para asegurar que las estadísticas se actualicen
                        // Usar setTimeout para evitar ejecución síncrona
                        setTimeout(() => {
                            Promise.all([
                                loadGolesExistentes(),
                                loadTarjetasExistentes(),
                                loadCambiosJugadores(),
                                loadFirmasExistentes()
                            ]).catch(err => console.error('Error al recargar datos después de finalizar:', err))
                        }, 100)
                    }
                    
                    return nuevoEstado
                })
            }
        } catch (err) {
            console.error('Error al cargar estado del encuentro:', err)
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, loadGolesExistentes, loadTarjetasExistentes, loadCambiosJugadores, loadFirmasExistentes])

    // Función para forzar la actualización del estado del encuentro
    const refreshEstadoEncuentro = useCallback(async () => {
        console.log('🔄 Forzando actualización del estado del encuentro...')
        await loadEstadoEncuentro()
    }, [loadEstadoEncuentro])

    const refreshAllData = useCallback(async () => {
        console.log('🔄 Refrescando todos los datos después de WO...')
        await Promise.all([
            loadData(),
            loadGolesExistentes(),
            loadTarjetasExistentes(),
            loadEstadoEncuentro(),
            loadJugadoresParticipantes(),
            loadCambiosJugadores()
        ])
        console.log('✅ Todos los datos refrescados')
    }, [loadData, loadGolesExistentes, loadTarjetasExistentes, loadEstadoEncuentro, loadJugadoresParticipantes, loadCambiosJugadores])


    // Determinar jugadores de los equipos según la URL o valores por defecto (memoizado para evitar recálculos)
    const jugadoresEquipoA = useMemo(() => {
        return jugadores.filter(j => {
            if (equipoLocalIdNum && j.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.id) {
                return j.jugadoresEquipoCategoria[0].equipoCategoria.equipo.id === equipoLocalIdNum
            } else if (nombreEquipoLocal && j.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre) {
                return j.jugadoresEquipoCategoria[0].equipoCategoria.equipo.nombre === nombreEquipoLocal
            }
            // Si no hay parámetros en la URL, fallback a nombre por defecto
            return j.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre === 'UDEF'
        })
    }, [jugadores, equipoLocalIdNum, nombreEquipoLocal])
    
    const jugadoresEquipoB = useMemo(() => {
        return jugadores.filter(j => {
            if (equipoVisitanteIdNum && j.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.id) {
                return j.jugadoresEquipoCategoria[0].equipoCategoria.equipo.id === equipoVisitanteIdNum
            } else if (nombreEquipoVisitante && j.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre) {
                return j.jugadoresEquipoCategoria[0].equipoCategoria.equipo.nombre === nombreEquipoVisitante
            }
            // Si no hay parámetros en la URL, fallback a nombre por defecto
            return j.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.nombre === '9 Octubre'
        })
    }, [jugadores, equipoVisitanteIdNum, nombreEquipoVisitante])

    const handleTogglePlayerSelection = useCallback((jugador: JugadorWithEquipo, equipo: 'A' | 'B') => {
        const setter = equipo === 'A' ? setJugadoresParticipantesA : setJugadoresParticipantesB
        const participantes = equipo === 'A' ? jugadoresParticipantesA : jugadoresParticipantesB
        if (participantes.some(p => p.id === jugador.id)) {
            setter(participantes.filter(p => p.id !== jugador.id))
        } else {
            setter([...participantes, jugador])
        }
    }, [jugadoresParticipantesA, jugadoresParticipantesB])

    const handleSelectAllPlayers = useCallback((equipo: 'A' | 'B') => {
        const source = equipo === 'A' ? jugadoresEquipoA : jugadoresEquipoB
        const setter = equipo === 'A' ? setJugadoresParticipantesA : setJugadoresParticipantesB
        setter(source)
    }, [jugadoresEquipoA, jugadoresEquipoB])

    const handleClearAllPlayers = useCallback((equipo: 'A' | 'B') => {
        const setter = equipo === 'A' ? setJugadoresParticipantesA : setJugadoresParticipantesB
        setter([])
    }, [])



    const handleAddTarjeta = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) return
        if (!(nuevaTarjeta.jugador && nuevaTarjeta.tipo)) return

        try {
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()
            if (!encuentro) return

            const jugadorIdStr = String(nuevaTarjeta.jugador as string)
            const jugadorObj = jugadores.find(j => j.id === jugadorIdStr)
            const equipoId = jugadorObj?.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.id 
                || (nuevaTarjeta.equipo === (nombreEquipoLocal || 'Equipo A') ? equipoLocalIdNum : equipoVisitanteIdNum)

            const result = await saveTarjeta({
                encuentro_id: encuentro.id,
                jugador_id: jugadorIdStr,
                equipo_id: equipoId!,
                tipo: nuevaTarjeta.tipo as any
            })

            const equipoNombre = equipoId === equipoLocalIdNum ? (nombreEquipoLocal || 'Equipo A') : (nombreEquipoVisitante || 'Equipo B')
            setTarjetas(prev => [...prev, { ...nuevaTarjeta, id: result.tarjeta.id.toString(), equipo: equipoNombre, minuto: 0, tiempo: 'primer' } as CardType])
            setNuevaTarjeta({})
            setShowTarjetaModal(false)
        } catch (e) {
            // Silencioso
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, nuevaTarjeta, jugadores, nombreEquipoLocal, nombreEquipoVisitante, getEncuentroActual])

    const registrarPago = useCallback(async (equipo: 'local' | 'visitante', monto: number, descripcion?: string) => {
        if (!torneoId || !jornadaNum) return
        const equipoId = equipo === 'local' ? equipoLocalIdNum : equipoVisitanteIdNum
        if (!equipoId) return
        const cents = Math.round(monto * 100)
        await registrarPagoMulta(torneoId, equipoId, jornadaNum, cents, descripcion || '')
        await reloadSaldos()
    }, [torneoId, jornadaNum, equipoLocalIdNum, equipoVisitanteIdNum, reloadSaldos])

    const handleDeleteTarjeta = useCallback((id: string) => {
        const numericId = parseInt(id)
        if (!isNaN(numericId)) {
            deleteTarjeta(numericId).catch(() => {})
        }
        setTarjetas(prev => prev.filter(t => t.id !== id))
    }, [])

    const handleQuickSanction = useCallback(async (jugador: JugadorWithEquipo, tipo: 'amarilla' | 'roja') => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) return
        
        try {
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()
            if (!encuentro) return

            const equipoId = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.id || (equipoLocalIdNum!)
            const equipoNombre = equipoId === equipoLocalIdNum ? (nombreEquipoLocal || 'Equipo A') : (nombreEquipoVisitante || 'Equipo B')

            const primary = await saveTarjeta({
                encuentro_id: encuentro.id,
                jugador_id: jugador.id,
                equipo_id: equipoId,
                tipo
            })

            setTarjetas(prev => {
                const jugadorIdStr = jugador.id.toString()
                const tarjetasJugador = prev.filter(t => t.jugador === jugadorIdStr)
                const amarillas = tarjetasJugador.filter(t => t.tipo === 'amarilla').length
                
                let nuevasTarjetas: CardType[] = [...prev, {
                    id: primary.tarjeta.id.toString(),
                    jugador: jugadorIdStr,
                    equipo: equipoNombre,
                    tipo,
                    minuto: 0,
                    tiempo: 'primer',
                    motivo: 'Sanción rápida'
                }]

                if (tipo === 'amarilla' && amarillas === 1) {
                    // Guardar tarjeta roja adicional por doble amarilla
                    saveTarjeta({
                        encuentro_id: encuentro.id,
                        jugador_id: jugador.id,
                        equipo_id: equipoId,
                        tipo: 'roja'
                    }).then(secundaria => {
                        setTarjetas(prevTarjetas => [...prevTarjetas, {
                            id: secundaria.tarjeta.id.toString(),
                            jugador: jugadorIdStr,
                            equipo: equipoNombre,
                            tipo: 'roja',
                            minuto: 0,
                            tiempo: 'primer',
                            motivo: 'Doble amarilla (expulsión automática)'
                        }])
                    }).catch(() => {})
                }

                return nuevasTarjetas
            })
        } catch (e) {
            // Silencioso
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, nombreEquipoLocal, nombreEquipoVisitante, getEncuentroActual])

    const handleAddGol = useCallback(async () => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) return
        if (!(nuevoGol.jugador && nuevoGol.tipo && nuevoGol.minuto)) return

        try {
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()
            if (!encuentro) return

            const jugadorIdStr = String(nuevoGol.jugador as string)
            const jugadorObj = jugadores.find(j => j.id === jugadorIdStr)
            const equipoId = jugadorObj?.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.id 
                || (nuevoGol.equipo === (nombreEquipoLocal || 'Equipo A') ? equipoLocalIdNum : equipoVisitanteIdNum)

            const result = await saveGol({
                encuentro_id: encuentro.id,
                jugador_id: jugadorIdStr,
                equipo_id: equipoId!,
                minuto: nuevoGol.minuto!,
                tiempo: (nuevoGol.tiempo || 'primer') as any,
                tipo: nuevoGol.tipo as any
            })

            const equipoNombre = equipoId === equipoLocalIdNum ? (nombreEquipoLocal || 'Equipo A') : (nombreEquipoVisitante || 'Equipo B')
            setGoles(prev => [...prev, { ...nuevoGol, id: result.gol.id.toString(), equipo: equipoNombre } as Goal])
            setNuevoGol({})
            setShowGolModal(false)
        } catch (e) {
            // Silencioso
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, nuevoGol, jugadores, nombreEquipoLocal, nombreEquipoVisitante, getEncuentroActual])

    const handleDeleteGol = useCallback((id: string) => {
        const numericId = parseInt(id)
        if (!isNaN(numericId)) {
            deleteGol(numericId).catch(() => {})
        }
        setGoles(prev => prev.filter(g => g.id !== id))
    }, [])

    const handleQuickGoal = useCallback(async (jugador: JugadorWithEquipo, tipo: 'gol' | 'penal') => {
        if (!torneoId || !equipoLocalIdNum || !equipoVisitanteIdNum || !jornadaNum) return
        try {
            // Obtener el encuentro actual usando el helper con caché
            const encuentro = await getEncuentroActual()
            if (!encuentro) return

            const equipoId = jugador.jugadoresEquipoCategoria?.[0]?.equipoCategoria?.equipo?.id || (equipoLocalIdNum!)
            const result = await saveGol({
                encuentro_id: encuentro.id,
                jugador_id: jugador.id,
                equipo_id: equipoId,
                minuto: 0,
                tiempo: 'primer',
                tipo
            })
            const equipoNombre = equipoId === equipoLocalIdNum ? (nombreEquipoLocal || 'Equipo A') : (nombreEquipoVisitante || 'Equipo B')
            const newGoal: Goal = {
                id: result.gol.id.toString(),
                jugador: jugador.id.toString(),
                equipo: equipoNombre,
                minuto: 0,
                tiempo: 'primer',
                tipo,
            }
            setGoles(prev => [...prev, newGoal])
        } catch (e) {
            // Silencioso
        }
    }, [torneoId, equipoLocalIdNum, equipoVisitanteIdNum, jornadaNum, nombreEquipoLocal, nombreEquipoVisitante, getEncuentroActual])

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
            // Obtener el encuentro actual usando el helper
            const encuentro = await getEncuentroActual()

            if (!encuentro) {
                console.error('No se encontró el encuentro para guardar cambios!')
                return
            }

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
            // Obtener el encuentro actual usando el helper
            const encuentro = await getEncuentroActual()
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
            setJugadoresParticipantesA(prev => prev.filter(jugador => jugador.id !== jugadorEntraId.toString()))
            setJugadoresParticipantesB(prev => prev.filter(jugador => jugador.id !== jugadorEntraId.toString()))
            
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
            
            // Obtener el encuentro actual usando el helper con caché
            const { saveFirmasEncuentro } = await import('../actions')
            const encuentro = await getEncuentroActual()

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
            // Obtener el encuentro actual usando el helper
            const encuentro = await getEncuentroActual()

            if (!encuentro) {
                return { success: false, error: 'No se encontró el encuentro' }
            }

            // Determinar el tipo de equipo
            const equipoTipo: 'local' | 'visitante' = equipo === 'A' ? 'local' : 'visitante'

            const result = await designarCapitan(encuentro.id, parseInt(jugador.id), equipoTipo)
            
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
            // Obtener el encuentro actual usando el helper
            const encuentro = await getEncuentroActual()

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
        torneoCategoriaId,
        isAdmin,
        showSelectionModalA,
        setShowSelectionModalA,
        showSelectionModalB,
        setShowSelectionModalB,
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
        refreshEstadoEncuentro,
        refreshAllData,
        getEncuentroActual,
        handleTogglePlayerSelection,
        handleSelectAllPlayers,
        handleClearAllPlayers,
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
        saldoLocalCents,
        saldoVisitanteCents,
        reloadSaldos,
        registrarPago,
        cargosManuales,
        detalleValores,
    }


    return (
        <GestionJugadoresContext.Provider value={value}>
            {children}
        </GestionJugadoresContext.Provider>
    )
}

export const GestionJugadoresProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <GestionJugadoresProviderInner>{children}</GestionJugadoresProviderInner>
        </Suspense>
    )
}
