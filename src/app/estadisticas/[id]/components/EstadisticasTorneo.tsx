'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Row, Col, Card, CardBody, CardHeader, Badge, Button, Nav, NavItem, NavLink, TabContent, TabPane } from 'react-bootstrap'
import { LuTrendingUp, LuStar, LuGamepad2, LuUsers, LuCalendar, LuShare2, LuMonitor, LuSmartphone, LuArrowLeft } from 'react-icons/lu'
import TablaPosiciones from './TablaPosiciones'
import TablaGoleadores from './TablaGoleadores'
import TablaFixture from './TablaFixture'
import '@/styles/fifa-animations.css'
import '@/styles/desktop-view-mobile.css'

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
  encuentros?: any[]
  equiposDescansan?: Record<number, number[]>
  equiposMap?: Record<number, { id: number; nombre: string; imagen_equipo?: string | null }>
}

export default function EstadisticasTorneo({ torneo, tablaPosiciones, tablaGoleadores, encuentros = [], equiposDescansan = {}, equiposMap = {} }: EstadisticasTorneoProps) {
  // TODO: Bandera temporal - Cambiar a true para mostrar la tabla de goleadores
  const SHOW_GOLEADORES = false
  
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('posiciones')
  const [isDesktopView, setIsDesktopView] = useState(false)
  
  // Si la tabla de goleadores está oculta y está activa, cambiar a posiciones
  useEffect(() => {
    if (!SHOW_GOLEADORES && activeTab === 'goleadores') {
      setActiveTab('posiciones')
    }
  }, [SHOW_GOLEADORES, activeTab])

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

  const toggleViewMode = () => {
    setIsDesktopView(!isDesktopView)
  }

  const handleTabSelect = (key: string | null) => {
    if (key && (SHOW_GOLEADORES || key !== 'goleadores')) {
      setActiveTab(key)
    }
  }

  return (
    <div 
      className={`min-vh-100 position-relative ${isDesktopView ? 'desktop-view-mobile' : ''}`} 
      style={{ 
        background: '#f5f5f5',
        ...(isDesktopView && {
          minWidth: '1200px',
          overflowX: 'auto'
        })
      }}
    >

      {/* Header del Torneo - Estilo Oscuro Elegante */}
      <div className="text-white py-3 position-relative" style={{ 
        background: `
          linear-gradient(135deg, rgba(26, 26, 26, 0.8) 0%, rgba(45, 45, 45, 0.8) 50%, rgba(31, 31, 31, 0.8) 100%),
          url('/uploads/ldba.jpeg')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Container>
          <Row className="align-items-center">
            <Col xs={12} md={8}>
              <div className="d-flex flex-column flex-md-row align-items-center align-items-md-start gap-3 mb-2">
                <div className="position-relative animate-float">
                  <img
                    src="/uploads/logoLdba.jpeg"
                    alt="Logo LDBA"
                    className="rounded-circle"
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                      border: '3px solid rgba(255, 255, 255, 0.2)'
                    }}
                  />
                </div>
                <div className="text-center text-md-start">
                  <h1 className="display-6 display-md-5 mb-2 text-white fw-bold animate-slide-in-left">
                    {torneo.nombre}
                  </h1>
                  <div className="d-flex flex-wrap justify-content-center justify-content-md-start align-items-center gap-2 gap-md-3 mb-2">
                    {torneo.categoria?.nombre && (
                      <Badge 
                        className="px-2 py-1" 
                        style={{ 
                          background: '#666666',
                          color: '#ffffff',
                          fontSize: '0.9rem',
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
                <p className="text-white-75 mb-2 fs-6 text-center text-md-start" style={{ 
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
                  maxWidth: '600px'
                }}>
                  {torneo.descripcion}
                </p>
              )}
              
              <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-3 gap-md-4 align-items-center">
                <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}>
                  <LuCalendar className="fs-4 text-white" />
                  <div className="text-center text-md-start">
                    <div className="fw-semibold text-white small">
                      {new Date(torneo.fecha_inicio).toLocaleDateString('es-ES')}
                    </div>
                    <div className="fw-semibold text-white small">
                      {new Date(torneo.fecha_fin).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            
            <Col xs={12} md={4} className="text-center text-md-end mt-4 mt-md-0">
              <div className="d-flex flex-column flex-md-column gap-2 gap-md-3">
                {/* Botón para regresar a estadísticas */}
                <Button 
                  variant="outline-light" 
                  onClick={() => router.push('/estadisticas')}
                  className="d-flex align-items-center justify-content-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                  style={{
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    fontSize: '0.9rem'
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
                  <LuArrowLeft />
                  <span className="d-none d-sm-inline">Regresar a Estadísticas</span>
                  <span className="d-inline d-sm-none">Regresar</span>
                </Button>
                
                {/* Botón de cambio de vista - Solo visible en móvil */}
                <Button 
                  variant="outline-light"
                  onClick={toggleViewMode}
                  className="d-flex align-items-center justify-content-center gap-2 px-3 py-2 rounded-pill fw-semibold d-md-none"
                  style={{
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    background: isDesktopView ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    fontSize: '0.9rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDesktopView ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {isDesktopView ? <LuSmartphone /> : <LuMonitor />}
                  <span>{isDesktopView ? 'Vista Móvil' : 'Vista Escritorio'}</span>
                </Button>
                
                <Button 
                  variant="light" 
                  onClick={handleShare}
                  className="d-flex align-items-center justify-content-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                  style={{
                    background: '#666666',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.3s ease',
                    fontSize: '0.9rem'
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
                  <span className="d-none d-sm-inline">Compartir Estadísticas</span>
                  <span className="d-inline d-sm-none">Compartir</span>
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>


        {/* Indicador de vista escritorio */}
        {isDesktopView && (
          <div className="d-md-none text-center py-2" style={{
            background: 'linear-gradient(135deg, #4a4a4a 0%, #666666 100%)',
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: '500'
          }}>
            <LuMonitor className="me-2" />
            Vista Escritorio Activada - Desliza horizontalmente para ver todo el contenido
          </div>
        )}

        {/* Navegación por Pestañas - Estilo Oscuro Elegante */}
        <Container 
          className={`py-3 ${isDesktopView ? 'desktop-container' : ''}`} 
          style={{ 
            background: '#f5f5f5',
            ...(isDesktopView && {
              maxWidth: 'none',
              paddingLeft: '20px',
              paddingRight: '20px'
            })
          }}
        >
          <Card 
            className={`border-0 position-relative overflow-hidden ${isDesktopView ? 'desktop-card' : ''}`} 
            style={{
              background: 'rgba(26, 26, 26, 0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 215, 0, 0.1)',
              ...(isDesktopView && {
                minWidth: '1100px'
              })
            }}
          >
          <div className="position-absolute top-0 start-0 w-100 h-100" style={{
            background: `
              radial-gradient(circle at 10% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)
            `,
            pointerEvents: 'none'
          }} />
          
          <CardHeader className="border-0 bg-transparent p-0">
            <Nav variant="tabs" className="nav-tabs-custom border-0 d-flex flex-row" activeKey={activeTab} onSelect={handleTabSelect}>
              <NavItem className="flex-fill">
                <NavLink 
                  eventKey="posiciones" 
                  className="fw-bold px-3 px-md-4 py-2 py-md-2 border-0 position-relative d-flex align-items-center justify-content-center gap-1 gap-md-2"
                  style={{
                    background: activeTab === 'posiciones' 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'transparent',
                    color: '#ffffff',
                    borderRadius: activeTab === 'posiciones' ? '15px 15px 0 0' : '0',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '0.95rem',
                    minHeight: '60px',
                    textAlign: 'center',
                    boxShadow: activeTab === 'posiciones' 
                      ? '0 4px 15px rgba(0, 0, 0, 0.2)' 
                      : 'none',
                    marginBottom: '1px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'posiciones') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'posiciones') {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                >
                  <LuTrendingUp className="fs-4 fs-md-5" />
                  <span className="fw-bold d-none d-lg-inline">Tabla de Posiciones</span>
                  <span className="fw-bold d-inline d-lg-none">Posiciones</span>
                  {activeTab === 'posiciones' && (
                    <div className="position-absolute bottom-0 start-50 translate-middle-x" style={{
                      width: '80px',
                      height: '4px',
                      background: 'linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                      borderRadius: '2px',
                      boxShadow: '0 2px 8px rgba(255, 255, 255, 0.3)'
                    }} />
                  )}
                </NavLink>
              </NavItem>
              {SHOW_GOLEADORES && (
                <NavItem className="flex-fill">
                  <NavLink 
                    eventKey="goleadores" 
                    className="fw-bold px-3 px-md-4 py-2 py-md-2 border-0 position-relative d-flex align-items-center justify-content-center gap-1 gap-md-2"
                    style={{
                      background: activeTab === 'goleadores' 
                        ? 'rgba(255, 255, 255, 0.2)' 
                        : 'transparent',
                      color: '#ffffff',
                      borderRadius: activeTab === 'goleadores' ? '15px 15px 0 0' : '0',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontSize: '0.95rem',
                      minHeight: '60px',
                      textAlign: 'center',
                      boxShadow: activeTab === 'goleadores' 
                        ? '0 4px 15px rgba(0, 0, 0, 0.2)' 
                        : 'none',
                      marginBottom: '1px'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'goleadores') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'goleadores') {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }
                    }}
                  >
                    <LuStar className="fs-4 fs-md-5" />
                    <span className="fw-bold d-none d-lg-inline">Tabla de Goleadores</span>
                    <span className="fw-bold d-inline d-lg-none">Goleadores</span>
                    {activeTab === 'goleadores' && (
                      <div className="position-absolute bottom-0 start-50 translate-middle-x" style={{
                        width: '80px',
                        height: '4px',
                        background: 'linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                        borderRadius: '2px',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.3)'
                      }} />
                    )}
                  </NavLink>
                </NavItem>
              )}
              <NavItem className="flex-fill">
                <NavLink 
                  eventKey="fixture" 
                  className="fw-bold px-3 px-md-4 py-2 py-md-2 border-0 position-relative d-flex align-items-center justify-content-center gap-1 gap-md-2"
                  style={{
                    background: activeTab === 'fixture' 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'transparent',
                    color: '#ffffff',
                    borderRadius: activeTab === 'fixture' ? '15px 15px 0 0' : '0',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '0.95rem',
                    minHeight: '60px',
                    textAlign: 'center',
                    boxShadow: activeTab === 'fixture' 
                      ? '0 4px 15px rgba(0, 0, 0, 0.2)' 
                      : 'none',
                    marginBottom: '1px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'fixture') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'fixture') {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                >
                  <LuGamepad2 className="fs-4 fs-md-5" />
                  <span className="fw-bold d-none d-lg-inline">Fixture</span>
                  <span className="fw-bold d-inline d-lg-none">Fixture</span>
                  {activeTab === 'fixture' && (
                    <div className="position-absolute bottom-0 start-50 translate-middle-x" style={{
                      width: '80px',
                      height: '4px',
                      background: 'linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                      borderRadius: '2px',
                      boxShadow: '0 2px 8px rgba(255, 255, 255, 0.3)'
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
              {SHOW_GOLEADORES && (
                <TabPane eventKey="goleadores" active={activeTab === 'goleadores'}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}>
                    <TablaGoleadores goleadores={tablaGoleadores} />
                  </div>
                </TabPane>
              )}
              <TabPane eventKey="fixture" active={activeTab === 'fixture'}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <TablaFixture encuentros={encuentros} equiposDescansan={equiposDescansan} equiposMap={equiposMap} />
                </div>
              </TabPane>
            </TabContent>
          </CardBody>
        </Card>
        </Container>
    </div>
  )
}
