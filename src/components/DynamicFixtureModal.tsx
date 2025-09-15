'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormSelect, FormCheck, Alert, Badge, Card, CardBody, Row, Col, Spinner } from 'react-bootstrap'
import { LuSettings, LuUsers, LuCalendar, LuCheck, LuX, LuTriangle, LuInfo, LuShuffle, LuTarget } from 'react-icons/lu'
import type { DynamicFixtureResult, JornadaPropuesta } from '@/lib/dynamic-fixture-generator'
import type { EquipoWithRelations } from '@/db/types'
import { generarPropuestaJornada } from '../app/(admin)/(apps)/torneos/dynamic-actions'

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
  descansosExistentes?: Record<number, number>
}

interface EquipoDescanso {
  id: number
  nombre: string
  descansos: number
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
  const [opciones, setOpciones] = useState({
    forzarDescanso: [] as number[],
    permitirDescansosConsecutivos: false,
    diasEntreJornadas: 7,
    canchas: ['Cancha Principal', 'Cancha Secundaria'],
    arbitros: ['Árbitro 1', 'Árbitro 2', 'Árbitro 3']
  })
  const [error, setError] = useState<string | null>(null)
  const [mostrarAlternativas, setMostrarAlternativas] = useState(false)

  // Cargar equipos disponibles para descanso al abrir el modal
  useEffect(() => {
    if (show && equipos.length > 0) {
      cargarEquiposDisponibles()
    }
  }, [show, equipos])

  // Generar propuesta inicial solo cuando se abre el modal
  useEffect(() => {
    if (show && equipos.length > 0) {
      generarPropuestaInicial()
    }
  }, [show, equipos])

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

  const generarPropuestaInicial = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Llamar a la función real del servidor
      const resultado = await generarPropuestaJornada(torneoId, jornada, {
        forzarDescanso: opciones.forzarDescanso,
        permitirDescansosConsecutivos: opciones.permitirDescansosConsecutivos,
        diasEntreJornadas: opciones.diasEntreJornadas,
        canchas: opciones.canchas,
        arbitros: opciones.arbitros
      })
      
      setPropuesta(resultado)
    } catch (error) {
      console.error('Error al generar propuesta:', error)
      setError(error instanceof Error ? error.message : 'Error al generar propuesta')
    } finally {
      setLoading(false)
    }
  }


  const handleRegenerar = async () => {
    await generarPropuestaInicial()
  }

  const handleConfirmar = async () => {
    if (!propuesta) return
    
    try {
      setLoading(true)
      await onConfirm(propuesta.jornada)
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
      await onRegenerate(propuesta.jornada)
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

        {/* Configuración de opciones */}
        <Card className="mb-4">
          <CardBody>
            <h6><LuSettings className="me-2" />Configuración de la Jornada</h6>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Equipos que deben descansar (opcional)</Form.Label>
                  <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <Form.Check
                      type="checkbox"
                      label="Automático (equipos con menos descansos)"
                      checked={opciones.forzarDescanso.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setOpciones(prev => ({ ...prev, forzarDescanso: [] }))
                        }
                      }}
                      className="mb-2"
                    />
                    {equiposDisponibles.map(equipo => (
                      <Form.Check
                        key={equipo.id}
                        type="checkbox"
                        label={`${equipo.nombre} (${equipo.descansos} descansos)`}
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
                        className="mb-1"
                      />
                    ))}
                  </div>
                  <Form.Text className="text-muted">
                    Selecciona los equipos que deben descansar en esta jornada. Si no seleccionas ninguno, se elegirán automáticamente.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Días entre jornadas</Form.Label>
                  <FormSelect
                    value={opciones.diasEntreJornadas}
                    onChange={(e) => setOpciones(prev => ({ 
                      ...prev, 
                      diasEntreJornadas: parseInt(e.target.value) 
                    }))}
                  >
                    <option value={3}>3 días</option>
                    <option value={7}>7 días</option>
                    <option value={14}>14 días</option>
                  </FormSelect>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Check
                  type="checkbox"
                  label="Permitir descansos consecutivos"
                  checked={opciones.permitirDescansosConsecutivos}
                  onChange={(e) => setOpciones(prev => ({ 
                    ...prev, 
                    permitirDescansosConsecutivos: e.target.checked 
                  }))}
                />
              </Col>
            </Row>
            <Row className="mt-3">
              <Col md={12}>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={generarPropuestaInicial}
                  disabled={loading}
                >
                  <LuShuffle className="me-1" />
                  Aplicar Configuración
                </Button>
                <small className="text-muted ms-2">
                  Haz clic para generar una nueva propuesta con la configuración actual
                </small>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-2">Generando propuesta de jornada...</p>
          </div>
        ) : propuesta ? (
          <>
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

            {/* Estadísticas */}
            <Card className="mb-4">
              <CardBody>
                <h6><LuInfo className="me-2" />Estadísticas de la Jornada</h6>
                <Row>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-primary">{propuesta.estadisticas.totalEncuentros}</h4>
                      <small>Encuentros</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-success">{propuesta.estadisticas.nuevosEmparejamientos}</h4>
                      <small>Nuevos</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-warning">{propuesta.estadisticas.emparejamientosRepetidos}</h4>
                      <small>Repetidos</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-info">{propuesta.estadisticas.proximasOpciones}</h4>
                      <small>Opciones futuras</small>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>

            {/* Equipos que descansan */}
            {propuesta.jornada.equiposQueDescansan && propuesta.jornada.equiposQueDescansan.length > 0 && (
              <Alert variant="info" className="mb-4">
                <h6><LuUsers className="me-2" />Equipos que descansan</h6>
                <div className="d-flex flex-wrap gap-2">
                  {propuesta.jornada.equiposQueDescansan.map(equipoId => (
                    <div key={equipoId} className="d-flex align-items-center gap-2 bg-white bg-opacity-50 p-2 rounded">
                      <img 
                        src={equipos.find(e => e.id === equipoId)?.imagen_equipo || 'https://via.placeholder.com/24x24/17a2b8/ffffff?text=💤'} 
                        alt="" 
                        className="rounded-circle"
                        width={24}
                        height={24}
                      />
                      <span className="fw-semibold">
                        💤 {getEquipoNombre(equipoId)}
                      </span>
                    </div>
                  ))}
                </div>
              </Alert>
            )}

            {/* Encuentros propuestos */}
            <Card>
              <CardBody>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6><LuCalendar className="me-2" />Encuentros Propuestos</h6>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={handleRegenerar}
                    disabled={loading}
                  >
                    <LuShuffle className="me-1" />
                    Regenerar
                  </Button>
                </div>
                
                <Row>
                  {propuesta.jornada.encuentros.map((encuentro, index) => (
                    <Col key={index} md={6} className="mb-3">
                      <Card className="border">
                        <CardBody className="p-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <img 
                                src={equipos.find(e => e.id === encuentro.equipoLocal)?.imagen_equipo || 'https://via.placeholder.com/24x24/007bff/ffffff?text=🏠'} 
                                alt="" 
                                className="rounded-circle"
                                width={24}
                                height={24}
                              />
                              <span className="fw-semibold">{getEquipoNombre(encuentro.equipoLocal)}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-muted">vs</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-semibold">{getEquipoNombre(encuentro.equipoVisitante)}</span>
                              <img 
                                src={equipos.find(e => e.id === encuentro.equipoVisitante)?.imagen_equipo || 'https://via.placeholder.com/24x24/28a745/ffffff?text=✈️'} 
                                alt="" 
                                className="rounded-circle"
                                width={24}
                                height={24}
                              />
                            </div>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <small className="text-muted d-block">{encuentro.cancha}</small>
                              <small className="text-muted">{encuentro.arbitro}</small>
                            </div>
                            <div>
                              {getPrioridadBadge(encuentro.prioridad)}
                              {encuentro.esNuevoEmparejamiento && (
                                <Badge bg="success" className="ms-1">Nuevo</Badge>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </CardBody>
            </Card>
          </>
        ) : null}
      </ModalBody>
      
      <ModalFooter>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancelar
        </Button>
        {propuesta && propuesta.validaciones.esValida && (
          <>
            {isRegenerating ? (
              <Button 
                variant="warning" 
                onClick={handleRegenerarJornada}
                disabled={loading}
              >
                <LuTarget className="me-1" />
                {loading ? 'Regenerando...' : 'Regenerar Jornada'}
              </Button>
            ) : (
              <Button 
                variant="success" 
                onClick={handleConfirmar}
                disabled={loading}
              >
                <LuCheck className="me-1" />
                {loading ? 'Confirmando...' : 'Confirmar Jornada'}
              </Button>
            )}
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
