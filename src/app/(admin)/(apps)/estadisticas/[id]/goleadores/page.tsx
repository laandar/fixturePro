'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Table } from 'react-bootstrap'
import { LuTrophy, LuInfo, LuUsers, LuGamepad2 } from 'react-icons/lu'
import EstadisticasTabs from '../components/Tabs'
import { getTorneoById, getEncuentrosByTorneo } from '../../../torneos/actions'
import { getGolesTorneo, getTarjetasTorneo } from '../../../gestion-jugadores/actions'
import { getJugadores } from '../../../jugadores/actions'
import { getEstadisticasGoleadores, getEstadisticasDetalladas, getGoleadoresPorEquipo } from '@/lib/torneo-statistics'
import type { TorneoWithRelations, EncuentroWithRelations, Gol, Tarjeta } from '@/db/types'

const GoleadoresPage = () => {
  const params = useParams()
  const torneoId = parseInt(params.id as string)
  
  const [torneo, setTorneo] = useState<TorneoWithRelations | null>(null)
  const [encuentros, setEncuentros] = useState<EncuentroWithRelations[]>([])
  const [goles, setGoles] = useState<Gol[]>([])
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [todosJugadores, setTodosJugadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [torneoData, encuentrosData, golesData, tarjetasData, jugadoresData] = await Promise.all([
          getTorneoById(torneoId),
          getEncuentrosByTorneo(torneoId),
          getGolesTorneo(torneoId),
          getTarjetasTorneo(torneoId),
          getJugadores()
        ])
        
        setTorneo(torneoData as unknown as TorneoWithRelations)
        setEncuentros(encuentrosData as unknown as EncuentroWithRelations[])
        setGoles(golesData)
        setTarjetas(tarjetasData)
        setTodosJugadores(jugadoresData)
      } catch (err) {
        setError('Error al cargar los datos del torneo')
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (torneoId) {
      loadData()
    }
  }, [torneoId])

  const getEstadisticasGoleadoresLocal = () => {
    return getEstadisticasGoleadores(goles, todosJugadores)
  }

  const getEstadisticasDetalladasLocal = () => {
    return getEstadisticasDetalladas(goles, encuentros)
  }

  const getGoleadoresPorEquipoLocal = () => {
    if (!torneo?.equiposTorneo) return []
    return getGoleadoresPorEquipo(goles, torneo.equiposTorneo)
  }

  if (loading) {
    return (
      <Container fluid>
        <EstadisticasTabs active="goleadores" />
        <PageBreadcrumb title="Cargando..." />
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    )
  }

  if (error || !torneo) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Error" />
        <div className="text-center py-5">
          <p className="text-danger">{error || 'Torneo no encontrado'}</p>
        </div>
      </Container>
    )
  }

  const equiposParticipantes = torneo.equiposTorneo || []
  const estadisticasDetalladas = getEstadisticasDetalladasLocal()
  const goleadores = getEstadisticasGoleadoresLocal()
  const goleadoresPorEquipo = getGoleadoresPorEquipoLocal()

  return (
    <Container fluid>
      <PageBreadcrumb title={`Goleadores - ${torneo.nombre}`} />
      <EstadisticasTabs active="goleadores" />
      
      <Row>
        <Col>
          <Card>
            <CardHeader className="p-0">
              <div className="d-flex justify-content-between align-items-center p-3">
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
            </CardHeader>
            <CardBody>
              {encuentros.filter(e => e.estado === 'finalizado').length === 0 ? (
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
              ) : (
                <div>
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
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default GoleadoresPage
