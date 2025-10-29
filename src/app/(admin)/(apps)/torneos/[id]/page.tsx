'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import '@/styles/mobile-tabs.css'
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Alert, Badge, Nav, NavItem, NavLink, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormControl, FloatingLabel, FormSelect, Tab } from 'react-bootstrap'
import { LuTrophy, LuCalendar, LuUsers, LuGamepad2, LuSettings, LuPlus, LuTrash, LuTriangle, LuCheck, LuX, LuClock, LuFilter, LuDownload, LuInfo } from 'react-icons/lu'
import { getTorneoById, addEquiposToTorneo, removeEquipoFromTorneo, generateFixtureForTorneo, getEncuentrosByTorneo, updateEncuentro, regenerateFixtureFromJornada, deleteJornada, getEquiposDescansan, crearJornadaConEmparejamientos } from '../actions'
import { getGolesTorneo, getTarjetasTorneo } from '../../gestion-jugadores/actions'
import { generarPropuestaJornada, confirmarJornada, regenerarJornadaDinamica, confirmarRegeneracionJornada } from '../dynamic-actions'
import { getCategorias, getEquipos, getEquiposByCategoria } from '../../equipos/actions'
import { getJugadores } from '../../jugadores/actions'
import { getHorarios, createHorario, updateHorario, deleteHorario, asignarHorarioAEncuentro, asignarHorariosAutomaticamente, asignarHorariosPorJornada, generarTablaDistribucionHorarios } from '../horarios-actions'
import { getCanchas } from '@/app/(admin)/(apps)/canchas/actions'
import type { TorneoWithRelations, EquipoWithRelations, Categoria, EncuentroWithRelations, Horario, Gol, Tarjeta } from '@/db/types'
import type { DynamicFixtureResult, JornadaPropuesta } from '@/lib/dynamic-fixture-generator'
import DynamicFixtureModal from '@/components/DynamicFixtureModal'
import EmparejamientosFaltantesModal from '@/components/EmparejamientosFaltantesModal'
import EncuentroCard from '@/components/EncuentroCard'
import { saveAs } from 'file-saver'
import { exportFixtureToExcel } from '@/lib/excel-exporter'
import { 
  getAllEstadisticas,
  getEstadisticasGoleadores,
  getEstadisticasGenerales,
  getEstadisticasDetalladas,
  getEstadisticasSanciones,
  getEstadisticasGeneralesSanciones,
  getSancionesPorEquipo,
  getGoleadoresPorEquipo,
  getEstadisticasEquipos
} from '@/lib/torneo-statistics'

const TorneoDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const torneoId = parseInt(params.id as string)
  
  const [torneo, setTorneo] = useState<TorneoWithRelations | null>(null)
  const [equiposDisponibles, setEquiposDisponibles] = useState<EquipoWithRelations[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [encuentros, setEncuentros] = useState<EncuentroWithRelations[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [canchas, setCanchas] = useState<any[]>([])
  const [goles, setGoles] = useState<Gol[]>([])
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [todosJugadores, setTodosJugadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
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
  
  // Estados para el sistema dinámico
  const [showDynamicFixtureModal, setShowDynamicFixtureModal] = useState(false)
  const [showDynamicRegenerateModal, setShowDynamicRegenerateModal] = useState(false)
  const [jornadaDinamica, setJornadaDinamica] = useState<number>(1)
  const [isRegenerating, setIsRegenerating] = useState(false)
  
  // Estado para tabs
  const [activeTab, setActiveTab] = useState('general')

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
      const [equiposData, categoriasData, encuentrosData, descansosData, horariosData, canchasData, jugadoresData] = await Promise.all([
        torneoData?.categoria_id ? getEquiposByCategoria(torneoData.categoria_id) : [],
        getCategorias(),
        getEncuentrosByTorneo(torneoId),
        getEquiposDescansan(torneoId),
        getHorarios(),
        getCanchas(),
        getJugadores()
      ])
      
      // Cargar goles del torneo
      let golesData: Gol[] = []
      try {
        golesData = await getGolesTorneo(torneoId)
        console.log('Goles cargados del torneo:', golesData.length)
      } catch (error) {
        console.error('Error al cargar goles del torneo:', error)
      }

      // Cargar tarjetas del torneo
      let tarjetasData: Tarjeta[] = []
      try {
        tarjetasData = await getTarjetasTorneo(torneoId)
        console.log('Tarjetas cargadas del torneo:', tarjetasData.length)
      } catch (error) {
        console.error('Error al cargar tarjetas del torneo:', error)
      }
      
      setEquiposDisponibles(equiposData)
      setCategorias(categoriasData)
      setEncuentros(encuentrosData as any)
      setHorarios(horariosData)
      setCanchas(canchasData)
      setGoles(golesData)
      setTarjetas(tarjetasData)
      setTodosJugadores(jugadoresData)
      
      // Cargar equipos que descansan desde la base de datos
      setEquiposDescansan(descansosData)
      
      
      console.log('Equipos que descansan cargados desde BD:', descansosData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (torneoId) {
      loadData()
    }
  }, [torneoId])

  const handleAddEquipos = async () => {
    if (selectedEquipos.length === 0) {
      setError('Debes seleccionar al menos un equipo')
      return
    }

    try {
      await addEquiposToTorneo(torneoId, selectedEquipos)
      setSuccess('Equipos agregados exitosamente')
      setSelectedEquipos([])
      setShowAddEquiposModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al agregar equipos')
    }
  }

  const handleRemoveEquipo = async (equipoId: number) => {
    try {
      await removeEquipoFromTorneo(torneoId, equipoId)
      setSuccess('Equipo removido exitosamente')
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al remover equipo')
    }
  }

  const handleGenerateFixture = async () => {
    if (!torneo?.equiposTorneo || torneo.equiposTorneo.length < 2) {
      setError('Se necesitan al menos 2 equipos para generar un fixture')
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
      
      setSuccess(`Fixture generado exitosamente con ${result.encuentrosCreados} encuentros`)
      setShowFixtureModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al generar fixture')
    }
  }



  const handleUpdateEncuentro = async (formData: FormData) => {
    if (!editingEncuentro) return

    try {
      await updateEncuentro(editingEncuentro.id, formData)
      setSuccess('Encuentro actualizado exitosamente')
      setShowEncuentroModal(false)
      setEditingEncuentro(null)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar encuentro')
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
    // Almacenar parámetros en localStorage
    localStorage.setItem('gestion-jugadores-torneo', torneoId.toString())
    localStorage.setItem('gestion-jugadores-jornada', (encuentro.jornada || 1).toString())
    localStorage.setItem('gestion-jugadores-equipoLocalId', encuentro.equipo_local_id.toString())
    localStorage.setItem('gestion-jugadores-equipoVisitanteId', encuentro.equipo_visitante_id.toString())
    localStorage.setItem('gestion-jugadores-nombreEquipoLocal', encuentro.equipoLocal?.nombre || '')
    localStorage.setItem('gestion-jugadores-nombreEquipoVisitante', encuentro.equipoVisitante?.nombre || '')
    
    // Navegar a la página de gestión de jugadores
    router.push('/gestion-jugadores')
  }




  const handleDeleteJornada = async () => {
    try {
      const result = await deleteJornada(torneoId, jornadaAEliminar)
      
      setSuccess(result.mensaje)
      setShowDeleteJornadaModal(false)
      await loadData()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al eliminar jornada')
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

  // Función para obtener estadísticas de goleadores (ahora usa la función externa)
  const getEstadisticasGoleadoresLocal = () => {
    return getEstadisticasGoleadores(goles, todosJugadores)
  }

  const getEstadisticasGeneralesLocal = () => {
    return getEstadisticasGenerales(goles, encuentros, todosJugadores)
  }

  const getEstadisticasDetalladasLocal = () => {
    return getEstadisticasDetalladas(goles, encuentros)
  }

  const getEstadisticasSancionesLocal = () => {
    return getEstadisticasSanciones(tarjetas, todosJugadores)
  }

  const getEstadisticasGeneralesSancionesLocal = () => {
    return getEstadisticasGeneralesSanciones(tarjetas, encuentros)
  }

  const getSancionesPorEquipoLocal = () => {
    return getSancionesPorEquipo(tarjetas, equiposParticipantes)
  }

  const getGoleadoresPorEquipoLocal = () => {
    return getGoleadoresPorEquipo(goles, equiposParticipantes)
  }

  const getEstadisticasEquiposLocal = () => {
    return getEstadisticasEquipos(encuentros, goles, equiposParticipantes)
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

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

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
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'general')}>
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
                          eventKey="general"
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
                          <span className="d-none d-sm-inline">Información General</span>
                          <span className="d-sm-none">General</span>
                        </NavLink>
                      </NavItem>
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
                          eventKey="tabla"
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
                          <span className="d-none d-sm-inline">Tabla de Posiciones</span>
                          <span className="d-sm-none">Tabla</span>
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
                          eventKey="goleadores"
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
                          Goleadores
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
                {/* Tab: Información General */}
                <Tab.Pane eventKey="general">
                  <Row>
                    <Col md={6}>
                      <h5>Detalles del Torneo</h5>
                      <Table borderless>
                        <tbody>
                          <tr>
                            <td><strong>Nombre:</strong></td>
                            <td>{torneo.nombre}</td>
                          </tr>
                          <tr>
                            <td><strong>Descripción:</strong></td>
                            <td>{torneo.descripcion || 'Sin descripción'}</td>
                          </tr>
                          <tr>
                            <td><strong>Tipo:</strong></td>
                            <td>
                              <Badge bg={torneo.tipo_torneo === 'liga' ? 'primary' : 'warning'}>
                                {torneo.tipo_torneo === 'liga' ? 'Liga' : 
                                 torneo.tipo_torneo === 'eliminacion' ? 'Eliminación' : 'Grupos'}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Permite Revancha:</strong></td>
                            <td>
                              <Badge bg={torneo.permite_revancha ? 'success' : 'secondary'}>
                                {torneo.permite_revancha ? 'Sí' : 'No'}
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h5>Estadísticas</h5>
                      <div className="d-grid gap-3">
                        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                          <span>Total de Equipos:</span>
                          <Badge bg="primary">{equiposParticipantes.length}</Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                          <span>Total de Encuentros:</span>
                          <Badge bg="success">{encuentros.length}</Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                          <span>Encuentros Jugados:</span>
                          <Badge bg="info">{encuentros.filter(e => e.estado === 'finalizado').length}</Badge>
                        </div>
                        <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                          <span>Encuentros Pendientes:</span>
                          <Badge bg="warning">{encuentros.filter(e => e.estado === 'programado').length}</Badge>
                        </div>
                      </div>
                    </Col>
                  </Row>


                </Tab.Pane>

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
                  {/* Botones de acciones - siempre visibles */}
                  <div className="d-flex justify-content-center mb-4">
                    <div className="d-flex flex-wrap gap-2 justify-content-center w-100">
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={handleDownloadFixtureExcel}
                        disabled={encuentros.length === 0}
                        className="px-2 px-md-3 flex-fill flex-md-grow-0"
                        style={{ minWidth: '120px', maxWidth: '200px' }}>
                        <LuDownload className="me-1" />
                        <span className="d-none d-sm-inline">Descargar Excel</span>
                        <span className="d-sm-none">Excel</span>
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => setShowFixtureModal(true)}
                        className="px-2 px-md-3 flex-fill flex-md-grow-0"
                        style={{ minWidth: '120px', maxWidth: '200px' }}>
                        <LuSettings className="me-1" />
                        <span className="d-none d-sm-inline">
                          {encuentros.length === 0 ? 'Generar Fixture' : 'Regenerar Fixture'}
                        </span>
                        <span className="d-sm-none">
                          {encuentros.length === 0 ? 'Generar' : 'Regenerar'}
                        </span>
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleGenerarJornadaDinamica(getJornadaActual())}
                        className="px-2 px-md-3 flex-fill flex-md-grow-0"
                        style={{ minWidth: '120px', maxWidth: '200px' }}>
                        <LuSettings className="me-1" />
                        <span className="d-none d-sm-inline">Sistema Dinámico</span>
                        <span className="d-sm-none">Dinámico</span>
                      </Button>
                      <Button 
                        variant="outline-info" 
                        size="sm"
                        onClick={() => setShowEmparejamientosModal(true)}
                        className="px-2 px-md-3 flex-fill flex-md-grow-0"
                        style={{ minWidth: '120px', maxWidth: '200px' }}>
                        <LuUsers className="me-1" />
                        <span className="d-none d-sm-inline">Emparejamientos</span>
                        <span className="d-sm-none">Emparejar</span>
                      </Button>
                    </div>
                  </div>

                  {encuentros.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="mb-4">
                        <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-3" style={{width: '80px', height: '80px'}}>
                          <LuGamepad2 className="fs-1 text-muted" />
                        </div>
                        <h4 className="mb-2">No hay encuentros programados</h4>
                        <p className="text-muted mb-4">
                          {equiposParticipantes.length >= 2 
                            ? 'Genera el fixture para ver los encuentros programados'
                            : 'Agrega al menos 2 equipos para generar el fixture'}
                        </p>
                        {equiposParticipantes.length >= 2 && (
                          <Button 
                            variant="primary" 
                            size="lg"
                            onClick={() => setShowFixtureModal(true)}>
                            <LuSettings className="me-2" />
                            Generar Fixture
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {Object.keys(jornadas).sort((a, b) => parseInt(a) - parseInt(b)).map(jornadaNum => (
                        <Card key={jornadaNum} className="mb-2 shadow-sm overflow-hidden" style={{ borderRadius: '15px' }}>
                          <CardHeader className="bg-light border-bottom" style={{ borderRadius: '15px 15px 0 0' }}>
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-2">
                                {/* Número de jornada simplificado */}
                                <div className="d-flex align-items-center gap-2">
                                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                                       style={{width: '40px', height: '40px', fontSize: '16px'}}>
                                    {jornadaNum}
                                  </div>
                                  <div>
                                    <h5 className="mb-0 fw-bold text-primary">Jornada {jornadaNum}</h5>
                                    <small className="text-muted">
                                      <strong>{jornadas[parseInt(jornadaNum)].length}</strong> encuentro{jornadas[parseInt(jornadaNum)].length !== 1 ? 's' : ''}
                                    </small>
                                  </div>
                                </div>
                                
                                {/* Equipos que descansan - diseño responsive */}
                                {getEquiposQueDescansan(parseInt(jornadaNum)).length > 0 && (
                                  <div className="bg-info bg-opacity-10 border border-info border-opacity-25 px-3 px-md-4 py-2 py-md-3 rounded">
                                    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 gap-md-3">
                                      <div className="d-flex align-items-center gap-2">
                                        <span className="text-info fs-5 fs-md-4">💤</span>
                                        <span className="text-info fw-bold fs-6 fs-md-6">Descansan:</span>
                                      </div>
                                      <div className="d-flex flex-wrap align-items-center gap-1 gap-md-2">
                                        {getEquiposQueDescansan(parseInt(jornadaNum)).filter(equipo => equipo).map((equipo, index) => (
                                          <div key={equipo?.id} className="d-flex align-items-center gap-1">
                                            <img 
                                              src={equipo?.imagen_equipo || `https://ui-avatars.com/api/?name=${encodeURIComponent(equipo?.nombre || 'E')}&background=6c757d&color=fff&size=18`} 
                                              alt={equipo?.nombre} 
                                              className="rounded-circle"
                                              width={18}
                                              height={18}
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none'
                                                e.currentTarget.nextElementSibling?.classList.remove('d-none')
                                              }}
                                            />
                                            <div className="d-none bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                                                 style={{width: '18px', height: '18px', fontSize: '9px'}}>
                                              {equipo?.nombre?.charAt(0) || 'E'}
                                            </div>
                                            <span className="text-info fw-bold fs-6 text-truncate" 
                                                  style={{maxWidth: '120px'}}
                                                  title={equipo?.nombre}>
                                              {equipo?.nombre}
                                            </span>
                                            {index < getEquiposQueDescansan(parseInt(jornadaNum)).filter(equipo => equipo).length - 1 && 
                                              <span className="text-muted d-none d-md-inline">•</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Estados y botones - diseño simplificado */}
                              <div className="d-flex align-items-center gap-2 p-2">
                                
                                {/* Botones de acción */}
                                <div className="d-flex gap-1">
                                  
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={() => {
                                      setJornadaAEliminar(parseInt(jornadaNum))
                                      setShowDeleteJornadaModal(true)
                                    }}
                                    title="Eliminar esta jornada">
                                    <LuTrash size={14} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardBody className="p-4">
                            <Row>
                              {jornadas[parseInt(jornadaNum)].map((encuentro) => (
                                <Col key={encuentro.id} md={6} lg={4} className="mb-2">
                                  <EncuentroCard 
                                    encuentro={encuentro}
                                    onManagePlayers={navigateToGestionJugadores}
                                    onEditHorario={(encuentro) => {
                                      handleSeleccionarHorario(encuentro)
                                    }}
                                  />
                                </Col>
                              ))}
                            </Row>
                            
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  )}
                </Tab.Pane>

                {/* Tab: Tabla de Posiciones */}
                <Tab.Pane eventKey="tabla">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h5 className="mb-1">🏆 Tabla de Posiciones</h5>
                      <p className="text-muted mb-0">Clasificación actual del torneo con goles reales</p>
                    </div>
                    <div className="d-flex gap-2">
                      <Badge bg="primary" className="fs-6 px-3 py-2">
                        {encuentros.filter(e => e.estado === 'finalizado').length} partidos jugados
                      </Badge>
                    </div>
                  </div>

                  {equiposParticipantes.length === 0 ? (
                    <div className="text-center py-5">
                      <p className="text-muted">No hay equipos participantes</p>
                    </div>
                  ) : (
                    <Card>
                      <CardHeader className="bg-light">
                        <h6 className="mb-0 fw-bold text-primary">
                          <LuTrophy className="me-2" />
                          Clasificación del Torneo
                        </h6>
                      </CardHeader>
                      <CardBody className="p-0">
                        <Table striped bordered hover responsive className="mb-0">
                          <thead className="table-dark">
                            <tr>
                              <th className="text-center">Pos</th>
                              <th>Equipo</th>
                              <th className="text-center">PJ</th>
                              <th className="text-center text-success">PG</th>
                              <th className="text-center text-warning">PE</th>
                              <th className="text-center text-danger">PP</th>
                              <th className="text-center">GF</th>
                              <th className="text-center">GC</th>
                              <th className="text-center">DG</th>
                              <th className="text-center fw-bold text-primary">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getEstadisticasEquiposLocal().map((estadistica, index) => (
                              <tr key={estadistica.equipo.id}>
                                <td className="fw-bold text-center">
                                  {index === 0 && <LuTrophy className="text-warning me-1" />}
                                  {index + 1}
                                </td>
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <img 
                                      src={estadistica.equipo.imagen_equipo || 'https://via.placeholder.com/24x24/fd7e14/ffffff?text=🏆'} 
                                      alt={estadistica.equipo.nombre} 
                                      className="rounded-circle"
                                      width={24}
                                      height={24}
                                    />
                                    <span className="fw-semibold">{estadistica.equipo.nombre}</span>
                                  </div>
                                </td>
                                <td className="text-center">{estadistica.partidosJugados}</td>
                                <td className="text-center text-success fw-bold">{estadistica.partidosGanados}</td>
                                <td className="text-center text-warning fw-bold">{estadistica.partidosEmpatados}</td>
                                <td className="text-center text-danger fw-bold">{estadistica.partidosPerdidos}</td>
                                <td className="text-center">{estadistica.golesFavor}</td>
                                <td className="text-center">{estadistica.golesContra}</td>
                                <td className={`text-center fw-bold ${estadistica.diferenciaGoles >= 0 ? 'text-success' : 'text-danger'}`}>
                                  {estadistica.diferenciaGoles >= 0 ? '+' : ''}{estadistica.diferenciaGoles}
                                </td>
                                <td className="text-center fw-bold text-primary fs-5">{estadistica.puntos}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </CardBody>
                    </Card>
                  )}

                  {/* Estadísticas adicionales */}
                  {encuentros.filter(e => e.estado === 'finalizado').length > 0 && (
                    <Row className="mt-4">
                      <Col md={6}>
                        <Card>
                          <CardHeader>
                            <h6><LuInfo className="me-2" />Estadísticas del Torneo</h6>
                          </CardHeader>
                          <CardBody>
                            <div className="d-grid gap-3">
                              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                <span>Total de partidos jugados:</span>
                                <Badge bg="primary">{encuentros.filter(e => e.estado === 'finalizado').length}</Badge>
                              </div>
                              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                <span>Total de goles marcados:</span>
                                <Badge bg="success">{goles.filter(g => g.tipo === 'gol' || g.tipo === 'penal').length}</Badge>
                              </div>
                              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                <span>Promedio de goles por partido:</span>
                                <Badge bg="info">
                                  {encuentros.filter(e => e.estado === 'finalizado').length > 0 
                                    ? (goles.filter(g => g.tipo === 'gol' || g.tipo === 'penal').length / encuentros.filter(e => e.estado === 'finalizado').length).toFixed(2)
                                    : '0.00'}
                                </Badge>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card>
                          <CardHeader>
                            <h6><LuUsers className="me-2" />Equipos Líderes</h6>
                          </CardHeader>
                          <CardBody>
                            <div className="d-grid gap-2">
                              {getEstadisticasEquiposLocal().slice(0, 3).map((estadistica, index) => (
                                <div key={estadistica.equipo.id} className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold text-primary">#{index + 1}</span>
                                    <img 
                                      src={estadistica.equipo.imagen_equipo || 'https://via.placeholder.com/24x24/fd7e14/ffffff?text=🏆'} 
                                      alt="" 
                                      className="rounded-circle"
                                      width={24}
                                      height={24}
                                    />
                                    <span className="fw-semibold">{estadistica.equipo.nombre}</span>
                                  </div>
                                  <Badge bg="primary">{estadistica.puntos} pts</Badge>
                                </div>
                              ))}
                            </div>
                          </CardBody>
                        </Card>
                      </Col>
                    </Row>
                  )}
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
                            <div className="row g-3">
                              {horarios.map(horario => (
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
                                      <small className="text-muted">
                                        Orden: {horario.orden}
                                      </small>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* Tab: Goleadores */}
                <Tab.Pane eventKey="goleadores">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h5 className="mb-1">🏆 Tabla de Goleadores</h5>
                      <p className="text-muted mb-0">Estadísticas de goles por jugador en el torneo</p>
                    </div>
                    <div className="d-flex gap-2">
                      <Badge bg="primary" className="fs-6 px-3 py-2">
                        {encuentros.filter(e => e.estado === 'finalizado').length} partidos jugados
                      </Badge>
                    </div>
                  </div>

                  {(() => {
                    const estadisticasGenerales = getEstadisticasGeneralesLocal()
                    const estadisticasDetalladas = getEstadisticasDetalladasLocal()
                    const goleadores = getEstadisticasGoleadoresLocal()
                    const goleadoresPorEquipo = getGoleadoresPorEquipoLocal()

                    if (encuentros.filter(e => e.estado === 'finalizado').length === 0) {
                      return (
                        <div className="text-center py-5">
                          <div className="mb-4">
                            <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-3" style={{width: '80px', height: '80px'}}>
                              <LuGamepad2 className="fs-1 text-muted" />
                            </div>
                            <h4 className="mb-2">No hay partidos finalizados</h4>
                            <p className="text-muted mb-4">
                              Los goleadores aparecerán cuando se finalicen los primeros partidos del torneo
                            </p>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div>
                        {/* Estadísticas generales */}
                        <Row className="mb-4">
                          <Col md={3}>
                            <Card className="text-center">
                              <CardBody>
                                <div className="d-flex align-items-center justify-content-center mb-2">
                                  <LuTrophy className="fs-2 text-warning me-2" />
                                  <h4 className="mb-0 text-warning">{estadisticasGenerales.totalGoles}</h4>
                                </div>
                                <h6 className="text-muted">Total Goles</h6>
                              </CardBody>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="text-center">
                              <CardBody>
                                <div className="d-flex align-items-center justify-content-center mb-2">
                                  <LuUsers className="fs-2 text-success me-2" />
                                  <h4 className="mb-0 text-success">{estadisticasGenerales.cantidadGoleadores}</h4>
                                </div>
                                <h6 className="text-muted">Goleadores</h6>
                              </CardBody>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="text-center">
                              <CardBody>
                                <div className="d-flex align-items-center justify-content-center mb-2">
                                  <LuGamepad2 className="fs-2 text-info me-2" />
                                  <h4 className="mb-0 text-info">{estadisticasGenerales.promedioPorPartido}</h4>
                                </div>
                                <h6 className="text-muted">Promedio por Partido</h6>
                              </CardBody>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="text-center">
                              <CardBody>
                                <div className="d-flex align-items-center justify-content-center mb-2">
                                  <LuCheck className="fs-2 text-primary me-2" />
                                  <h4 className="mb-0 text-primary">{estadisticasGenerales.hatTricks}</h4>
                                </div>
                                <h6 className="text-muted">Hat-tricks</h6>
                              </CardBody>
                            </Card>
                          </Col>
                        </Row>

                        {/* Tabla de goleadores */}
                        <Card>
                          <CardHeader className="bg-light">
                            <h5 className="mb-0 fw-bold text-primary">
                              <LuTrophy className="me-2" />
                              Ranking de Goleadores
                            </h5>
                          </CardHeader>
                          <CardBody>
                            {goleadores.length === 0 ? (
                              <div className="text-center py-5">
                                <div className="mb-4">
                                  <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-3" style={{width: '80px', height: '80px'}}>
                                    <LuTrophy className="fs-1 text-muted" />
                                  </div>
                                  <h4 className="mb-2">No hay goles registrados</h4>
                                  <p className="text-muted mb-4">
                                    Los goleadores aparecerán cuando se registren goles en los partidos finalizados
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <Table striped bordered hover responsive>
                                <thead>
                                  <tr>
                                    <th>Pos</th>
                                    <th>Jugador</th>
                                    <th>Equipo</th>
                                    <th>Goles</th>
                                    <th>Penales</th>
                                    <th>Autogoles</th>
                                    <th>1T</th>
                                    <th>2T</th>
                                    <th>Hat-tricks</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {goleadores.map((goleador, index) => (
                                    <tr key={goleador.jugador?.id || index}>
                                      <td className="fw-bold">
                                        {index === 0 && <LuTrophy className="text-warning me-1" />}
                                        {index + 1}
                                      </td>
                                      <td>
                                        <div className="d-flex align-items-center gap-2">
                                          <img 
                                            src={goleador.jugador?.foto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(goleador.jugador?.apellido_nombre || 'Jugador') + '&background=007bff&color=fff&size=32'} 
                                            alt={goleador.jugador?.apellido_nombre || 'Jugador'} 
                                            className="rounded-circle"
                                            width={32}
                                            height={32}
                                          />
                                          <span className="fw-semibold">{goleador.jugador?.apellido_nombre || 'Jugador'}</span>
                                        </div>
                                      </td>
                                      <td>
                                        <Badge bg="secondary">
                                          {equiposParticipantes.find(et => 
                                            et.equipo?.jugadores?.some(j => j.id === goleador.jugador?.id)
                                          )?.equipo?.nombre || 'N/A'}
                                        </Badge>
                                      </td>
                                      <td className="text-success fw-bold">{goleador.goles}</td>
                                      <td className="text-warning">{goleador.penales}</td>
                                      <td className="text-danger">{goleador.autogoles}</td>
                                      <td className="text-info">{goleador.golesPrimerTiempo}</td>
                                      <td className="text-primary">{goleador.golesSegundoTiempo}</td>
                                      <td>
                                        {goleador.hatTricks > 0 && (
                                          <Badge bg="warning" className="text-dark">
                                            {goleador.hatTricks} 🎩
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
                                <h6><LuInfo className="me-2" />Información sobre Goleadores</h6>
                              </CardHeader>
                              <CardBody>
                                <div className="d-grid gap-3">
                                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <span>Partidos con goles:</span>
                                    <Badge bg="success">{estadisticasDetalladas.partidosConGoles}</Badge>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <span>Partidos sin goles:</span>
                                    <Badge bg="warning">{estadisticasDetalladas.partidosSinGoles}</Badge>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <span>Goles en primer tiempo:</span>
                                    <Badge bg="info">{estadisticasDetalladas.golesPrimerTiempo}</Badge>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <span>Goles en segundo tiempo:</span>
                                    <Badge bg="primary">{estadisticasDetalladas.golesSegundoTiempo}</Badge>
                                  </div>
                                </div>
                              </CardBody>
                            </Card>
                          </Col>
                          <Col md={6}>
                            <Card>
                              <CardHeader>
                                <h6><LuUsers className="me-2" />Goleadores por Equipo</h6>
                              </CardHeader>
                              <CardBody>
                                {goleadoresPorEquipo.length === 0 ? (
                                  <p className="text-muted text-center">No hay goles registrados por equipo</p>
                                ) : (
                                  <div className="d-grid gap-2">
                                    {goleadoresPorEquipo.map((item, index) => (
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
                                        <Badge bg="primary">{item.totalGoles} goles</Badge>
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
                    const estadisticasGenerales = getEstadisticasGeneralesSancionesLocal()
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
                        {/* Estadísticas generales */}
                        <Row className="mb-4">
                          <Col md={3}>
                            <Card className="text-center">
                              <CardBody>
                                <div className="d-flex align-items-center justify-content-center mb-2">
                                  <span className="fs-2 text-warning me-2">🟨</span>
                                  <h4 className="mb-0 text-warning">{estadisticasGenerales.totalAmarillas}</h4>
                                </div>
                                <h6 className="text-muted">Tarjetas Amarillas</h6>
                              </CardBody>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="text-center">
                              <CardBody>
                                <div className="d-flex align-items-center justify-content-center mb-2">
                                  <span className="fs-2 text-danger me-2">🟥</span>
                                  <h4 className="mb-0 text-danger">{estadisticasGenerales.totalRojas}</h4>
                                </div>
                                <h6 className="text-muted">Tarjetas Rojas</h6>
                              </CardBody>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="text-center">
                              <CardBody>
                                <div className="d-flex align-items-center justify-content-center mb-2">
                                  <LuX className="fs-2 text-danger me-2" />
                                  <h4 className="mb-0 text-danger">{estadisticasGenerales.jugadoresSancionados}</h4>
                                </div>
                                <h6 className="text-muted">Jugadores Sancionados</h6>
                              </CardBody>
                            </Card>
                          </Col>
                          <Col md={3}>
                            <Card className="text-center">
                              <CardBody>
                                <div className="d-flex align-items-center justify-content-center mb-2">
                                  <LuInfo className="fs-2 text-info me-2" />
                                  <h4 className="mb-0 text-info">{estadisticasGenerales.promedioPorPartido}</h4>
                                </div>
                                <h6 className="text-muted">Promedio por Partido</h6>
                              </CardBody>
                            </Card>
                          </Col>
                        </Row>

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
                                          {equiposParticipantes.find(et => 
                                            et.equipo?.jugadores?.some(j => j.id === jugador.jugador?.id)
                                          )?.equipo?.nombre || 'N/A'}
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
                                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                    <span>Total de tarjetas:</span>
                                    <Badge bg="primary">{estadisticasGenerales.totalAmarillas + estadisticasGenerales.totalRojas}</Badge>
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
              <Col md={12}>
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
                      {horario.hora_inicio}
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

    </Container>
  )
}

export default TorneoDetailPage
