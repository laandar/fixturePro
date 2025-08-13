'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Button, Card, CardBody, CardHeader, Col, Container, Row, Alert, Badge, Nav, NavItem, NavLink, Table, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormControl, FloatingLabel, FormSelect, Tab } from 'react-bootstrap'
import { LuTrophy, LuCalendar, LuUsers, LuGamepad2, LuSettings, LuPlus, LuTrash } from 'react-icons/lu'
import { getTorneoById, addEquiposToTorneo, removeEquipoFromTorneo, generateFixtureForTorneo, getEncuentrosByTorneo, updateEncuentro } from '../actions'
import { getCategorias, getEquipos } from '../../equipos/actions'
import type { TorneoWithRelations, EquipoWithRelations, Categoria, EncuentroWithRelations } from '@/db/types'

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
  const [showRestrictions, setShowRestrictions] = useState(false)
  const [unavailableByJornada, setUnavailableByJornada] = useState<Record<number, number[]>>({})
  const [equiposDescansan, setEquiposDescansan] = useState<Record<number, number>>({})
  
  // Estado para tabs
  const [activeTab, setActiveTab] = useState('general')

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [torneoData, equiposData, categoriasData, encuentrosData] = await Promise.all([
        getTorneoById(torneoId),
        getEquipos(),
        getCategorias(),
        getEncuentrosByTorneo(torneoId)
      ])
      
      setTorneo((torneoData ?? null) as TorneoWithRelations | null)
      setEquiposDisponibles(equiposData)
      setCategorias(categoriasData)
      setEncuentros(encuentrosData as any)
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
      const hasRestrictions = Object.keys(unavailableByJornada).length > 0
      const result = await generateFixtureForTorneo(torneoId, equipos, {
        unavailableByJornada: hasRestrictions ? unavailableByJornada : undefined,
      })
      
      // Capturar información de equipos que descansan
      if (result.equiposDescansan) {
        setEquiposDescansan(result.equiposDescansan)
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

  const getEstadoBadge = (estado: string | null) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      programado: { bg: 'secondary', text: 'secondary', label: 'Programado' },
      en_curso: { bg: 'warning', text: 'warning', label: 'En Curso' },
      finalizado: { bg: 'success', text: 'success', label: 'Finalizado' },
      cancelado: { bg: 'danger', text: 'danger', label: 'Cancelado' },
      aplazado: { bg: 'info', text: 'info', label: 'Aplazado' }
    }
    const estadoKey = estado ?? 'programado'
    const configItem = config[estadoKey] || { bg: 'secondary', text: 'secondary', label: estadoKey }
    
    return (
      <Badge bg={configItem.bg} className={`text-${configItem.text}`}>
        {configItem.label}  
      </Badge>
    )
  }

  const getEquipoQueDescansa = (jornada: number) => {
    const equipoId = equiposDescansan[jornada]
    if (!equipoId) return null
    
    const equipoTorneo = torneo?.equiposTorneo?.find(et => et.equipo_id === equipoId)
    return equipoTorneo?.equipo || null
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
                  {encuentros.length === 0 ? (
                    <div className="text-center py-5">
                      <LuGamepad2 className="fs-1 text-muted mb-3" />
                      <h5>No hay encuentros programados</h5>
                      <p className="text-muted">
                        {equiposParticipantes.length >= 2 
                          ? 'Genera el fixture para ver los encuentros programados'
                          : 'Agrega al menos 2 equipos para generar el fixture'}
                      </p>
                      {equiposParticipantes.length >= 2 && (
                        <Button 
                          variant="primary"
                          onClick={() => setShowFixtureModal(true)}>
                          <LuSettings className="me-1" />
                          Generar Fixture
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h5>Fixture del Torneo</h5>
                      {Object.keys(jornadas).sort((a, b) => parseInt(a) - parseInt(b)).map(jornadaNum => (
                        <Card key={jornadaNum} className="mb-4">
                          <CardHeader>
                            <div className="d-flex justify-content-between align-items-center">
                              <h6 className="mb-0">Jornada {jornadaNum}</h6>
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
                                    src={getEquipoQueDescansa(parseInt(jornadaNum))?.imagen_equipo || 'https://via.placeholder.com/32x32/ffc107/000000?text=💤'} 
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
                                <Col key={encuentro.id} md={6} lg={4} className="mb-3">
                                  <Card className="border">
                                    <CardBody className="p-3">
                                      <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div className="d-flex align-items-center gap-2">
                                          <img 
                                            src={encuentro.equipoLocal?.imagen_equipo || 'https://via.placeholder.com/24x24/007bff/ffffff?text=🏠'} 
                                            alt="" 
                                            className="rounded-circle"
                                            width={24}
                                            height={24}
                                          />
                                          <span className="fw-semibold">{encuentro.equipoLocal?.nombre}</span>
                                        </div>
                                        <div className="text-center">
                                          {encuentro.goles_local !== null && encuentro.goles_visitante !== null ? (
                                            <span className="fw-bold fs-5">
                                              {encuentro.goles_local} - {encuentro.goles_visitante}
                                            </span>
                                          ) : (
                                            <span className="text-muted">vs</span>
                                          )}
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                          <span className="fw-semibold">{encuentro.equipoVisitante?.nombre}</span>
                                          <img 
                                            src={encuentro.equipoVisitante?.imagen_equipo || 'https://via.placeholder.com/24x24/28a745/ffffff?text=✈️'} 
                                            alt="" 
                                            className="rounded-circle"
                                            width={24}
                                            height={24}
                                          />
                                        </div>
                                      </div>
                                      <div className="d-flex justify-content-between align-items-center">
                                        <small className="text-muted">
                                          {encuentro.fecha_programada ? 
                                            new Date(encuentro.fecha_programada).toLocaleDateString('es-ES') : 'Fecha por definir'}
                                        </small>
                                        <div className="d-flex gap-1">
                                          {getEstadoBadge(encuentro.estado)}
                                          <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => {
                                              setEditingEncuentro(encuentro)
                                              setShowEncuentroModal(true)
                                            }}>
                                            <LuSettings className="fs-sm" />
                                          </Button>
                                        </div>
                                      </div>
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
      <Modal show={showFixtureModal} onHide={() => setShowFixtureModal(false)}>
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

          <div className="mt-3">
            <Form.Check
              type="switch"
              id="toggle-restricciones"
              label="Agregar restricciones por jornada (equipos no disponibles)"
              checked={showRestrictions}
              onChange={(e) => setShowRestrictions(e.target.checked)}
            />
            {showRestrictions && (
              <div className="mt-3">
                {totalJornadas === 0 ? (
                  <Alert variant="info">Agrega al menos 2 equipos para configurar restricciones.</Alert>
                ) : (
                  <div className="d-grid gap-3">
                    {Array.from({ length: totalJornadas }, (_, idx) => idx + 1).map((jornadaNum) => (
                      <Row key={jornadaNum} className="align-items-center g-2">
                        <Col md={4}>
                          <strong>Jornada {jornadaNum}</strong>
                        </Col>
                        <Col md={8}>
                          <FloatingLabel label="Equipos no disponibles">
                            <FormSelect
                              multiple
                              value={(unavailableByJornada[jornadaNum] || []).map(String)}
                              onChange={(e) => {
                                const selectEl = e.target as HTMLSelectElement
                                const selected = Array.from(selectEl.selectedOptions).map((opt) => parseInt(opt.value))
                                setUnavailableByJornada((prev) => ({
                                  ...prev,
                                  [jornadaNum]: selected,
                                }))
                              }}
                            >
                              {equiposParticipantes.map((ep) => (
                                <option key={ep.equipo_id} value={ep.equipo_id}>
                                  {ep.equipo?.nombre}
                                </option>
                              ))}
                            </FormSelect>
                          </FloatingLabel>
                        </Col>
                      </Row>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
    </Container>
  )
}

export default TorneoDetailPage
