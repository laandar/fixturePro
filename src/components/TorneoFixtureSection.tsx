'use client'
import { Card, CardBody, CardHeader, Row, Col, Button } from 'react-bootstrap'
import { LuGamepad2, LuSettings, LuTrash, LuDownload, LuUsers } from 'react-icons/lu'
import EncuentroCard from '@/components/EncuentroCard'
import type { TorneoWithRelations, EncuentroWithRelations, EquipoTorneo } from '@/db/types'

interface TorneoFixtureSectionProps {
  torneo: TorneoWithRelations | null
  encuentros: EncuentroWithRelations[]
  equiposParticipantes: EquipoTorneo[]
  equiposDescansan: Record<number, number[]>
  onDownloadExcel?: () => void
  onGenerarFixture?: () => void
  onSistemaDinamico?: () => void
  onEmparejamientos?: () => void
  onEliminarJornada?: (jornada: number) => void
  onManagePlayers?: (encuentro: EncuentroWithRelations) => void
  onEditHorario?: (encuentro: EncuentroWithRelations) => void
  showActions?: boolean
}

export default function TorneoFixtureSection({
  torneo,
  encuentros,
  equiposParticipantes,
  equiposDescansan,
  onDownloadExcel,
  onGenerarFixture,
  onSistemaDinamico,
  onEmparejamientos,
  onEliminarJornada,
  onManagePlayers,
  onEditHorario,
  showActions = true
}: TorneoFixtureSectionProps) {
  const getEncuentrosPorJornada = () => {
    const jornadas: Record<number, EncuentroWithRelations[]> = {}
    encuentros.forEach(encuentro => {
      if (encuentro.jornada) {
        if (!jornadas[encuentro.jornada]) {
          jornadas[encuentro.jornada] = []
        }
        jornadas[encuentro.jornada].push(encuentro)
      }
    })
    return jornadas
  }

  const getEquiposQueDescansan = (jornada: number) => {
    const equiposIds = equiposDescansan[jornada] || []
    
    if (equiposIds.length > 0 && torneo?.equiposTorneo) {
      const equiposTorneo = torneo.equiposTorneo.filter(et => equiposIds.includes(et.equipo_id))
      return equiposTorneo.map(et => et.equipo).filter(e => e)
    }
    
    if (equiposIds.length === 0 && torneo?.equiposTorneo && encuentros.length > 0) {
      const encuentrosJornada = encuentros.filter(e => e.jornada === jornada)
      const equiposQueJuegan = new Set<number>()
      encuentrosJornada.forEach(encuentro => {
        if (encuentro.equipo_local_id) equiposQueJuegan.add(encuentro.equipo_local_id)
        if (encuentro.equipo_visitante_id) equiposQueJuegan.add(encuentro.equipo_visitante_id)
      })
      
      const equiposQueDescansan = torneo.equiposTorneo.filter(et => 
        et.equipo && !equiposQueJuegan.has(et.equipo_id)
      )
      
      return equiposQueDescansan.map(et => et.equipo).filter(e => e)
    }
    
    return []
  }

  const jornadas = getEncuentrosPorJornada()

  return (
    <>
      {/* Botones de acciones - siempre visibles */}
      {showActions && (
        <div className="d-flex justify-content-center mb-4">
          <div className="d-flex flex-wrap gap-2 justify-content-center w-100">
            {onDownloadExcel && (
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={onDownloadExcel}
                disabled={encuentros.length === 0}
                className="px-2 px-md-3 flex-fill flex-md-grow-0"
                style={{ minWidth: '120px', maxWidth: '200px' }}>
                <LuDownload className="me-1" />
                <span className="d-none d-sm-inline">Descargar Excel</span>
                <span className="d-sm-none">Excel</span>
              </Button>
            )}
            {onGenerarFixture && (
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={onGenerarFixture}
                className="px-2 px-md-3 flex-fill flex-md-grow-0"
                style={{ minWidth: '120px', maxWidth: '200px' }}>
                <LuSettings className="me-1" />
                <span className="d-none d-sm-inline">
                  {encuentros.length === 0 ? 'Generar Fixture' : 'Regenerar Fixture'}
                </span>
                <span className="d-sm-none">
                  {encuentros.length === 0 ? 'Generar' : 'Regenerar'}
                </span>
              </Button>
            )}
            {onSistemaDinamico && (
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={onSistemaDinamico}
                className="px-2 px-md-3 flex-fill flex-md-grow-0"
                style={{ minWidth: '120px', maxWidth: '200px' }}>
                <LuSettings className="me-1" />
                <span className="d-none d-sm-inline">Sistema Dinámico</span>
                <span className="d-sm-none">Dinámico</span>
              </Button>
            )}
            {onEmparejamientos && (
              <Button 
                variant="outline-info" 
                size="sm"
                onClick={onEmparejamientos}
                className="px-2 px-md-3 flex-fill flex-md-grow-0"
                style={{ minWidth: '120px', maxWidth: '200px' }}>
                <LuUsers className="me-1" />
                <span className="d-none d-sm-inline">Emparejamientos</span>
                <span className="d-sm-none">Emparejar</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {encuentros.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-4">
            <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-3" style={{width: '80px', height: '80px'}}>
              <LuGamepad2 className="fs-1 text-muted" />
            </div>
            <h4 className="mb-2">No hay encuentros programados</h4>
            <p className="text-muted mb-4">
              {equiposParticipantes.length >= 2 
                ? 'Genera el fixture para ver los encuentros programados'
                : 'Agrega al menos 2 equipos para generar el fixture'}
            </p>
            {equiposParticipantes.length >= 2 && onGenerarFixture && (
              <Button 
                variant="primary" 
                size="lg"
                onClick={onGenerarFixture}>
                <LuSettings className="me-2" />
                Generar Fixture
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {Object.keys(jornadas).sort((a, b) => parseInt(a) - parseInt(b)).map(jornadaNum => (
            <Card key={jornadaNum} className="mb-2 shadow-sm overflow-hidden" style={{ borderRadius: '15px' }}>
              <CardHeader className="bg-light border-bottom" style={{ borderRadius: '15px 15px 0 0' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    {/* Número de jornada simplificado */}
                    <div className="d-flex align-items-center gap-2">
                      <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                           style={{width: '40px', height: '40px', fontSize: '16px'}}>
                        {jornadaNum}
                      </div>
                      <div>
                        <h5 className="mb-0 fw-bold text-primary">Jornada {jornadaNum}</h5>
                        <small className="text-muted">
                          <strong>{jornadas[parseInt(jornadaNum)].length}</strong> encuentro{jornadas[parseInt(jornadaNum)].length !== 1 ? 's' : ''}
                        </small>
                      </div>
                    </div>
                    
                    {/* Equipos que descansan - diseño responsive */}
                    {getEquiposQueDescansan(parseInt(jornadaNum)).length > 0 && (
                      <div className="bg-info bg-opacity-10 border border-info border-opacity-25 px-3 px-md-4 py-2 py-md-3 rounded">
                        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 gap-md-3">
                          <div className="d-flex align-items-center gap-2">
                            <span className="text-info fs-5 fs-md-4">💤</span>
                            <span className="text-info fw-bold fs-6 fs-md-6">Descansan:</span>
                          </div>
                          <div className="d-flex flex-wrap align-items-center gap-1 gap-md-2">
                            {getEquiposQueDescansan(parseInt(jornadaNum)).filter(equipo => equipo).map((equipo, index) => (
                              <div key={equipo?.id} className="d-flex align-items-center gap-1">
                                <img 
                                  src={equipo?.imagen_equipo || `https://ui-avatars.com/api/?name=${encodeURIComponent(equipo?.nombre || 'E')}&background=6c757d&color=fff&size=18`} 
                                  alt={equipo?.nombre} 
                                  className="rounded-circle"
                                  width={18}
                                  height={18}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.nextElementSibling?.classList.remove('d-none')
                                  }}
                                />
                                <div className="d-none bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                                     style={{width: '18px', height: '18px', fontSize: '9px'}}>
                                  {equipo?.nombre?.charAt(0) || 'E'}
                                </div>
                                <span className="text-info fw-bold fs-6 text-truncate" 
                                      style={{maxWidth: '120px'}}
                                      title={equipo?.nombre}>
                                  {equipo?.nombre}
                                </span>
                                {index < getEquiposQueDescansan(parseInt(jornadaNum)).filter(equipo => equipo).length - 1 && 
                                  <span className="text-muted d-none d-md-inline">•</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Estados y botones - diseño simplificado */}
                  {showActions && onEliminarJornada && (
                    <div className="d-flex align-items-center gap-2 p-2">
                      {/* Botones de acción */}
                      <div className="d-flex gap-1">
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => onEliminarJornada(parseInt(jornadaNum))}
                          title="Eliminar esta jornada">
                          <LuTrash size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardBody className="p-4">
                <Row>
                  {jornadas[parseInt(jornadaNum)]
                    .sort((a, b) => {
                      // Ordenar por hora: primero los que tienen horario, luego los que no
                      const horaA = a.horario?.hora_inicio || ''
                      const horaB = b.horario?.hora_inicio || ''
                      
                      // Si ambos tienen horario, ordenar por hora
                      if (horaA && horaB) {
                        return horaA.localeCompare(horaB)
                      }
                      
                      // Si solo uno tiene horario, el que tiene horario va primero
                      if (horaA && !horaB) return -1
                      if (!horaA && horaB) return 1
                      
                      // Si ninguno tiene horario, mantener orden original
                      return 0
                    })
                    .map((encuentro) => (
                    <Col key={encuentro.id} md={6} lg={4} className="mb-2">
                      <EncuentroCard 
                        encuentro={encuentro}
                        onManagePlayers={onManagePlayers}
                        onEditHorario={onEditHorario}
                      />
                    </Col>
                  ))}
                </Row>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

