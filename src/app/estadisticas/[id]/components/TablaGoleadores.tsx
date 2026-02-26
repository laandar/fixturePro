'use client'

import { Table, Badge, Row, Col } from 'react-bootstrap'
import { LuTrophy, LuTarget, LuUsers, LuGamepad2 } from 'react-icons/lu'
import '@/styles/fifa-animations.css'

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
  totalGoles: number
}

interface TablaGoleadoresProps {
  goleadores: Goleador[]
}

export default function TablaGoleadores({ goleadores }: TablaGoleadoresProps) {
  const getPosicionIcon = (posicion: number) => {
    switch (posicion) {
      case 1:
        return <LuTrophy className="text-warning fs-5" />
      case 2:
        return <LuTarget className="text-secondary fs-5" />
      case 3:
        return <LuTarget className="text-warning fs-5" />
      default:
        return <span className="fw-bold text-muted">{posicion}</span>
    }
  }

  const getPosicionBadge = (posicion: number) => {
    if (posicion <= 3) {
      const colors = {
        1: 'warning',
        2: 'secondary',
        3: 'warning'
      }
      return <Badge bg={colors[posicion as keyof typeof colors]} className="px-2 py-1">{posicion}</Badge>
    }
    return <span className="fw-bold text-muted">{posicion}</span>
  }

  if (goleadores.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="avatar avatar-lg mx-auto mb-3">
          <div className="avatar-title bg-light text-muted rounded-circle">
            <LuGamepad2 className="fs-3" />
          </div>
        </div>
        <h5 className="text-muted">No hay goleadores registrados</h5>
        <p className="text-muted">Los goleadores aparecerán aquí una vez que se registren goles en los partidos.</p>
      </div>
    )
  }

  return (
    <div className="p-3">
     

      {/* Tabla responsive */}
      <div className="table-responsive">
        <Table className="table-fifa mb-0">
          <thead>
            <tr style={{
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
              color: '#ffffff',
              borderBottom: '2px solid #ffffff',
              fontWeight: 'bold'
            }}>
              <th className="text-center fw-bold py-2" style={{ width: '60px', fontSize: '1rem', color: '#ffffff' }}>#</th>
              <th className="fw-bold py-2" style={{ fontSize: '1rem', color: '#ffffff' }}>Jugador</th>
              <th className="fw-bold py-2" style={{ fontSize: '1rem', color: '#ffffff' }}>Equipo</th>
              <th className="text-center fw-bold py-2" style={{ width: '80px', fontSize: '1rem', color: '#ffffff' }}>Goles</th>
            </tr>
          </thead>
          <tbody>
            {goleadores.map((goleador, index) => (
              <tr 
                key={goleador.jugador.id} 
                className="animate-slide-in-up"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <td className="text-center align-middle py-2">
                  <div className="d-flex justify-content-center align-items-center">
                    {getPosicionIcon(goleador.posicion)}
                  </div>
                </td>
                <td className="align-middle py-2">
                  <div className="d-flex align-items-center gap-4">
                    <div className="position-relative">
                      {goleador.jugador.foto && goleador.jugador.foto.trim() !== '' ? (
                        <img
                          src={goleador.jugador.foto}
                          
                          className="rounded-circle"
                          width={40}
                          height={40}
                          style={{
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                          }}
                        />
                      ) : (
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                          style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #fd7e14 0%, #e8590c 100%)',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            fontSize: '18px'
                          }}
                        >
                          {goleador.jugador.apellido_nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                            <h5 className="mb-0 fw-bold text-white">{goleador.jugador.apellido_nombre}</h5>
                    </div>
                  </div>
                </td>
                <td className="align-middle py-2">
                  {goleador.jugador.equipo ? (
                    <div className="d-flex align-items-center gap-2">
                      {goleador.jugador.equipo.imagen_equipo && goleador.jugador.equipo.imagen_equipo.trim() !== '' ? (
                        <>
                          <img
                            src={goleador.jugador.equipo.imagen_equipo}
                            alt={goleador.jugador.equipo.nombre}
                            className="rounded-circle flex-shrink-0"
                            width={32}
                            height={32}
                            style={{
                              border: '2px solid rgba(255, 255, 255, 0.2)',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                              objectFit: 'cover'
                            }}
                          />
                          <span className="fw-bold fs-6 text-white">{goleador.jugador.equipo.nombre}</span>
                        </>
                      ) : (
                        <span className="fw-bold fs-6 text-white">{goleador.jugador.equipo.nombre}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-white-75 fs-6">Sin equipo</span>
                  )}
                </td>
                <td className="text-center align-middle py-2">
                  <Badge 
                    className="px-3 py-2 fw-bold fs-6"
                    style={{
                      background: '#666666',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {goleador.totalGoles}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      

      
        
    </div>
  )
}
