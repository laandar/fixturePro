'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Card, Row, Col, Badge, ProgressBar, Form, Alert } from 'react-bootstrap'
import { LuX, LuCheck, LuUsers, LuTarget } from 'react-icons/lu'
import { obtenerEmparejamientosFaltantes } from '@/app/(admin)/(apps)/torneos/dynamic-actions'

interface Emparejamiento {
  equipo1: { id: number; nombre: string }
  equipo2: { id: number; nombre: string }
  jugado: boolean
}

interface EmparejamientosData {
  total: number
  jugados: number
  faltantes: number
  emparejamientosJugados: Emparejamiento[]
  emparejamientosFaltantes: Emparejamiento[]
  porcentajeCompletado: number
}

interface EmparejamientosFaltantesModalProps {
  show: boolean
  onHide: () => void
  torneoId: number
  onSeleccionarEmparejamientos: (emparejamientos: Emparejamiento[]) => void
}

export default function EmparejamientosFaltantesModal({
  show,
  onHide,
  torneoId,
  onSeleccionarEmparejamientos
}: EmparejamientosFaltantesModalProps) {
  const [data, setData] = useState<EmparejamientosData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emparejamientosSeleccionados, setEmparejamientosSeleccionados] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<'todos' | 'faltantes' | 'jugados'>('faltantes')

  useEffect(() => {
    if (show && torneoId) {
      cargarEmparejamientos()
    }
  }, [show, torneoId])

  const cargarEmparejamientos = async () => {
    setLoading(true)
    setError(null)
    try {
      const resultado = await obtenerEmparejamientosFaltantes(torneoId)
      setData(resultado)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar emparejamientos')
    } finally {
      setLoading(false)
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
    if (!data) return
    
    const todosFaltantes = new Set(
      data.emparejamientosFaltantes.map(e => `${e.equipo1.id}-${e.equipo2.id}`)
    )
    setEmparejamientosSeleccionados(todosFaltantes)
  }

  const limpiarSeleccion = () => {
    setEmparejamientosSeleccionados(new Set())
  }

  const handleConfirmar = () => {
    if (!data) return
    
    const emparejamientos = data.emparejamientosFaltantes.filter(e => 
      emparejamientosSeleccionados.has(`${e.equipo1.id}-${e.equipo2.id}`)
    )
    
    onSeleccionarEmparejamientos(emparejamientos)
    onHide()
  }

  const emparejamientosAMostrar = () => {
    if (!data) return []
    
    switch (filtro) {
      case 'faltantes':
        return data.emparejamientosFaltantes
      case 'jugados':
        return data.emparejamientosJugados
      default:
        return [...data.emparejamientosFaltantes, ...data.emparejamientosJugados]
    }
  }

  if (!data && !loading) {
    return null
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <LuUsers className="me-2" />
          Emparejamientos del Torneo
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-2">Cargando emparejamientos...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">
            <Alert.Heading>Error</Alert.Heading>
            {error}
          </Alert>
        ) : data ? (
          <div>
            <Card className="mb-4">
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-primary">{data.total}</h4>
                      <small className="text-muted">Total de emparejamientos</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-success">{data.jugados}</h4>
                      <small className="text-muted">Ya jugados</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-warning">{data.faltantes}</h4>
                      <small className="text-muted">Faltantes</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <h4 className="text-info">{data.porcentajeCompletado}%</h4>
                      <small className="text-muted">Completado</small>
                    </div>
                  </Col>
                </Row>
                <ProgressBar 
                  now={data.porcentajeCompletado} 
                  variant="success" 
                  className="mt-3"
                  label={`${data.porcentajeCompletado}%`}
                />
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex gap-2">
                <Form.Select 
                  value={filtro} 
                  onChange={(e) => setFiltro(e.target.value as any)}
                  style={{ width: 'auto' }}
                >
                  <option value="faltantes">Solo faltantes</option>
                  <option value="jugados">Solo jugados</option>
                  <option value="todos">Todos</option>
                </Form.Select>
              </div>
              
              {filtro === 'faltantes' && (
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={seleccionarTodosFaltantes}
                  >
                    Seleccionar todos los faltantes
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={limpiarSeleccion}
                  >
                    Limpiar selección
                  </Button>
                </div>
              )}
            </div>

            <Row>
              {emparejamientosAMostrar().map((emparejamiento) => {
                const clave = `${emparejamiento.equipo1.id}-${emparejamiento.equipo2.id}`
                const seleccionado = emparejamientosSeleccionados.has(clave)
                const esFaltante = !emparejamiento.jugado
                
                return (
                  <Col md={6} lg={4} key={clave} className="mb-3">
                    <Card 
                      className={`h-100 ${seleccionado ? 'border-primary bg-primary bg-opacity-10' : ''} ${!esFaltante ? 'opacity-75' : ''}`}
                      style={{ cursor: esFaltante ? 'pointer' : 'default' }}
                      onClick={() => esFaltante && toggleEmparejamiento(emparejamiento)}
                    >
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2">
                            {esFaltante ? (
                              <LuTarget className="text-warning" />
                            ) : (
                              <LuCheck className="text-success" />
                            )}
                            <Badge 
                              bg={esFaltante ? 'warning' : 'success'}
                              className="text-dark"
                            >
                              {esFaltante ? 'Faltante' : 'Jugado'}
                            </Badge>
                          </div>
                          
                          {esFaltante && (
                            <Form.Check
                              type="checkbox"
                              checked={seleccionado}
                              onChange={() => toggleEmparejamiento(emparejamiento)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                        
                        <div className="text-center">
                          <h6 className="mb-1">{emparejamiento.equipo1.nombre}</h6>
                          <div className="text-muted mb-1">VS</div>
                          <h6 className="mb-0">{emparejamiento.equipo2.nombre}</h6>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                )
              })}
            </Row>

            {emparejamientosAMostrar().length === 0 && (
              <div className="text-center py-4">
                <LuCheck className="text-success" size={48} />
                <h5 className="mt-2">¡Excelente!</h5>
                <p className="text-muted">
                  {filtro === 'faltantes' 
                    ? 'No hay emparejamientos faltantes. Todos los equipos ya se han enfrentado.'
                    : 'No hay emparejamientos para mostrar con el filtro seleccionado.'
                  }
                </p>
              </div>
            )}
          </div>
        ) : null}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <LuX className="me-1" />
          Cerrar
        </Button>
        
        {data && emparejamientosSeleccionados.size > 0 && (
          <Button 
            variant="primary" 
            onClick={handleConfirmar}
          >
            <LuCheck className="me-1" />
            Generar jornada con {emparejamientosSeleccionados.size} emparejamiento(s)
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}
