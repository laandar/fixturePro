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

// Forzar regeneración de la página
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EstadisticasPage() {
  try {
    // Obtener todos los torneos activos o finalizados
    const torneos = await estadisticasQueries.getTorneosPublicos()
    
    if (!torneos || torneos.length === 0) {
      return (
      <div className="min-vh-100" style={{ 
        backgroundImage: 'url(/uploads/ldba.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 0
        }} />
        <Container className="py-5" style={{ position: 'relative', zIndex: 1 }}>
          <div className="text-center">
            <h2 className="text-white">No hay torneos disponibles</h2>
            <p className="text-white-75">Los torneos aparecerán aquí una vez que estén activos o finalizados.</p>
          </div>
        </Container>
      </div>
      )
    }

    return (
      <div className="min-vh-100" style={{ 
        backgroundImage: 'url(/uploads/ldba.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto'
      }}>
        {/* Overlay oscuro para mejorar legibilidad del texto */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(51, 65, 85, 0.75) 50%, rgba(30, 41, 59, 0.85) 100%)',
          zIndex: 0
        }} />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
        <Container className="py-4 py-md-5 px-3 px-md-4" style={{ maxWidth: '100%', width: '100%', overflowX: 'hidden', paddingLeft: '1rem', paddingRight: '1rem' }}>
          <Row className="align-items-center min-vh-100 g-0" style={{ marginLeft: 0, marginRight: 0, width: '100%' }}>
            {/* Columna Izquierda - Texto */}
            <Col xs={12} lg={5} className="text-white text-center text-lg-start mb-4 mb-lg-0 px-3 px-lg-4">
              
              <h1 className="display-1 fw-bold mb-3 mb-md-4" style={{ 
                fontSize: 'clamp(2rem, 8vw, 4.5rem)',
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
              
              <p className="fs-5 fs-md-6 mb-3 mb-md-4 text-white-75 mx-auto mx-lg-0" style={{ 
                maxWidth: '500px',
                lineHeight: '1.6'
              }}>
                Consulta en tiempo real las estadísticas, tabla de posiciones y máximos goleadores de todos los torneos activos.
              </p>
              
              <div className="d-flex flex-column flex-md-row align-items-center justify-content-center justify-content-lg-start gap-3 gap-md-4 mb-4">
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

              {/* Decorative elements - Hidden on mobile */}
              <div className="position-absolute d-none d-lg-block" style={{
                bottom: '10%',
                left: '5%',
                width: '80px',
                height: '80px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                filter: 'blur(40px)'
              }} />
              
              {/* Soccer field icons decorative - Hidden on mobile */}
              <div className="position-absolute d-none d-lg-block" style={{
                top: '10%',
                left: '8%',
                opacity: 0.08,
                transform: 'rotate(-15deg)'
              }}>
                <TbSoccerField style={{ fontSize: '70px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute d-none d-lg-block" style={{
                top: '45%',
                left: '3%',
                opacity: 0.06,
                transform: 'rotate(30deg)'
              }}>
                <TbSoccerField style={{ fontSize: '60px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute d-none d-lg-block" style={{
                bottom: '20%',
                left: '12%',
                opacity: 0.07,
                transform: 'rotate(-25deg)'
              }}>
                <TbSoccerField style={{ fontSize: '65px', color: '#ffffff' }} />
              </div>
            </Col>

            {/* Columna Derecha - Tarjetas de Torneos */}
            <Col xs={12} lg={7} className="position-relative px-3 px-lg-4">
              {/* Decorative soccer icons on right side - Hidden on mobile */}
              <div className="position-absolute d-none d-lg-block" style={{
                top: '8%',
                right: '10%',
                opacity: 0.05,
                transform: 'rotate(35deg)',
                zIndex: 0
              }}>
                <TbSoccerField style={{ fontSize: '80px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute d-none d-lg-block" style={{
                top: '40%',
                right: '5%',
                opacity: 0.04,
                transform: 'rotate(-15deg)',
                zIndex: 0
              }}>
                <TbSoccerField style={{ fontSize: '70px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute d-none d-lg-block" style={{
                bottom: '25%',
                right: '15%',
                opacity: 0.045,
                transform: 'rotate(25deg)',
                zIndex: 0
              }}>
                <TbSoccerField style={{ fontSize: '65px', color: '#ffffff' }} />
              </div>
              
              <div className="position-absolute d-none d-lg-block" style={{
                bottom: '8%',
                right: '8%',
                opacity: 0.04,
                transform: 'rotate(-30deg)',
                zIndex: 0
              }}>
                <TbSoccerField style={{ fontSize: '75px', color: '#ffffff' }} />
              </div>
              
              <div style={{ 
                maxHeight: '75vh',
                overflowY: 'auto',
                overflowX: 'hidden',
                position: 'relative',
                zIndex: 1,
                paddingRight: '8px',
                width: '100%'
              }}>
                <Row className="g-2" style={{ marginLeft: 0, marginRight: 0, width: '100%' }}>
                  {torneos.map((torneo) => (
                    <Col key={torneo.id} xs={12} sm={6} lg={12} xl={6} style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem', maxWidth: '100%' }}>
                      <TorneoCard torneo={torneo} />
                    </Col>
                  ))}
                </Row>
              </div>
            </Col>
          </Row>
        </Container>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error al cargar torneos:', error)
    
    return (
      <div className="min-vh-100" style={{ 
        backgroundImage: 'url(/uploads/ldba.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 0
        }} />
        <Container className="py-5" style={{ position: 'relative', zIndex: 1 }}>
          <div className="text-center">
            <h2 className="text-white">Error al cargar torneos</h2>
            <p className="text-white-75">Ocurrió un error al cargar la lista de torneos. Intenta nuevamente más tarde.</p>
          </div>
        </Container>
      </div>
    )
  }
}
