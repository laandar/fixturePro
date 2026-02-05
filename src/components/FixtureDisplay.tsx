'use client'
import { useState } from 'react'
import { Card, CardBody, CardHeader, Row, Col, Badge, Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormControl, FloatingLabel, FormSelect } from 'react-bootstrap'
import { LuCalendar, LuMapPin, LuUser, LuEye } from 'react-icons/lu'
import { formatFechaProgramada } from '@/helpers/date'
import type { EncuentroWithRelations, EquipoWithRelations } from '@/db/types'

interface FixtureDisplayProps {
  encuentros: EncuentroWithRelations[]
  equiposDescansan?: Record<number, number> // jornada -> equipo_id que descansa
  equiposParticipantes?: EquipoWithRelations[] // Para obtener detalles de equipos que descansan
  onUpdateEncuentro?: (encuentroId: number, formData: FormData) => Promise<void>
  showActions?: boolean
}

export default function FixtureDisplay({ encuentros, equiposDescansan, equiposParticipantes, onUpdateEncuentro, showActions = true }: FixtureDisplayProps) {
  const [selectedEncuentro, setSelectedEncuentro] = useState<EncuentroWithRelations | null>(null)
  const [showModal, setShowModal] = useState(false)

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

  const getEquipoQueDescansa = (jornada: number) => {
    if (!equiposDescansan || !equiposParticipantes) return null
    
    const equipoId = equiposDescansan[jornada]
    if (!equipoId) return null
    
    return equiposParticipantes.find(equipo => equipo.id === equipoId)
  }

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { bg: string; text: string; label: string; icon: string }> = {
      programado: { bg: 'secondary', text: 'secondary', label: 'Programado', icon: '📅' },
      en_curso: { bg: 'warning', text: 'warning', label: 'En Curso', icon: '⚽' },
      finalizado: { bg: 'success', text: 'success', label: 'Finalizado', icon: '🏆' },
      cancelado: { bg: 'danger', text: 'danger', label: 'Cancelado', icon: '❌' },
      aplazado: { bg: 'info', text: 'info', label: 'Aplazado', icon: '⏰' }
    }
    const configItem = config[estado] || { bg: 'secondary', text: 'secondary', label: estado, icon: '❓' }
    
    return (
      <Badge bg={configItem.bg} className={`text-${configItem.text}`}>
        {configItem.icon} {configItem.label}
      </Badge>
    )
  }

  const handleUpdateEncuentro = async (formData: FormData) => {
    if (!selectedEncuentro || !onUpdateEncuentro) return

    try {
      await onUpdateEncuentro(selectedEncuentro.id, formData)
      setShowModal(false)
      setSelectedEncuentro(null)
    } catch (error) {
      console.error('Error al actualizar encuentro:', error)
    }
  }

  const jornadas = getEncuentrosPorJornada()

  if (encuentros.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="fs-1 mb-3">⚽</div>
        <h5>No hay encuentros programados</h5>
        <p className="text-muted">El fixture aún no ha sido generado</p>
      </div>
    )
  }

  return (
    <div>
      {Object.keys(jornadas).sort((a, b) => parseInt(a) - parseInt(b)).map(jornadaNum => (
        <Card key={jornadaNum} className="mb-4 shadow-sm">
          <CardHeader className="bg-primary text-white">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                🏆 Jornada {jornadaNum}
              </h5>
              <Badge bg="light" text="dark">
                {jornadas[parseInt(jornadaNum)].length} encuentros
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            {/* Mostrar equipo que descansa si aplica */}
            {getEquipoQueDescansa(parseInt(jornadaNum)) && (
              <div className="alert alert-info mb-3 d-flex align-items-center">
                <div className="me-3">
                  <img 
                    src={getEquipoQueDescansa(parseInt(jornadaNum))?.imagen_equipo || 'https://via.placeholder.com/32x32/28a745/ffffff?text=🏆'} 
                    alt="" 
                    className="rounded-circle"
                    width={32}
                    height={32}
                  />
                </div>
                <div>
                  <strong>🛌 {getEquipoQueDescansa(parseInt(jornadaNum))?.nombre}</strong> descansa esta jornada
                </div>
              </div>
            )}
            
            <Row>
              {jornadas[parseInt(jornadaNum)].map((encuentro) => (
                <Col key={encuentro.id} lg={6} xl={4} className="mb-3">
                  <Card className="h-100 border-0 shadow-sm hover-shadow">
                    <CardBody className="p-3">
                      {/* Equipos y resultado */}
                      <div className="text-center mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="text-center flex-fill">
                            <div className="avatar avatar-md mx-auto mb-2">
                              <img 
                                src={encuentro.equipoLocal?.imagen_equipo || 'https://via.placeholder.com/48x48/007bff/ffffff?text=🏟️'} 
                                alt="" 
                                className="img-fluid rounded-circle border"
                                width={48}
                                height={48}
                              />
                            </div>
                            <h6 className="mb-0 fw-semibold">{encuentro.equipoLocal?.nombre}</h6>
                            <small className="text-muted">{encuentro.equipoLocal?.entrenador?.nombre}</small>
                          </div>
                          
                          <div className="text-center mx-3">
                            {encuentro.goles_local !== null && encuentro.goles_visitante !== null ? (
                              <div>
                                <div className="fs-2 fw-bold text-primary">
                                  {encuentro.goles_local} - {encuentro.goles_visitante}
                                </div>
                                <small className="text-muted">Resultado Final</small>
                              </div>
                            ) : (
                              <div>
                                <div className="fs-3 fw-bold text-muted">VS</div>
                                <small className="text-muted">Por jugar</small>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-center flex-fill">
                            <div className="avatar avatar-md mx-auto mb-2">
                              <img 
                                src={encuentro.equipoVisitante?.imagen_equipo || 'https://via.placeholder.com/48x48/dc3545/ffffff?text=⚽'} 
                                alt="" 
                                className="img-fluid rounded-circle border"
                                width={48}
                                height={48}
                              />
                            </div>
                            <h6 className="mb-0 fw-semibold">{encuentro.equipoVisitante?.nombre}</h6>
                            <small className="text-muted">{encuentro.equipoVisitante?.entrenador?.nombre}</small>
                          </div>
                        </div>
                      </div>

                      {/* Información del encuentro */}
                      <div className="border-top pt-3">
                        <div className="row g-2 text-center">
                          <div className="col-3">
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <LuCalendar className="text-muted" />
                              <small className="text-muted">
                                {encuentro.fecha_programada ? 
                                  formatFechaProgramada(encuentro.fecha_programada) : 'Por definir'}
                              </small>
                            </div>
                          </div>
                          <div className="col-3">
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <span className="text-info">🕐</span>
                              <small className="text-muted">
                                {encuentro.horario?.hora_inicio || 'Por definir'}
                              </small>
                            </div>
                          </div>
                          <div className="col-3">
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <LuMapPin className="text-muted" />
                              <small className="text-muted">
                                {encuentro.cancha || 'Por definir'}
                              </small>
                            </div>
                          </div>
                          <div className="col-3">
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <LuUser className="text-muted" />
                              <small className="text-muted">
                                {encuentro.arbitro || 'Por definir'}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Estado y acciones */}
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        {getEstadoBadge(encuentro.estado || 'programado')}
                        
                        {showActions && (
                          <div className="d-flex gap-1">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => {
                                setSelectedEncuentro(encuentro)
                                setShowModal(true)
                              }}>
                              <LuEye className="fs-sm" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Observaciones */}
                      {encuentro.observaciones && (
                        <div className="mt-2 p-2 bg-light rounded">
                          <small className="text-muted">
                            <strong>Observaciones:</strong> {encuentro.observaciones}
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

      {/* Modal para editar encuentro */}
      {showActions && onUpdateEncuentro && (
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <ModalHeader closeButton>
            <Modal.Title>Editar Encuentro</Modal.Title>
          </ModalHeader>
          <ModalBody>
            {selectedEncuentro && (
              <div>
                <div className="text-center mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="text-center">
                      <img 
                        src={selectedEncuentro.equipoLocal?.imagen_equipo || 'https://via.placeholder.com/64x64/6c757d/ffffff?text=⚽'} 
                        alt="" 
                        className="rounded-circle mb-2"
                        width={64}
                        height={64}
                      />
                      <h6>{selectedEncuentro.equipoLocal?.nombre}</h6>
                    </div>
                    <div className="text-center">
                      <h4 className="text-muted">VS</h4>
                    </div>
                    <div className="text-center">
                      <img 
                        src={selectedEncuentro.equipoVisitante?.imagen_equipo || 'https://via.placeholder.com/64x64/6c757d/ffffff?text=⚽'} 
                        alt="" 
                        className="rounded-circle mb-2"
                        width={64}
                        height={64}
                      />
                      <h6>{selectedEncuentro.equipoVisitante?.nombre}</h6>
                    </div>
                  </div>
                </div>

                <Form action={handleUpdateEncuentro}>
                  <Row>
                    <Col md={6}>
                      <FloatingLabel label="Goles Local">
                        <FormControl 
                          type="number" 
                          name="goles_local" 
                          min="0"
                          defaultValue={selectedEncuentro.goles_local || ''} 
                        />
                      </FloatingLabel>
                    </Col>
                    <Col md={6}>
                      <FloatingLabel label="Goles Visitante">
                        <FormControl 
                          type="number" 
                          name="goles_visitante" 
                          min="0"
                          defaultValue={selectedEncuentro.goles_visitante || ''} 
                        />
                      </FloatingLabel>
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col md={6}>
                      <FloatingLabel label="Estado">
                        <FormSelect name="estado" defaultValue={selectedEncuentro.estado || 'programado'}>
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
                          defaultValue={selectedEncuentro.cancha || ''} 
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
                          defaultValue={selectedEncuentro.observaciones || ''} 
                        />
                      </FloatingLabel>
                    </Col>
                  </Row>
                </Form>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="encuentro-form">
              Actualizar
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
