'use client'

import { useState } from 'react'
import { Container, Row, Col, Card, CardBody, CardHeader, Badge, Button, Nav, NavItem, NavLink, TabContent, TabPane } from 'react-bootstrap'
import { LuTrophy, LuTarget, LuUsers, LuCalendar, LuTrendingUp, LuShare2, LuDownload, LuStar, LuZap, LuCrown } from 'react-icons/lu'
import TablaPosiciones from './TablaPosiciones'
import TablaGoleadores from './TablaGoleadores'
import '@/styles/fifa-animations.css'

interface Torneo {
  id: number
  nombre: string
  descripcion?: string | null
  categoria?: {
    id: number
    nombre: string
  } | null
  fecha_inicio: string
  fecha_fin: string
  estado: string | null
}

interface PosicionEquipo {
  posicion: number
  equipo: {
    id: number
    nombre: string
    imagen_equipo?: string | null
    entrenador?: {
      nombre: string
    } | null
  }
  puntos: number
  partidosJugados: number
  partidosGanados: number
  partidosEmpatados: number
  partidosPerdidos: number
  golesFavor: number
  golesContra: number
  diferenciaGoles: number
}

interface Goleador {
  posicion: number
  jugador: {
    id: number
    apellido_nombre: string
    foto?: string | null
    equipo?: {
      id: number
      nombre: string
      imagen_equipo?: string | null
    } | null
  }
  goles: number
  penales: number
  totalGoles: number
}

interface EstadisticasTorneoProps {
  torneo: Torneo
  tablaPosiciones: PosicionEquipo[]
  tablaGoleadores: Goleador[]
}

export default function EstadisticasTorneo({ torneo, tablaPosiciones, tablaGoleadores }: EstadisticasTorneoProps) {
  const [activeTab, setActiveTab] = useState('posiciones')

  const getEstadoBadge = (estado: string | null) => {
    const estadoConfig = {
      planificado: { bg: 'secondary', text: 'Planificado' },
      en_curso: { bg: 'success', text: 'En Curso' },
      finalizado: { bg: 'primary', text: 'Finalizado' },
      cancelado: { bg: 'danger', text: 'Cancelado' }
    }

    const config = estadoConfig[estado as keyof typeof estadoConfig] || { bg: 'secondary', text: estado || 'Desconocido' }
    return <Badge bg={config.bg}>{config.text}</Badge>
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Estadísticas - ${torneo.nombre}`,
          text: `Mira las estadísticas del torneo ${torneo.nombre}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error al compartir:', error)
      }
    } else {
      // Fallback: copiar URL al portapapeles
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('URL copiada al portapapeles')
      } catch (error) {
        console.log('Error al copiar URL:', error)
      }
    }
  }

  return (
    <div className="min-vh-100 position-relative" style={{ background: '#f5f5f5' }}>

      {/* Header del Torneo - Estilo Oscuro Elegante */}
      <div className="text-white py-3 position-relative" style={{ 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1f1f1f 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Container>
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="position-relative animate-float">
                  <div className="avatar avatar-xl" style={{
                    background: '#666666',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    border: '3px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <div className="avatar-title text-white">
                      <LuCrown className="fs-1" />
                    </div>
                  </div>
                </div>
                <div>
                  <h1 className="display-5 mb-2 text-white fw-bold animate-slide-in-left">
                    {torneo.nombre}
                  </h1>
                  <div className="d-flex align-items-center gap-3 mb-2">
                    {torneo.categoria?.nombre && (
                      <Badge 
                        className="px-2 py-1" 
                        style={{ 
                          background: '#666666',
                          color: '#ffffff',
                          fontSize: '1rem',
                          border: 'none',
                          fontWeight: 'bold',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        <LuUsers className="me-2" />
                        {torneo.categoria.nombre}
                      </Badge>
                    )}
                    {getEstadoBadge(torneo.estado)}
                  </div>
                </div>
              </div>
              
              {torneo.descripcion && (
                <p className="text-white-75 mb-2 fs-6" style={{ 
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
                  maxWidth: '600px'
                }}>
                  {torneo.descripcion}
                </p>
              )}
              
              <div className="d-flex flex-wrap gap-4 align-items-center">
                <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}>
                  <LuCalendar className="fs-4 text-white" />
                  <div>
                    <div className="fw-semibold text-white">
                      {new Date(torneo.fecha_inicio).toLocaleDateString('es-ES')}
                    </div>
                    <div className="fw-semibold text-white">
                      {new Date(torneo.fecha_fin).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            
            <Col md={4} className="text-md-end mt-4 mt-md-0">
              <div className="d-flex flex-column gap-3">
                <Button 
                  variant="light" 
                  onClick={handleShare}
                  className="d-flex align-items-center justify-content-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                  style={{
                    background: '#666666',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <LuShare2 />
                  Compartir Estadísticas
                </Button>
                <Button 
                  variant="outline-light"
                  className="d-flex align-items-center justify-content-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                  style={{
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <LuDownload />
                  Exportar Datos
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>


        {/* Navegación por Pestañas - Estilo Oscuro Elegante */}
        <Container className="py-3" style={{ background: '#f5f5f5' }}>
          <Card className="border-0 position-relative overflow-hidden" style={{
            background: 'rgba(26, 26, 26, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 215, 0, 0.1)'
          }}>
          <div className="position-absolute top-0 start-0 w-100 h-100" style={{
            background: `
              radial-gradient(circle at 10% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)
            `,
            pointerEvents: 'none'
          }} />
          
          <CardHeader className="border-0 bg-transparent">
            <Nav variant="tabs" className="nav-tabs-custom border-0" activeKey={activeTab} onSelect={(k) => k && setActiveTab(k)}>
              <NavItem>
                <NavLink 
                  eventKey="posiciones" 
                  className="fw-bold px-3 py-2 border-0 position-relative"
                  style={{
                    background: activeTab === 'posiciones' ? '#666666' : 'transparent',
                    color: '#ffffff',
                    borderRadius: activeTab === 'posiciones' ? '15px 15px 0 0' : '0',
                    transition: 'all 0.3s ease',
                    fontSize: '1.1rem'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'posiciones') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'posiciones') {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                >
                  <LuTrophy className="me-2 fs-5" />
                  Tabla de Posiciones
                  {activeTab === 'posiciones' && (
                    <div className="position-absolute bottom-0 start-50 translate-middle-x" style={{
                      width: '60px',
                      height: '3px',
                      background: '#ffffff',
                      borderRadius: '2px'
                    }} />
                  )}
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink 
                  eventKey="goleadores" 
                  className="fw-bold px-3 py-2 border-0 position-relative"
                  style={{
                    background: activeTab === 'goleadores' ? '#666666' : 'transparent',
                    color: '#ffffff',
                    borderRadius: activeTab === 'goleadores' ? '15px 15px 0 0' : '0',
                    transition: 'all 0.3s ease',
                    fontSize: '1.1rem'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'goleadores') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'goleadores') {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                >
                  <LuTarget className="me-2 fs-5" />
                  Tabla de Goleadores
                  {activeTab === 'goleadores' && (
                    <div className="position-absolute bottom-0 start-50 translate-middle-x" style={{
                      width: '60px',
                      height: '3px',
                      background: '#ffffff',
                      borderRadius: '2px'
                    }} />
                  )}
                </NavLink>
              </NavItem>
            </Nav>
          </CardHeader>
          
          <CardBody className="p-0 position-relative">
            <TabContent>
              <TabPane eventKey="posiciones" active={activeTab === 'posiciones'}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <TablaPosiciones equipos={tablaPosiciones} />
                </div>
              </TabPane>
              <TabPane eventKey="goleadores" active={activeTab === 'goleadores'}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <TablaGoleadores goleadores={tablaGoleadores} />
                </div>
              </TabPane>
            </TabContent>
          </CardBody>
        </Card>
        </Container>
    </div>
  )
}
