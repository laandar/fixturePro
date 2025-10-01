'use client'

import { Table, Badge, Row, Col } from 'react-bootstrap'
import { LuTrophy, LuMedal, LuAward, LuUsers, LuTarget } from 'react-icons/lu'
import '@/styles/fifa-animations.css'

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

interface TablaPosicionesProps {
  equipos: PosicionEquipo[]
}

export default function TablaPosiciones({ equipos }: TablaPosicionesProps) {
  const getPosicionIcon = (posicion: number) => {
    switch (posicion) {
      case 1:
        return <LuTrophy className="text-warning fs-5" />
      case 2:
        return <LuMedal className="text-secondary fs-5" />
      case 3:
        return <LuAward className="text-warning fs-5" />
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

  if (equipos.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="avatar avatar-lg mx-auto mb-3">
          <div className="avatar-title bg-light text-muted rounded-circle">
            <LuUsers className="fs-3" />
          </div>
        </div>
        <h5 className="text-muted">No hay equipos registrados</h5>
        <p className="text-muted">Los equipos aparecerán aquí una vez que se registren en el torneo.</p>
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
              <th className="fw-bold py-2" style={{ fontSize: '1rem', color: '#ffffff' }}>Equipo</th>
              <th className="text-center fw-bold py-2" style={{ width: '70px', fontSize: '1rem', color: '#ffffff' }}>PTS</th>
              <th className="text-center fw-bold py-2" style={{ width: '60px', fontSize: '1rem', color: '#ffffff' }}>PJ</th>
              <th className="text-center fw-bold py-2" style={{ width: '60px', fontSize: '1rem', color: '#ffffff' }}>PG</th>
              <th className="text-center fw-bold py-2" style={{ width: '60px', fontSize: '1rem', color: '#ffffff' }}>PE</th>
              <th className="text-center fw-bold py-2" style={{ width: '60px', fontSize: '1rem', color: '#ffffff' }}>PP</th>
              <th className="text-center fw-bold py-2" style={{ width: '60px', fontSize: '1rem', color: '#ffffff' }}>GF</th>
              <th className="text-center fw-bold py-2" style={{ width: '60px', fontSize: '1rem', color: '#ffffff' }}>GC</th>
              <th className="text-center fw-bold py-2" style={{ width: '70px', fontSize: '1rem', color: '#ffffff' }}>DG</th>
            </tr>
          </thead>
          <tbody>
            {equipos.map((equipo, index) => (
              <tr 
                key={equipo.equipo.id} 
                className="animate-slide-in-up"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <td className="text-center align-middle py-2">
                  <div className="d-flex justify-content-center align-items-center">
                    {getPosicionIcon(equipo.posicion)}
                  </div>
                </td>
                <td className="align-middle py-2">
                  <div className="d-flex align-items-center gap-4">
                    <div className="position-relative">
                      <img
                        src={equipo.equipo.imagen_equipo || 'https://via.placeholder.com/40x40/fd7e14/ffffff?text=🏆'}
                        alt={equipo.equipo.nombre}
                        className="rounded-circle"
                        width={40}
                        height={40}
                        style={{
                          border: '2px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                        }}
                      />
                    </div>
                    <div>
                            <h5 className="mb-1 fw-bold text-white">{equipo.equipo.nombre}</h5>
                      {equipo.equipo.entrenador && (
                        <small className="text-white-75">{equipo.equipo.entrenador.nombre}</small>
                      )}
                    </div>
                  </div>
                </td>
                <td className="text-center align-middle py-2">
                  <Badge 
                    className="px-3 py-2 fw-bold fs-6"
                    style={{
                      background: '#4a4a4a',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {equipo.puntos}
                  </Badge>
                </td>
                <td className="text-center align-middle py-2">
                  <span className="fw-bold fs-6 text-white">{equipo.partidosJugados}</span>
                </td>
                <td className="text-center align-middle py-2">
                  <span className="fw-bold fs-6 text-white">{equipo.partidosGanados}</span>
                </td>
                <td className="text-center align-middle py-2">
                  <span className="fw-bold fs-6 text-white">{equipo.partidosEmpatados}</span>
                </td>
                <td className="text-center align-middle py-2">
                  <span className="fw-bold fs-6 text-white">{equipo.partidosPerdidos}</span>
                </td>
                <td className="text-center align-middle py-2">
                  <span className="fw-bold fs-6 text-white">{equipo.golesFavor}</span>
                </td>
                <td className="text-center align-middle py-2">
                  <span className="fw-bold fs-6 text-white">{equipo.golesContra}</span>
                </td>
                <td className="text-center align-middle py-2">
                  <Badge 
                    className="px-3 py-2 fw-bold fs-6"
                    style={{
                      background: equipo.diferenciaGoles > 0 
                        ? '#666666' 
                        : equipo.diferenciaGoles < 0 
                        ? '#666666'
                        : '#4a4a4a',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {equipo.diferenciaGoles > 0 ? '+' : ''}{equipo.diferenciaGoles}
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
