'use client'

import { Table, Badge } from 'react-bootstrap'
import { LuCreditCard, LuGamepad2 } from 'react-icons/lu'
import '@/styles/fifa-animations.css'

interface TarjetaJugador {
  posicion: number
  jugador: {
    id: string
    apellido_nombre: string
    foto?: string | null
    equipo?: {
      id: number
      nombre: string
      imagen_equipo?: string | null
    } | null
  }
  jornada: number | null
  amarillas: number
  rojas: number
  total: number
}

interface TablaTarjetasProps {
  tarjetas: TarjetaJugador[]
}

export default function TablaTarjetas({ tarjetas }: TablaTarjetasProps) {
  if (tarjetas.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="avatar avatar-lg mx-auto mb-3">
          <div className="avatar-title bg-light text-muted rounded-circle">
            <LuCreditCard className="fs-3" />
          </div>
        </div>
        <h5 className="text-muted">No hay tarjetas registradas</h5>
        <p className="text-muted">Las tarjetas amarillas y rojas aparecerán aquí una vez que se registren en partidos finalizados.</p>
      </div>
    )
  }

  return (
    <div className="p-3">
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
              <th className="text-center fw-bold py-2" style={{ width: '85px', fontSize: '1rem', color: '#ffffff' }}>Jornada</th>
              <th className="text-center fw-bold py-2" style={{ width: '90px', fontSize: '1rem', color: '#ffffff' }}>Amarillas</th>
              <th className="text-center fw-bold py-2" style={{ width: '90px', fontSize: '1rem', color: '#ffffff' }}>Rojas</th>
            </tr>
          </thead>
          <tbody>
            {tarjetas.map((item, index) => (
              <tr
                key={`${item.jugador.id}-${item.jornada ?? 'n'}-${index}`}
                className="animate-slide-in-up"
                style={{
                  animationDelay: `${index * 0.05}s`,
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <td className="text-center align-middle py-2">
                  <span className="fw-bold text-muted">{item.posicion}</span>
                </td>
                <td className="align-middle py-2">
                  <div className="d-flex align-items-center gap-2">
                    {item.jugador.foto && item.jugador.foto.trim() !== '' ? (
                      <>
                        <img
                          src={item.jugador.foto}
                          alt={item.jugador.apellido_nombre}
                          className="rounded-circle flex-shrink-0"
                          width={40}
                          height={40}
                          style={{
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            objectFit: 'cover'
                          }}
                        />
                        <span className="fw-bold text-white">{item.jugador.apellido_nombre}</span>
                      </>
                    ) : (
                      <span className="fw-bold text-white">{item.jugador.apellido_nombre}</span>
                    )}
                  </div>
                </td>
                <td className="align-middle py-2">
                  {item.jugador.equipo ? (
                    <div className="d-flex align-items-center gap-2">
                      {item.jugador.equipo.imagen_equipo && item.jugador.equipo.imagen_equipo.trim() !== '' ? (
                        <>
                          <img
                            src={item.jugador.equipo.imagen_equipo}
                            alt={item.jugador.equipo.nombre}
                            className="rounded-circle flex-shrink-0"
                            width={32}
                            height={32}
                            style={{
                              border: '2px solid rgba(255, 255, 255, 0.2)',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                              objectFit: 'cover'
                            }}
                          />
                          <span className="fw-bold fs-6 text-white">{item.jugador.equipo.nombre}</span>
                        </>
                      ) : (
                        <span className="fw-bold fs-6 text-white">{item.jugador.equipo.nombre}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-white-75 fs-6">Sin equipo</span>
                  )}
                </td>
                <td className="text-center align-middle py-2">
                  <span className="fw-bold text-white">
                    {item.jornada != null ? `J${item.jornada}` : '—'}
                  </span>
                </td>
                <td className="text-center align-middle py-2">
                  <Badge
                    bg="warning"
                    text="dark"
                    className="px-3 py-2 fw-bold fs-6"
                    style={{ border: 'none', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
                  >
                    {item.amarillas}
                  </Badge>
                </td>
                <td className="text-center align-middle py-2">
                  <Badge
                    bg="danger"
                    className="px-3 py-2 fw-bold fs-6"
                    style={{ border: 'none', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
                  >
                    {item.rojas}
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
