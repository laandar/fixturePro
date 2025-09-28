'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormSelect, FormCheck, Alert, Badge, Card, CardHeader, CardBody, Row, Col, Spinner, Tab, Nav, NavItem, NavLink, ProgressBar } from 'react-bootstrap'
import { LuSettings, LuUsers, LuCalendar, LuCheck, LuX, LuTriangle, LuInfo, LuShuffle, LuTarget, LuClock, LuFilter, LuStar, LuPlus } from 'react-icons/lu'
import type { DynamicFixtureResult, JornadaPropuesta } from '@/lib/dynamic-fixture-generator'
import type { EquipoWithRelations, Horario } from '@/db/types'
import { generarPropuestaJornada, obtenerEmparejamientosFaltantes } from '../app/(admin)/(apps)/torneos/dynamic-actions'
import { getHorarios } from '../app/(admin)/(apps)/torneos/horarios-actions'

interface DynamicFixtureModalProps {
  show: boolean
  onHide: () => void
  torneoId: number
  jornada: number
  equipos: EquipoWithRelations[]
  onConfirm: (jornada: JornadaPropuesta) => Promise<void>
  onRegenerate?: (jornada: JornadaPropuesta) => Promise<void>
  isRegenerating?: boolean
  encuentrosExistentes?: any[]
  descansosExistentes?: Record<number, number[]>
}

interface EquipoDescanso {
  id: number
  nombre: string
  descansos: number
}

interface RestriccionHorario {
  equipoId: number
  horarioId: number | null
  tipo: 'preferencial' | 'forzado' | 'bloqueado'
}

interface RestriccionJornada {
  jornada: number
  equipoId: number
  horarioId: number | null
  tipo: 'forzado' | 'bloqueado'
}

interface Emparejamiento {
  equipo1: { id: number; nombre: string }
  equipo2: { id: number; nombre: string }
  jugado: boolean
}

interface EmparejamientosData {
  total: number
  jugados: number
  faltantes: number
  emparejamientosFaltantes: Emparejamiento[]
  porcentajeCompletado: number
}

export default function DynamicFixtureModal({
  show,
  onHide,
  torneoId,
  jornada,
  equipos,
  onConfirm,
  onRegenerate,
  isRegenerating = false,
  encuentrosExistentes = [],
  descansosExistentes = {}
}: DynamicFixtureModalProps) {
  const [loading, setLoading] = useState(false)
  const [propuesta, setPropuesta] = useState<DynamicFixtureResult | null>(null)
  const [equiposDisponibles, setEquiposDisponibles] = useState<EquipoDescanso[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [opciones, setOpciones] = useState({
    forzarDescanso: [] as number[],
    canchas: ['Cancha Principal', 'Cancha Secundaria'],
    arbitros: ['Árbitro 1', 'Árbitro 2', 'Árbitro 3']
  })
  const [fechaJornada, setFechaJornada] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [mostrarAlternativas, setMostrarAlternativas] = useState(false)
  const [encuentrosRemovidos, setEncuentrosRemovidos] = useState<Set<number>>(new Set())
  
  // Estados para restricciones de horarios
  const [restriccionesHorarios, setRestriccionesHorarios] = useState<RestriccionHorario[]>([])
  const [restriccionesJornada, setRestriccionesJornada] = useState<RestriccionJornada[]>([])
  const [distribucionEquitativa, setDistribucionEquitativa] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  
  // Estados para emparejamientos faltantes
  const [emparejamientosData, setEmparejamientosData] = useState<EmparejamientosData | null>(null)
  const [emparejamientosLoading, setEmparejamientosLoading] = useState(false)
  const [emparejamientosError, setEmparejamientosError] = useState<string | null>(null)
  const [filtroEmparejamientos, setFiltroEmparejamientos] = useState<'todos' | 'faltantes' | 'jugados'>('faltantes')
  const [emparejamientosSeleccionados, setEmparejamientosSeleccionados] = useState<Set<string>>(new Set())
  const [fechaJornadaEmparejamientos, setFechaJornadaEmparejamientos] = useState<string>('')

  // Cargar equipos disponibles para descanso al abrir el modal
  useEffect(() => {
    if (show && equipos.length > 0) {
      cargarEquiposDisponibles()
      cargarHorarios()
      // Establecer fecha por defecto
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setFechaJornada(tomorrow.toISOString().split('T')[0])
    }
  }, [show, equipos])

  // Cargar emparejamientos faltantes cuando se cambie a esa pestaña
  useEffect(() => {
    if (show && activeTab === 'emparejamientos' && !emparejamientosData) {
      cargarEmparejamientosFaltantes()
    }
  }, [show, activeTab])

  // Generar propuesta inicial cuando se abre el modal y se establece la fecha
  useEffect(() => {
    if (show && equipos.length > 0 && fechaJornada) {
      generarPropuestaInicial()
      // Limpiar encuentros removidos cuando se genera nueva propuesta
      setEncuentrosRemovidos(new Set())
    }
  }, [show, equipos, fechaJornada])

  const cargarEquiposDisponibles = async () => {
    try {
      // Calcular descansos reales de cada equipo
      const equiposConDescansos = equipos.map(equipo => {
        // Contar cuántas veces ha descansado este equipo
        let totalDescansos = 0
        Object.values(descansosExistentes).forEach(equiposDescansando => {
          if (Array.isArray(equiposDescansando)) {
            // Nuevo formato: Record<number, number[]>
            if (equiposDescansando.includes(equipo.id)) {
              totalDescansos++
            }
          } else {
            // Formato antiguo: Record<number, number> (para compatibilidad)
            if (equiposDescansando === equipo.id) {
              totalDescansos++
            }
          }
        })
        
        return {
          id: equipo.id,
          nombre: equipo.nombre,
          descansos: totalDescansos
        }
      })
      
      setEquiposDisponibles(equiposConDescansos)
    } catch (error) {
      console.error('Error al cargar equipos disponibles:', error)
      // Fallback a datos básicos si hay error
      const equiposBasicos = equipos.map(equipo => ({
        id: equipo.id,
        nombre: equipo.nombre,
        descansos: 0
      }))
      setEquiposDisponibles(equiposBasicos)
    }
  }

  const cargarHorarios = async () => {
    try {
      const horariosData = await getHorarios()
      setHorarios(horariosData)
    } catch (error) {
      console.error('Error al cargar horarios:', error)
      setHorarios([])
    }
  }

  const cargarEmparejamientosFaltantes = async () => {
    try {
      setEmparejamientosLoading(true)
      setEmparejamientosError(null)
      const resultado = await obtenerEmparejamientosFaltantes(torneoId)
      setEmparejamientosData(resultado)
      // Establecer fecha por defecto para emparejamientos
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setFechaJornadaEmparejamientos(tomorrow.toISOString().split('T')[0])
    } catch (error) {
      console.error('Error al cargar emparejamientos:', error)
      setEmparejamientosError(error instanceof Error ? error.message : 'Error al cargar emparejamientos')
    } finally {
      setEmparejamientosLoading(false)
    }
  }

  const toggleEmparejamiento = (emparejamiento: Emparejamiento) => {
    const clave = `${emparejamiento.equipo1.id}-${emparejamiento.equipo2.id}`
    const nuevosSeleccionados = new Set(emparejamientosSeleccionados)
    
    if (nuevosSeleccionados.has(clave)) {
      nuevosSeleccionados.delete(clave)
    } else {
      nuevosSeleccionados.add(clave)
    }
    
    setEmparejamientosSeleccionados(nuevosSeleccionados)
  }

  const seleccionarTodosFaltantes = () => {
    if (!emparejamientosData) return
    
    const todosFaltantes = new Set(
      emparejamientosData.emparejamientosFaltantes
        .filter(e => !e.jugado)
        .map(e => `${e.equipo1.id}-${e.equipo2.id}`)
    )
    setEmparejamientosSeleccionados(todosFaltantes)
  }

  const limpiarSeleccionEmparejamientos = () => {
    setEmparejamientosSeleccionados(new Set())
  }

  const generarJornadaDesdeEmparejamientos = async () => {
    if (emparejamientosSeleccionados.size === 0) {
      setError('Debes seleccionar al menos un emparejamiento para generar la jornada')
      return
    }

    if (!fechaJornadaEmparejamientos) {
      setError('Debes seleccionar una fecha para la jornada')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Si ya hay una propuesta automática, la usamos como base
      if (propuesta) {
        // Convertir emparejamientos seleccionados a encuentros
        const emparejamientosArray = Array.from(emparejamientosSeleccionados)
        
        // Validar que los emparejamientos seleccionados no estén ya en la propuesta automática
        const emparejamientosExistentes = new Set<string>()
        propuesta.jornada.encuentros.forEach(encuentro => {
          emparejamientosExistentes.add(`${encuentro.equipoLocal}-${encuentro.equipoVisitante}`)
          emparejamientosExistentes.add(`${encuentro.equipoVisitante}-${encuentro.equipoLocal}`)
        })

        const emparejamientosValidos = emparejamientosArray.filter(clave => 
          !emparejamientosExistentes.has(clave)
        )

        if (emparejamientosValidos.length !== emparejamientosArray.length) {
          const duplicados = emparejamientosArray.filter(clave => 
            emparejamientosExistentes.has(clave)
          )
          
          // Convertir IDs a nombres de equipos
          const duplicadosConNombres = duplicados.map(clave => {
            const [equipo1Id, equipo2Id] = clave.split('-').map(Number)
            const equipo1 = equipos.find(e => e.id === equipo1Id)
            const equipo2 = equipos.find(e => e.id === equipo2Id)
            return equipo1 && equipo2 ? `${equipo1.nombre} - ${equipo2.nombre}` : clave
          })
          
          setError(`Los siguientes emparejamientos ya están en la propuesta automática: ${duplicadosConNombres.join(', ')}`)
          return
        }

        const encuentrosSeleccionados = emparejamientosValidos.map((clave, index) => {
          const [equipo1Id, equipo2Id] = clave.split('-').map(Number)
          
          // Asignar horarios únicos evitando los ya usados
          const horariosUsados = propuesta.jornada.encuentros.map(e => e.horarioId).filter(Boolean)
          const horarioDisponible = horarios.find(h => !horariosUsados.includes(h.id)) || horarios[0]
          
          return {
            equipoLocal: equipo1Id,
            equipoVisitante: equipo2Id,
            cancha: opciones.canchas[(propuesta.jornada.encuentros.length + index) % opciones.canchas.length] || 'Cancha Principal',
            arbitro: opciones.arbitros[(propuesta.jornada.encuentros.length + index) % opciones.arbitros.length] || 'Árbitro Principal',
            fecha: new Date(fechaJornadaEmparejamientos + 'T00:00:00'),
            esNuevoEmparejamiento: true,
            prioridad: 'alta' as const,
            horarioId: horarioDisponible?.id || null,
            esEmparejamientoSeleccionado: true // Marcar como emparejamiento seleccionado manualmente
          }
        })

        // Combinar encuentros existentes (automáticos) con los seleccionados
        const encuentrosExistentes = propuesta.jornada.encuentros.map(encuentro => ({
          ...encuentro,
          esEmparejamientoSeleccionado: false // Marcar como automático
        }))

        const todosLosEncuentros = [...encuentrosExistentes, ...encuentrosSeleccionados]

        // Obtener equipos ya utilizados en la propuesta combinada
        const equiposUtilizados = new Set<number>()
        todosLosEncuentros.forEach(encuentro => {
          equiposUtilizados.add(encuentro.equipoLocal)
          equiposUtilizados.add(encuentro.equipoVisitante)
        })

        // Recalcular equipos que descansan
        const equiposQueDescansan = equipos
          .filter(e => !equiposUtilizados.has(e.id))
          .map(e => e.id)

        // Crear jornada combinada
        const jornadaCombinada: JornadaPropuesta = {
          numero: jornada,
          encuentros: todosLosEncuentros,
          equiposQueDescansan: equiposQueDescansan,
          fecha: new Date(fechaJornadaEmparejamientos + 'T00:00:00'),
          canchas: opciones.canchas,
          arbitros: opciones.arbitros
        }

        const resultadoCombinado: DynamicFixtureResult = {
          jornada: jornadaCombinada,
          estadisticas: {
            totalEncuentros: todosLosEncuentros.length,
            nuevosEmparejamientos: todosLosEncuentros.length,
            emparejamientosRepetidos: 0,
            equiposConDescanso: equiposQueDescansan.length,
            balanceDescansos: {},
            proximasOpciones: 0
          },
          validaciones: {
            esValida: true,
            errores: [],
            advertencias: [],
            descansosConsecutivos: [],
            equiposDesbalanceados: []
          }
        }

        setPropuesta(resultadoCombinado)
        setActiveTab('general') // Cambiar a la pestaña general para mostrar la propuesta
      } else {
        // Si no hay propuesta automática, generar una nueva con los emparejamientos seleccionados
        setError('Primero debes generar una propuesta automática en la pestaña "General"')
      }
    } catch (error) {
      console.error('Error al generar jornada desde emparejamientos:', error)
      setError(error instanceof Error ? error.message : 'Error al generar jornada')
    } finally {
      setLoading(false)
    }
  }

  const generarPropuestaInicial = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Usar la fecha seleccionada por el usuario o la fecha por defecto
      const fechaSeleccionada = fechaJornada ? new Date(fechaJornada + 'T00:00:00') : new Date()
      
      console.log('🔍 Fecha seleccionada en modal:', fechaJornada)
      console.log('🔍 Fecha convertida a Date:', fechaSeleccionada)
      console.log('🔍 Fecha ISO string:', fechaSeleccionada.toISOString())
      
      // Llamar a la función real del servidor
      const resultado = await generarPropuestaJornada(torneoId, jornada, {
        forzarDescanso: opciones.forzarDescanso,
        canchas: opciones.canchas,
        arbitros: opciones.arbitros,
        fechaJornada: fechaSeleccionada,
        restriccionesJornada,
        distribucionEquitativa
      } as any)
      
      setPropuesta(resultado)
      // Limpiar encuentros removidos cuando se genera nueva propuesta
      setEncuentrosRemovidos(new Set())
    } catch (error) {
      console.error('Error al generar propuesta:', error)
      setError(error instanceof Error ? error.message : 'Error al generar propuesta')
    } finally {
      setLoading(false)
    }
  }


  const handleRegenerar = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Usar la fecha seleccionada por el usuario o la fecha por defecto
      const fechaSeleccionada = fechaJornada ? new Date(fechaJornada + 'T00:00:00') : new Date()
      
      // Llamar a la función real del servidor
      const resultado = await generarPropuestaJornada(torneoId, jornada, {
        forzarDescanso: opciones.forzarDescanso,
        canchas: opciones.canchas,
        arbitros: opciones.arbitros,
        fechaJornada: fechaSeleccionada,
        restriccionesJornada,
        distribucionEquitativa
      } as any)
      
      setPropuesta(resultado)
      // Limpiar encuentros removidos cuando se regenera propuesta
      setEncuentrosRemovidos(new Set())
    } catch (error) {
      console.error('Error al regenerar propuesta:', error)
      setError(error instanceof Error ? error.message : 'Error al regenerar propuesta')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmar = async () => {
    if (!propuesta) return
    
    try {
      setLoading(true)
      
      // Filtrar encuentros removidos
      const encuentrosFiltrados = propuesta.jornada.encuentros.filter((_, index) => !encuentrosRemovidos.has(index))
      
      // Crear una copia de la jornada con la fecha seleccionada y encuentros filtrados
      const jornadaConFecha = {
        ...propuesta.jornada,
        encuentros: encuentrosFiltrados,
        fecha: fechaJornada ? new Date(fechaJornada + 'T00:00:00') : propuesta.jornada.fecha
      }
      
      await onConfirm(jornadaConFecha)
      onHide()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al confirmar jornada')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerarJornada = async () => {
    if (!propuesta || !onRegenerate) return
    
    try {
      setLoading(true)
      
      // Filtrar encuentros removidos
      const encuentrosFiltrados = propuesta.jornada.encuentros.filter((_, index) => !encuentrosRemovidos.has(index))
      
      // Crear una copia de la jornada con la fecha seleccionada y encuentros filtrados
      const jornadaConFecha = {
        ...propuesta.jornada,
        encuentros: encuentrosFiltrados,
        fecha: fechaJornada ? new Date(fechaJornada + 'T00:00:00') : propuesta.jornada.fecha
      }
      
      await onRegenerate(jornadaConFecha)
      onHide()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al regenerar jornada')
    } finally {
      setLoading(false)
    }
  }

  const getEquipoNombre = (equipoId: number) => {
    return equipos.find(e => e.id === equipoId)?.nombre || `Equipo ${equipoId}`
  }

  const getPrioridadBadge = (prioridad: string) => {
    const config = {
      alta: { bg: 'success', text: 'Nuevo' },
      media: { bg: 'warning', text: 'Medio' },
      baja: { bg: 'secondary', text: 'Repetido' }
    }
    const conf = config[prioridad as keyof typeof config] || config.baja
    
    return <Badge bg={conf.bg}>{conf.text}</Badge>
  }

  const toggleEncuentroRemovido = (index: number) => {
    const nuevosRemovidos = new Set(encuentrosRemovidos)
    if (nuevosRemovidos.has(index)) {
      nuevosRemovidos.delete(index)
    } else {
      nuevosRemovidos.add(index)
    }
    setEncuentrosRemovidos(nuevosRemovidos)
  }

  // Funciones para manejar restricciones de horarios

  const agregarRestriccionJornada = (equipoId: number, horarioId: number, tipo: 'forzado' | 'bloqueado') => {
    const nuevaRestriccion: RestriccionJornada = { jornada, equipoId, horarioId, tipo }
    setRestriccionesJornada(prev => [...prev.filter(r => !(r.jornada === jornada && r.equipoId === equipoId && r.horarioId === horarioId)), nuevaRestriccion])
  }

  const eliminarRestriccionJornada = (equipoId: number, horarioId: number) => {
    setRestriccionesJornada(prev => prev.filter(r => !(r.jornada === jornada && r.equipoId === equipoId && r.horarioId === horarioId)))
  }

  const ciclarRestriccionJornada = (equipoId: number, horarioId: number) => {
    const restriccionActual = getRestriccionJornada(equipoId, horarioId)
    
    if (!restriccionActual) {
      // Sin restricción → Forzado
      agregarRestriccionJornada(equipoId, horarioId, 'forzado')
    } else if (restriccionActual.tipo === 'forzado') {
      // Forzado → Bloqueado
      agregarRestriccionJornada(equipoId, horarioId, 'bloqueado')
    } else {
      // Bloqueado → Sin restricción
      eliminarRestriccionJornada(equipoId, horarioId)
    }
  }


  const getRestriccionJornada = (equipoId: number, horarioId: number) => {
    return restriccionesJornada.find(r => r.jornada === jornada && r.equipoId === equipoId && r.horarioId === horarioId)
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <ModalHeader closeButton>
        <Modal.Title>
          <LuSettings className="me-2" />
          {isRegenerating ? 'Regenerar' : 'Generar'} Jornada {jornada} - Sistema Dinámico
        </Modal.Title>
      </ModalHeader>
      
      <ModalBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Tabs de configuración */}
        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'general')}>
          <Nav variant="tabs" className="mb-3">
            <NavItem>
              <NavLink eventKey="general">
                <LuSettings className="me-1" size={14} />
                General
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink eventKey="horarios">
                <LuClock className="me-1" size={14} />
                Restricciones Horarios
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink eventKey="emparejamientos">
                <LuTarget className="me-1" size={14} />
                Emparejamientos Faltantes
              </NavLink>
            </NavItem>
          </Nav>

          <Tab.Content>
            {/* Tab: Configuración General */}
            <Tab.Pane eventKey="general">
        <Card className="mb-3 border-0 shadow-sm">
          <CardBody className="p-3">
            <Row>
              <Col md={12}>
                <Form.Group className="mb-0">
                  <Form.Label className="small fw-semibold mb-2">Equipos que deben descansar (opcional)</Form.Label>
                  <div className="border rounded p-2 bg-light bg-opacity-25" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    <Form.Check
                      type="checkbox"
                      label="Automático (equipos con menos descansos)"
                      checked={opciones.forzarDescanso.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setOpciones(prev => ({ ...prev, forzarDescanso: [] }))
                        }
                      }}
                      className="mb-1 small"
                    />
                    <div className="row g-1">
                      {equiposDisponibles.map(equipo => (
                        <div key={equipo.id} className="col-md-6">
                          <Form.Check
                            type="checkbox"
                            label={`${equipo.nombre} (${equipo.descansos})`}
                            checked={opciones.forzarDescanso.includes(equipo.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setOpciones(prev => ({ 
                                  ...prev, 
                                  forzarDescanso: [...prev.forzarDescanso, equipo.id] 
                                }))
                              } else {
                                setOpciones(prev => ({ 
                                  ...prev, 
                                  forzarDescanso: prev.forzarDescanso.filter(id => id !== equipo.id) 
                                }))
                              }
                            }}
                            className="small"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </Form.Group>
              </Col>
            </Row>
            
          </CardBody>
        </Card>
            </Tab.Pane>

            {/* Tab: Restricciones de Horarios */}
            <Tab.Pane eventKey="horarios">
              <div className="row g-3">
                {/* Distribución Equitativa */}
                <Col md={12}>
                  <Card className="border-0 shadow-sm">
                    <CardBody>
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-info bg-opacity-10 rounded-circle p-2">
                          <LuFilter className="text-info" size={20} />
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">Distribución Equitativa de Horarios</h6>
                          <small className="text-muted">
                            Evita que los equipos jueguen en el mismo horario de la jornada anterior
                          </small>
                        </div>
                        <Form.Check
                          type="switch"
                          checked={distribucionEquitativa}
                          onChange={(e) => setDistribucionEquitativa(e.target.checked)}
                          label="Activar"
                        />
                      </div>
                    </CardBody>
                  </Card>
                </Col>

                {/* Restricciones por Jornada */}
                <Col md={12}>
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="bg-light">
                      <h6 className="mb-0">
                        <LuCalendar className="me-2 text-primary" />
                        Restricciones Jornada {jornada}
                      </h6>
                    </CardHeader>
                    <CardBody>
                      <small className="text-muted mb-3 d-block">
                        Define horarios específicos para esta jornada
                      </small>
                      
                      {horarios.length === 0 ? (
                        <Alert variant="warning" className="mb-0">
                          <LuInfo className="me-2" />
                          No hay horarios disponibles. Crea horarios primero.
                        </Alert>
                      ) : (
                        <div className="row g-2">
                          {equipos.map(equipo => (
                            <div key={equipo.id} className="col-md-4 col-lg-3">
                              <div className="border rounded p-2 h-100">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <img 
                                    src={equipo.imagen_equipo || `https://ui-avatars.com/api/?name=${encodeURIComponent(equipo.nombre)}&background=6c757d&color=fff&size=16`} 
                                    alt={equipo.nombre} 
                                    className="rounded-circle"
                                    width={16}
                                    height={16}
                                  />
                                  <small className="fw-semibold" style={{ fontSize: '11px' }}>{equipo.nombre}</small>
                                </div>
                                <div className="row g-1">
                                  {horarios.map(horario => {
                                    const restriccion = getRestriccionJornada(equipo.id, horario.id)
                                    return (
                                      <div key={horario.id} className="col-6">
                                        <Button
                                          variant={restriccion ? 
                                            restriccion.tipo === 'forzado' ? 'success' : 'danger'
                                            : 'outline-secondary'
                                          }
                                          size="sm"
                                          className="w-100"
                                          style={{ fontSize: '10px', padding: '1px 3px' }}
                                          onClick={() => ciclarRestriccionJornada(equipo.id, horario.id)}
                                        >
                                          <div 
                                            className="rounded-circle me-1 d-inline-block"
                                            style={{ 
                                              width: '6px', 
                                              height: '6px', 
                                              backgroundColor: horario.color || '#007bff'
                                            }}
                                          />
                                          {horario.hora_inicio}
                                        </Button>
                                      </div>
                                    )
                                  })}
                                </div>
                                <small className="text-muted mt-1 d-block" style={{ fontSize: '9px' }}>
                                  Verde: Forzado | Rojo: Bloqueado
                                </small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>

              </div>
            </Tab.Pane>

            {/* Tab: Emparejamientos Faltantes */}
            <Tab.Pane eventKey="emparejamientos">
              <div className="row g-3">
                {emparejamientosLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" className="text-primary mb-3" />
                    <h6 className="text-primary">Cargando emparejamientos...</h6>
                  </div>
                ) : emparejamientosError ? (
                  <Alert variant="danger">
                    <h6><LuX className="me-2" />Error</h6>
                    <p className="mb-0">{emparejamientosError}</p>
                    <Button variant="outline-danger" size="sm" className="mt-2" onClick={cargarEmparejamientosFaltantes}>
                      Reintentar
                    </Button>
                  </Alert>
                ) : emparejamientosData ? (
                  <>

                    {/* Filtros */}
                    <Col md={12}>
                      <Card className="border-0 shadow-sm">
                        <CardBody>
                          <div className="d-flex align-items-center gap-3">
                            <div className="bg-info bg-opacity-10 rounded-circle p-2">
                              <LuFilter className="text-info" size={20} />
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1">Filtrar Emparejamientos</h6>
                              <small className="text-muted">Selecciona qué emparejamientos quieres ver</small>
                            </div>
                            <div className="d-flex gap-2">
                              <Button 
                                variant={filtroEmparejamientos === 'faltantes' ? 'primary' : 'outline-primary'}
                                size="sm"
                                onClick={() => setFiltroEmparejamientos('faltantes')}
                              >
                                Faltantes ({emparejamientosData.faltantes})
                              </Button>
                              <Button 
                                variant={filtroEmparejamientos === 'jugados' ? 'primary' : 'outline-primary'}
                                size="sm"
                                onClick={() => setFiltroEmparejamientos('jugados')}
                              >
                                Jugados ({emparejamientosData.jugados})
                              </Button>
                              <Button 
                                variant={filtroEmparejamientos === 'todos' ? 'primary' : 'outline-primary'}
                                size="sm"
                                onClick={() => setFiltroEmparejamientos('todos')}
                              >
                                Todos ({emparejamientosData.total})
                              </Button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>


                    {/* Lista de emparejamientos */}
                    <Col md={12}>
                      <Card className="border-0 shadow-sm">
                        <CardBody>
                          <h6 className="mb-3">Emparejamientos</h6>
                          <Row className="g-2">
                            {emparejamientosData.emparejamientosFaltantes
                              .filter(emparejamiento => {
                                if (filtroEmparejamientos === 'faltantes') return !emparejamiento.jugado
                                if (filtroEmparejamientos === 'jugados') return emparejamiento.jugado
                                return true
                              })
                              .map((emparejamiento, index) => {
                                const esFaltante = !emparejamiento.jugado
                                const clave = `${emparejamiento.equipo1.id}-${emparejamiento.equipo2.id}`
                                const seleccionado = emparejamientosSeleccionados.has(clave)
                                
                                return (
                                  <Col md={6} lg={3} xl={2} key={index}>
                                    <Card 
                                      className={`h-100 transition-all border-0 ${
                                        seleccionado 
                                          ? 'shadow-lg' 
                                          : esFaltante 
                                            ? 'shadow-md' 
                                            : 'shadow-sm'
                                      } ${esFaltante ? 'cursor-pointer' : 'cursor-default'}`}
                                      style={{ 
                                        cursor: esFaltante ? 'pointer' : 'default',
                                        transition: 'all 0.3s ease',
                                        backgroundColor: seleccionado 
                                          ? '#E0F2FE' 
                                          : esFaltante 
                                            ? '#FFFFFF' 
                                            : '#F8F9FA',
                                        border: seleccionado 
                                          ? '2px solid #20B2AA' 
                                          : esFaltante 
                                            ? '1px solid #E5E7EB' 
                                            : '1px solid #D1D5DB',
                                        borderRadius: '16px',
                                        transform: seleccionado ? 'scale(1.02)' : 'scale(1)',
                                        boxShadow: seleccionado 
                                          ? '0 10px 25px rgba(32, 178, 170, 0.15)' 
                                          : esFaltante 
                                            ? '0 4px 12px rgba(0, 0, 0, 0.08)' 
                                            : '0 2px 8px rgba(0, 0, 0, 0.04)'
                                      }}
                                      onClick={() => esFaltante && toggleEmparejamiento(emparejamiento)}
                                      onMouseEnter={(e) => {
                                        if (esFaltante && !seleccionado) {
                                          e.currentTarget.style.transform = 'scale(1.02)'
                                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.12)'
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (esFaltante && !seleccionado) {
                                          e.currentTarget.style.transform = 'scale(1)'
                                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'
                                        }
                                      }}
                                    >
                                      <CardBody className="p-3">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                          <span 
                                            className="badge rounded-pill"
                                            style={{ 
                                              fontSize: '9px', 
                                              padding: '4px 8px',
                                              backgroundColor: esFaltante ? '#F1F3F4' : '#E8F5E8',
                                              color: esFaltante ? '#5F6368' : '#137333',
                                              fontWeight: '500'
                                            }}
                                          >
                                            {esFaltante ? 'Faltante' : 'Jugado'}
                                          </span>
                                          {seleccionado && (
                                            <div 
                                              className="rounded-circle d-flex align-items-center justify-content-center"
                                              style={{
                                                width: '20px',
                                                height: '20px',
                                                backgroundColor: '#20B2AA',
                                                color: '#FFFFFF'
                                              }}
                                            >
                                              <LuCheck size={12} />
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="d-flex align-items-center justify-content-between">
                                          <div className="d-flex align-items-center">
                                            <div 
                                              className="rounded-circle d-flex align-items-center justify-content-center me-2" 
                                              style={{
                                                width: '24px', 
                                                height: '24px',
                                                backgroundColor: '#20B2AA',
                                                color: '#FFFFFF',
                                                fontWeight: '600'
                                              }}
                                            >
                                              <span className="fw-bold" style={{fontSize: '10px'}}>
                                                {emparejamiento.equipo1.nombre.charAt(0)}
                                              </span>
                                            </div>
                                            <small className="fw-semibold" style={{ fontSize: '10px', color: '#202124' }}>
                                              {emparejamiento.equipo1.nombre.length > 6 ? 
                                                emparejamiento.equipo1.nombre.substring(0, 6) + '...' : 
                                                emparejamiento.equipo1.nombre}
                                            </small>
                                          </div>
                                          
                                          <div className="mx-2" style={{fontSize: '8px', fontWeight: '600', color: '#5F6368'}}>VS</div>
                                          
                                          <div className="d-flex align-items-center">
                                            <small className="fw-semibold me-2" style={{ fontSize: '10px', color: '#202124' }}>
                                              {emparejamiento.equipo2.nombre.length > 6 ? 
                                                emparejamiento.equipo2.nombre.substring(0, 6) + '...' : 
                                                emparejamiento.equipo2.nombre}
                                            </small>
                                            <div 
                                              className="rounded-circle d-flex align-items-center justify-content-center" 
                                              style={{
                                                width: '24px', 
                                                height: '24px',
                                                backgroundColor: '#20B2AA',
                                                color: '#FFFFFF',
                                                fontWeight: '600'
                                              }}
                                            >
                                              <span className="fw-bold" style={{fontSize: '10px'}}>
                                                {emparejamiento.equipo2.nombre.charAt(0)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </CardBody>
                                    </Card>
                                  </Col>
                                )
                              })}
                          </Row>
                        </CardBody>
                      </Card>
                    </Col>

                  </>
                ) : null}
              </div>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>

        {loading ? (
          <div className="text-center py-5">
            <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                 style={{width: '80px', height: '80px'}}>
              <Spinner animation="border" className="text-primary" />
            </div>
            <h6 className="text-primary">Generando propuesta de jornada...</h6>
            <p className="text-muted">Esto puede tomar unos segundos</p>
          </div>
        ) : propuesta ? (
          <div>
            {/* Validaciones */}
            {!propuesta.validaciones.esValida && (
              <Alert variant="danger">
                <h6><LuX className="me-2" />Errores encontrados</h6>
                <ul className="mb-0">
                  {propuesta.validaciones.errores.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {propuesta.validaciones.advertencias.length > 0 && (
              <Alert variant="warning">
                <h6><LuTriangle className="me-2" />Advertencias</h6>
                <ul className="mb-0">
                  {propuesta.validaciones.advertencias.map((advertencia, index) => (
                    <li key={index}>{advertencia}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Encuentros propuestos - Compacto */}
            <Card className="border-0 shadow-sm">
              <CardBody className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <div className="bg-primary bg-opacity-10 rounded-circle p-1 me-2">
                        <LuCalendar className="text-primary" size={16} />
                      </div>
                      <h6 className="mb-0">Encuentros Propuestos</h6>
                    </div>
                  </div>
                  
                  {/* Fecha de la jornada y Botón Aplicar unificado */}
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <label className="small text-muted mb-0">Fecha:</label>
                      <Form.Control
                        type="date"
                        value={fechaJornada}
                        onChange={(e) => setFechaJornada(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        size="sm"
                        style={{ width: '140px' }}
                      />
                    </div>
                    <Button
                      variant={activeTab === 'emparejamientos' ? 'success' : 'primary'}
                      size="sm"
                      onClick={activeTab === 'emparejamientos' ? generarJornadaDesdeEmparejamientos : generarPropuestaInicial}
                      disabled={loading || (activeTab === 'emparejamientos' ? emparejamientosSeleccionados.size === 0 : horarios.length === 0)}
                      className="d-flex align-items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" />
                          {activeTab === 'emparejamientos' ? 'Procesando...' : 'Generando...'}
                        </>
                      ) : (
                        <>
                          <LuCheck size={14} />
                          {activeTab === 'emparejamientos' ? 'Agregar a Propuesta' : 'Aplicar'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Equipos que descansan - compacto */}
                {propuesta.jornada.equiposQueDescansan && propuesta.jornada.equiposQueDescansan.length > 0 && (
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="bg-info bg-opacity-20 rounded-circle p-1 d-flex align-items-center justify-content-center">
                      <LuUsers className="text-info" size={12} />
                    </div>
                    <small className="text-info fw-semibold">Descansan:</small>
                    <div className="d-flex gap-1">
                      {propuesta.jornada.equiposQueDescansan.map(equipoId => {
                        const equipo = equipos.find(e => e.id === equipoId)
                        return (
                          <div key={equipoId} className="d-flex align-items-center gap-1 bg-info bg-opacity-10 px-1 py-0 rounded border border-info border-opacity-25">
                            <img 
                              src={equipo?.imagen_equipo || `https://ui-avatars.com/api/?name=${encodeURIComponent(equipo?.nombre || 'E')}&background=17a2b8&color=fff&size=16`} 
                              alt={equipo?.nombre || 'Equipo'} 
                              className="rounded-circle"
                              width={16}
                              height={16}
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(equipo?.nombre || 'E')}&background=17a2b8&color=fff&size=16`
                              }}
                            />
                            <small className="text-info fw-semibold">💤 {getEquipoNombre(equipoId)}</small>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Información sobre tipos de encuentros */}
                <div className="d-flex align-items-center gap-3 mt-2">
                  <div className="d-flex align-items-center gap-1">
                    <Badge bg="primary" className="small">
                      <LuTarget size={10} /> Seleccionado
                    </Badge>
                    <small className="text-muted">Emparejamientos elegidos manualmente</small>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <Badge bg="secondary" className="small">
                      <LuShuffle size={10} /> Automático
                    </Badge>
                    <small className="text-muted">Emparejamientos generados automáticamente</small>
                  </div>
                </div>
                
                {encuentrosRemovidos.size > 0 && (
                  <div className="alert alert-warning alert-dismissible py-1 px-2 mb-0 small mt-1">
                    <LuX className="me-1" />
                    <strong>{encuentrosRemovidos.size}</strong> removido{encuentrosRemovidos.size !== 1 ? 's' : ''} 
                    - <strong>{propuesta.jornada.encuentros.length - encuentrosRemovidos.size}</strong> se crearán
                  </div>
                )}
                
                <div className="d-flex justify-content-end mt-2">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={handleRegenerar}
                    disabled={loading}
                    className="d-flex align-items-center gap-1"
                  >
                    <LuShuffle size={14} />
                    Regenerar
                  </Button>
                </div>
              </CardBody>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardBody className="p-3">
                <Row className="g-2">
                  {propuesta.jornada.encuentros.map((encuentro, index) => {
                    const estaRemovido = encuentrosRemovidos.has(index)
                    const equipoLocal = equipos.find(e => e.id === encuentro.equipoLocal)
                    const equipoVisitante = equipos.find(e => e.id === encuentro.equipoVisitante)
                    
                    return (
                      <Col key={index} md={6} lg={4} className="mb-2">
                        <Card className={`border-0 shadow-sm transition-all ${estaRemovido ? 'opacity-50 bg-light' : 'bg-white'}`} 
                              style={{transition: 'all 0.3s ease'}}>
                          <CardBody className="p-3">
                            {/* Header compacto */}
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-1">
                                {getPrioridadBadge(encuentro.prioridad)}
                                {(encuentro as any).esEmparejamientoSeleccionado && (
                                  <Badge bg="primary" className="small">
                                    <LuTarget size={10} /> Seleccionado
                                  </Badge>
                                )}
                                {!(encuentro as any).esEmparejamientoSeleccionado && (
                                  <Badge bg="secondary" className="small">
                                    <LuShuffle size={10} /> Automático
                                  </Badge>
                                )}
                                {estaRemovido && (
                                  <Badge bg="danger" className="small">
                                    <LuX size={10} /> Removido
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant={estaRemovido ? "success" : "outline-danger"}
                                size="sm"
                                onClick={() => toggleEncuentroRemovido(index)}
                                title={estaRemovido ? "Restaurar encuentro" : "Remover encuentro"}
                                className="rounded-circle d-flex align-items-center justify-content-center p-0"
                                style={{ width: '24px', height: '24px' }}
                              >
                                <LuX size={12} />
                              </Button>
                            </div>

                            {/* Equipos enfrentándose - compacto */}
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <div className="d-flex align-items-center gap-2 flex-grow-1">
                                <div className="text-center">
                                  <div className="position-relative mb-1">
                                    <img 
                                      src={equipoLocal?.imagen_equipo || `https://ui-avatars.com/api/?name=${encodeURIComponent(equipoLocal?.nombre || 'L')}&background=007bff&color=fff&size=32`} 
                                      alt={equipoLocal?.nombre || 'Local'} 
                                      className="rounded-circle border border-1 border-primary"
                                      width={32}
                                      height={32}
                                      onError={(e) => {
                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(equipoLocal?.nombre || 'L')}&background=007bff&color=fff&size=32`
                                      }}
                                    />
                                    <div className="position-absolute top-0 start-0 translate-middle">
                                      <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                                           style={{width: '12px', height: '12px', fontSize: '8px'}}>
                                        🏠
                                      </div>
                                    </div>
                                  </div>
                                  <small className={`fw-semibold text-center d-block ${estaRemovido ? 'text-decoration-line-through text-muted' : 'text-dark'}`}
                                         style={{fontSize: '0.75rem', maxWidth: '60px'}}>
                                    {getEquipoNombre(encuentro.equipoLocal)}
                                  </small>
                                </div>
                                
                                <div className="text-center flex-grow-1">
                                  <div className="bg-light rounded d-flex align-items-center justify-content-center mb-1" 
                                       style={{width: '30px', height: '30px', margin: '0 auto'}}>
                                    <span className="fw-bold text-primary small">VS</span>
                                  </div>
                                </div>
                                
                                <div className="text-center">
                                  <div className="position-relative mb-1">
                                    <img 
                                      src={equipoVisitante?.imagen_equipo || `https://ui-avatars.com/api/?name=${encodeURIComponent(equipoVisitante?.nombre || 'V')}&background=28a745&color=fff&size=32`} 
                                      alt={equipoVisitante?.nombre || 'Visitante'} 
                                      className="rounded-circle border border-1 border-success"
                                      width={32}
                                      height={32}
                                      onError={(e) => {
                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(equipoVisitante?.nombre || 'V')}&background=28a745&color=fff&size=32`
                                      }}
                                    />
                                    <div className="position-absolute top-0 start-0 translate-middle">
                                      <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                                           style={{width: '12px', height: '12px', fontSize: '8px'}}>
                                        ✈️
                                      </div>
                                    </div>
                                  </div>
                                  <small className={`fw-semibold text-center d-block ${estaRemovido ? 'text-decoration-line-through text-muted' : 'text-dark'}`}
                                         style={{fontSize: '0.75rem', maxWidth: '60px'}}>
                                    {getEquipoNombre(encuentro.equipoVisitante)}
                                  </small>
                                </div>
                              </div>
                            </div>

                            {/* Detalles del encuentro - compacto */}
                            <div className="bg-light rounded p-2">
                              <div className="row g-1">
                                {/* Horario */}
                                {(encuentro as any).horarioId && (
                                  <div className="col-12 mb-2">
                                    <div className="d-flex align-items-center gap-1">
                                      <span className="text-info" style={{fontSize: '10px'}}>🕐</span>
                                      <div className="flex-grow-1">
                                        <small className="text-muted d-block" style={{fontSize: '0.65rem'}}>Horario</small>
                                        <div className="d-flex align-items-center gap-1">
                                          <div 
                                            className="rounded-circle d-inline-block"
                                            style={{ 
                                              width: '8px', 
                                              height: '8px', 
                                              backgroundColor: horarios.find(h => h.id === (encuentro as any).horarioId)?.color || '#007bff'
                                            }}
                                          />
                                          <small className="fw-semibold" style={{fontSize: '0.7rem'}}>
                                            {horarios.find(h => h.id === (encuentro as any).horarioId)?.hora_inicio || 'N/A'}
                                          </small>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="col-6">
                                  <div className="d-flex align-items-center gap-1">
                                    <span className="text-primary" style={{fontSize: '10px'}}>🏟️</span>
                                    <div>
                                      <small className="text-muted d-block" style={{fontSize: '0.65rem'}}>Cancha</small>
                                      <small className="fw-semibold" style={{fontSize: '0.7rem'}}>{encuentro.cancha}</small>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-6">
                                  <div className="d-flex align-items-center gap-1">
                                    <span className="text-warning" style={{fontSize: '10px'}}>👨‍⚖️</span>
                                    <div>
                                      <small className="text-muted d-block" style={{fontSize: '0.65rem'}}>Árbitro</small>
                                      <small className="fw-semibold" style={{fontSize: '0.7rem'}}>{encuentro.arbitro}</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              </CardBody>
            </Card>
          </div>
        ) : null}
      </ModalBody>
      
      <ModalFooter className="border-top-0 bg-light">
        <Button variant="secondary" onClick={onHide} disabled={loading} className="d-flex align-items-center gap-2">
          <LuX size={16} />
          Cancelar
        </Button>
        {propuesta && propuesta.validaciones.esValida && (
          <>
            {isRegenerating ? (
              <Button 
                variant="warning" 
                onClick={handleRegenerarJornada}
                disabled={loading}
                className="d-flex align-items-center gap-2"
              >
                <LuTarget size={16} />
                {loading ? 'Regenerando...' : 'Regenerar Jornada'}
              </Button>
            ) : (
              <Button 
                variant="success" 
                onClick={handleConfirmar}
                disabled={loading}
                className="d-flex align-items-center gap-2"
              >
                <LuCheck size={16} />
                {loading ? 'Confirmando...' : `Confirmar Jornada (${propuesta ? propuesta.jornada.encuentros.length - encuentrosRemovidos.size : 0} encuentros)`}
              </Button>
            )}
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
