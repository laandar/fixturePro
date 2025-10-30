'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Table } from 'react-bootstrap'
import { LuTrophy, LuInfo, LuUsers } from 'react-icons/lu'
import { getTorneoById, getEncuentrosByTorneo } from '../../../torneos/actions'
import { getGolesTorneo } from '../../../gestion-jugadores/actions'
import { getEstadisticasEquipos } from '@/lib/torneo-statistics'
import type { TorneoWithRelations, EncuentroWithRelations, Gol } from '@/db/types'

const TablaPosicionesPage = () => {
  const params = useParams()
  const torneoId = parseInt(params.id as string)
  
  const [torneo, setTorneo] = useState<TorneoWithRelations | null>(null)
  const [encuentros, setEncuentros] = useState<EncuentroWithRelations[]>([])
  const [goles, setGoles] = useState<Gol[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [torneoData, encuentrosData, golesData] = await Promise.all([
          getTorneoById(torneoId),
          getEncuentrosByTorneo(torneoId),
          getGolesTorneo(torneoId)
        ])
        
        setTorneo(torneoData as unknown as TorneoWithRelations)
        setEncuentros(encuentrosData as unknown as EncuentroWithRelations[])
        setGoles(golesData)
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

  const getEstadisticasEquiposLocal = () => {
    if (!torneo?.equiposTorneo) return []
    return getEstadisticasEquipos(encuentros, goles, torneo.equiposTorneo)
  }

  if (loading) {
    return (
      <Container fluid>
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

  return (
    <Container fluid>
      <PageBreadcrumb title={`Tabla de Posiciones - ${torneo.nombre}`} />
      
      <Row>
        <Col>
          <Card>
            <CardHeader className="p-0">
              <div className="d-flex justify-content-between align-items-center p-3">
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
            </CardHeader>
            <CardBody>
              {!equiposParticipantes || equiposParticipantes.length === 0 ? (
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
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default TablaPosicionesPage
