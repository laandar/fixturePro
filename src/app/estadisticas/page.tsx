import { estadisticasQueries } from '@/db/queries'
import { Container, Row, Col } from 'react-bootstrap'
import { LuTrophy, LuUsers, LuTrendingUp } from 'react-icons/lu'
import { TbSoccerField } from 'react-icons/tb'
import TorneoCard from './TorneoCard'

export async function generateMetadata() {
  return {
    title: 'Estadísticas de Torneos',
    description: 'Consulta las estadísticas, tabla de posiciones y goleadores de todos los torneos',
  }
}

export default async function EstadisticasPage() {
  try {
    // Log para debugging en producción
    console.log('🔍 Intentando cargar torneos públicos...')
    console.log('🌍 Entorno:', process.env.NODE_ENV)
    console.log('🔗 DATABASE_URL presente:', !!process.env.DATABASE_URL)
    
    // Obtener todos los torneos activos o finalizados
    const torneos = await estadisticasQueries.getTorneosPublicos()
    
    console.log('📊 Torneos obtenidos:', torneos?.length || 0)
    
    if (!torneos || torneos.length === 0) {
      console.log('⚠️ No se encontraron torneos')
      
      // Obtener información adicional para debugging
      let debugInfo = null
      try {
        const todosLosTorneos = await estadisticasQueries.getAllTorneos()
        debugInfo = {
          totalTorneos: todosLosTorneos.length,
          estados: todosLosTorneos.reduce((acc, t) => {
            const estado = t.estado || 'sin_estado'
            acc[estado] = (acc[estado] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          torneos: todosLosTorneos.map(t => ({
            id: t.id,
            nombre: t.nombre,
            estado: t.estado
          }))
        }
        console.log('🔍 Debug info:', debugInfo)
      } catch (debugError) {
        console.error('Error obteniendo debug info:', debugError)
      }
      
      return (
      <div className="min-vh-100" style={{ background: '#f5f5f5' }}>
        <Container className="py-5">
          <div className="text-center">
            <div className="avatar avatar-lg mx-auto mb-4">
              <div className="avatar-title rounded-circle" style={{
                background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 32px rgba(108, 117, 125, 0.4)'
              }}>
                <LuTrophy className="fs-2" />
              </div>
            </div>
            <h2 className="text-dark">No hay torneos disponibles</h2>
            <p className="text-muted">Los torneos aparecerán aquí una vez que estén activos o finalizados.</p>
            
            {/* Información de debug */}
            {debugInfo && (
              <div className="mt-4 p-3 bg-light rounded" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h6 className="text-muted mb-2">🔍 Información de Debug:</h6>
                <div className="text-start">
                  <p className="mb-1"><strong>Total de torneos:</strong> {debugInfo.totalTorneos}</p>
                  <p className="mb-1"><strong>Estados encontrados:</strong></p>
                  <ul className="mb-2">
                    {Object.entries(debugInfo.estados).map(([estado, count]) => (
                      <li key={estado}>{estado}: {count} torneo(s)</li>
                    ))}
                  </ul>
                  <details>
                    <summary className="text-muted">Ver todos los torneos</summary>
                    <pre className="mt-2 p-2 bg-white rounded" style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                      {JSON.stringify(debugInfo.torneos, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-3">
                <small className="text-muted">
                  Debug: {torneos === null ? 'torneos es null' : 'torneos es array vacío'}
                </small>
              </div>
            )}
          </div>
        </Container>
      </div>
      )
    }

    return (
      <div className="min-vh-100" style={{ 
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
        overflow: 'hidden'
      }}>
        <Container fluid className="py-5">
          <Row className="align-items-center min-vh-100">
            {/* Columna Izquierda - Texto */}
            <Col lg={5} className="text-white ps-5">
              <div className="mb-4">
                <div className="avatar avatar-lg mb-3" style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <div className="avatar-title text-white">
                    <LuTrophy className="fs-1" />
                  </div>
                </div>
              </div>
              
              <h1 className="display-1 fw-bold mb-4" style={{ 
                fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                lineHeight: '1.1',
                letterSpacing: '-0.02em'
              }}>
                Estadísticas de{' '}
                <span style={{ 
                  display: 'block',
                  background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Torneos
                </span>
              </h1>
              
              <p className="fs-5 mb-4 text-white-75" style={{ 
                maxWidth: '500px',
                lineHeight: '1.6'
              }}>
                Consulta en tiempo real las estadísticas, tabla de posiciones y máximos goleadores de todos los torneos activos.
              </p>
              
              <div className="d-flex align-items-center gap-4 mb-4">
                <div className="d-flex align-items-center gap-2">
                  <LuTrendingUp className="fs-3" style={{ color: '#4ade80' }} />
                  <div>
                    <div className="fw-bold fs-4">{torneos.length}</div>
                    <small className="text-white-75">Torneos</small>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <LuUsers className="fs-3" style={{ color: '#60a5fa' }} />
                  <div>
                    <div className="fw-bold fs-4">
                      {torneos.reduce((sum, t) => sum + (t.equiposCount || 0), 0)}
                    </div>
                    <small className="text-white-75">Equipos</small>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="position-absolute" style={{
                bottom: '10%',
                left: '5%',
                width: '80px',
                height: '80px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                filter: 'blur(40px)'
              }} />
              
              {/* Soccer field icons decorative */}
              <div className="position-absolute" style={{
                top: '10%',
                left: '8%',
                opacity: 0.08,
                transform: 'rotate(-15deg)'
              }}>
                <TbSoccerField style={{ fontSize: '70px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute" style={{
                top: '45%',
                left: '3%',
                opacity: 0.06,
                transform: 'rotate(30deg)'
              }}>
                <TbSoccerField style={{ fontSize: '60px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute" style={{
                bottom: '20%',
                left: '12%',
                opacity: 0.07,
                transform: 'rotate(-25deg)'
              }}>
                <TbSoccerField style={{ fontSize: '65px', color: '#ffffff' }} />
              </div>
            </Col>

            {/* Columna Derecha - Tarjetas de Torneos */}
            <Col lg={7} className="pe-5 position-relative">
              {/* Decorative soccer icons on right side */}
              <div className="position-absolute" style={{
                top: '8%',
                right: '10%',
                opacity: 0.05,
                transform: 'rotate(35deg)',
                zIndex: 0
              }}>
                <TbSoccerField style={{ fontSize: '80px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute" style={{
                top: '40%',
                right: '5%',
                opacity: 0.04,
                transform: 'rotate(-15deg)',
                zIndex: 0
              }}>
                <TbSoccerField style={{ fontSize: '70px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute" style={{
                bottom: '25%',
                right: '15%',
                opacity: 0.045,
                transform: 'rotate(25deg)',
                zIndex: 0
              }}>
                <TbSoccerField style={{ fontSize: '65px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute" style={{
                bottom: '8%',
                right: '8%',
                opacity: 0.04,
                transform: 'rotate(-30deg)',
                zIndex: 0
              }}>
                <TbSoccerField style={{ fontSize: '75px', color: '#ffffff' }} />
              </div>
              
              <div style={{ 
                maxHeight: '80vh', 
                overflowY: 'auto',
                paddingRight: '20px',
                position: 'relative',
                zIndex: 1
              }}>
                <Row className="g-3">
                  {torneos.map((torneo) => (
                    <Col key={torneo.id} md={6} xl={6}>
                      <TorneoCard torneo={torneo} />
                    </Col>
                  ))}
                </Row>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    )
  } catch (error) {
    console.error('❌ Error al cargar torneos:', error)
    console.error('📋 Detalles del error:', {
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    return (
      <div className="min-vh-100" style={{ background: '#f5f5f5' }}>
        <Container className="py-5">
          <div className="text-center">
            <div className="avatar avatar-lg mx-auto mb-4">
              <div className="avatar-title rounded-circle" style={{
                background: 'linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 32px rgba(220, 53, 69, 0.4)'
              }}>
                <LuTrophy className="fs-2" />
              </div>
            </div>
            <h2 className="text-dark">Error al cargar torneos</h2>
            <p className="text-muted">Ocurrió un error al cargar la lista de torneos. Intenta nuevamente más tarde.</p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-3">
                <details className="text-start">
                  <summary className="text-muted">Detalles del error (solo en desarrollo)</summary>
                  <pre className="mt-2 p-3 bg-light rounded text-danger" style={{ fontSize: '0.8rem' }}>
                    {error instanceof Error ? error.message : 'Error desconocido'}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </Container>
      </div>
    )
  }
}
