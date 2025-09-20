'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Alert, Badge, Nav, NavItem, NavLink, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormControl, FloatingLabel, FormSelect, Tab } from 'react-bootstrap'
import { LuTrophy, LuCalendar, LuUsers, LuGamepad2, LuSettings, LuPlus, LuTrash, LuTriangle, LuCheck, LuX, LuClock, LuFilter, LuDownload, LuInfo } from 'react-icons/lu'
import { getTorneoById, addEquiposToTorneo, removeEquipoFromTorneo, generateFixtureForTorneo, getEncuentrosByTorneo, updateEncuentro, regenerateFixtureFromJornada, deleteJornada, getEquiposDescansan, crearJornadaConEmparejamientos } from '../actions'
import { generarPropuestaJornada, confirmarJornada, regenerarJornadaDinamica, confirmarRegeneracionJornada, analizarTorneo } from '../dynamic-actions'
import { getCategorias, getEquipos } from '../../equipos/actions'
import type { TorneoWithRelations, EquipoWithRelations, Categoria, EncuentroWithRelations } from '@/db/types'
import type { DynamicFixtureResult, JornadaPropuesta } from '@/lib/dynamic-fixture-generator'
import DynamicFixtureModal from '@/components/DynamicFixtureModal'
import EmparejamientosFaltantesModal from '@/components/EmparejamientosFaltantesModal'
import TorneoAnalytics from '@/components/TorneoAnalytics'
// @ts-ignore
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const TorneoDetailPage = () => {
  const params = useParams()
  const torneoId = parseInt(params.id as string)
  
  const [torneo, setTorneo] = useState<TorneoWithRelations | null>(null)
  const [equiposDisponibles, setEquiposDisponibles] = useState<EquipoWithRelations[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [encuentros, setEncuentros] = useState<EncuentroWithRelations[]>([])
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
  const [jornadaAEliminar, setJornadaAEliminar] = useState<number>(1)
  
  // Estados para el sistema dinámico
  const [showDynamicFixtureModal, setShowDynamicFixtureModal] = useState(false)
  const [showDynamicRegenerateModal, setShowDynamicRegenerateModal] = useState(false)
  const [jornadaDinamica, setJornadaDinamica] = useState<number>(1)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [analisisTorneo, setAnalisisTorneo] = useState<any>(null)
  
  // Estado para tabs
  const [activeTab, setActiveTab] = useState('general')

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [torneoData, equiposData, categoriasData, encuentrosData, descansosData] = await Promise.all([
        getTorneoById(torneoId),
        getEquipos(),
        getCategorias(),
        getEncuentrosByTorneo(torneoId),
        getEquiposDescansan(torneoId)
      ])
      
      setTorneo((torneoData ?? null) as TorneoWithRelations | null)
      setEquiposDisponibles(equiposData)
      setCategorias(categoriasData)
      setEncuentros(encuentrosData as any)
      
      // Cargar equipos que descansan desde la base de datos
      setEquiposDescansan(descansosData)
      
      // Cargar análisis del torneo
      try {
        const analisis = await analizarTorneo(torneoId)
        setAnalisisTorneo(analisis)
      } catch (error) {
        console.error('Error al cargar análisis del torneo:', error)
      }
      
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
        className={`badge text-${configItem.text} ${configItem.border} px-3 py-2 rounded-pill fw-semibold d-flex align-items-center gap-1 bg-transparent`}
        style={{ fontSize: '0.75rem' }}
      >
        <span>{configItem.icon}</span>
        <span>{configItem.label}</span>
      </span>
    )
  }

  const handleDownloadFixtureExcel = () => {
    if (!torneo || encuentros.length === 0) {
      setError('No hay fixture disponible para descargar')
      return
    }

    try {
      // Crear un nuevo libro de trabajo
      const workbook = XLSX.utils.book_new()
      
      // Datos del torneo
      const torneoData = [
        ['INFORMACIÓN DEL TORNEO'],
        [''],
        ['Nombre:', torneo.nombre],
        ['Descripción:', torneo.descripcion || 'Sin descripción'],
        ['Categoría:', torneo.categoria?.nombre || 'Sin categoría'],
        ['Tipo:', torneo.tipo_torneo === 'liga' ? 'Liga' : torneo.tipo_torneo === 'eliminacion' ? 'Eliminación' : 'Grupos'],
        ['Permite Revancha:', torneo.permite_revancha ? 'Sí' : 'No'],
        ['Estado:', torneo.estado === 'planificado' ? 'Planificado' : torneo.estado === 'en_curso' ? 'En Curso' : torneo.estado === 'finalizado' ? 'Finalizado' : 'Cancelado'],
        ['Fecha Inicio:', torneo.fecha_inicio ? new Date(torneo.fecha_inicio).toLocaleDateString('es-ES') : 'N/A'],
        ['Fecha Fin:', torneo.fecha_fin ? new Date(torneo.fecha_fin).toLocaleDateString('es-ES') : 'N/A'],
        ['Total Equipos:', equiposParticipantes.length],
        ['Total Encuentros:', encuentros.length],
        ['Encuentros Jugados:', encuentros.filter(e => e.estado === 'finalizado').length],
        ['Encuentros Pendientes:', encuentros.filter(e => e.estado === 'programado').length],
        [''],
        ['GENERADO EL:', new Date().toLocaleString('es-ES')]
      ]

      // Crear hoja de información del torneo
      const torneoSheet = XLSX.utils.aoa_to_sheet(torneoData)
      XLSX.utils.book_append_sheet(workbook, torneoSheet, 'Información Torneo')

      // Preparar datos del fixture por jornadas
      const jornadas = getEncuentrosPorJornada()
      const jornadasOrdenadas = Object.keys(jornadas).map(Number).sort((a, b) => a - b)

      jornadasOrdenadas.forEach(jornada => {
        const encuentrosJornada = jornadas[jornada]
        const equiposQueDescansan = getEquiposQueDescansan(jornada)
        
        // Encabezados para cada jornada
        const jornadaData = [
          [`JORNADA ${jornada}`],
          [''],
          ['Local', 'Goles Local', 'Goles Visitante', 'Visitante', 'Fecha', 'Estado', 'Cancha', 'Observaciones']
        ]

        // Agregar encuentros de la jornada
        encuentrosJornada.forEach(encuentro => {
          jornadaData.push([
            encuentro.equipoLocal?.nombre || 'N/A',
            encuentro.goles_local !== null ? encuentro.goles_local.toString() : '',
            encuentro.goles_visitante !== null ? encuentro.goles_visitante.toString() : '',
            encuentro.equipoVisitante?.nombre || 'N/A',
            encuentro.fecha_programada ? new Date(encuentro.fecha_programada).toLocaleDateString('es-ES') : 'Por definir',
            encuentro.estado === 'programado' ? 'Programado' : 
            encuentro.estado === 'en_curso' ? 'En Curso' : 
            encuentro.estado === 'finalizado' ? 'Finalizado' : 
            encuentro.estado === 'cancelado' ? 'Cancelado' : 
            encuentro.estado === 'aplazado' ? 'Aplazado' : 'N/A',
            encuentro.cancha || '',
            encuentro.observaciones || ''
          ])
        })

        // Agregar información de los equipos que descansan si existen
        if (equiposQueDescansan.length > 0) {
          jornadaData.push([''])
          jornadaData.push(['EQUIPOS QUE DESCANSAN:', equiposQueDescansan.map(e => e?.nombre).filter(Boolean).join(', ')])
        }

        // Crear hoja para la jornada
        const jornadaSheet = XLSX.utils.aoa_to_sheet(jornadaData)
        XLSX.utils.book_append_sheet(workbook, jornadaSheet, `Jornada ${jornada}`)
      })

      // Crear hoja de tabla de posiciones
      const tablaData = [
        ['TABLA DE POSICIONES'],
        [''],
        ['Pos', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts']
      ]

      equiposParticipantes
        .sort((a, b) => {
          const puntosA = a.puntos ?? 0
          const puntosB = b.puntos ?? 0
          if (puntosB !== puntosA) return puntosB - puntosA
          const dgA = a.diferencia_goles ?? 0
          const dgB = b.diferencia_goles ?? 0
          return dgB - dgA
        })
        .forEach((equipoTorneo, index) => {
          tablaData.push([
            (index + 1).toString(),
            equipoTorneo.equipo?.nombre || 'N/A',
            (equipoTorneo.partidos_jugados ?? 0).toString(),
            (equipoTorneo.partidos_ganados ?? 0).toString(),
            (equipoTorneo.partidos_empatados ?? 0).toString(),
            (equipoTorneo.partidos_perdidos ?? 0).toString(),
            (equipoTorneo.goles_favor ?? 0).toString(),
            (equipoTorneo.goles_contra ?? 0).toString(),
            ((equipoTorneo.diferencia_goles ?? 0) >= 0 ? '+' : '') + (equipoTorneo.diferencia_goles ?? 0).toString(),
            (equipoTorneo.puntos ?? 0).toString()
          ])
        })

      const tablaSheet = XLSX.utils.aoa_to_sheet(tablaData)
      XLSX.utils.book_append_sheet(workbook, tablaSheet, 'Tabla Posiciones')

      // Generar el archivo Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      // Descargar el archivo
      const fileName = `Fixture_${torneo.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      saveAs(data, fileName)
      
      setSuccess('Fixture descargado exitosamente en formato Excel')
    } catch (error) {
      setError('Error al generar el archivo Excel: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
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
    <Container fluid>
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
              <CardHeader>
                <Nav variant="tabs">
                  <NavItem>
                    <NavLink eventKey="general">Información General</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink eventKey="equipos">Equipos Participantes</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink eventKey="fixture">Fixture</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink eventKey="tabla">Tabla de Posiciones</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink eventKey="dinamico">Sistema Dinámico</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink eventKey="analytics">Análisis</NavLink>
                  </NavItem>
                </Nav>
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
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h5 className="mb-1">Fixture del Torneo</h5>
                      <p className="text-muted mb-0">Gestiona los encuentros y jornadas del torneo</p>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={handleDownloadFixtureExcel}
                        disabled={encuentros.length === 0}>
                        <LuDownload className="me-1" />
                        Descargar Excel
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => setShowFixtureModal(true)}>
                        <LuSettings className="me-1" />
                        {encuentros.length === 0 ? 'Generar Fixture' : 'Regenerar Fixture Completo'}
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleGenerarJornadaDinamica(getJornadaActual())}
                        className="me-2">
                        <LuSettings className="me-1" />
                        Sistema Dinámico
                      </Button>
                      <Button 
                        variant="outline-info" 
                        size="sm"
                        onClick={() => setShowEmparejamientosModal(true)}>
                        <LuUsers className="me-1" />
                        Emparejamientos Faltantes
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
                        <Card key={jornadaNum} className="mb-3 shadow-sm">
                          <CardHeader className="bg-light border-bottom">
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-3">
                                {/* Número de jornada simplificado */}
                                <div className="d-flex align-items-center gap-2">
                                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                                       style={{width: '32px', height: '32px', fontSize: '14px'}}>
                                    {jornadaNum}
                                  </div>
                                  <div>
                                    <h6 className="mb-0 fw-semibold">Jornada {jornadaNum}</h6>
                                    <small className="text-muted">
                                      {jornadas[parseInt(jornadaNum)].length} encuentro{jornadas[parseInt(jornadaNum)].length !== 1 ? 's' : ''}
                                    </small>
                                  </div>
                                </div>
                                
                                {/* Equipos que descansan - diseño compacto */}
                                {getEquiposQueDescansan(parseInt(jornadaNum)).length > 0 && (
                                  <div className="d-flex align-items-center gap-2 bg-info bg-opacity-10 border border-info border-opacity-25 px-3 py-2 rounded">
                                    <span className="text-info">💤</span>
                                    <span className="text-info fw-semibold small">Descansan:</span>
                                    <div className="d-flex align-items-center gap-1">
                                      {getEquiposQueDescansan(parseInt(jornadaNum)).filter(equipo => equipo).map((equipo, index) => (
                                        <div key={equipo?.id} className="d-flex align-items-center gap-1">
                                          <img 
                                            src={equipo?.imagen_equipo || `https://ui-avatars.com/api/?name=${encodeURIComponent(equipo?.nombre || 'E')}&background=6c757d&color=fff&size=20`} 
                                            alt={equipo?.nombre} 
                                            className="rounded-circle"
                                            width={20}
                                            height={20}
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                              e.currentTarget.nextElementSibling?.classList.remove('d-none')
                                            }}
                                          />
                                          <div className="d-none bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                                               style={{width: '20px', height: '20px', fontSize: '10px'}}>
                                            {equipo?.nombre?.charAt(0) || 'E'}
                                          </div>
                                          <span className="text-info fw-semibold small">
                                            {equipo?.nombre}
                                          </span>
                                          {index < getEquiposQueDescansan(parseInt(jornadaNum)).filter(equipo => equipo).length - 1 && 
                                            <span className="text-muted">•</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Estados y botones - diseño simplificado */}
                              <div className="d-flex align-items-center gap-2">
                                
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
                                <Col key={encuentro.id} md={6} lg={4} className="mb-3">
                                  <Card className="border-0 shadow-sm h-100">
                                    <CardBody className="p-4">
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-3 flex-grow-1">
                                          <div className="d-flex align-items-center gap-2">
                                            <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                              <img 
                                                src={encuentro.equipoLocal?.imagen_equipo || `https://ui-avatars.com/api/?name=${encodeURIComponent(encuentro.equipoLocal?.nombre || 'L')}&background=007bff&color=fff&size=32`} 
                                                alt={encuentro.equipoLocal?.nombre} 
                                                className="rounded-circle"
                                                width={32}
                                                height={32}
                                                onError={(e) => {
                                                  e.currentTarget.style.display = 'none'
                                                  e.currentTarget.nextElementSibling?.classList.remove('d-none')
                                                }}
                                              />
                                              <div className="d-none text-primary fw-bold" style={{fontSize: '14px'}}>
                                                {encuentro.equipoLocal?.nombre?.charAt(0) || 'L'}
                                              </div>
                                            </div>
                                            <div>
                                              <div className="fw-semibold text-truncate" style={{maxWidth: '120px'}}>
                                                {encuentro.equipoLocal?.nombre}
                                              </div>
                                              <small className="text-muted">Local</small>
                                            </div>
                                          </div>
                                          
                                          <div className="text-center flex-grow-1">
                                            {encuentro.goles_local !== null && encuentro.goles_visitante !== null ? (
                                              <div className="bg-light rounded p-2">
                                                <span className="fw-bold fs-4 text-primary">
                                                  {encuentro.goles_local} - {encuentro.goles_visitante}
                                                </span>
                                              </div>
                                            ) : (
                                              <div className="bg-light rounded p-2">
                                                <span className="text-muted fw-semibold">VS</span>
                                              </div>
                                            )}
                                          </div>
                                          
                                          <div className="d-flex align-items-center gap-2">
                                            <div>
                                              <div className="fw-semibold text-truncate text-end" style={{maxWidth: '120px'}}>
                                                {encuentro.equipoVisitante?.nombre}
                                              </div>
                                              <small className="text-muted text-end d-block">Visitante</small>
                                            </div>
                                            <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                              <img 
                                                src={encuentro.equipoVisitante?.imagen_equipo || `https://ui-avatars.com/api/?name=${encodeURIComponent(encuentro.equipoVisitante?.nombre || 'V')}&background=28a745&color=fff&size=32`} 
                                                alt={encuentro.equipoVisitante?.nombre} 
                                                className="rounded-circle"
                                                width={32}
                                                height={32}
                                                onError={(e) => {
                                                  e.currentTarget.style.display = 'none'
                                                  e.currentTarget.nextElementSibling?.classList.remove('d-none')
                                                }}
                                              />
                                              <div className="d-none text-success fw-bold" style={{fontSize: '14px'}}>
                                                {encuentro.equipoVisitante?.nombre?.charAt(0) || 'V'}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center gap-2">
                                          <LuClock className="text-muted" size={14} />
                                          <small className="text-muted">
                                            {encuentro.fecha_programada ? 
                                              new Date(encuentro.fecha_programada).toLocaleDateString('es-ES') : 'Fecha por definir'}
                                          </small>
                                        </div>
                                        <div className="d-flex gap-2">
                                          {getEstadoBadge(encuentro.estado)}
                                          <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => {
                                              setEditingEncuentro(encuentro)
                                              setShowEncuentroModal(true)
                                            }}
                                            title="Editar encuentro">
                                            <LuSettings size={14} />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      {encuentro.cancha && (
                                        <div className="mt-2">
                                          <small className="text-muted">
                                            <strong>Cancha:</strong> {encuentro.cancha}
                                          </small>
                                        </div>
                                      )}
                                      
                                      {encuentro.observaciones && (
                                        <div className="mt-2">
                                          <small className="text-muted">
                                            <strong>Obs:</strong> {encuentro.observaciones}
                                          </small>
                                        </div>
                                      )}
                                    </CardBody>
                                  </Card>
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
                  <h5>Tabla de Posiciones</h5>
                  {equiposParticipantes.length === 0 ? (
                    <div className="text-center py-5">
                      <p className="text-muted">No hay equipos participantes</p>
                    </div>
                  ) : (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Equipo</th>
                          <th>PJ</th>
                          <th>PG</th>
                          <th>PE</th>
                          <th>PP</th>
                          <th>GF</th>
                          <th>GC</th>
                          <th>DG</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equiposParticipantes
                          .sort((a, b) => {
                            const puntosA = a.puntos ?? 0
                            const puntosB = b.puntos ?? 0
                            if (puntosB !== puntosA) return puntosB - puntosA
                            const dgA = a.diferencia_goles ?? 0
                            const dgB = b.diferencia_goles ?? 0
                            return dgB - dgA
                          })
                          .map((equipoTorneo, index) => (
                            <tr key={equipoTorneo.id}>
                              <td className="fw-bold">{index + 1}</td>
                              <td>
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
                              </td>
                              <td>{equipoTorneo.partidos_jugados ?? 0}</td>
                              <td className="text-success fw-bold">{equipoTorneo.partidos_ganados ?? 0}</td>
                              <td className="text-warning fw-bold">{equipoTorneo.partidos_empatados ?? 0}</td>
                              <td className="text-danger fw-bold">{equipoTorneo.partidos_perdidos ?? 0}</td>
                              <td>{equipoTorneo.goles_favor ?? 0}</td>
                              <td>{equipoTorneo.goles_contra ?? 0}</td>
                              <td className={(equipoTorneo.diferencia_goles ?? 0) >= 0 ? 'text-success' : 'text-danger'}>
                                {(equipoTorneo.diferencia_goles ?? 0) >= 0 ? '+' : ''}{equipoTorneo.diferencia_goles ?? 0}
                              </td>
                              <td className="fw-bold text-primary">{equipoTorneo.puntos ?? 0}</td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
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

                {/* Tab: Análisis */}
                <Tab.Pane eventKey="analytics">
                  <h5>Análisis del Torneo</h5>
                  {analisisTorneo ? (
                    <TorneoAnalytics 
                      torneoId={torneoId}
                      equipos={equiposParticipantes.map(et => et.equipo!).filter(e => e)}
                      encuentros={encuentros}
                      descansos={equiposDescansan as any}
                    />
                  ) : (
                    <div className="text-center py-5">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Cargando análisis...</span>
                      </div>
                    </div>
                  )}
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

    </Container>
  )
}

export default TorneoDetailPage
