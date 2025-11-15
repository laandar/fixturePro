'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import '@/styles/mobile-tabs.css'
import { Toast } from 'primereact/toast'
import 'primereact/resources/themes/lara-light-cyan/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Alert, Badge, Nav, NavItem, NavLink, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormControl, FloatingLabel, FormSelect, Tab } from 'react-bootstrap'
import { LuTrophy, LuCalendar, LuUsers, LuGamepad2, LuSettings, LuPlus, LuTrash, LuTriangle, LuCheck, LuX, LuClock, LuFilter, LuDownload, LuInfo } from 'react-icons/lu'
import { getTorneoById, addEquiposToTorneo, removeEquipoFromTorneo, generateFixtureForTorneo, getEncuentrosByTorneo, updateEncuentro, regenerateFixtureFromJornada, deleteJornada, getEquiposDescansan, crearJornadaConEmparejamientos, getJugadoresByTorneo, updateFechaJornada, asignarCanchasAutomaticamente, generarTablaDistribucionCanchas } from '../actions'
import { getTarjetasTorneo } from '../../gestion-jugadores/actions'
import { confirmarJornada,  confirmarRegeneracionJornada } from '../dynamic-actions'
import { getEquiposByCategoria } from '../../equipos/actions'
import { getHorarios, createHorario, updateHorario, deleteHorario, asignarHorarioAEncuentro, asignarHorariosAutomaticamente, asignarHorariosPorJornada, generarTablaDistribucionHorarios } from '../horarios-actions'
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
      setTorneo((torneoData ?? null) as TorneoWithRelations | null)
      
      // Luego cargar el resto de datos en paralelo, incluyendo solo equipos de la categoría del torneo
      const [equiposData, encuentrosData, descansosData, horariosData, canchasData] = await Promise.all([
        torneoData?.categoria_id ? getEquiposByCategoria(torneoData.categoria_id) : [],
        getEncuentrosByTorneo(torneoId),
        getEquiposDescansan(torneoId),
        getHorarios(),
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar datos'
      setError(errorMessage)
      toast.current?.show({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (torneoId) {
      loadData()
    }
  }, [torneoId])

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
    setSelectedCancha(encuentro.cancha || '')
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
        await updateHorario(editingHorario.id, formData)
        setSuccess('Horario actualizado exitosamente')
      } else {
        await createHorario(formData)
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
      await updateHorario(id, formData)
      setSuccess('Horario actualizado exitosamente')
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar horario')
    }
  }

  const handleDeleteHorario = async (id: number) => {
    try {
      await deleteHorario(id)
      setSuccess('Horario eliminado exitosamente')
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar horario')
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

  const handleAsignarHorarioYCancha = async (encuentroId: number, horarioId: number | null, cancha: string | null) => {
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
        formData.append('cancha', cancha || '')
        await updateEncuentro(encuentroId, formData)
        actualizaciones.push('cancha')
      }
      
      if (actualizaciones.length > 0) {
        setSuccess(`${actualizaciones.join(' y ')} ${actualizaciones.length === 1 ? 'actualizado' : 'actualizados'} exitosamente`)
        await loadData()
      } else {
        setSuccess('No se realizaron cambios')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar horario y cancha')
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
      const resultado = await generarTablaDistribucionHorarios(torneoId)
      if (resultado.success) {
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
    try {
      setLoading(true)
      
      // Ejecutar asignación automática con configuración seleccionada
      const resultadoAsignacion = await asignarHorariosAutomaticamente(torneoId, {
        reiniciarAsignaciones: reiniciarAsignaciones,
        soloEncuentrosSinHorario: soloEncuentrosSinHorario,
        ordenPorJornada: true
      })

      if (resultadoAsignacion?.success) {
        setSuccess(`Asignación automática completada: ${resultadoAsignacion.asignacionesRealizadas} encuentros actualizados`)
        
        // Recargar datos
        await loadData()
        
        // Generar nueva tabla de distribución
        const resultadoTabla = await generarTablaDistribucionHorarios(torneoId)
        if (resultadoTabla.success) {
          setTablaDistribucion(resultadoTabla.tabla)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error en la asignación automática')
    } finally {
      setLoading(false)
    }
  }

  const handleMostrarTablaDistribucionCanchas = async () => {
    try {
      setLoading(true)
      const resultado = await generarTablaDistribucionCanchas(torneoId)
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
    try {
      setLoading(true)
      
      // Ejecutar asignación automática de canchas con configuración seleccionada
      const resultadoAsignacion = await asignarCanchasAutomaticamente(torneoId, {
        reiniciarAsignaciones: reiniciarAsignacionesCanchas,
        soloEncuentrosSinCancha: soloEncuentrosSinCancha,
        ordenPorJornada: true,
        canchaPrioritariaId: canchaPrioritariaId || null
      })

      if (resultadoAsignacion?.success) {
        const mensaje = resultadoAsignacion.mensaje || `Asignación automática completada: ${resultadoAsignacion.asignacionesRealizadas} encuentros actualizados`
        setSuccess(mensaje)
        toast.current?.show({ severity: 'success', summary: 'Éxito', detail: mensaje, life: 5000 })
        
        // Recargar datos
        await loadData()
        
        // Actualizar tabla de distribución si está abierta
        if (showTablaDistribucionCanchas) {
          const resultadoTabla = await generarTablaDistribucionCanchas(torneoId)
          if (resultadoTabla.success) {
            setTablaDistribucionCanchas(resultadoTabla.tabla)
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en la asignación automática de canchas'
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

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Detalle del Torneo" subtitle="Apps" />
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    )
  }

  if (!torneo) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Torneo no encontrado" subtitle="Apps" />
        <Alert variant="danger">El torneo no fue encontrado</Alert>
      </Container>
    )
  }

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
              <div className="d-flex gap-2">
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
                      <NavItem className="flex-shrink-0">
                        <NavLink 
                          eventKey="horarios"
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
                          Horarios
                        </NavLink>
                      </NavItem>
                      <NavItem className="flex-shrink-0">
                        <NavLink 
                          eventKey="canchas"
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
                          <span className="d-none d-sm-inline">Asignar Canchas</span>
                          <span className="d-sm-none">Canchas</span>
                        </NavLink>
                      </NavItem>
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
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Equipos Participantes ({equiposParticipantes.length})</h5>
                    <div className="d-flex gap-2">
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
                              <Badge bg="primary">{equipoTorneo.puntos ?? 0} pts</Badge>
                              <Badge bg="secondary">{equipoTorneo.partidos_jugados ?? 0} PJ</Badge>
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
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Sistema Dinámico de Fixture</h5>
                    <div className="d-flex gap-2">
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

                {/* Tab: Horarios */}
                <Tab.Pane eventKey="horarios">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold text-primary mb-0">🕐 Gestión de Horarios</h4>
                    <div className="d-flex gap-2">
                      <Button 
                        variant="info" 
                        size="sm"
                        onClick={handleMostrarTablaDistribucion}
                        disabled={horarios.length === 0}
                        className="px-3">
                        <LuInfo className="me-1" size={16} />
                        Tabla
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => setShowHorariosModal(true)}
                        className="px-3">
                        <LuPlus className="me-1" size={16} />
                        Nuevo
                      </Button>
                    </div>
                  </div>

                  <Alert variant="info" className="mb-3 py-2">
                    <div className="d-flex align-items-center">
                      <LuClock className="me-2" size={16} />
                      <small className="mb-0">
                        <strong>Horarios:</strong> Define tiempos específicos para cada encuentro con asignación automática y distribución equitativa.
                      </small>
                    </div>
                  </Alert>

                  <Row>
                    <Col md={8}>
                      <Card>
                        <CardHeader className="bg-light py-3">
                          <h5 className="mb-0 fw-bold text-primary">
                            <LuClock className="me-2" size={18} />Horarios Disponibles
                          </h5>
                        </CardHeader>
                        <CardBody>
                          {horarios.length === 0 ? (
                            <div className="text-center py-5">
                              <LuClock className="fs-1 text-muted mb-4" style={{fontSize: '4rem'}} />
                              <h4 className="mb-3">No hay horarios configurados</h4>
                              <p className="text-muted fs-5 mb-4">Crea horarios para poder asignarlos a los encuentros</p>
                              <Button 
                                variant="primary" 
                                size="lg"
                                onClick={() => setShowHorariosModal(true)}
                                className="px-5">
                                <LuPlus className="me-2" size={20} />
                                Crear Primer Horario
                              </Button>
                            </div>
                          ) : (
                            <div className="d-flex flex-column gap-4">
                              {DIAS_HORARIOS.map(dia => {
                                const horariosPorDia = horarios.filter(
                                  horario => normalizarDiaHorario(horario.dia_semana) === dia.value
                                )
                                
                                return (
                                  <div key={dia.value}>
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <div className="d-flex align-items-center gap-2">
                                        <Badge bg={dia.badge} pill className="text-uppercase">
                                          {dia.label}
                                        </Badge>
                                        <small className="text-muted">
                                          {horariosPorDia.length === 0
                                            ? 'Sin horarios configurados'
                                            : `${horariosPorDia.length} horario${horariosPorDia.length > 1 ? 's' : ''}`}
                                        </small>
                                      </div>
                                      {horariosPorDia.length > 0 && (
                                        <small className="text-muted">
                                          Ordenados por hora y prioridad
                                        </small>
                                      )}
                                    </div>
                                    
                                    {horariosPorDia.length === 0 ? (
                                      <div className="py-2 text-muted fst-italic">
                                        No hay horarios configurados para este día.
                                      </div>
                                    ) : (
                                      <div className="row g-3">
                                        {horariosPorDia.map(horario => (
                                          <div key={horario.id} className="col-md-6 col-lg-4">
                                            <div className="card h-100 border-0 shadow-sm">
                                              <div className="card-body p-3">
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                  <div 
                                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                                    style={{
                                                      width: '40px', 
                                                      height: '40px', 
                                                      backgroundColor: horario.color || '#007bff',
                                                      fontSize: '14px'
                                                    }}
                                                  >
                                                    {horario.orden}
                                                  </div>
                                                  <div className="d-flex gap-1">
                                                    <Button 
                                                      variant="outline-primary" 
                                                      size="sm"
                                                      onClick={() => handleEditHorario(horario)}
                                                      title="Editar horario"
                                                      className="p-2">
                                                      <LuSettings size={14} />
                                                    </Button>
                                                    <Button 
                                                      variant="outline-danger" 
                                                      size="sm"
                                                      onClick={() => handleDeleteHorario(horario.id)}
                                                      title="Eliminar horario"
                                                      className="p-2">
                                                      <LuTrash size={14} />
                                                    </Button>
                                                  </div>
                                                </div>
                                                <h5 className="mb-1 fw-bold text-primary">{horario.hora_inicio}</h5>
                                                <small className="text-muted d-block">
                                                  Orden: {horario.orden}
                                                </small>
                                                <small className="text-muted">
                                                  Día: {obtenerEtiquetaDia(horario.dia_semana)}
                                                </small>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* Tab: Asignar Canchas */}
                <Tab.Pane eventKey="canchas">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold text-primary mb-0">🏟️ Asignación Automática de Canchas</h4>
                    <div className="d-flex gap-2">
                      <Button 
                        variant="info" 
                        size="sm"
                        onClick={handleMostrarTablaDistribucionCanchas}
                        disabled={encuentros.filter(e => e.cancha && e.cancha.trim() !== '').length === 0}
                        className="px-3">
                        <LuInfo className="me-1" size={16} />
                        Ver Distribución
                      </Button>
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={handleEjecutarAsignacionCanchas}
                        disabled={loading || canchas.filter(c => c.estado).length === 0}
                        className="px-3">
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            Ejecutando...
                          </>
                        ) : (
                          <>
                            <LuSettings className="me-1" size={16} />
                            Ejecutar Asignación
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Alert variant="info" className="mb-3 py-2">
                    <div className="d-flex align-items-center">
                      <LuInfo className="me-2" size={16} />
                      <small className="mb-0">
                        <strong>Asignación Automática:</strong> Opcionalmente selecciona una cancha prioritaria que recibirá los primeros partidos hasta completar su capacidad (número de horarios disponibles). Si no seleccionas una cancha prioritaria, los partidos se distribuirán equitativamente entre todas las canchas disponibles.
                      </small>
                    </div>
                  </Alert>

                  <Row>
                    <Col md={8}>
                      <Card>
                        <CardHeader className="bg-light py-3">
                          <h5 className="mb-0 fw-bold text-primary">
                            ⚙️ Configuración de Asignación
                          </h5>
                        </CardHeader>
                        <CardBody>
                          <div className="row g-3">
                            <div className="col-md-12 mb-3">
                              <label htmlFor="canchaPrioritaria" className="form-label fw-semibold">
                                🏆 Cancha Prioritaria <span className="text-muted">(Opcional)</span>
                              </label>
                              <FormSelect
                                id="canchaPrioritaria"
                                value={canchaPrioritariaId || ''}
                                onChange={(e) => setCanchaPrioritariaId(e.target.value ? parseInt(e.target.value) : null)}
                              >
                                <option value="">Sin cancha prioritaria (distribución equitativa)</option>
                                {canchas.filter(c => c.estado).map((cancha) => (
                                  <option key={cancha.id} value={cancha.id}>
                                    {cancha.nombre} {cancha.ubicacion && `- ${cancha.ubicacion}`}
                                  </option>
                                ))}
                              </FormSelect>
                              <small className="text-muted d-block mt-1">
                                Si seleccionas una cancha prioritaria, recibirá los primeros partidos hasta completar su capacidad (número de horarios disponibles). Si no seleccionas ninguna, los partidos se distribuirán equitativamente entre todas las canchas disponibles.
                              </small>
                            </div>
                            <div className="col-md-6">
                              <div className="form-check">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  id="reiniciarAsignacionesCanchas"
                                  checked={reiniciarAsignacionesCanchas}
                                  onChange={(e) => setReiniciarAsignacionesCanchas(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="reiniciarAsignacionesCanchas">
                                  <small className="fw-semibold">Reiniciar todas las asignaciones</small>
                                  <br />
                                  <small className="text-muted">Elimina las canchas asignadas antes de asignar nuevas</small>
                                </label>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="form-check">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  id="soloEncuentrosSinCancha"
                                  checked={soloEncuentrosSinCancha}
                                  onChange={(e) => setSoloEncuentrosSinCancha(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="soloEncuentrosSinCancha">
                                  <small className="fw-semibold">Solo encuentros sin cancha</small>
                                  <br />
                                  <small className="text-muted">Asigna canchas solo a encuentros que no tienen cancha asignada</small>
                                </label>
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                    <Col md={4}>
                      <Card>
                        <CardHeader className="bg-light py-3">
                          <h6 className="mb-0">📊 Canchas Disponibles</h6>
                          {torneo?.categoria && (
                            <small className="text-muted">Categoría: {torneo.categoria.nombre}</small>
                          )}
                        </CardHeader>
                        <CardBody>
                          {canchas.filter(c => c.estado).length === 0 ? (
                            <div className="text-center py-3">
                              <p className="text-muted mb-0">
                                {torneo?.categoria 
                                  ? `No hay canchas activas para la categoría ${torneo.categoria.nombre}`
                                  : 'No hay canchas activas'}
                              </p>
                            </div>
                          ) : (
                            <div className="d-grid gap-2">
                              {canchas.filter(c => c.estado).map(cancha => (
                                <div key={cancha.id} className="d-flex align-items-center gap-2 p-2 bg-light rounded">
                                  <div 
                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                    style={{
                                      width: '32px', 
                                      height: '32px', 
                                      backgroundColor: '#28a745',
                                      fontSize: '12px'
                                    }}
                                  >
                                    ✓
                                  </div>
                                  <div className="flex-grow-1">
                                    <strong>{cancha.nombre}</strong>
                                    {cancha.ubicacion && (
                                      <small className="d-block text-muted">{cancha.ubicacion}</small>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>

                  <Row className="mt-3">
                    <Col>
                      <Card>
                        <CardHeader className="bg-light py-3">
                          <h6 className="mb-0">📋 Resumen de Encuentros</h6>
                        </CardHeader>
                        <CardBody>
                          <div className="row text-center">
                            <Col md={4}>
                              <div className="p-3 bg-light rounded">
                                <h4 className="mb-0 text-primary">{encuentros.length}</h4>
                                <small className="text-muted">Total Encuentros</small>
                              </div>
                            </Col>
                            <Col md={4}>
                              <div className="p-3 bg-light rounded">
                                <h4 className="mb-0 text-success">
                                  {encuentros.filter(e => e.cancha && e.cancha.trim() !== '').length}
                                </h4>
                                <small className="text-muted">Con Cancha Asignada</small>
                              </div>
                            </Col>
                            <Col md={4}>
                              <div className="p-3 bg-light rounded">
                                <h4 className="mb-0 text-warning">
                                  {encuentros.filter(e => !e.cancha || e.cancha.trim() === '').length}
                                </h4>
                                <small className="text-muted">Sin Cancha Asignada</small>
                              </div>
                            </Col>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* Tab: Sanciones */}
                <Tab.Pane eventKey="sanciones">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h5 className="mb-1">🟨🟥 Sanciones y Tarjetas</h5>
                      <p className="text-muted mb-0">Control de tarjetas amarillas, rojas y jugadores sancionados</p>
                    </div>
                    <div className="d-flex gap-2">
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
                                          <Badge bg="warning" className="text-dark">{item.amarillas} 🟨</Badge>
                                          <Badge bg="danger">{item.rojas} 🟥</Badge>
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
          <p className="text-muted mb-3">
            Selecciona los equipos que deseas agregar al torneo:
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
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAddEquiposModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleAddEquipos}>
            Agregar Equipos
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
          }}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              if (editingEncuentro) {
                // Usar los estados en lugar de obtener del DOM
                const horarioIdFinal = selectedHorarioId
                const canchaFinal = selectedCancha || null
                
                handleAsignarHorarioYCancha(editingEncuentro.id, horarioIdFinal, canchaFinal)
                setShowAsignarHorarioModal(false)
                // Limpiar estados al guardar
                setSelectedHorarioId(null)
                setSelectedCancha('')
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
              <h6 className="mb-0 text-success">
                <LuSettings className="me-2" size={18} />
                Asignación Automática de Horarios
              </h6>
              <Button 
                variant="success" 
                size="sm"
                onClick={handleEjecutarAsignacionAutomatica}
                disabled={loading}
                className="px-3">
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Ejecutando...
                  </>
                ) : (
                  <>
                    <LuSettings className="me-1" size={14} />
                    Ejecutar Asignación
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
                          <tr key={equipo.id}>
                            <td className="fw-bold">{equipo.nombre}</td>
                            {equipo.distribucion.map((dist: any) => (
                              <td key={dist.horario_id} className="text-center">
                                <Badge 
                                  bg={dist.veces >= tablaDistribucion.estadisticas.vecesMinimas && 
                                      dist.veces <= tablaDistribucion.estadisticas.vecesMaximas ? 
                                      "success" : "warning"}
                                >
                                  {dist.veces}
                                </Badge>
                              </td>
                            ))}
                            <td className="text-center">
                              <Badge bg="primary">{equipo.totalEncuentros}</Badge>
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
                          <tr key={equipo.id}>
                            <td className="fw-bold">{equipo.nombre}</td>
                            {equipo.distribucion.map((dist: any) => (
                              <td key={dist.cancha} className="text-center">
                                <Badge 
                                  bg={dist.veces >= tablaDistribucionCanchas.estadisticas.vecesMinimas && 
                                      dist.veces <= tablaDistribucionCanchas.estadisticas.vecesMaximas ? 
                                      "success" : "warning"}
                                >
                                  {dist.veces}
                                </Badge>
                              </td>
                            ))}
                            <td className="text-center">
                              <Badge bg="primary">{equipo.totalEncuentros}</Badge>
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

      {/* Toast de PrimeReact */}
      <Toast ref={toast} position="top-right" />

    </Container>
  )
}

export default TorneoDetailPage
