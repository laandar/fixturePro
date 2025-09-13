'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, Row, Col, Badge, ProgressBar, Alert, Table, Button } from 'react-bootstrap'
import { LuActivity, LuUsers, LuCalendar, LuTarget, LuTrendingUp, LuTriangle, LuCheck } from 'react-icons/lu'
import type { EquipoWithRelations } from '@/db/types'

interface TorneoAnalyticsProps {
  torneoId: number
  equipos: EquipoWithRelations[]
  encuentros: any[]
  descansos: Record<number, number>
}

interface AnalisisTorneo {
  equipos: Array<{
    id: number
    nombre: string
    descansos: number
    encuentrosJugados: number
  }>
  jornadas: number[]
  emparejamientosRestantes: number
  progreso: number
  recomendaciones: string[]
}

export default function TorneoAnalytics({ torneoId, equipos, encuentros, descansos }: TorneoAnalyticsProps) {
  const [analisis, setAnalisis] = useState<AnalisisTorneo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (torneoId && equipos.length > 0) {
      analizarTorneo()
    }
  }, [torneoId, equipos, encuentros, descansos])

  const analizarTorneo = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Simular análisis del torneo
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const analisisSimulado: AnalisisTorneo = {
        equipos: equipos.map(equipo => ({
          id: equipo.id,
          nombre: equipo.nombre,
          descansos: Object.values(descansos).filter(equipoId => equipoId === equipo.id).length,
          encuentrosJugados: encuentros.filter(e => 
            e.equipo_local_id === equipo.id || e.equipo_visitante_id === equipo.id
          ).length
        })),
        jornadas: [...new Set(encuentros.map(e => e.jornada).filter(j => j !== null))].sort((a, b) => a - b),
        emparejamientosRestantes: Math.max(0, (equipos.length * (equipos.length - 1)) / 2 - encuentros.length),
        progreso: Math.min(100, (encuentros.length / ((equipos.length * (equipos.length - 1)) / 2)) * 100),
        recomendaciones: generarRecomendaciones(equipos, encuentros, descansos)
      }
      
      setAnalisis(analisisSimulado)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al analizar torneo')
    } finally {
      setLoading(false)
    }
  }

  const generarRecomendaciones = (equipos: EquipoWithRelations[], encuentros: any[], descansos: Record<number, number>) => {
    const recomendaciones: string[] = []
    
    // Verificar balance de descansos
    const descansosPorEquipo = equipos.map(equipo => ({
      id: equipo.id,
      nombre: equipo.nombre,
      descansos: Object.values(descansos).filter(equipoId => equipoId === equipo.id).length
    }))
    
    const maxDescansos = Math.max(...descansosPorEquipo.map(d => d.descansos))
    const minDescansos = Math.min(...descansosPorEquipo.map(d => d.descansos))
    
    if (maxDescansos - minDescansos > 1) {
      recomendaciones.push('Hay desbalance en los descansos. Considera forzar descansos para equipos con menos descansos.')
    }
    
    // Verificar progreso
    const totalEmparejamientos = (equipos.length * (equipos.length - 1)) / 2
    const progreso = (encuentros.length / totalEmparejamientos) * 100
    
    if (progreso < 50) {
      recomendaciones.push('El torneo está en etapas tempranas. Prioriza nuevos emparejamientos.')
    } else if (progreso > 80) {
      recomendaciones.push('El torneo está avanzado. Considera permitir descansos consecutivos si es necesario.')
    }
    
    // Verificar emparejamientos restantes
    const emparejamientosRestantes = totalEmparejamientos - encuentros.length
    if (emparejamientosRestantes < 5) {
      recomendaciones.push('Quedan pocos emparejamientos nuevos. El torneo está cerca de completarse.')
    }
    
    return recomendaciones
  }

  const getProgresoColor = (progreso: number) => {
    if (progreso < 30) return 'danger'
    if (progreso < 70) return 'warning'
    return 'success'
  }

  const getBalanceDescansosColor = (equipo: any, maxDescansos: number, minDescansos: number) => {
    const diferencia = maxDescansos - minDescansos
    if (diferencia <= 1) return 'success'
    if (equipo.descansos === minDescansos) return 'warning'
    if (equipo.descansos === maxDescansos) return 'danger'
    return 'secondary'
  }

  if (loading) {
    return (
      <Card>
        <CardBody className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Analizando...</span>
          </div>
          <p className="mt-2">Analizando estado del torneo...</p>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        <LuTriangle className="me-2" />
        {error}
      </Alert>
    )
  }

  if (!analisis) {
    return null
  }

  const maxDescansos = Math.max(...analisis.equipos.map(e => e.descansos))
  const minDescansos = Math.min(...analisis.equipos.map(e => e.descansos))

  return (
    <div>
      {/* Resumen general */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <CardBody>
              <LuActivity className="fs-2 text-primary mb-2" />
              <h4>{analisis.progreso.toFixed(0)}%</h4>
              <small>Progreso del Torneo</small>
              <ProgressBar 
                variant={getProgresoColor(analisis.progreso)} 
                now={analisis.progreso} 
                className="mt-2"
              />
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <CardBody>
              <LuUsers className="fs-2 text-success mb-2" />
              <h4>{analisis.equipos.length}</h4>
              <small>Equipos Participantes</small>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <CardBody>
              <LuCalendar className="fs-2 text-warning mb-2" />
              <h4>{analisis.jornadas.length}</h4>
              <small>Jornadas Jugadas</small>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <CardBody>
              <LuTarget className="fs-2 text-info mb-2" />
              <h4>{analisis.emparejamientosRestantes}</h4>
              <small>Emparejamientos Restantes</small>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Recomendaciones */}
      {analisis.recomendaciones.length > 0 && (
        <Alert variant="info" className="mb-4">
          <h6><LuTrendingUp className="me-2" />Recomendaciones del Sistema</h6>
          <ul className="mb-0">
            {analisis.recomendaciones.map((recomendacion, index) => (
              <li key={index}>{recomendacion}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Balance de descansos */}
      <Card className="mb-4">
        <CardBody>
          <h6><LuUsers className="me-2" />Balance de Descansos por Equipo</h6>
          <Row>
            {analisis.equipos.map(equipo => (
              <Col key={equipo.id} md={6} lg={4} className="mb-3">
                <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                  <div className="d-flex align-items-center gap-2">
                    <img 
                      src={equipos.find(e => e.id === equipo.id)?.imagen_equipo || 'https://via.placeholder.com/32x32/fd7e14/ffffff?text=🏆'} 
                      alt="" 
                      className="rounded-circle"
                      width={32}
                      height={32}
                    />
                    <div>
                      <div className="fw-semibold">{equipo.nombre}</div>
                      <small className="text-muted">{equipo.encuentrosJugados} encuentros</small>
                    </div>
                  </div>
                  <div className="text-end">
                    <Badge 
                      bg={getBalanceDescansosColor(equipo, maxDescansos, minDescansos)}
                      className="fs-6"
                    >
                      {equipo.descansos} descansos
                    </Badge>
                    {equipo.descansos === minDescansos && maxDescansos - minDescansos > 1 && (
                      <div className="small text-warning mt-1">
                        <LuTriangle className="me-1" />
                        Menos descansos
                      </div>
                    )}
                    {equipo.descansos === maxDescansos && maxDescansos - minDescansos > 1 && (
                      <div className="small text-danger mt-1">
                        <LuTriangle className="me-1" />
                        Más descansos
                      </div>
                    )}
                    {maxDescansos - minDescansos <= 1 && (
                      <div className="small text-success mt-1">
                        <LuCheck className="me-1" />
                        Balanceado
                      </div>
                    )}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </CardBody>
      </Card>

      {/* Historial de jornadas */}
      <Card>
        <CardBody>
          <h6><LuCalendar className="me-2" />Historial de Jornadas</h6>
          {analisis.jornadas.length === 0 ? (
            <p className="text-muted">No hay jornadas jugadas aún</p>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {analisis.jornadas.map(jornada => (
                <Badge 
                  key={jornada} 
                  bg="primary" 
                  className="fs-6 px-3 py-2"
                >
                  Jornada {jornada}
                </Badge>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
