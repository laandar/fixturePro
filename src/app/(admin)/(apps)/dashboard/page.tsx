'use client'
import { useEffect, useState } from 'react'
import { Container, Row, Col, Card } from 'react-bootstrap'
import { TbTrophy, TbUsers, TbTournament, TbChartBar, TbSettings } from 'react-icons/tb'
import { getTorneos } from '../torneos/actions'
import { getJugadores } from '../jugadores/actions'
import { getEquipos } from '../equipos/actions'

const DashboardPage = () => {
  const [stats, setStats] = useState({
    jugadores: 0,
    torneos: 0,
    equipos: 0,
    partidos: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        const [torneosData, jugadoresData, equiposData] = await Promise.all([
          getTorneos(),
          getJugadores(),
          getEquipos()
        ])

        // Contar partidos de todos los torneos
        let totalPartidos = 0
        if (torneosData.length > 0) {
          const partidosPromises = torneosData.map(async (torneo: any) => {
            try {
              const { getEncuentrosByTorneo } = await import('../torneos/actions')
              const encuentros = await getEncuentrosByTorneo(torneo.id)
              return encuentros.length
            } catch {
              return 0
            }
          })
          const partidosCounts = await Promise.all(partidosPromises)
          totalPartidos = partidosCounts.reduce((sum, count) => sum + count, 0)
        }

        setStats({
          jugadores: jugadoresData.length,
          torneos: torneosData.length,
          equipos: equiposData.length,
          partidos: totalPartidos
        })
      } catch (error) {
        console.error('Error al cargar estadísticas:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const features = [
    {
      icon: TbUsers,
      title: 'Gestión de Jugadores',
      description: 'Administra jugadores, equipos y estadísticas completas'
    },
    {
      icon: TbTournament,
      title: 'Gestión de Torneos',
      description: 'Crea y administra torneos con fixtures dinámicos'
    },
    {
      icon: TbChartBar,
      title: 'Estadísticas',
      description: 'Analiza rendimientos y genera reportes detallados'
    },
    {
      icon: TbSettings,
      title: 'Configuración Avanzada',
      description: 'Personaliza reglas y parámetros del sistema'
    }
  ]

  return (
    <Container fluid className="px-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingTop: '1.5rem', paddingBottom: '2rem' }}>
      {/* Header compacto */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h3 className="mb-1 fw-bold" style={{ color: '#1e293b' }}>Dashboard</h3>
              <p className="text-muted mb-0 small">Resumen general del sistema</p>
            </div>
            <div className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 px-3 py-2 rounded">
              <TbTrophy className="text-primary" size={20} />
              <span className="text-primary fw-semibold small">FixturePro</span>
            </div>
          </div>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="g-3 mb-4">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm h-100" style={{ 
            borderRadius: '12px',
            borderTop: '4px solid #6366f1',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-2 small fw-semibold text-uppercase">Jugadores</p>
                  {loading ? (
                    <div className="spinner-border spinner-border-sm text-primary" role="status" />
                  ) : (
                    <h2 className="mb-0 fw-bold" style={{ color: '#1e293b', fontSize: '2rem' }}>{stats.jugadores}</h2>
                  )}
                </div>
                <div className="bg-primary bg-opacity-10 rounded d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                  <TbUsers className="text-primary" size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm h-100" style={{ 
            borderRadius: '12px',
            borderTop: '4px solid #10b981',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-2 small fw-semibold text-uppercase">Torneos</p>
                  {loading ? (
                    <div className="spinner-border spinner-border-sm text-success" role="status" />
                  ) : (
                    <h2 className="mb-0 fw-bold" style={{ color: '#1e293b', fontSize: '2rem' }}>{stats.torneos}</h2>
                  )}
                </div>
                <div className="bg-success bg-opacity-10 rounded d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                  <TbTrophy className="text-success" size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm h-100" style={{ 
            borderRadius: '12px',
            borderTop: '4px solid #f59e0b',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-2 small fw-semibold text-uppercase">Partidos</p>
                  {loading ? (
                    <div className="spinner-border spinner-border-sm text-warning" role="status" />
                  ) : (
                    <h2 className="mb-0 fw-bold" style={{ color: '#1e293b', fontSize: '2rem' }}>{stats.partidos}</h2>
                  )}
                </div>
                <div className="bg-warning bg-opacity-10 rounded d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                  <TbTournament className="text-warning" size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm h-100" style={{ 
            borderRadius: '12px',
            borderTop: '4px solid #8b5cf6',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-2 small fw-semibold text-uppercase">Equipos</p>
                  {loading ? (
                    <div className="spinner-border spinner-border-sm text-info" role="status" />
                  ) : (
                    <h2 className="mb-0 fw-bold" style={{ color: '#1e293b', fontSize: '2rem' }}>{stats.equipos}</h2>
                  )}
                </div>
                <div className="bg-info bg-opacity-10 rounded d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                  <TbSettings className="text-info" size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Features Grid */}
      <Row className="g-3">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Col key={index} lg={3} md={6}>
              <Card className="h-100 border-0 shadow-sm" style={{ 
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <Card.Body className="p-4">
                  <div 
                    className="mb-3 d-inline-flex align-items-center justify-content-center rounded"
                    style={{ 
                      width: '48px', 
                      height: '48px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  >
                    <Icon size={24} className="text-white" />
                  </div>
                  <h6 className="fw-bold mb-2" style={{ color: '#1e293b' }}>{feature.title}</h6>
                  <p className="text-muted mb-0 small" style={{ fontSize: '0.875rem' }}>{feature.description}</p>
                </Card.Body>
              </Card>
            </Col>
          )
        })}
      </Row>
    </Container>
  )
}

export default DashboardPage
