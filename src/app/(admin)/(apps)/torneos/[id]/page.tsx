'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import '@/styles/mobile-tabs.css'
import '@/styles/horarios-canchas-tab.css'
import { Toast } from 'primereact/toast'
import 'primereact/resources/themes/lara-light-cyan/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Alert, Badge, Nav, NavItem, NavLink, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormControl, FloatingLabel, FormSelect, Tab } from 'react-bootstrap'
import { LuTrophy, LuCalendar, LuUsers, LuGamepad2, LuSettings, LuPlus, LuTrash, LuTriangle, LuCheck, LuX, LuClock, LuFilter, LuDownload, LuInfo } from 'react-icons/lu'
import { TbHelp } from 'react-icons/tb'
import { getTorneoById, addEquiposToTorneo, removeEquipoFromTorneo, generateFixtureForTorneo, getEncuentrosByTorneo, updateEncuentro, deleteEncuentro, regenerateFixtureFromJornada, deleteJornada, getEquiposDescansan, crearJornadaConEmparejamientos, getJugadoresByTorneo, updateFechaJornada, asignarCanchasAutomaticamente, generarTablaDistribucionCanchas, generarTablaDistribucionCanchasParaTorneos, getTorneosParaAsignacion, getTorneosByTemporada, asignarHorariosParaTorneos, asignarCanchasParaTorneos } from '../actions'
import { getTarjetasTorneo } from '../../gestion-jugadores/actions'
import { confirmarJornada,  confirmarRegeneracionJornada } from '../dynamic-actions'
import { getEquiposByCategoria } from '../../equipos/actions'
import { getHorarios, createHorario, updateHorario, deleteHorario, asignarHorarioAEncuentro, asignarHorariosAutomaticamente, asignarHorariosPorJornada, generarTablaDistribucionHorarios, generarTablaDistribucionHorariosParaTorneos } from '../horarios-actions'
import { getCanchas, getCanchasByCategoriaId } from '@/app/(admin)/(apps)/canchas/actions'
import type { TorneoWithRelations, EquipoWithRelations, EncuentroWithRelations, Horario, Tarjeta } from '@/db/types'
import type {  JornadaPropuesta } from '@/lib/dynamic-fixture-generator'
import DynamicFixtureModal from '@/components/DynamicFixtureModal'
import EmparejamientosFaltantesModal from '@/components/EmparejamientosFaltantesModal'
import EncuentroCard from '@/components/EncuentroCard'
import TorneoFixtureSection from '@/components/TorneoFixtureSection'
import { saveAs } from 'file-saver'
import { exportFixtureToExcel } from '@/lib/excel-exporter'
import { 
  getEstadisticasSanciones,
  getSancionesPorEquipo
} from '@/lib/torneo-statistics'

const DIAS_HORARIOS = [
  { value: 'viernes', label: 'Viernes', badge: 'info' },
  { value: 'sabado', label: 'Sábado', badge: 'warning' },
  { value: 'domingo', label: 'Domingo', badge: 'success' }
] as const

type DiaHorarioValue = typeof DIAS_HORARIOS[number]['value']

const normalizarDiaHorario = (dia?: string | null): DiaHorarioValue => {
  const valor = (dia || '').toLowerCase()
  const encontrado = DIAS_HORARIOS.find(diaItem => diaItem.value === valor)
  return encontrado ? encontrado.value : 'viernes'
}

const obtenerEtiquetaDia = (dia?: string | null) => {
  const valorNormalizado = normalizarDiaHorario(dia)
  return DIAS_HORARIOS.find(d => d.value === valorNormalizado)?.label || 'Viernes'
}

// Ocultar temporalmente la pestaña Sanciones (cambiar a true para mostrarla)
const SHOW_SANCIONES_TAB = false

const TorneoDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const torneoId = parseInt(params.id as string)
  
  const [torneo, setTorneo] = useState<TorneoWithRelations | null>(null)
  const [equiposDisponibles, setEquiposDisponibles] = useState<EquipoWithRelations[]>([])
  const [encuentros, setEncuentros] = useState<EncuentroWithRelations[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [canchas, setCanchas] = useState<any[]>([])
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [todosJugadores, setTodosJugadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const toast = useRef<any>(null)
  
  // Estados para modales
  const [showAddEquiposModal, setShowAddEquiposModal] = useState(false)
  const [showFixtureModal, setShowFixtureModal] = useState(false)
  const [showEncuentroModal, setShowEncuentroModal] = useState(false)
  const [selectedEquipos, setSelectedEquipos] = useState<number[]>([])
  const [editingEncuentro, setEditingEncuentro] = useState<EncuentroWithRelations | null>(null)
  const [equiposDescansan, setEquiposDescansan] = useState<Record<number, number[]>>({})
  const [showDeleteJornadaModal, setShowDeleteJornadaModal] = useState(false)
  const [showEmparejamientosModal, setShowEmparejamientosModal] = useState(false)
  const [showCrearEmparejamientoModal, setShowCrearEmparejamientoModal] = useState(false)
  const [formEmparejamiento, setFormEmparejamiento] = useState({
    equipoLocalId: '',
    equipoVisitanteId: '',
    fecha: '',
    horarioId: '',
    cancha: '',
    jornada: ''
  })
  const [showHorariosModal, setShowHorariosModal] = useState(false)
  const [showAsignarHorarioModal, setShowAsignarHorarioModal] = useState(false)
  const [showTablaDistribucionModal, setShowTablaDistribucionModal] = useState(false)
  const [tablaDistribucion, setTablaDistribucion] = useState<any>(null)
  const [soloEncuentrosSinHorario, setSoloEncuentrosSinHorario] = useState(false)
  const [reiniciarAsignaciones, setReiniciarAsignaciones] = useState(true)
  const [editingHorario, setEditingHorario] = useState<Horario | null>(null)
  const [jornadaAEliminar, setJornadaAEliminar] = useState<number>(1)
  const [selectedHorarioId, setSelectedHorarioId] = useState<number | null>(null)
  const [selectedCancha, setSelectedCancha] = useState<string>('')
  const [selectedFecha, setSelectedFecha] = useState<string>('')
  const [soloEncuentrosSinCancha, setSoloEncuentrosSinCancha] = useState(false)
  const [reiniciarAsignacionesCanchas, setReiniciarAsignacionesCanchas] = useState(true)
  const [canchaPrioritariaId, setCanchaPrioritariaId] = useState<number | null>(null)
  const [showTablaDistribucionCanchas, setShowTablaDistribucionCanchas] = useState(false)
  const [tablaDistribucionCanchas, setTablaDistribucionCanchas] = useState<any>(null)
  
  // Estados para el sistema dinámico
  const [showDynamicFixtureModal, setShowDynamicFixtureModal] = useState(false)
  const [showDynamicRegenerateModal, setShowDynamicRegenerateModal] = useState(false)
  const [jornadaDinamica, setJornadaDinamica] = useState<number>(1)
  const [isRegenerating, setIsRegenerating] = useState(false)
  
  // Estado para tabs
  const [activeTab, setActiveTab] = useState('equipos')
  const [showManualUsuario, setShowManualUsuario] = useState(false)
  const [manualTab, setManualTab] = useState<'equipos' | 'fixture' | 'horarios-canchas' | 'dinamico' | 'sanciones'>('equipos')

  const openManualTab = (tab: 'equipos' | 'fixture' | 'horarios-canchas' | 'dinamico' | 'sanciones') => {
    setManualTab(tab)
    setShowManualUsuario(true)
  }
  const [torneosParaHorarios, setTorneosParaHorarios] = useState<{ id: number; nombre: string | null }[]>([])
  const [selectedTorneoIdsHorarios, setSelectedTorneoIdsHorarios] = useState<number[]>([torneoId])
  const [torneosParaCanchas, setTorneosParaCanchas] = useState<{ id: number; nombre: string | null }[]>([])
  const [selectedTorneoIdsCanchas, setSelectedTorneoIdsCanchas] = useState<number[]>([torneoId])

  // Cargar torneos para asignación: si hay temporada, todos los torneos de la temporada; si no, torneos de la misma categoría
  useEffect(() => {
    if (torneo?.temporada_id) {
      getTorneosByTemporada(torneo.temporada_id)
        .then(lista => {
          setTorneosParaHorarios(lista)
          setTorneosParaCanchas(lista)
          const ids = lista.map(t => t.id)
          setSelectedTorneoIdsHorarios(prev => (prev.length === 0 || !ids.includes(prev[0]) ? [torneoId].filter(id => ids.includes(id)) : prev))
          setSelectedTorneoIdsCanchas(prev => (prev.length === 0 || !ids.includes(prev[0]) ? [torneoId].filter(id => ids.includes(id)) : prev))
        })
        .catch(() => {
          setTorneosParaHorarios([])
          setTorneosParaCanchas([])
          setSelectedTorneoIdsHorarios([torneoId])
          setSelectedTorneoIdsCanchas([torneoId])
        })
      return
    }
    if (!torneo?.categoria_id) {
      setTorneosParaHorarios([])
      setTorneosParaCanchas([])
      setSelectedTorneoIdsHorarios([torneoId])
      setSelectedTorneoIdsCanchas([torneoId])
      return
    }
    getTorneosParaAsignacion(torneo.categoria_id)
      .then(lista => {
        setTorneosParaHorarios(lista)
        setTorneosParaCanchas(lista)
        const ids = lista.map(t => t.id)
        setSelectedTorneoIdsHorarios(prev => (prev.length === 0 || !ids.includes(prev[0]) ? [torneoId].filter(id => ids.includes(id)) : prev))
        setSelectedTorneoIdsCanchas(prev => (prev.length === 0 || !ids.includes(prev[0]) ? [torneoId].filter(id => ids.includes(id)) : prev))
      })
      .catch(() => {
        setTorneosParaHorarios([])
        setTorneosParaCanchas([])
        setSelectedTorneoIdsHorarios([torneoId])
        setSelectedTorneoIdsCanchas([torneoId])
      })
  }, [torneo?.categoria_id, torneo?.temporada_id, torneoId])

  // Efecto para manejar indicadores de scroll en las pestañas móviles
  useEffect(() => {
    const updateScrollIndicators = () => {
      const scrollContainer = document.querySelector('.nav-scroll-container')
      const leftIndicator = document.querySelector('.scroll-indicator-left')
      const rightIndicator = document.querySelector('.scroll-indicator-right')
      
      if (scrollContainer && leftIndicator && rightIndicator) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainer
        
        // Mostrar/ocultar indicador izquierdo
        if (scrollLeft > 0) {
          leftIndicator.classList.remove('d-none')
        } else {
          leftIndicator.classList.add('d-none')
        }
        
        // Mostrar/ocultar indicador derecho
        if (scrollLeft < scrollWidth - clientWidth - 1) {
          rightIndicator.classList.remove('d-none')
        } else {
          rightIndicator.classList.add('d-none')
        }
      }
    }

    // Actualizar indicadores al cargar y redimensionar
    updateScrollIndicators()
    window.addEventListener('resize', updateScrollIndicators)
    
    // Agregar listener de scroll
    const scrollContainer = document.querySelector('.nav-scroll-container')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateScrollIndicators)
    }

    return () => {
      window.removeEventListener('resize', updateScrollIndicators)
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updateScrollIndicators)
      }
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Primero cargar el torneo para obtener la categoría
      const torneoData = await getTorneoById(torneoId)
      // Solo actualizar torneo si se obtuvo un valor válido
      // Esto previene que torneo se resetee a null si hay un error en una recarga
      if (torneoData) {
        setTorneo(torneoData as any)
      }
      
      // Si no hay torneoData y es la primera carga, no continuar
      if (!torneoData && isInitialLoad) {
        setLoading(false)
        setIsInitialLoad(false)
        return
      }
      
      // Si no hay torneoData pero no es la primera carga, mantener el torneo anterior
      if (!torneoData && !isInitialLoad) {
        // No hacer nada, mantener los datos existentes
        setLoading(false)
        return
      }
      
      // Luego cargar el resto de datos en paralelo, incluyendo solo equipos de la categoría del torneo
      const [equiposData, encuentrosData, descansosData, horariosData, canchasData] = await Promise.all([
        torneoData?.categoria_id ? getEquiposByCategoria(torneoData.categoria_id) : [],
        getEncuentrosByTorneo(torneoId),
        getEquiposDescansan(torneoId),
        getHorarios(torneoId),
        torneoData?.categoria_id ? getCanchasByCategoriaId(torneoData.categoria_id) : getCanchas()
      ])
      
      // Cargar tarjetas y jugadores en paralelo (optimización)
      const [tarjetasData, jugadoresData] = await Promise.all([
        getTarjetasTorneo(torneoId).catch(() => [] as Tarjeta[]),
        getJugadoresByTorneo(torneoId).catch(() => [])
      ])
      
      // Mapear canchas si vienen del join (estructura { canchas: {...}, canchas_categorias: {...} })
      const canchasMapeadas = canchasData.map((item: any) => item.canchas || item)
      
      setEquiposDisponibles(equiposData)
      setEncuentros(encuentrosData as any)
      setHorarios(horariosData)
      setCanchas(canchasMapeadas)
      setTarjetas(tarjetasData)
      setTodosJugadores(jugadoresData)
      
      // Cargar equipos que descansan desde la base de datos
      setEquiposDescansan(descansosData)
      
      console.log('Equipos que descansan cargados desde BD:', descansosData)
      // Marcar que la carga inicial se completó
      setIsInitialLoad(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar datos'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
      // Si hay un error pero ya teníamos un torneo cargado, mantenerlo
      // No resetear torneo a null si ya tenía un valor
      // Marcar que la carga inicial se completó (aunque haya error)
      setIsInitialLoad(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (torneoId) {
      loadData()
    }
  }, [torneoId])

  // Resetear loading cuando cambia de pestaña (no mostrar loading al cambiar de tab)
  useEffect(() => {
    // Solo resetear si ya no es la carga inicial para evitar interferir con la carga inicial
    if (!isInitialLoad) {
      setLoading(false)
    }
  }, [activeTab, isInitialLoad])

  // Opcionalmente inicializar cancha prioritaria cuando se cargan las canchas
  // Solo si no hay ninguna seleccionada (el usuario puede dejarla vacía para distribución equitativa)
  // Comentado para que el usuario decida explícitamente si quiere una cancha prioritaria
  // useEffect(() => {
  //   if (canchas.length > 0 && !canchaPrioritariaId) {
  //     const primeraCanchaActiva = canchas.find(c => c.estado)
  //     if (primeraCanchaActiva) {
  //       setCanchaPrioritariaId(primeraCanchaActiva.id)
  //     }
  //   }
  // }, [canchas, canchaPrioritariaId])

  const handleAddEquipos = async () => {
    if (selectedEquipos.length === 0) {
      const errorMessage = 'Debes seleccionar al menos un equipo'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
      return
    }

    try {
      await addEquiposToTorneo(torneoId, selectedEquipos)
      const successMessage = 'Equipos agregados exitosamente'
      setSuccess(successMessage)
      toast.current?.show({ severity: 'success', summary: 'Éxito', detail: successMessage, life: 5000 })
      setSelectedEquipos([])
      setShowAddEquiposModal(false)
      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al agregar equipos'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
    }
  }

  const handleRemoveEquipo = async (equipoId: number) => {
    try {
      await removeEquipoFromTorneo(torneoId, equipoId)
      const successMessage = 'Equipo removido exitosamente'
      setSuccess(successMessage)
      toast.current?.show({ severity: 'success', summary: 'Éxito', detail: successMessage, life: 5000 })
      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al remover equipo'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
    }
  }

  const handleGenerateFixture = async () => {
    if (!torneo?.equiposTorneo || torneo.equiposTorneo.length < 2) {
      const errorMessage = 'Se necesitan al menos 2 equipos para generar un fixture'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
      return
    }

    try {
      const equipos = torneo.equiposTorneo.map(et => et.equipo!).filter(e => e)
      const result = await generateFixtureForTorneo(torneoId, equipos, {})
      
      // Capturar información de equipos que descansan
      if (result.equiposDescansan) {
        // Convertir el formato antiguo al nuevo formato
        const equiposDescansanFormato: Record<number, number[]> = {}
        Object.entries(result.equiposDescansan).forEach(([jornada, equipoId]) => {
          equiposDescansanFormato[parseInt(jornada)] = [equipoId as number]
        })
        setEquiposDescansan(equiposDescansanFormato)
      }
      
      const successMessage = `Fixture generado exitosamente con ${result.encuentrosCreados} encuentros`
      setSuccess(successMessage)
      toast.current?.show({ severity: 'success', summary: 'Éxito', detail: successMessage, life: 5000 })
      setShowFixtureModal(false)
      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al generar fixture'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 7000 })
    }
  }



  const handleUpdateEncuentro = async (formData: FormData) => {
    if (!editingEncuentro) return

    try {
      await updateEncuentro(editingEncuentro.id, formData)
      const successMessage = 'Encuentro actualizado exitosamente'
      setSuccess(successMessage)
      toast.current?.show({ severity: 'success', summary: 'Éxito', detail: successMessage, life: 5000 })
      setShowEncuentroModal(false)
      setEditingEncuentro(null)
      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar encuentro'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
    }
  }

  const handleEditEncuentro = (encuentro: EncuentroWithRelations) => {
    setEditingEncuentro(encuentro)
    setShowEncuentroModal(true)
  }

  const handleSeleccionarHorario = (encuentro: EncuentroWithRelations) => {
    setEditingEncuentro(encuentro)
    // Precargar valores existentes
    setSelectedHorarioId(encuentro.horario_id || null)
    
    // Asegurar que la cancha seleccionada coincida con una opción válida
    const canchaInicial = encuentro.cancha || ''
    const canchasActivas = canchas.filter(cancha => cancha.estado)
    const canchaValida = canchasActivas.find(c => c.nombre === canchaInicial)
    const canchaFinal = canchaValida ? canchaValida.nombre : ''
    
    setSelectedCancha(canchaFinal)
    
    // Inicializar fecha si existe, formatear para input datetime-local
    if (encuentro.fecha_programada) {
      const fecha = new Date(encuentro.fecha_programada)
      const fechaLocal = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
      setSelectedFecha(fechaLocal.toISOString().slice(0, 16))
    } else {
      setSelectedFecha('')
    }
    setShowAsignarHorarioModal(true)
  }

  const navigateToGestionJugadores = (encuentro: EncuentroWithRelations) => {
    // Pasar solo el encuentroId, la página consultará la BD directamente
    router.push(`/gestion-jugadores?encuentroId=${encuentro.id}`)
  }




  const handleDeleteJornada = async () => {
    try {
      const result = await deleteJornada(torneoId, jornadaAEliminar)
      
      const successMessage = result.mensaje
      setSuccess(successMessage)
      toast.current?.show({ severity: 'success', summary: 'Éxito', detail: successMessage, life: 5000 })
      setShowDeleteJornadaModal(false)
      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar jornada'
      setError(errorMessage)
      toast.current?.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: errorMessage, 
        life: 7000 
      })
    }
  }

  // ===== FUNCIONES DEL SISTEMA DINÁMICO =====

  const handleGenerarJornadaDinamica = async (jornada: number) => {
    setJornadaDinamica(jornada)
    setIsRegenerating(false)
    setShowDynamicFixtureModal(true)
  }

  const handleRegenerarJornadaDinamica = async (jornada: number) => {
    setJornadaDinamica(jornada)
    setIsRegenerating(true)
    setShowDynamicRegenerateModal(true)
  }

  const handleCrearEmparejamiento = async () => {
    try {
      if (!formEmparejamiento.equipoLocalId || !formEmparejamiento.equipoVisitanteId) {
        setError('Selecciona equipos local y visitante')
        return
      }
      if (formEmparejamiento.equipoLocalId === formEmparejamiento.equipoVisitanteId) {
        setError('Los equipos no pueden ser iguales')
        return
      }

      // Verificar si ya existe un encuentro entre estos equipos
      const equipoLocalId = Number(formEmparejamiento.equipoLocalId)
      const equipoVisitanteId = Number(formEmparejamiento.equipoVisitanteId)
      
      // Si el torneo permite revancha, solo bloquear si existe un encuentro con exactamente los mismos equipos en las mismas posiciones
      // Si no permite revancha, bloquear cualquier encuentro entre estos equipos
      const encuentroExistente = encuentros.find(encuentro => {
        if (torneo?.permite_revancha) {
          // Con revancha: solo bloquear si es exactamente el mismo emparejamiento (mismo local y mismo visitante)
          return encuentro.equipo_local_id === equipoLocalId && 
                 encuentro.equipo_visitante_id === equipoVisitanteId
        } else {
          // Sin revancha: bloquear cualquier encuentro entre estos equipos
          return (encuentro.equipo_local_id === equipoLocalId && encuentro.equipo_visitante_id === equipoVisitanteId) ||
                 (encuentro.equipo_local_id === equipoVisitanteId && encuentro.equipo_visitante_id === equipoLocalId)
        }
      })

      if (encuentroExistente) {
        const equipoLocal = equiposParticipantes.find(et => et.equipo_id === equipoLocalId)?.equipo?.nombre || 'Equipo Local'
        const equipoVisitante = equiposParticipantes.find(et => et.equipo_id === equipoVisitanteId)?.equipo?.nombre || 'Equipo Visitante'
        setError(`Ya existe un encuentro entre ${equipoLocal} y ${equipoVisitante} en este torneo`)
        return
      }

      const res = await fetch('/api/encuentros/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneoId,
          equipoLocalId: Number(formEmparejamiento.equipoLocalId),
          equipoVisitanteId: Number(formEmparejamiento.equipoVisitanteId),
          fechaProgramada: formEmparejamiento.fecha ? new Date(formEmparejamiento.fecha).toISOString() : null,
          horarioId: formEmparejamiento.horarioId ? Number(formEmparejamiento.horarioId) : null,
          cancha: formEmparejamiento.cancha || null,
          jornada: formEmparejamiento.jornada ? Number(formEmparejamiento.jornada) : null
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Error al crear emparejamiento')
      }
      setShowCrearEmparejamientoModal(false)
      setFormEmparejamiento({ equipoLocalId: '', equipoVisitanteId: '', fecha: '', horarioId: '', cancha: '', jornada: '' })
      setSuccess('Emparejamiento creado exitosamente')
      await loadData()
    } catch (e: any) {
      setError(e.message || 'Error al crear emparejamiento')
    }
  }

  const handleConfirmarJornadaDinamica = async (jornada: JornadaPropuesta) => {
    try {
      const result = await confirmarJornada(torneoId, jornada)
      setSuccess(result.mensaje)
      
      // Actualizar el estado local con los equipos que descansan
      if (result.equiposQueDescansan && result.equiposQueDescansan.length > 0) {
        setEquiposDescansan(prev => ({ ...prev, [jornada.numero]: result.equiposQueDescansan! }))
      }
      
      setShowDynamicFixtureModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al confirmar jornada')
    }
  }

  const handleConfirmarRegeneracionDinamica = async (jornada: JornadaPropuesta) => {
    try {
      const result = await confirmarRegeneracionJornada(torneoId, jornada)
      setSuccess(result.mensaje)
      
      // Actualizar el estado local con los equipos que descansan
      if (result.equiposQueDescansan && result.equiposQueDescansan.length > 0) {
        setEquiposDescansan(prev => ({ ...prev, [jornada.numero]: result.equiposQueDescansan! }))
      }
      
      setShowDynamicRegenerateModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al regenerar jornada')
    }
  }

  const handleSeleccionarEmparejamientos = async (emparejamientos: Array<{equipo1: {id: number, nombre: string}, equipo2: {id: number, nombre: string}}>, fecha?: Date) => {
    try {
      // Usar la función del servidor para crear la jornada
      const resultado = await crearJornadaConEmparejamientos(torneoId, emparejamientos, fecha)
      
      setSuccess(resultado.mensaje)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear jornada con emparejamientos seleccionados')
    }
  }

  // ===== FUNCIONES PARA HORARIOS =====

  const handleCreateHorario = async (formData: FormData) => {
    try {
      if (editingHorario) {
        await updateHorario(editingHorario.id, torneoId, formData)
        setSuccess('Horario actualizado exitosamente')
      } else {
        await createHorario(torneoId, formData)
        setSuccess('Horario creado exitosamente')
      }
      setShowHorariosModal(false)
      setEditingHorario(null)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al procesar horario')
    }
  }

  const handleUpdateHorario = async (id: number, formData: FormData) => {
    try {
      await updateHorario(id, torneoId, formData)
      setSuccess('Horario actualizado exitosamente')
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar horario')
    }
  }

  const handleDeleteHorario = async (id: number) => {
    try {
      await deleteHorario(id, torneoId)
      const successMessage = 'Horario eliminado exitosamente'
      setSuccess(successMessage)
      toast.current?.show({ severity: 'success', summary: 'Éxito', detail: successMessage, life: 5000 })
      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar horario'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 6000 })
    }
  }

  const handleAsignarHorario = async (encuentroId: number, horarioId: number) => {
    try {
      await asignarHorarioAEncuentro(encuentroId, horarioId)
      setSuccess('Horario asignado exitosamente')
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al asignar horario')
    }
  }

  const handleDeleteEncuentro = async (encuentro: EncuentroWithRelations) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el encuentro entre ${encuentro.equipoLocal?.nombre} y ${encuentro.equipoVisitante?.nombre}?`)) {
      return
    }
    
    try {
      const result = await deleteEncuentro(encuentro.id)
      setSuccess(result.message)
      toast.current?.show({ severity: 'success', summary: 'Éxito', detail: result.message, life: 5000 })
      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar encuentro'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 6000 })
    }
  }

  const handleAsignarHorarioYCancha = async (encuentroId: number, horarioId: number | null, cancha: string | null, fecha: string | null) => {
    try {
      const encuentro = encuentros.find(e => e.id === encuentroId)
      if (!encuentro) {
        setError('Encuentro no encontrado')
        return
      }

      let actualizaciones = []
      
      // Solo actualizar horario si cambió
      if (encuentro.horario_id !== horarioId) {
        if (horarioId) {
          await asignarHorarioAEncuentro(encuentroId, horarioId)
        } else {
          // Si horarioId es null, remover horario asignado
          const formData = new FormData()
          formData.append('horario_id', '')
          await updateEncuentro(encuentroId, formData)
        }
        actualizaciones.push('horario')
      }
      
      // Solo actualizar cancha si cambió
      if (encuentro.cancha !== cancha) {
        const formData = new FormData()
        const canchaValue = cancha ? String(cancha).trim() : ''
        formData.append('cancha', canchaValue)
        
        // También necesitamos enviar el estado actual para no perderlo
        const encuentroActual = encuentros.find(e => e.id === encuentroId)
        if (encuentroActual?.estado) {
          formData.append('estado', encuentroActual.estado)
        }
        
        await updateEncuentro(encuentroId, formData)
        actualizaciones.push('cancha')
      }
      
      // Actualizar fecha si cambió
      const fechaActual = encuentro.fecha_programada ? new Date(encuentro.fecha_programada).toISOString().slice(0, 16) : ''
      if (fechaActual !== fecha) {
        const formData = new FormData()
        if (fecha) {
          formData.append('fecha_programada', new Date(fecha).toISOString())
        } else {
          formData.append('fecha_programada', '')
        }
        await updateEncuentro(encuentroId, formData)
        actualizaciones.push('fecha')
      }
      
      if (actualizaciones.length > 0) {
        setSuccess(`${actualizaciones.join(', ')} ${actualizaciones.length === 1 ? 'actualizado' : 'actualizados'} exitosamente`)
        await loadData()
      } else {
        setSuccess('No se realizaron cambios')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar horario, cancha y fecha')
    }
  }


 
  const handleEditHorario = (horario: Horario) => {
    setEditingHorario(horario)
    setShowHorariosModal(true)
  }

  const handleCloseHorariosModal = () => {
    setShowHorariosModal(false)
    setEditingHorario(null)
  }

  const handleMostrarTablaDistribucion = async () => {
    try {
      setLoading(true)
      const ids = selectedTorneoIdsHorarios.length ? selectedTorneoIdsHorarios : [torneoId]
      const resultado = await generarTablaDistribucionHorariosParaTorneos(ids)
      if (resultado.success && resultado.tabla) {
        setTablaDistribucion(resultado.tabla)
        setShowTablaDistribucionModal(true)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al generar tabla de distribución')
    } finally {
      setLoading(false)
    }
  }

  const handleEjecutarAsignacionAutomatica = async () => {
    const ids = selectedTorneoIdsHorarios.length ? selectedTorneoIdsHorarios : [torneoId]
    try {
      setLoading(true)
      const resultadoAsignacion = await asignarHorariosParaTorneos(ids, {
        reiniciarAsignaciones: true
      })

      if (resultadoAsignacion?.success) {
        await loadData()
        if (ids.length >= 1) {
          const resultadoTabla = await generarTablaDistribucionHorariosParaTorneos(ids)
          if (resultadoTabla.success) {
            setTablaDistribucion(resultadoTabla.tabla)
            if (resultadoTabla.tabla) {
              const equiposEquitativos = resultadoTabla.tabla.estadisticas.equiposConDistribucionEquitativa
              const totalEquipos = resultadoTabla.tabla.estadisticas.totalEquipos
              const porcentaje = Math.round((equiposEquitativos / totalEquipos) * 100)
              const mensaje = `Redistribución completada: ${resultadoAsignacion.asignacionesRealizadas} encuentros. ${equiposEquitativos}/${totalEquipos} equipos con distribución equitativa (${porcentaje}%)`
              setSuccess(mensaje)
              toast.current?.show({ severity: 'success', summary: 'Redistribución completada', detail: mensaje, life: 6000 })
            } else {
              setSuccess(resultadoAsignacion.mensaje)
              toast.current?.show({ severity: 'success', summary: 'Éxito', detail: resultadoAsignacion.mensaje, life: 5000 })
            }
          } else {
            setSuccess(resultadoAsignacion.mensaje)
            toast.current?.show({ severity: 'success', summary: 'Éxito', detail: resultadoAsignacion.mensaje, life: 5000 })
          }
        } else {
          setSuccess(resultadoAsignacion.mensaje)
          toast.current?.show({ severity: 'success', summary: 'Éxito', detail: resultadoAsignacion.mensaje, life: 5000 })
        }
      } else {
        toast.current?.show({ severity: 'warn', summary: 'Aviso', detail: resultadoAsignacion?.mensaje ?? 'No se realizaron asignaciones', life: 5000 })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en la asignación automática'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
    } finally {
      setLoading(false)
    }
  }

  const handleMostrarTablaDistribucionCanchas = async () => {
    try {
      setLoading(true)
      const ids = selectedTorneoIdsHorarios.length ? selectedTorneoIdsHorarios : [torneoId]
      const resultado = await generarTablaDistribucionCanchasParaTorneos(ids)
      if (resultado.success) {
        setTablaDistribucionCanchas(resultado.tabla)
        setShowTablaDistribucionCanchas(true)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al generar tabla de distribución')
      toast.current?.show({ severity: 'error', summary: 'Error', detail: error instanceof Error ? error.message : 'Error al generar tabla de distribución', life: 5000 })
    } finally {
      setLoading(false)
    }
  }

  const handleEjecutarAsignacionCanchas = async () => {
    const ids = selectedTorneoIdsCanchas.length ? selectedTorneoIdsCanchas : [torneoId]
    try {
      setLoading(true)
      
      const resultadoAsignacion = await asignarCanchasParaTorneos(ids, {
        reiniciarAsignaciones: reiniciarAsignacionesCanchas,
        canchaPrioritariaId: canchaPrioritariaId ?? undefined
      })

      if (resultadoAsignacion?.success) {
        const mensaje = resultadoAsignacion.mensaje || `Asignación automática completada: ${resultadoAsignacion.asignacionesRealizadas} encuentros actualizados`
        setSuccess(mensaje)
        toast.current?.show({ severity: 'success', summary: 'Éxito', detail: mensaje, life: 5000 })
        
        await loadData()
        
        if (showTablaDistribucionCanchas) {
          const idsCanchas = selectedTorneoIdsCanchas.length ? selectedTorneoIdsCanchas : [torneoId]
          const resultadoTabla = await generarTablaDistribucionCanchasParaTorneos(idsCanchas)
          if (resultadoTabla.success) {
            setTablaDistribucionCanchas(resultadoTabla.tabla)
          }
        }
      } else {
        toast.current?.show({ severity: 'warn', summary: 'Aviso', detail: resultadoAsignacion?.mensaje ?? 'No se realizaron asignaciones', life: 5000 })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en la asignación automática de canchas'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
    } finally {
      setLoading(false)
    }
  }

  /** Ejecuta redistribución de horarios y luego de canchas en un solo paso. */
  const handleEjecutarRedistribucionCompleta = async () => {
    const ids = selectedTorneoIdsHorarios.length ? selectedTorneoIdsHorarios : [torneoId]
    try {
      setLoading(true)
      const rHorarios = await asignarHorariosParaTorneos(ids, { reiniciarAsignaciones })
      if (!rHorarios?.success) {
        toast.current?.show({ severity: 'warn', summary: 'Horarios', detail: rHorarios?.mensaje ?? 'No se realizaron asignaciones de horarios', life: 5000 })
      }
      const rCanchas = await asignarCanchasParaTorneos(ids, {
        reiniciarAsignaciones: reiniciarAsignacionesCanchas,
        canchaPrioritariaId: canchaPrioritariaId ?? undefined
      })
      await loadData()
      if (rHorarios?.success || rCanchas?.success) {
        const mensaje = [
          rHorarios?.success ? `Horarios: ${rHorarios.asignacionesRealizadas} encuentros` : null,
          rCanchas?.success ? `Canchas: ${rCanchas.asignacionesRealizadas} encuentros` : null
        ].filter(Boolean).join('. ')
        toast.current?.show({ severity: 'success', summary: 'Redistribución completada', detail: mensaje, life: 6000 })
        if (ids.length >= 1 && rHorarios?.success) {
          const resultadoTabla = await generarTablaDistribucionHorariosParaTorneos(ids)
          if (resultadoTabla.success) setTablaDistribucion(resultadoTabla.tabla)
        }
        if (rCanchas?.success) {
          const resultadoTabla = await generarTablaDistribucionCanchasParaTorneos(ids)
          if (resultadoTabla.success) setTablaDistribucionCanchas(resultadoTabla.tabla)
        }
      } else {
        toast.current?.show({ severity: 'warn', summary: 'Aviso', detail: 'No se realizaron asignaciones', life: 5000 })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en la redistribución'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
    } finally {
      setLoading(false)
    }
  }

  const getEncuentrosPorJornada = () => {
    const jornadas: Record<number, EncuentroWithRelations[]> = {}
    encuentros.forEach(encuentro => {
      if (encuentro.jornada) {
        if (!jornadas[encuentro.jornada]) {
          jornadas[encuentro.jornada] = []
        }
        jornadas[encuentro.jornada].push(encuentro)
      }
    })
    return jornadas
  }


  // Función para obtener la jornada actual (próxima jornada)
  const getJornadaActual = () => {
    const jornadas = getEncuentrosPorJornada()
    const jornadasOrdenadas = Object.keys(jornadas)
      .map(Number)
      .sort((a, b) => a - b)
    
    // Retornar la siguiente jornada
    return jornadasOrdenadas.length > 0 ? Math.max(...jornadasOrdenadas) + 1 : 1
  }




  const getEstadoBadge = (estado: string | null) => {
    const config: Record<string, { 
      text: string; 
      label: string; 
      icon: string;
      border: string;
    }> = {
      programado: { 
        text: 'secondary', 
        label: 'Programado',
        icon: '⏰',
        border: 'border border-secondary'
      },
      en_curso: { 
        text: 'warning', 
        label: 'En Curso',
        icon: '⚽',
        border: 'border border-warning'
      },
      finalizado: { 
        text: 'success', 
        label: 'Finalizado',
        icon: '✅',
        border: 'border border-success'
      },
      cancelado: { 
        text: 'danger', 
        label: 'Cancelado',
        icon: '❌',
        border: 'border border-danger'
      },
      aplazado: { 
        text: 'info', 
        label: 'Aplazado',
        icon: '⏳',
        border: 'border border-info'
      }
    }
    const estadoKey = estado ?? 'programado'
    const configItem = config[estadoKey] || { 
      text: 'secondary', 
      label: estadoKey,
      icon: '❓',
      border: 'border border-secondary'
    }
    
    return (
      <span 
        className={`badge text-${configItem.text} ${configItem.border} px-2 py-1 rounded-pill fw-semibold d-flex align-items-center justify-content-center bg-transparent`}
        style={{ fontSize: '0.8rem', width: '24px', height: '24px' }}
        title={configItem.label}
      >
        <span>{configItem.icon}</span>
      </span>
    )
  }

  const handleDownloadFixtureExcel = async () => {
    if (!torneo || encuentros.length === 0) {
      setError('No hay fixture disponible para descargar')
      return
    }

    try {
      // Usar la función exportada para generar el Excel
      const data = await exportFixtureToExcel({
        torneo,
        encuentros,
        equiposParticipantes,
        getEncuentrosPorJornada,
        getEquiposQueDescansan
      })
      
      // Descargar el archivo
      const fileName = `Fixture_${torneo.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      saveAs(data, fileName)
      
      setSuccess('Fixture descargado exitosamente con colores y estilos')
    } catch (error) {
      console.error('Error al generar el archivo Excel:', error)
      setError('Error al generar el archivo Excel: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  const getEstadisticasSancionesLocal = () => {
    return getEstadisticasSanciones(tarjetas, todosJugadores)
  }

  const getSancionesPorEquipoLocal = () => {
    return getSancionesPorEquipo(tarjetas, equiposParticipantes)
  }

  const getEquiposQueDescansan = (jornada: number) => {
    // Usar los datos de equipos que descansan cargados desde la base de datos
    const equiposIds = equiposDescansan[jornada] || []
    
    if (equiposIds.length > 0 && torneo?.equiposTorneo) {
      const equiposTorneo = torneo.equiposTorneo.filter(et => equiposIds.includes(et.equipo_id))
      return equiposTorneo.map(et => et.equipo).filter(e => e)
    }
    
    // Calcular los equipos que descansan si no hay datos en BD
    if (equiposIds.length === 0 && torneo?.equiposTorneo && encuentros.length > 0) {
      // Obtener encuentros de esta jornada
      const encuentrosJornada = encuentros.filter(e => e.jornada === jornada)
      
      // Obtener equipos que juegan en esta jornada
      const equiposQueJuegan = new Set<number>()
      encuentrosJornada.forEach(encuentro => {
        if (encuentro.equipo_local_id) equiposQueJuegan.add(encuentro.equipo_local_id)
        if (encuentro.equipo_visitante_id) equiposQueJuegan.add(encuentro.equipo_visitante_id)
      })
      
      // Encontrar los equipos que no juegan (descansan)
      const equiposQueDescansan = torneo.equiposTorneo.filter(et => 
        et.equipo && !equiposQueJuegan.has(et.equipo_id)
      )
      
      return equiposQueDescansan.map(et => et.equipo).filter(e => e)
    }
    
    return []
  }

  // Si torneo tiene valor, nunca mostrar overlay (ya se cargó)
  // Solo mostrar overlay durante la primera carga cuando realmente no hay datos
  // NUNCA mostrar cuando cambia de pestaña
  if (!torneo) {
    // Si no hay torneo pero ya se intentó cargar, mostrar error
    if (!isInitialLoad) {
      return (
        <Container fluid>
          <PageBreadcrumb title="Torneo no encontrado" subtitle="Apps" />
          <Alert variant="danger">El torneo no fue encontrado</Alert>
        </Container>
      )
    }
    
    // Si no hay torneo y no está cargando, mostrar error
    return (
      <Container fluid>
        <PageBreadcrumb title="Torneo no encontrado" subtitle="Apps" />
        <Alert variant="danger">El torneo no fue encontrado</Alert>
      </Container>
    )
  }
  
  // Si llegamos aquí, torneo tiene valor - NUNCA mostrar overlay

  // TypeScript ahora sabe que torneo no es null aquí
  const jornadas = getEncuentrosPorJornada()
  const equiposParticipantes = torneo.equiposTorneo || []
  const equiposDisponiblesParaAgregar = equiposDisponibles.filter(
    equipo => !equiposParticipantes.some(ep => ep.equipo_id === equipo.id)
  )
  const totalJornadasIda = Math.max(0, equiposParticipantes.length - 1)
  const totalJornadas = torneo.permite_revancha ? totalJornadasIda * 2 : totalJornadasIda

  return (
    <Container fluid style={{ backgroundColor: '#FCFCFC', minHeight: '100vh' }}>
      <PageBreadcrumb title={torneo.nombre} subtitle="Apps" />


      {/* Información general del torneo */}
      <Row className="mb-4">
        <Col>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">
                  <LuTrophy className="me-2 text-primary" />
                  {torneo.nombre}
                </h4>
                <p className="text-muted mb-0">{torneo.descripcion}</p>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <Badge bg={torneo.estado === 'en_curso' ? 'success' : torneo.estado === 'finalizado' ? 'primary' : 'secondary'}>
                  {torneo.estado === 'planificado' ? 'Planificado' : 
                   torneo.estado === 'en_curso' ? 'En Curso' : 
                   torneo.estado === 'finalizado' ? 'Finalizado' : 'Cancelado'}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <Row>
                <Col md={3}>
                  <div className="text-center">
                    <LuTrophy className="fs-2 text-primary mb-2" />
                    <h6>Categoría</h6>
                    <p className="text-muted">{torneo.categoria?.nombre || 'Sin categoría'}</p>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <LuUsers className="fs-2 text-success mb-2" />
                    <h6>Equipos</h6>
                    <p className="text-muted">{equiposParticipantes.length}</p>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <LuGamepad2 className="fs-2 text-warning mb-2" />
                    <h6>Encuentros</h6>
                    <p className="text-muted">{encuentros.length}</p>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center">
                    <LuCalendar className="fs-2 text-info mb-2" />
                    <h6>Período</h6>
                    <p className="text-muted">
                      {torneo.fecha_inicio ? new Date(torneo.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'} - 
                      {torneo.fecha_fin ? new Date(torneo.fecha_fin).toLocaleDateString('es-ES') : 'N/A'}
                    </p>
                  </div>
                </Col>

              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Tabs de navegación */}
      <Row>
        <Col>
          <Card>
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'equipos')}>
              <CardHeader className="p-0">
                <div className="position-relative w-100">
                  <div 
                    className="nav-scroll-container"
                    style={{
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      width: '100%',
                      maxWidth: '100%'
                    }}
                  >
                    <Nav 
                      variant="tabs" 
                      className="nav-tabs-mobile flex-nowrap"
                      style={{
                        minWidth: 'max-content',
                        borderBottom: '1px solid #dee2e6'
                      }}
                    >
                      <NavItem className="flex-shrink-0">
                        <NavLink 
                          eventKey="equipos"
                          className="px-2 px-md-3 py-2"
                          style={{ 
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                            minWidth: 'fit-content',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <span className="d-none d-sm-inline">Equipos Participantes</span>
                          <span className="d-sm-none">Equipos</span>
                        </NavLink>
                      </NavItem>
                      <NavItem className="flex-shrink-0">
                        <NavLink 
                          eventKey="fixture"
                          className="px-2 px-md-3 py-2"
                          style={{ 
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                            minWidth: 'fit-content',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          Fixture
                        </NavLink>
                      </NavItem>
                      <NavItem className="flex-shrink-0">
                        <NavLink 
                          eventKey="horarios-canchas"
                          className="px-2 px-md-3 py-2"
                          style={{ 
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                            minWidth: 'fit-content',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <span className="d-none d-sm-inline">Horarios y Canchas</span>
                          <span className="d-sm-none">Horarios / Canchas</span>
                        </NavLink>
                      </NavItem>
                      <NavItem className="flex-shrink-0">
                        <NavLink 
                          eventKey="dinamico"
                          className="px-2 px-md-3 py-2"
                          style={{ 
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                            minWidth: 'fit-content',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <span className="d-none d-sm-inline">Sistema Dinámico</span>
                          <span className="d-sm-none">Dinámico</span>
                        </NavLink>
                      </NavItem>
                      {SHOW_SANCIONES_TAB && (
                        <NavItem className="flex-shrink-0">
                          <NavLink 
                            eventKey="sanciones"
                            className="px-2 px-md-3 py-2"
                            style={{ 
                              fontSize: '0.875rem',
                              whiteSpace: 'nowrap',
                              minWidth: 'fit-content',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            Sanciones
                          </NavLink>
                        </NavItem>
                      )}
                    </Nav>
                  </div>
                  {/* Indicadores de scroll */}
                  <div 
                    className="scroll-indicator scroll-indicator-left d-none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '20px',
                      background: 'linear-gradient(to right, rgba(255,255,255,0.9), transparent)',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  />
                  <div 
                    className="scroll-indicator scroll-indicator-right d-none"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '20px',
                      background: 'linear-gradient(to left, rgba(255,255,255,0.9), transparent)',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  />
                </div>
              </CardHeader>
              <CardBody>
                <Tab.Content>

                {/* Tab: Equipos Participantes */}
                <Tab.Pane eventKey="equipos">
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <h5 className="mb-0">Equipos Participantes ({equiposParticipantes.length})</h5>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => openManualTab('equipos')}
                        title="Manual de esta pestaña"
                      >
                        <TbHelp className="me-1" />
                        Manual de Usuario
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => setShowAddEquiposModal(true)}
                        disabled={equiposDisponiblesParaAgregar.length === 0}>
                        <LuPlus className="me-1" />
                        Agregar Equipos
                      </Button>
                      {equiposParticipantes.length >= 2 && (
                        <Button 
                          variant="success" 
                          size="sm"
                          onClick={() => setShowFixtureModal(true)}>
                          <LuSettings className="me-1" />
                          Generar Fixture
                        </Button>
                      )}
                    </div>
                  </div>

                  <Row>
                    {equiposParticipantes.map((equipoTorneo) => (
                      <Col key={equipoTorneo.id} md={6} lg={4} className="mb-3">
                        <Card>
                          <CardBody className="text-center">
                            <div className="avatar avatar-lg mx-auto mb-3">
                              <img 
                                src={equipoTorneo.equipo?.imagen_equipo || 'https://via.placeholder.com/64x64/17a2b8/ffffff?text=🏅'} 
                                alt="" 
                                className="img-fluid rounded-circle"
                                width={64}
                                height={64}
                              />
                            </div>
                            <h6>{equipoTorneo.equipo?.nombre}</h6>
                            <p className="text-muted small mb-2">
                              {equipoTorneo.equipo?.entrenador?.nombre || 'Sin entrenador'}
                            </p>
                            <div className="d-flex justify-content-center gap-2">
                              <Badge bg="primary">{Number(equipoTorneo.puntos) || 0} pts</Badge>
                              <Badge bg="secondary">{Number(equipoTorneo.partidos_jugados) || 0} PJ</Badge>
                            </div>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => handleRemoveEquipo(equipoTorneo.equipo_id)}>
                              <LuTrash className="me-1" />
                              Remover
                            </Button>
                          </CardBody>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Tab.Pane>

                {/* Tab: Fixture */}
                <Tab.Pane eventKey="fixture">
                  <div className="d-flex justify-content-end mb-3">
                    <Button
                      variant="outline-info"
                      size="sm"
                      onClick={() => openManualTab('fixture')}
                      title="Manual de esta pestaña"
                    >
                      <TbHelp className="me-1" />
                      Manual de Usuario
                    </Button>
                  </div>
                  <TorneoFixtureSection
                    torneo={torneo}
                    encuentros={encuentros}
                    equiposParticipantes={equiposParticipantes}
                    equiposDescansan={equiposDescansan}
                    onDownloadExcel={handleDownloadFixtureExcel}
                    onGenerarFixture={() => setShowFixtureModal(true)}
                    onSistemaDinamico={() => handleGenerarJornadaDinamica(getJornadaActual())}
                    onEmparejamientos={() => setShowEmparejamientosModal(true)}
                    onEliminarJornada={(jornada) => {
                      setJornadaAEliminar(jornada)
                      setShowDeleteJornadaModal(true)
                    }}
                    onManagePlayers={navigateToGestionJugadores}
                    onEditHorario={handleSeleccionarHorario}
                    onDeleteEncuentro={handleDeleteEncuentro}
                    onCrearEmparejamiento={() => setShowCrearEmparejamientoModal(true)}
                    onUpdateFechaJornada={async (torneoId, jornada, fecha) => {
                      try {
                        const resultado = await updateFechaJornada(torneoId, jornada, fecha)
                        setSuccess(resultado.mensaje)
                        toast.current?.show({ severity: 'success', summary: 'Éxito', detail: resultado.mensaje, life: 5000 })
                        setError(null)
                        // Recargar datos del torneo
                        await loadData()
                      } catch (err: any) {
                        const errorMessage = err.message || 'Error al actualizar la fecha de la jornada'
                        setError(errorMessage)
                        toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
                        setSuccess(null)
                      }
                    }}
                    showActions={true}
                  />
                </Tab.Pane>

                {/* Tab: Sistema Dinámico */}
                <Tab.Pane eventKey="dinamico">
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <h5 className="mb-0">Sistema Dinámico de Fixture</h5>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => openManualTab('dinamico')}
                        title="Manual de esta pestaña"
                      >
                        <TbHelp className="me-1" />
                        Manual de Usuario
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => handleGenerarJornadaDinamica(getJornadaActual())}>
                        <LuSettings className="me-1" />
                        Generar Jornada Dinámica
                      </Button>
                    </div>
                  </div>

                  <Alert variant="info" className="mb-4">
                    <h6><LuInfo className="me-2" />Sistema Dinámico de Fixture</h6>
                    <p className="mb-2">
                      El sistema dinámico te permite generar jornadas con restricciones configurables:
                    </p>
                    <ul className="mb-0">
                      <li><strong>Descansos forzados:</strong> Puedes indicar qué equipo debe descansar en cada jornada</li>
                      <li><strong>Validación de restricciones:</strong> No repite partidos ya jugados y valida descansos consecutivos</li>
                      <li><strong>Confirmación previa:</strong> Revisa la propuesta antes de guardarla</li>
                      <li><strong>Alternativas:</strong> El sistema te muestra opciones alternativas si la propuesta no es óptima</li>
                      <li><strong>Equilibrio:</strong> Mantiene el balance de descansos entre equipos</li>
                    </ul>
                  </Alert>

                  <Row>
                    <Col md={6}>
                      <Card>
                        <CardBody>
                          <h6><LuUsers className="me-2" />Estado de Equipos</h6>
                          <div className="d-grid gap-2">
                            {equiposParticipantes.map(equipoTorneo => (
                              <div key={equipoTorneo.id} className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                <div className="d-flex align-items-center gap-2">
                                  <img 
                                    src={equipoTorneo.equipo?.imagen_equipo || 'https://via.placeholder.com/24x24/fd7e14/ffffff?text=🏆'} 
                                    alt="" 
                                    className="rounded-circle"
                                    width={24}
                                    height={24}
                                  />
                                  <span>{equipoTorneo.equipo?.nombre}</span>
                                </div>
                                <Badge bg="secondary">
                                  {equiposDescansan[equipoTorneo.equipo_id] || 0} descansos
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card>
                        <CardBody>
                          <h6><LuCalendar className="me-2" />Jornadas Generadas</h6>
                          <div className="d-flex flex-wrap gap-2">
                            {Object.keys(jornadas).sort((a, b) => parseInt(a) - parseInt(b)).map(jornadaNum => (
                              <Badge 
                                key={jornadaNum} 
                                bg="primary" 
                                className="fs-6 px-3 py-2"
                              >
                                Jornada {jornadaNum}
                              </Badge>
                            ))}
                          </div>
                          {Object.keys(jornadas).length === 0 && (
                            <p className="text-muted">No hay jornadas generadas aún</p>
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* Tab: Horarios y Canchas (unificada) — Diseño mejorado */}
                <Tab.Pane eventKey="horarios-canchas">
                  <div className="hc-tab">
                    {/* Header con CTA principal */}
                    <header className="hc-header">
                      <div className="hc-header-top">
                        <h2 className="hc-title">
                          <span className="hc-title-icon"><LuClock size={22} /></span>
                          Horarios y Canchas
                        </h2>
                        <div className="hc-actions">
                          <Button variant="outline-info" size="sm" className="hc-btn-secondary" onClick={() => openManualTab('horarios-canchas')} title="Manual de esta pestaña">
                            <TbHelp size={16} className="me-1" /> Manual de Usuario
                          </Button>
                          <button type="button" className="hc-btn-secondary" onClick={handleMostrarTablaDistribucion} disabled={horarios.length === 0}>
                            <LuInfo size={16} /> Tabla Horarios
                          </button>
                          <button type="button" className="hc-btn-secondary" onClick={handleMostrarTablaDistribucionCanchas} disabled={encuentros.filter(e => e.cancha && e.cancha.trim() !== '').length === 0}>
                            <LuInfo size={16} /> Tabla Canchas
                          </button>
                          <button type="button" className="hc-btn-secondary" onClick={() => setShowHorariosModal(true)}>
                            <LuPlus size={16} /> Nuevo Horario
                          </button>
                          <Button
                            variant="success"
                            className="hc-cta-primary"
                            onClick={handleEjecutarRedistribucionCompleta}
                            disabled={loading || horarios.length === 0 || canchas.filter(c => c.estado).length === 0 || selectedTorneoIdsHorarios.length === 0}
                          >
                            {loading ? (
                              <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                Redistribuyendo...
                              </>
                            ) : (
                              <>
                                <LuSettings size={18} />
                                Ejecutar Redistribución
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="hc-desc">
                        Asigna horarios y canchas a los encuentros de los torneos seleccionados. Un solo clic aplica primero horarios y luego canchas.
                      </p>
                    </header>

                    {/* Torneos a incluir */}
                    {torneosParaHorarios.length > 0 && (
                      <div className="hc-block">
                        <div className="hc-block-header">Torneos a incluir</div>
                        <div className="hc-block-body">
                          <div className="hc-chips">
                            {torneosParaHorarios.map((t) => (
                              <label key={t.id} className={`hc-chip ${selectedTorneoIdsHorarios.includes(t.id) ? 'active' : ''}`}>
                                <input
                                  type="checkbox"
                                  className="visually-hidden"
                                  checked={selectedTorneoIdsHorarios.includes(t.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTorneoIdsHorarios((prev) => (prev.includes(t.id) ? prev : [...prev, t.id]))
                                    } else {
                                      setSelectedTorneoIdsHorarios((prev) => prev.filter((id) => id !== t.id))
                                    }
                                  }}
                                />
                                <span>{t.nombre || `Torneo ${t.id}`}</span>
                                {t.id === torneoId && <span className="hc-chip-badge">actual</span>}
                              </label>
                            ))}
                          </div>
                          {selectedTorneoIdsHorarios.length === 0 && (
                            <p className="hc-warning-text">Selecciona al menos un torneo para ejecutar la redistribución.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Opciones de redistribución */}
                    <div className="hc-block">
                      <div className="hc-block-header">Opciones de redistribución</div>
                      <div className="hc-block-body">
                        <div className="hc-options">
                          <div className="hc-option-item">
                            <div className="form-check">
                              <input className="form-check-input" type="checkbox" id="reiniciarAsignacionesUnificado" checked={reiniciarAsignaciones} onChange={(e) => setReiniciarAsignaciones(e.target.checked)} />
                              <label className="form-check-label" htmlFor="reiniciarAsignacionesUnificado">Reiniciar horarios antes</label>
                            </div>
                            <small className="text-muted">Quita horarios asignados y vuelve a distribuir</small>
                          </div>
                          <div className="hc-option-item">
                            <div className="form-check">
                              <input className="form-check-input" type="checkbox" id="reiniciarAsignacionesCanchasUnificado" checked={reiniciarAsignacionesCanchas} onChange={(e) => setReiniciarAsignacionesCanchas(e.target.checked)} />
                              <label className="form-check-label" htmlFor="reiniciarAsignacionesCanchasUnificado">Reiniciar canchas antes</label>
                            </div>
                            <small className="text-muted">Quita canchas asignadas y vuelve a distribuir</small>
                          </div>
                          <div className="hc-option-item">
                            <label htmlFor="canchaPrioritariaUnificado">Cancha prioritaria</label>
                            <FormSelect id="canchaPrioritariaUnificado" value={canchaPrioritariaId || ''} onChange={(e) => setCanchaPrioritariaId(e.target.value ? parseInt(e.target.value) : null)}>
                              <option value="">Distribución equitativa</option>
                              {canchas.filter(c => c.estado).map((cancha) => (
                                <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>
                              ))}
                            </FormSelect>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Grid: Horarios | Canchas + Resumen */}
                    <div className="hc-grid">
                      <Card className="hc-horarios-card hc-block">
                        <CardHeader><LuClock size={18} /> Horarios disponibles</CardHeader>
                        <CardBody>
                          {horarios.length === 0 ? (
                            <div className="hc-empty">
                              <div className="hc-empty-icon"><LuClock size={40} /></div>
                              <div className="hc-empty-title">No hay horarios configurados</div>
                              <p className="hc-empty-text">Crea horarios para asignarlos a los encuentros</p>
                              <Button variant="primary" onClick={() => setShowHorariosModal(true)} className="rounded-2">
                                <LuPlus className="me-2" /> Crear primer horario
                              </Button>
                            </div>
                          ) : (
                            <>
                              {DIAS_HORARIOS.map(dia => {
                                const horariosPorDia = horarios.filter(horario => normalizarDiaHorario(horario.dia_semana) === dia.value)
                                return (
                                  <div key={dia.value} className="hc-dia-section">
                                    <div className="hc-dia-head">
                                      <Badge bg={dia.badge} pill className="hc-dia-badge">{dia.label}</Badge>
                                      <span className="hc-dia-count">{horariosPorDia.length === 0 ? 'Sin horarios' : `${horariosPorDia.length} horario${horariosPorDia.length > 1 ? 's' : ''}`}</span>
                                    </div>
                                    {horariosPorDia.length === 0 ? (
                                      <p className="text-muted fst-italic small mb-0">No hay horarios para este día.</p>
                                    ) : (
                                      <Row className="g-2 g-md-3">
                                        {horariosPorDia.map(horario => (
                                          <Col key={horario.id} xs={12} sm={6} lg={4}>
                                            <div className="hc-horario-item">
                                              <div className="hc-horario-top">
                                                <span className="hc-horario-num" style={{ backgroundColor: horario.color || '#0d6efd' }}>{horario.orden}</span>
                                                <div className="hc-horario-actions">
                                                  <Button variant="outline-primary" size="sm" onClick={() => handleEditHorario(horario)} title="Editar"><LuSettings size={14} /></Button>
                                                  <Button variant="outline-danger" size="sm" onClick={() => handleDeleteHorario(horario.id)} title="Eliminar"><LuTrash size={14} /></Button>
                                                </div>
                                              </div>
                                              <div className="hc-horario-time">{horario.hora_inicio}</div>
                                              <div className="hc-horario-meta">{obtenerEtiquetaDia(horario.dia_semana)}</div>
                                            </div>
                                          </Col>
                                        ))}
                                      </Row>
                                    )}
                                  </div>
                                )
                              })}
                            </>
                          )}
                        </CardBody>
                      </Card>

                      <div className="hc-sidebar">
                        <Card className="hc-canchas-card hc-block">
                          <CardHeader>Canchas disponibles</CardHeader>
                          <CardBody>
                            {canchas.filter(c => c.estado).length === 0 ? (
                              <p className="text-muted small mb-0">{torneo?.categoria ? `No hay canchas activas para ${torneo.categoria.nombre}` : 'No hay canchas activas'}</p>
                            ) : (
                              <>
                                {canchas.filter(c => c.estado).map(cancha => (
                                  <div key={cancha.id} className="hc-cancha-item">
                                    <div className="hc-cancha-avatar"><LuCheck size={18} /></div>
                                    <div className="hc-cancha-info">
                                      <strong>{cancha.nombre}</strong>
                                      {cancha.ubicacion && <small>{cancha.ubicacion}</small>}
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </CardBody>
                        </Card>
                        <Card className="hc-resumen-card hc-block">
                          <CardHeader>Resumen</CardHeader>
                          <CardBody>
                            <div className="hc-stats">
                              <div className="hc-stat">
                                <span className="hc-stat-value primary">{encuentros.length}</span>
                                <span className="hc-stat-label">Encuentros</span>
                              </div>
                              <div className="hc-stat">
                                <span className="hc-stat-value success">{encuentros.filter(e => e.cancha && e.cancha.trim() !== '').length}</span>
                                <span className="hc-stat-label">Con cancha</span>
                              </div>
                              <div className="hc-stat">
                                <span className="hc-stat-value warning">{encuentros.filter(e => !e.cancha || e.cancha.trim() === '').length}</span>
                                <span className="hc-stat-label">Sin cancha</span>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      </div>
                    </div>
                  </div>
                </Tab.Pane>

                {/* Tab: Sanciones (oculta temporalmente con SHOW_SANCIONES_TAB) */}
                {SHOW_SANCIONES_TAB && (
                <Tab.Pane eventKey="sanciones">
                  <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                    <div>
                      <h5 className="mb-1">🟨🟥 Sanciones y Tarjetas</h5>
                      <p className="text-muted mb-0">Control de tarjetas amarillas, rojas y jugadores sancionados</p>
                    </div>
                    <div className="d-flex gap-2 flex-wrap align-items-center">
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => openManualTab('sanciones')}
                        title="Manual de esta pestaña"
                      >
                        <TbHelp className="me-1" />
                        Manual de Usuario
                      </Button>
                      <Badge bg="primary" className="fs-6 px-3 py-2">
                        {encuentros.filter(e => e.estado === 'finalizado').length} partidos jugados
                      </Badge>
                    </div>
                  </div>

                  {(() => {
                    const jugadoresConSanciones = getEstadisticasSancionesLocal()
                    const sancionesPorEquipo = getSancionesPorEquipoLocal()

                    if (encuentros.filter(e => e.estado === 'finalizado').length === 0) {
                      return (
                        <div className="text-center py-5">
                          <div className="mb-4">
                            <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-3" style={{width: '80px', height: '80px'}}>
                              <LuGamepad2 className="fs-1 text-muted" />
                            </div>
                            <h4 className="mb-2">No hay partidos finalizados</h4>
                            <p className="text-muted mb-4">
                              Las sanciones aparecerán cuando se finalicen los primeros partidos del torneo
                            </p>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div>

                        {/* Tabla de jugadores sancionados */}
                        <Card>
                          <CardHeader className="bg-light">
                            <h5 className="mb-0 fw-bold text-primary">
                              <LuX className="me-2" />
                              Jugadores con Sanciones
                            </h5>
                          </CardHeader>
                          <CardBody>
                            {jugadoresConSanciones.length === 0 ? (
                              <div className="text-center py-5">
                                <div className="mb-4">
                                  <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-3" style={{width: '80px', height: '80px'}}>
                                    <LuCheck className="fs-1 text-success" />
                                  </div>
                                  <h4 className="mb-2">No hay sanciones registradas</h4>
                                  <p className="text-muted mb-4">
                                    Los jugadores con tarjetas aparecerán cuando se registren sanciones en los partidos finalizados
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <Table striped bordered hover responsive>
                                <thead>
                                  <tr>
                                    <th>Jugador</th>
                                    <th>Equipo</th>
                                    <th className="text-center">🟨</th>
                                    <th className="text-center">🟥</th>
                                    <th className="text-center">Total</th>
                                    <th className="text-center">Estado</th>
                                    <th className="text-center">Partidos Sancionado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {jugadoresConSanciones.map((jugador, index) => (
                                    <tr key={jugador.jugador?.id || index}>
                                      <td>
                                        <div className="d-flex align-items-center gap-2">
                                          <img 
                                            src={jugador.jugador?.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(jugador.jugador?.apellido_nombre || 'Jugador') + '&background=007bff&color=fff&size=32'} 
                                            alt={jugador.jugador?.apellido_nombre || 'Jugador'} 
                                            className="rounded-circle"
                                            width={32}
                                            height={32}
                                          />
                                          <span className="fw-semibold">{jugador.jugador?.apellido_nombre || 'Jugador'}</span>
                                        </div>
                                      </td>
                                      <td>
                                        <Badge bg="secondary">
                                          {jugador.equipo_id 
                                            ? (equiposParticipantes.find(et => et.equipo_id === jugador.equipo_id)?.equipo?.nombre || 'N/A')
                                            : 'N/A'}
                                        </Badge>
                                      </td>
                                      <td className="text-center text-warning fw-bold">{jugador.amarillas}</td>
                                      <td className="text-center text-danger fw-bold">{jugador.rojas}</td>
                                      <td className="text-center fw-bold">{jugador.totalTarjetas}</td>
                                      <td className="text-center">
                                        {jugador.sancionado ? (
                                          <Badge bg="danger">Sancionado</Badge>
                                        ) : (
                                          <Badge bg="success">Disponible</Badge>
                                        )}
                                      </td>
                                      <td className="text-center">
                                        {jugador.partidosSancionado > 0 && (
                                          <Badge bg="warning" className="text-dark">
                                            {jugador.partidosSancionado} partido{jugador.partidosSancionado !== 1 ? 's' : ''}
                                          </Badge>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            )}
                          </CardBody>
                        </Card>

                        {/* Información adicional */}
                        <Row className="mt-4">
                          <Col md={6}>
                            <Card>
                              <CardHeader>
                                <h6><LuInfo className="me-2" />Reglas de Sanciones</h6>
                              </CardHeader>
                              <CardBody>
                                <div className="d-grid gap-3">
                                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <span>Tarjeta Amarilla:</span>
                                    <Badge bg="warning" className="text-dark">Advertencia</Badge>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <span>5 Amarillas:</span>
                                    <Badge bg="danger">1 partido de sanción</Badge>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <span>Tarjeta Roja:</span>
                                    <Badge bg="danger">1 partido de sanción</Badge>
                                  </div>
                                </div>
                              </CardBody>
                            </Card>
                          </Col>
                          <Col md={6}>
                            <Card>
                              <CardHeader>
                                <h6><LuUsers className="me-2" />Sanciones por Equipo</h6>
                              </CardHeader>
                              <CardBody>
                                {sancionesPorEquipo.length === 0 ? (
                                  <p className="text-muted text-center">No hay sanciones registradas por equipo</p>
                                ) : (
                                  <div className="d-grid gap-2">
                                    {sancionesPorEquipo.map((item, index) => (
                                      <div key={item.equipo.id} className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                        <div className="d-flex align-items-center gap-2">
                                          <span className="fw-bold text-primary">#{index + 1}</span>
                                          <img 
                                            src={item.equipo.imagen_equipo || 'https://via.placeholder.com/24x24/fd7e14/ffffff?text=🏆'} 
                                            alt="" 
                                            className="rounded-circle"
                                            width={24}
                                            height={24}
                                          />
                                          <span className="fw-semibold">{item.equipo.nombre}</span>
                                        </div>
                                        <div className="d-flex gap-2">
                                          <Badge bg="warning" className="text-dark">{Number(item.amarillas) || 0} 🟨</Badge>
                                          <Badge bg="danger">{Number(item.rojas) || 0} 🟥</Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardBody>
                            </Card>
                          </Col>
                        </Row>
                      </div>
                    )
                  })()}
                </Tab.Pane>
                )}


              </Tab.Content>
            </CardBody>
            </Tab.Container>
          </Card>
        </Col>
      </Row>

      {/* Modal para agregar equipos */}
      <Modal show={showAddEquiposModal} onHide={() => setShowAddEquiposModal(false)} size="lg">
        <ModalHeader closeButton>
          <Modal.Title>Agregar Equipos al Torneo</Modal.Title>
        </ModalHeader>
        <ModalBody>
          {torneo.categoria ? (
            <Alert variant="info" className="mb-3">
              <LuInfo className="me-2" />
              Solo se muestran equipos <strong>activos</strong> de la categoría: <strong>{torneo.categoria.nombre}</strong>
            </Alert>
          ) : (
            <Alert variant="warning" className="mb-3">
              <LuInfo className="me-2" />
              Este torneo no tiene una categoría asignada. Se mostrarán todos los equipos activos.
            </Alert>
          )}
          {equiposDisponiblesParaAgregar.length === 0 ? (
            <Alert variant="warning">
              No hay equipos disponibles para agregar. 
              {torneo.categoria && ` Todos los equipos de la categoría ${torneo.categoria.nombre} ya están participando o no existen equipos en esta categoría.`}
            </Alert>
          ) : (
            <>
              <p className="text-muted mb-3">
                Selecciona los equipos que deseas agregar al torneo ({equiposDisponiblesParaAgregar.length} disponibles):
              </p>
              <Row>
                {equiposDisponiblesParaAgregar.map((equipo) => (
              <Col key={equipo.id} md={6} className="mb-2">
                <Form.Check
                  type="checkbox"
                  id={`equipo-${equipo.id}`}
                  label={
                    <div className="d-flex align-items-center gap-2">
                      <img 
                        src={equipo.imagen_equipo || 'https://via.placeholder.com/24x24/6f42c1/ffffff?text=⭐'} 
                        alt="" 
                        className="rounded-circle"
                        width={24}
                        height={24}
                      />
                      <span>{equipo.nombre}</span>
                    </div>
                  }
                  checked={selectedEquipos.includes(equipo.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEquipos([...selectedEquipos, equipo.id])
                    } else {
                      setSelectedEquipos(selectedEquipos.filter(id => id !== equipo.id))
                    }
                  }}
                />
              </Col>
            ))}
              </Row>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAddEquiposModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddEquipos}
            disabled={equiposDisponiblesParaAgregar.length === 0 || selectedEquipos.length === 0}
          >
            Agregar Equipos ({selectedEquipos.length})
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para generar fixture */}
      <Modal show={showFixtureModal} onHide={() => setShowFixtureModal(false)} size="lg">
        <ModalHeader closeButton>
          <Modal.Title>Generar Fixture</Modal.Title>
        </ModalHeader>
        <ModalBody>
          <p>
            Se generará un fixture automático para los {equiposParticipantes.length} equipos participantes.
            {torneo.permite_revancha && ' Se incluirán partidos de ida y vuelta.'}
          </p>
          <p className="text-muted small">
            El algoritmo Round Robin asegura que cada equipo juegue contra todos los demás.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowFixtureModal(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleGenerateFixture}>
            Generar Fixture
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para editar encuentro */}
      <Modal show={showEncuentroModal} onHide={() => setShowEncuentroModal(false)}>
        <ModalHeader closeButton>
          <Modal.Title>Editar Encuentro</Modal.Title>
        </ModalHeader>
        <ModalBody>
          {editingEncuentro && (
            <Form id="encuentro-form" action={handleUpdateEncuentro}>
              <Row>
                <Col md={6}>
                  <FloatingLabel label="Goles Local">
                    <FormControl 
                      type="number" 
                      name="goles_local" 
                      min="0"
                      defaultValue={editingEncuentro.goles_local || ''} 
                    />
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel label="Goles Visitante">
                    <FormControl 
                      type="number" 
                      name="goles_visitante" 
                      min="0"
                      defaultValue={editingEncuentro.goles_visitante || ''} 
                    />
                  </FloatingLabel>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col md={6}>
                  <FloatingLabel label="Estado">
                    <FormSelect name="estado" defaultValue={editingEncuentro.estado ?? 'programado'}>
                      <option value="programado">Programado</option>
                      <option value="en_curso">En Curso</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="aplazado">Aplazado</option>
                    </FormSelect>
                  </FloatingLabel>
                </Col>
                <Col md={6}>
                  <FloatingLabel label="Cancha">
                    <FormControl 
                      type="text" 
                      name="cancha" 
                      defaultValue={editingEncuentro.cancha || ''} 
                    />
                  </FloatingLabel>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col>
                  <FloatingLabel label="Observaciones">
                    <FormControl 
                      as="textarea" 
                      name="observaciones" 
                      rows={3}
                      defaultValue={editingEncuentro.observaciones || ''} 
                    />
                  </FloatingLabel>
                </Col>
              </Row>
            </Form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowEncuentroModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="encuentro-form">
            Actualizar
          </Button>
        </ModalFooter>
      </Modal>



      {/* Modal para eliminar jornada */}
      <Modal show={showDeleteJornadaModal} onHide={() => setShowDeleteJornadaModal(false)}>
        <ModalHeader closeButton>
          <Modal.Title>
            <LuTrash className="me-2" />
            Eliminar Jornada
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          <Alert variant="danger" className="mb-3">
            <h6><LuTrash className="me-2" />Confirmar Eliminación de Jornada</h6>
            <p className="mb-0">
              <strong>¿Estás seguro de que deseas eliminar la jornada {jornadaAEliminar}?</strong>
            </p>
          </Alert>

          <Alert variant="warning" className="mb-3">
            <h6><LuInfo className="me-2" />Información Importante</h6>
            <ul className="mb-0">
              <li><strong>Se eliminarán:</strong> Todos los encuentros de la jornada {jornadaAEliminar}</li>
              <li><strong>Se eliminará:</strong> El registro de descanso de la jornada {jornadaAEliminar}</li>
              <li><strong>No se puede deshacer:</strong> Esta acción es irreversible</li>
              <li><strong>Restricción:</strong> Solo se pueden eliminar jornadas que no estén cerradas (jugadas)</li>
            </ul>
          </Alert>

          <div className="bg-light p-3 rounded">
            <h6>Jornada a Eliminar: {jornadaAEliminar}</h6>
            <p className="mb-0 text-muted">
              Esta acción eliminará completamente la jornada y todos sus encuentros programados.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteJornadaModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteJornada}
          >
            <LuTrash className="me-1" />
            Eliminar Jornada {jornadaAEliminar}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para crear emparejamiento manual */}
      <Modal show={showCrearEmparejamientoModal} onHide={() => setShowCrearEmparejamientoModal(false)} centered>
        <ModalHeader closeButton>
          <Modal.Title>Crear Emparejamiento</Modal.Title>
        </ModalHeader>
        <ModalBody>
          <Form className="d-grid gap-3">
            <Form.Group>
              <FloatingLabel label="Equipo Local">
                <FormSelect
                  value={formEmparejamiento.equipoLocalId}
                  onChange={(e) => setFormEmparejamiento(f => ({ ...f, equipoLocalId: e.target.value }))}
                >
                  <option value="">Selecciona equipo</option>
                  {equiposParticipantes.map(et => (
                    <option key={et.equipo_id} value={et.equipo_id}>
                      {et.equipo?.nombre || 'Equipo sin nombre'}
                    </option>
                  ))}
                </FormSelect>
              </FloatingLabel>
            </Form.Group>
            <Form.Group>
              <FloatingLabel label="Equipo Visitante">
                <FormSelect
                  value={formEmparejamiento.equipoVisitanteId}
                  onChange={(e) => setFormEmparejamiento(f => ({ ...f, equipoVisitanteId: e.target.value }))}
                >
                  <option value="">Selecciona equipo</option>
                  {equiposParticipantes.map(et => (
                    <option key={et.equipo_id} value={et.equipo_id}>
                      {et.equipo?.nombre || 'Equipo sin nombre'}
                    </option>
                  ))}
                </FormSelect>
              </FloatingLabel>
            </Form.Group>
            <Form.Group>
              <FloatingLabel label="Fecha y hora (opcional)">
                <FormControl
                  type="datetime-local"
                  value={formEmparejamiento.fecha}
                  onChange={(e) => setFormEmparejamiento(f => ({ ...f, fecha: e.target.value }))}
                />
              </FloatingLabel>
            </Form.Group>
            <Form.Group>
              <FloatingLabel label="Horario (opcional)">
                <FormSelect
                  value={formEmparejamiento.horarioId}
                  onChange={(e) => setFormEmparejamiento(f => ({ ...f, horarioId: e.target.value }))}
                >
                  <option value="">Selecciona un horario</option>
                  {horarios.map(horario => (
                    <option key={horario.id} value={horario.id}>
                      {obtenerEtiquetaDia(horario.dia_semana)} - {horario.hora_inicio}
                    </option>
                  ))}
                </FormSelect>
              </FloatingLabel>
              <Form.Text className="text-muted">
                Si seleccionas un horario, se ignorará la hora manual.
              </Form.Text>
            </Form.Group>
            <Form.Group>
              <FloatingLabel label="Cancha (opcional)">
                <FormSelect
                  value={formEmparejamiento.cancha}
                  onChange={(e) => setFormEmparejamiento(f => ({ ...f, cancha: e.target.value }))}
                >
                  <option value="">Selecciona una cancha</option>
                  {canchas.map(cancha => (
                    <option key={cancha.id} value={cancha.nombre}>
                      {cancha.nombre} {cancha.ubicacion && `- ${cancha.ubicacion}`}
                    </option>
                  ))}
                </FormSelect>
              </FloatingLabel>
            </Form.Group>
            <Form.Group>
              <FloatingLabel label="Jornada (opcional)">
                <FormControl
                  type="number"
                  min={1}
                  value={formEmparejamiento.jornada}
                  onChange={(e) => setFormEmparejamiento(f => ({ ...f, jornada: e.target.value }))}
                />
              </FloatingLabel>
            </Form.Group>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCrearEmparejamientoModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleCrearEmparejamiento}>
            Guardar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal del Sistema Dinámico */}
      <DynamicFixtureModal
        show={showDynamicFixtureModal}
        onHide={() => setShowDynamicFixtureModal(false)}
        torneoId={torneoId}
        jornada={jornadaDinamica}
        equipos={equiposParticipantes.map(et => et.equipo!).filter(e => e)}
        onConfirm={handleConfirmarJornadaDinamica}
        isRegenerating={false}
        encuentrosExistentes={encuentros}
        descansosExistentes={equiposDescansan as any}
      />

      {/* Modal de Regeneración Dinámica */}
      <DynamicFixtureModal
        show={showDynamicRegenerateModal}
        onHide={() => setShowDynamicRegenerateModal(false)}
        torneoId={torneoId}
        jornada={jornadaDinamica}
        equipos={equiposParticipantes.map(et => et.equipo!).filter(e => e)}
        onConfirm={handleConfirmarRegeneracionDinamica}
        onRegenerate={handleConfirmarRegeneracionDinamica}
        isRegenerating={true}
        encuentrosExistentes={encuentros}
        descansosExistentes={equiposDescansan as any}
      />

      {/* Modal de Emparejamientos Faltantes */}
      <EmparejamientosFaltantesModal
        show={showEmparejamientosModal}
        onHide={() => setShowEmparejamientosModal(false)}
        torneoId={torneoId}
        onSeleccionarEmparejamientos={handleSeleccionarEmparejamientos}
      />

      {/* Modal para crear/editar horarios */}
      <Modal show={showHorariosModal} onHide={handleCloseHorariosModal} size="lg">
        <ModalHeader closeButton>
          <Modal.Title>
            <LuClock className="me-2" />
            {editingHorario ? 'Editar Horario' : 'Crear Nuevo Horario'}
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          <Form id="horario-form" action={handleCreateHorario}>
            <Row>
              <Col md={6}>
                <FloatingLabel label="Hora Inicio">
                  <FormControl 
                    type="time" 
                    name="hora_inicio" 
                    defaultValue={editingHorario?.hora_inicio || ''}
                    required 
                  />
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Orden">
                  <FormControl 
                    type="number" 
                    name="orden" 
                    defaultValue={editingHorario?.orden || 0}
                    min="0"
                  />
                </FloatingLabel>
              </Col>
            </Row>
            <Row className="mt-3">
              <Col md={6}>
                <FloatingLabel label="Día disponible">
                  <FormSelect 
                    name="dia_semana"
                    defaultValue={editingHorario?.dia_semana || 'viernes'}
                    aria-label="Selecciona el día para el horario"
                  >
                    {DIAS_HORARIOS.map(dia => (
                      <option key={dia.value} value={dia.value}>
                        {dia.label}
                      </option>
                    ))}
                  </FormSelect>
                </FloatingLabel>
              </Col>
              <Col md={6}>
                <FloatingLabel label="Color">
                  <FormControl 
                    type="color" 
                    name="color" 
                    defaultValue={editingHorario?.color || '#007bff'}
                  />
                </FloatingLabel>
              </Col>
            </Row>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={handleCloseHorariosModal}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="horario-form">
            <LuSettings className="me-1" />
            {editingHorario ? 'Actualizar Horario' : 'Crear Horario'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para asignar horario a encuentro */}
      <Modal show={showAsignarHorarioModal} onHide={() => setShowAsignarHorarioModal(false)}>
        <ModalHeader closeButton>
          <Modal.Title>
            <LuClock className="me-2" />
            Modificar Horario y Cancha
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          {editingEncuentro && (
            <div>
              <p className="mb-3">
                <strong>Encuentro:</strong> {editingEncuentro.equipoLocal?.nombre} vs {editingEncuentro.equipoVisitante?.nombre}
              </p>
              
                           
              <div className="mb-3">
                <label className="form-label fw-semibold">Horario:</label>
                <FormSelect 
                  id="horario-select"
                  value={selectedHorarioId || ""}
                  onChange={(e) => setSelectedHorarioId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Seleccionar horario...</option>
                  {horarios.map(horario => (
                    <option key={horario.id} value={horario.id}>
                      {`${obtenerEtiquetaDia(horario.dia_semana)} - ${horario.hora_inicio}`}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Fecha y Hora:</label>
                <FormControl
                  type="datetime-local"
                  value={selectedFecha}
                  onChange={(e) => setSelectedFecha(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Cancha:</label>
                <FormSelect 
                  id="cancha-select"
                  value={selectedCancha}
                  onChange={(e) => setSelectedCancha(e.target.value)}
                >
                  <option value="">Seleccionar cancha...</option>
                  {canchas.filter(cancha => cancha.estado).map((cancha) => (
                    <option key={cancha.id} value={cancha.nombre}>
                      {cancha.nombre} {cancha.ubicacion && `- ${cancha.ubicacion}`}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => {
            setShowAsignarHorarioModal(false)
            // Limpiar estados al cancelar
            setSelectedHorarioId(null)
            setSelectedCancha('')
            setSelectedFecha('')
          }}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              if (editingEncuentro) {
                const horarioIdFinal = selectedHorarioId
                const canchaFinal = selectedCancha || null
                const fechaFinal = selectedFecha || null
                
                handleAsignarHorarioYCancha(editingEncuentro.id, horarioIdFinal, canchaFinal, fechaFinal)
                setShowAsignarHorarioModal(false)
                // Limpiar estados al guardar
                setSelectedHorarioId(null)
                setSelectedCancha('')
                setSelectedFecha('')
              } else {
                setError('Error: Encuentro no encontrado')
              }
            }}
          >
            Guardar Cambios
          </Button>
        </ModalFooter>
      </Modal>


      {/* Modal: Tabla de Distribución de Horarios */}
      <Modal 
        show={showTablaDistribucionModal} 
        onHide={() => setShowTablaDistribucionModal(false)}
        size="xl"
        centered
      >
        <ModalHeader closeButton>
          <Modal.Title>
            <LuInfo className="me-2" />
            Tabla de Distribución de Horarios
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          {/* Sección de Asignación Automática */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 className="mb-0 text-success">
                  <LuSettings className="me-2" size={18} />
                  Redistribución Automática de Horarios
                </h6>
                <small className="text-muted d-block mt-1">
                  Ejecuta redistribución de horarios y canchas para una distribución equitativa
                </small>
                {tablaDistribucion && tablaDistribucion.estadisticas.equiposConDistribucionEquitativa < tablaDistribucion.estadisticas.totalEquipos && (
                  <small className="text-warning d-block mt-1">
                    ⚠️ Se detectaron desequilibrios. Haz clic en &quot;Ejecutar Redistribución&quot; para aplicar horarios y canchas.
                  </small>
                )}
                {tablaDistribucion && tablaDistribucion.estadisticas.equiposConDistribucionEquitativa === tablaDistribucion.estadisticas.totalEquipos && (
                  <small className="text-success d-block mt-1">
                    ✅ Distribución equitativa lograda
                  </small>
                )}
              </div>
              <Button 
                variant="success" 
                size="sm"
                onClick={handleEjecutarRedistribucionCompleta}
                disabled={loading || selectedTorneoIdsHorarios.length === 0}
                className="px-3">
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Redistribuyendo...
                  </>
                ) : (
                  <>
                    <LuSettings className="me-1" size={14} />
                    Ejecutar Redistribución
                  </>
                )}
              </Button>
            </div>
            
            <div className="row g-2">
              <div className="col-md-6">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="reiniciarAsignaciones"
                    checked={reiniciarAsignaciones}
                    onChange={(e) => setReiniciarAsignaciones(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="reiniciarAsignaciones">
                    <small className="fw-semibold">Reiniciar todas las asignaciones</small>
                  </label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="soloEncuentrosSinHorario"
                    checked={soloEncuentrosSinHorario}
                    onChange={(e) => setSoloEncuentrosSinHorario(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="soloEncuentrosSinHorario">
                    <small>Solo encuentros sin horario</small>
                  </label>
                </div>
              </div>
            </div>
            
  
          </div>

          {tablaDistribucion && (
            <div>
              {/* Tabla de Distribución por Equipo */}
              <Card>
                <CardHeader className="bg-light">
                  <h6 className="mb-0">📋 Distribución por Equipo</h6>
                </CardHeader>
                <CardBody>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead className="table-dark">
                        <tr>
                          <th>Equipo</th>
                          {tablaDistribucion.horarios.map((horario: any) => (
                            <th key={horario.id} className="text-center">
                              {horario.hora}
                            </th>
                          ))}
                          <th className="text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tablaDistribucion.equipos.map((equipo: any) => (
                          <tr key={`${equipo.id}-${equipo.torneoId ?? equipo.id}`}>
                            <td className="fw-bold">{equipo.displayName ?? equipo.nombre}</td>
                            {equipo.distribucion.map((dist: any) => (
                              <td key={dist.horario_id} className="text-center">
                                <Badge 
                                  bg={(Number(dist.veces) || 0) >= (Number(tablaDistribucion.estadisticas.vecesMinimas) || 0) && 
                                      (Number(dist.veces) || 0) <= (Number(tablaDistribucion.estadisticas.vecesMaximas) || 0) ? 
                                      "success" : "warning"}
                                >
                                  {Number(dist.veces) || 0}
                                </Badge>
                              </td>
                            ))}
                            <td className="text-center">
                              <Badge bg="primary">{Number(equipo.totalEncuentros) || 0}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  
                  {/* Estadísticas y Leyenda */}
                  <div className="mt-3">
                    <div className="row mb-2">
                      <div className="col-md-6">
                        <small className="text-muted">
                          <strong>Equipos con distribución equitativa:</strong>{' '}
                          <Badge bg={tablaDistribucion.estadisticas.equiposConDistribucionEquitativa === tablaDistribucion.estadisticas.totalEquipos ? "success" : "warning"}>
                            {Number(tablaDistribucion.estadisticas.equiposConDistribucionEquitativa) || 0} / {Number(tablaDistribucion.estadisticas.totalEquipos) || 0}
                          </Badge>
                        </small>
                      </div>
                      <div className="col-md-6">
                        <small className="text-muted">
                          <strong>Rango esperado por horario:</strong>{' '}
                          {tablaDistribucion.estadisticas.vecesMinimas} - {tablaDistribucion.estadisticas.vecesMaximas} veces
                        </small>
                      </div>
                    </div>
                    <small className="text-muted">
                      <Badge bg="success" className="me-2">Verde</Badge> = Distribución equitativa
                      <Badge bg="warning" className="ms-3 me-2">Amarillo</Badge> = Fuera del rango esperado
                    </small>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowTablaDistribucionModal(false)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal: Tabla de Distribución de Canchas */}
      <Modal 
        show={showTablaDistribucionCanchas} 
        onHide={() => setShowTablaDistribucionCanchas(false)}
        size="xl"
        centered
      >
        <ModalHeader closeButton>
          <Modal.Title>
            <LuInfo className="me-2" />
            Tabla de Distribución de Canchas
          </Modal.Title>
        </ModalHeader>
        <ModalBody>
          {tablaDistribucionCanchas && (
            <div>
              {/* Tabla de Distribución por Equipo */}
              <Card>
                <CardHeader className="bg-light">
                  <h6 className="mb-0">📋 Distribución por Equipo</h6>
                </CardHeader>
                <CardBody>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead className="table-dark">
                        <tr>
                          <th>Equipo</th>
                          {tablaDistribucionCanchas.canchas.map((cancha: any) => (
                            <th key={cancha.nombre} className="text-center">
                              {cancha.nombre}
                            </th>
                          ))}
                          <th className="text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tablaDistribucionCanchas.equipos.map((equipo: any) => (
                          <tr key={`${equipo.id}-${equipo.torneoId ?? equipo.id}`}>
                            <td className="fw-bold">{equipo.displayName ?? equipo.nombre}</td>
                            {equipo.distribucion.map((dist: any) => (
                              <td key={dist.cancha} className="text-center">
                                <Badge 
                                  bg={(Number(dist.veces) || 0) >= (Number(tablaDistribucionCanchas.estadisticas.vecesMinimas) || 0) && 
                                      (Number(dist.veces) || 0) <= (Number(tablaDistribucionCanchas.estadisticas.vecesMaximas) || 0) ? 
                                      "success" : "warning"}
                                >
                                  {Number(dist.veces) || 0}
                                </Badge>
                              </td>
                            ))}
                            <td className="text-center">
                              <Badge bg="primary">{Number(equipo.totalEncuentros) || 0}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  
                  {/* Leyenda */}
                  <div className="mt-3">
                    <small className="text-muted">
                      <Badge bg="success" className="me-2">Verde</Badge> = Distribución equitativa
                      <Badge bg="warning" className="ms-3 me-2">Amarillo</Badge> = Fuera del rango esperado
                    </small>
                  </div>
                  
                  {/* Estadísticas */}
                  <div className="mt-3 p-3 bg-light rounded">
                    <h6 className="mb-2">📊 Estadísticas</h6>
                    <div className="row text-center">
                      <div className="col-md-3">
                        <div className="p-2">
                          <h5 className="mb-0 text-primary">{tablaDistribucionCanchas.estadisticas.totalJornadas}</h5>
                          <small className="text-muted">Total Jornadas</small>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="p-2">
                          <h5 className="mb-0 text-info">{tablaDistribucionCanchas.estadisticas.totalCanchas}</h5>
                          <small className="text-muted">Total Canchas</small>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="p-2">
                          <h5 className="mb-0 text-success">
                            {tablaDistribucionCanchas.estadisticas.equiposConDistribucionEquitativa}
                          </h5>
                          <small className="text-muted">Equipos con Distribución Equitativa</small>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="p-2">
                          <h5 className="mb-0 text-warning">
                            {tablaDistribucionCanchas.estadisticas.vecesPorCancha.toFixed(2)}
                          </h5>
                          <small className="text-muted">Veces por Cancha (promedio)</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowTablaDistribucionCanchas(false)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal de Manual de Usuario (contenido según pestaña) */}
      <Modal show={showManualUsuario} onHide={() => setShowManualUsuario(false)} size="lg" centered>
        <ModalHeader closeButton>
          <Modal.Title className="d-flex align-items-center">
            <TbHelp className="me-2" />
            {manualTab === 'equipos' && 'Manual - Equipos Participantes'}
            {manualTab === 'fixture' && 'Manual - Fixture'}
            {manualTab === 'horarios-canchas' && 'Manual - Horarios y Canchas'}
            {manualTab === 'dinamico' && 'Manual - Sistema Dinámico'}
            {manualTab === 'sanciones' && 'Manual - Sanciones'}
          </Modal.Title>
        </ModalHeader>
        <ModalBody style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div className="manual-content">
            {manualTab === 'equipos' && (
              <>
                <Alert variant="info" className="mb-4">
                  <strong>Equipos Participantes</strong>
                  <br />
                  <small>Desde aquí defines qué equipos forman parte del torneo. Solo se listan equipos de la misma categoría del torneo y que estén activos.</small>
                </Alert>
                <h6 className="text-primary mb-2">Agregar Equipos</h6>
                <p>Haz clic en <strong>&quot;Agregar Equipos&quot;</strong>. Se abre un modal con todos los equipos disponibles (de la categoría del torneo). Puedes seleccionar varios a la vez con las casillas. Al confirmar, los equipos quedan inscritos en el torneo. El botón se deshabilita si no hay equipos disponibles (todos ya están o no hay equipos en la categoría).</p>
                <h6 className="text-primary mb-2 mt-3">Generar Fixture</h6>
                <p>Este botón aparece cuando hay <strong>al menos 2 equipos</strong>. Al hacer clic se abre el asistente para generar el fixture (todos contra todos u otra modalidad según el tipo de torneo). Debes generar el fixture antes de poder asignar horarios y canchas a los encuentros.</p>
                <h6 className="text-primary mb-2 mt-3">Tarjetas de equipo</h6>
                <p>Cada equipo se muestra en una tarjeta con: imagen del equipo, nombre, entrenador, <strong>puntos (pts)</strong>, <strong>partidos jugados (PJ)</strong>. El botón <strong>&quot;Remover&quot;</strong> quita al equipo del torneo; no borra el equipo del sistema ni de otras pantallas.</p>
                <Alert variant="warning" className="mb-0 mt-3">
                  <small>Si el torneo no tiene categoría asignada, se mostrarán todos los equipos activos del sistema al agregar.</small>
                </Alert>
              </>
            )}

            {manualTab === 'fixture' && (
              <>
                <Alert variant="info" className="mb-4">
                  <strong>Fixture</strong>
                  <br />
                  <small>Visualizas y gestionas todos los encuentros del torneo por jornada. Aquí se editan resultados, horarios, canchas y estado de cada partido.</small>
                </Alert>
                <h6 className="text-primary mb-2">Descargar Excel</h6>
                <p>Exporta el fixture actual a un archivo Excel con todos los encuentros, jornadas, equipos, horarios y canchas. Útil para imprimir o compartir.</p>
                <h6 className="text-primary mb-2 mt-3">Generar Fixture / Regenerar Fixture</h6>
                <p>Si aún no hay encuentros, el botón dice <strong>&quot;Generar Fixture&quot;</strong>; si ya existen, <strong>&quot;Regenerar Fixture&quot;</strong>. Al hacer clic se abre el asistente que crea todos los partidos según el tipo de torneo (liga, eliminación, grupos). Regenerar reemplaza todo el fixture actual.</p>
                <h6 className="text-primary mb-2 mt-3">Sistema Dinámico</h6>
                <p>Genera una sola jornada con restricciones (por ejemplo, indicar qué equipo debe descansar) sin tocar el resto del fixture. Ideal para ajustar una fecha puntual.</p>
                <h6 className="text-primary mb-2 mt-3">Emparejamientos</h6>
                <p>Muestra un resumen de emparejamientos faltantes o incompletos por jornada. Sirve para detectar si falta algún partido en alguna fecha.</p>
                <h6 className="text-primary mb-2 mt-3">Crear Emparejamiento</h6>
                <p>Añade un partido manual: eliges equipo local, visitante, fecha programada, horario, cancha y jornada. Útil para partidos aplazados o añadidos a mano.</p>
                <h6 className="text-primary mb-2 mt-3">Eliminar Jornada</h6>
                <p>Elimina todos los encuentros de una jornada que indiques. Se pide confirmación. Útil si quieres volver a generar solo esa fecha.</p>
                <h6 className="text-primary mb-2 mt-3">Gestionar Jugadores</h6>
                <p>Enlace a la pantalla de gestión de jugadores de este torneo (inscripción, carnets, etc.).</p>
                <h6 className="text-primary mb-2 mt-3">En cada encuentro (tarjeta)</h6>
                <p>Puedes editar horario, cancha, y eliminar el encuentro. Las tarjetas amarillas y rojas se cargan desde aquí y se reflejan en la pestaña Sanciones.</p>
              </>
            )}

            {manualTab === 'horarios-canchas' && (
              <>
                <Alert variant="info" className="mb-4">
                  <strong>Horarios y Canchas</strong>
                  <br />
                  <small>Configuras las franjas horarias (por día) y asignas automáticamente horario y cancha a cada encuentro. Puedes incluir varios torneos en la redistribución.</small>
                </Alert>
                <h6 className="text-primary mb-2">Torneos a incluir</h6>
                <p>Los chips permiten elegir uno o más torneos para la redistribución. Si el torneo tiene temporada, se listan los torneos de esa temporada; si no, los de la misma categoría. Debes seleccionar al menos un torneo (incluido el actual) para que el botón &quot;Ejecutar Redistribución&quot; esté activo.</p>
                <h6 className="text-primary mb-2 mt-3">Tabla Horarios / Tabla Canchas</h6>
                <p><strong>Tabla Horarios:</strong> Muestra cómo se reparten los encuentros entre los horarios configurados (útil para ver carga por franja). <strong>Tabla Canchas:</strong> Muestra la distribución por cancha. Ambas se habilitan cuando hay datos (horarios creados o encuentros con cancha).</p>
                <h6 className="text-primary mb-2 mt-3">Nuevo Horario</h6>
                <p>Crea una franja horaria: día de la semana (Viernes, Sábado, Domingo), hora de inicio, orden de uso y color. Los horarios se agrupan por día. Luego puedes editar o eliminar cada franja desde la lista. Sin horarios no podrás asignar horarios a los encuentros.</p>
                <h6 className="text-primary mb-2 mt-3">Ejecutar Redistribución</h6>
                <p>Asigna en un solo paso primero <strong>horarios</strong> y después <strong>canchas</strong> a todos los encuentros de los torneos seleccionados. El sistema reparte de forma automática. Requiere: al menos un torneo seleccionado, horarios creados y canchas activas (de la categoría del torneo).</p>
                <h6 className="text-primary mb-2 mt-3">Opciones de redistribución</h6>
                <ul className="mb-0">
                  <li><strong>Reiniciar horarios antes:</strong> Quita todos los horarios ya asignados a los encuentros y vuelve a distribuir desde cero.</li>
                  <li><strong>Reiniciar canchas antes:</strong> Quita las canchas asignadas y vuelve a asignar canchas.</li>
                  <li><strong>Cancha prioritaria:</strong> Si eliges una cancha, el algoritmo la prioriza en la distribución (más partidos en esa cancha). &quot;Distribución equitativa&quot; reparte sin priorizar.</li>
                </ul>
                <p className="mt-3 mb-0">Las canchas disponibles son las activas asociadas a la categoría del torneo. El resumen lateral muestra cuántos encuentros tienen cancha y cuántos no.</p>
              </>
            )}

            {manualTab === 'dinamico' && (
              <>
                <Alert variant="info" className="mb-4">
                  <strong>Sistema Dinámico de Fixture</strong>
                  <br />
                  <small>Genera jornadas una a una con restricciones (descansos forzados, equilibrio entre equipos) sin regenerar todo el fixture.</small>
                </Alert>
                <h6 className="text-primary mb-2">Generar Jornada Dinámica</h6>
                <p>Al hacer clic se abre un asistente donde puedes indicar qué equipo(s) deben <strong>descansar</strong> en esa jornada. El sistema propone emparejamientos válidos: no repite partidos ya jugados y respeta los descansos indicados. Puedes revisar la propuesta y confirmar o ver alternativas antes de guardar.</p>
                <h6 className="text-primary mb-2 mt-3">Estado de Equipos</h6>
                <p>Lista cada equipo y la cantidad de <strong>descansos</strong> que lleva hasta el momento. Sirve para equilibrar y decidir quién debe descansar en la próxima jornada.</p>
                <h6 className="text-primary mb-2 mt-3">Jornadas Generadas</h6>
                <p>Muestra las jornadas que ya fueron generadas con este sistema (badges por número de jornada). Si no hay ninguna, verás el mensaje &quot;No hay jornadas generadas aún&quot;.</p>
                <Alert variant="success" className="mb-0 mt-3">
                  <small>Recomendado cuando necesitas controlar descansos, localías o restricciones por fecha sin modificar el resto del calendario.</small>
                </Alert>
              </>
            )}

            {manualTab === 'sanciones' && (
              <>
                <Alert variant="info" className="mb-4">
                  <strong>Sanciones y Tarjetas</strong>
                  <br />
                  <small>Consulta tarjetas amarillas, rojas y jugadores sancionados. Los datos se alimentan desde los partidos finalizados en la pestaña Fixture.</small>
                </Alert>
                <h6 className="text-primary mb-2">Requisito para ver datos</h6>
                <p>Solo se muestran estadísticas cuando hay partidos en estado <strong>finalizado</strong> y con sanciones cargadas. Las tarjetas se registran al editar cada encuentro en la pestaña Fixture (resultado y tarjetas por jugador). Si no hay partidos finalizados, verás el mensaje explicativo.</p>
                <h6 className="text-primary mb-2 mt-3">Jugadores con Sanciones</h6>
                <p>Tabla con: jugador (foto y nombre), equipo, cantidad de tarjetas amarillas, rojas, total de tarjetas, estado (Sancionado o Disponible) y partidos que debe cumplir de sanción. Un jugador aparece como &quot;Sancionado&quot; cuando acumula 5 amarillas o tiene roja y debe cumplir partido(s) sin jugar.</p>
                <h6 className="text-primary mb-2 mt-3">Reglas de sanciones</h6>
                <ul>
                  <li><strong>Tarjeta amarilla:</strong> Advertencia; se acumulan.</li>
                  <li><strong>5 amarillas:</strong> 1 partido de sanción (no puede jugar el siguiente partido).</li>
                  <li><strong>Tarjeta roja:</strong> 1 partido de sanción.</li>
                </ul>
                <h6 className="text-primary mb-2 mt-3">Sanciones por Equipo</h6>
                <p>Resumen por equipo: total de amarillas y rojas. Útil para comparar disciplina entre equipos.</p>
                <Alert variant="warning" className="mb-0 mt-3">
                  <small>Para que un jugador aparezca aquí, las tarjetas deben haberse cargado en el partido correspondiente (editar encuentro en Fixture y guardar amarillas/rojas).</small>
                </Alert>
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowManualUsuario(false)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Toast de PrimeReact */}
      <Toast ref={toast} position="top-right" />

    </Container>
  )
}

export default TorneoDetailPage
