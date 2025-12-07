'use client'

import { Table, Badge, Card, CardHeader, CardBody, Row, Col } from 'react-bootstrap'
import { LuClock, LuMapPin, LuCalendar, LuUsers, LuMove } from 'react-icons/lu'
import type { EncuentroWithRelations, Horario } from '@/db/types'
import { useState, useEffect, useTransition } from 'react'
import { moverEncuentroGlobal } from '@/app/(admin)/(apps)/torneos/actions'

interface TablaHorariosCanchasProps {
  encuentros: EncuentroWithRelations[]
  horarios: Horario[]
  canchas: string[] // Nombres de todas las canchas disponibles
}

const obtenerEtiquetaDia = (dia?: string | null) => {
  const dias: Record<string, string> = {
    viernes: 'Viernes',
    sabado: 'Sábado',
    domingo: 'Domingo'
  }
  return dias[dia || 'viernes'] || 'Viernes'
}

const formatearFecha = (fecha: Date | string | null | undefined): string => {
  if (!fecha) return ''
  
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha
  if (isNaN(fechaObj.getTime())) return ''
  
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  
  const diaSemana = diasSemana[fechaObj.getDay()]
  const dia = fechaObj.getDate()
  const mes = meses[fechaObj.getMonth()]
  const año = fechaObj.getFullYear()
  
  return `${diaSemana}, ${dia} de ${mes} de ${año}`
}

export default function TablaHorariosCanchas({ 
  encuentros, 
  horarios, 
  canchas 
}: TablaHorariosCanchasProps) {
  const [localEncuentros, setLocalEncuentros] = useState<EncuentroWithRelations[]>(encuentros)
  const [isPending, startTransition] = useTransition()
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    setLocalEncuentros(encuentros)
  }, [encuentros])

  // Filtrar encuentros que tienen cancha y horario
  const encuentrosConDatos = localEncuentros.filter(e => 
    e.cancha && e.cancha.trim() !== '' && e.horario
  )

  // Agrupar encuentros por jornada
  const encuentrosPorJornada = new Map<number, EncuentroWithRelations[]>()
  encuentrosConDatos.forEach(encuentro => {
    const jornada = encuentro.jornada ?? 0
    if (!encuentrosPorJornada.has(jornada)) {
      encuentrosPorJornada.set(jornada, [])
    }
    encuentrosPorJornada.get(jornada)!.push(encuentro)
  })

  const jornadasOrdenadas = Array.from(encuentrosPorJornada.keys()).sort((a, b) => a - b)

  // ====== HORAS POR DÍA (para mostrar huecos) ======
  // En la vista global puede haber varios registros de horario con la misma hora para distintos torneos.
  // Aquí colapsamos por combinación (dia_semana, hora_inicio) para no repetir filas.
  const horasPorDiaSemana = new Map<string, string[]>()
  horarios.forEach(horario => {
    if (!horario.dia_semana || !horario.hora_inicio) return
    const lista = horasPorDiaSemana.get(horario.dia_semana) || []
    if (!lista.includes(horario.hora_inicio)) {
      lista.push(horario.hora_inicio)
    }
    horasPorDiaSemana.set(horario.dia_semana, lista)
  })
  // Ordenar horas dentro de cada día
  horasPorDiaSemana.forEach((lista, dia) => {
    lista.sort((a, b) => (a || '').localeCompare(b || ''))
    horasPorDiaSemana.set(dia, lista)
  })

  const obtenerHorasParaFecha = (fechaKey: string): string[] => {
    const fecha = new Date(fechaKey + 'T00:00:00')
    if (isNaN(fecha.getTime())) return []
    const diasDb = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const diaDb = diasDb[fecha.getDay()] || 'domingo'
    return horasPorDiaSemana.get(diaDb) || []
  }

  // Función para obtener la fecha formateada
  const obtenerFechaFormateada = (fechaKey: string): string => {
    const fecha = new Date(fechaKey + 'T00:00:00')
    return formatearFecha(fecha)
  }

  // Función para agrupar encuentros por cancha dentro de una fecha
  const agruparPorCancha = (encuentros: EncuentroWithRelations[]) => {
    const porCancha = new Map<string, EncuentroWithRelations[]>()
    
    encuentros.forEach(encuentro => {
      if (encuentro.cancha) {
        if (!porCancha.has(encuentro.cancha)) {
          porCancha.set(encuentro.cancha, [])
        }
        porCancha.get(encuentro.cancha)!.push(encuentro)
      }
    })
    
    // Ordenar encuentros dentro de cada cancha por hora
    porCancha.forEach((encuentrosCancha, cancha) => {
      encuentrosCancha.sort((a, b) => {
        const horaA = a.horario?.hora_inicio || ''
        const horaB = b.horario?.hora_inicio || ''
        return horaA.localeCompare(horaB)
      })
    })
    
    return porCancha
  }

  if (jornadasOrdenadas.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-5">
          <p className="text-muted">
            No hay encuentros con cancha y horario asignados
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader 
        className="bg-primary text-white py-3"
        style={{ 
          background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)'
        }}
      >
        <h5 className="mb-0 d-flex align-items-center">
          <LuCalendar className="me-2" size={20} />
          Programación de Encuentros
        </h5>
      </CardHeader>
      <CardBody className="p-4">
        {jornadasOrdenadas.map((jornadaKey, jornadaIndex) => {
          const encuentrosJornada = encuentrosPorJornada.get(jornadaKey) || []

          // Agrupar por fecha dentro de la jornada
          const encuentrosPorFecha = new Map<string, EncuentroWithRelations[]>()
          encuentrosJornada.forEach(encuentro => {
            let fechaKey = ''
            
            if (encuentro.fecha_programada) {
              const fecha = new Date(encuentro.fecha_programada)
              fechaKey = fecha.toISOString().split('T')[0] // YYYY-MM-DD
            } else if (encuentro.horario?.dia_semana) {
              const hoy = new Date()
              const diaSemana = encuentro.horario.dia_semana
              const diasSemana: Record<string, number> = {
                domingo: 0,
                lunes: 1,
                martes: 2,
                miercoles: 3,
                jueves: 4,
                viernes: 5,
                sabado: 6
              }
              const diaNum = diasSemana[diaSemana.toLowerCase()] ?? 5
              const diff = diaNum - hoy.getDay()
              const fechaEstimada = new Date(hoy)
              fechaEstimada.setDate(hoy.getDate() + diff)
              fechaKey = fechaEstimada.toISOString().split('T')[0]
            }
            
            if (fechaKey) {
              if (!encuentrosPorFecha.has(fechaKey)) {
                encuentrosPorFecha.set(fechaKey, [])
              }
              encuentrosPorFecha.get(fechaKey)!.push(encuentro)
            }
          })

          const fechasOrdenadas = Array.from(encuentrosPorFecha.keys()).sort()

          return (
            <div key={jornadaKey} className={jornadaIndex > 0 ? 'mt-5' : ''}>
              <div className="mb-3 p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                <h4 className="fw-bold text-success mb-0 d-flex align-items-center">
                  <LuCalendar className="me-2" size={18} />
                  Jornada {jornadaKey === 0 ? '-' : jornadaKey}
                </h4>
              </div>

              {fechasOrdenadas.map((fechaKey, fechaIndex) => {
                const encuentrosFecha = encuentrosPorFecha.get(fechaKey) || []
                const encuentrosPorCancha = agruparPorCancha(encuentrosFecha)
                // Incluir todas las canchas disponibles, no solo las que tienen encuentros
                const canchasConEncuentros = Array.from(encuentrosPorCancha.keys())
                const canchasFecha = Array.from(new Set([...canchas, ...canchasConEncuentros])).sort()
                const horasDeEsteDia = obtenerHorasParaFecha(fechaKey)

                return (
                  <div key={`${jornadaKey}-${fechaKey}`} className={fechaIndex > 0 ? 'mt-4' : ''}>
                    {/* Título de la fecha */}
                    <div className="mb-3 p-2 bg-primary bg-opacity-10 rounded-2 border border-primary border-opacity-25">
                      <h5 className="fw-bold text-primary mb-0 d-flex align-items-center">
                        <LuCalendar className="me-2" size={18} />
                        {obtenerFechaFormateada(fechaKey)}
                      </h5>
                    </div>

                    {/* Tablas por cancha */}
                    <Row>
                      {canchasFecha.map(cancha => {
                        const encuentrosCancha = encuentrosPorCancha.get(cancha) || []
                        
                        const handleDragStart = (event: React.DragEvent<HTMLTableRowElement>, encuentro: EncuentroWithRelations) => {
                          setDraggedId(encuentro.id)
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({
                              encuentroId: encuentro.id,
                              horarioId: encuentro.horario?.id ?? null,
                              cancha: encuentro.cancha,
                              fecha_programada: encuentro.fecha_programada,
                              torneo_id: (encuentro as any).torneo_id,
                              jornada: encuentro.jornada,
                            }),
                          )
                        }

                        const handleDragEnd = () => {
                          setDraggedId(null)
                          setDragOverId(null)
                        }

                        const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>, slotId: string) => {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                          setDragOverId(slotId)
                        }

                        const handleDragLeave = () => {
                          setDragOverId(null)
                        }

                        const handleDrop = async (
                          event: React.DragEvent<HTMLTableRowElement>,
                          horaDestino: string,
                          canchaDestino: string,
                          fechaKeyDestino: string,
                        ) => {
                          event.preventDefault()
                          setDragOverId(null)
                          setDraggedId(null)
                          const data = event.dataTransfer.getData('application/json')
                          if (!data) return

                          const payload = JSON.parse(data) as {
                            encuentroId: number
                            horarioId: number | null
                            cancha: string | null
                            fecha_programada: string | null
                            torneo_id: number
                            jornada: number | null
                          }

                          // Buscar el horario destino por día y hora
                          const fecha = new Date(fechaKeyDestino + 'T00:00:00')
                          const diasDb = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
                          const diaDb = diasDb[fecha.getDay()] || 'domingo'

                          const horarioDestino = horarios.find(
                            h => h.dia_semana === diaDb && h.hora_inicio === horaDestino,
                          )

                          if (!horarioDestino) {
                            console.warn('No se encontró horario destino para la hora/día seleccionados')
                            return
                          }

                          startTransition(async () => {
                            const fechaDestino = new Date(fechaKeyDestino + 'T00:00:00')
                            const resultado = await moverEncuentroGlobal(
                              payload.encuentroId,
                              horarioDestino.id,
                              canchaDestino,
                              fechaDestino,
                            )

                            if (!resultado.success) {
                              console.error('No se pudo mover el encuentro:', resultado.mensaje)
                              return
                            }

                            // Actualizar estado local de forma optimista
                            setLocalEncuentros(prev =>
                              prev.map(e => {
                                if (e.id === payload.encuentroId) {
                                  return {
                                    ...e,
                                    cancha: canchaDestino,
                                    horario: {
                                      ...(e.horario as any),
                                      id: horarioDestino.id,
                                      hora_inicio: horarioDestino.hora_inicio,
                                      dia_semana: horarioDestino.dia_semana,
                                    },
                                    horario_id: horarioDestino.id,
                                    fecha_programada: fechaDestino,
                                  } as any
                                }
                                return e
                              }),
                            )
                          })
                        }

                        return (
                          <Col key={cancha} md={6} lg={4} xl={3} className="mb-4">
                            <Card className="h-100 shadow-sm border hover-shadow transition-all" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                              <CardHeader 
                                className="bg-warning bg-opacity-75 text-dark py-3 border-0" 
                                style={{ 
                                  background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.85) 0%, rgba(255, 193, 7, 0.95) 100%)'
                                }}
                              >
                                <h6 className="mb-0 fw-bold d-flex align-items-center">
                                  <LuMapPin className="me-2" size={18} />
                                  {cancha}
                                </h6>
                              </CardHeader>
                              <CardBody className="p-0">
                                <Table striped bordered hover size="sm" className="mb-0">
                                  <thead className="table-warning">
                                    <tr>
                                      <th className="text-center fw-bold" style={{ width: '80px' }}>
                                        <LuClock size={14} className="me-1" />
                                        HORA
                                      </th>
                                      <th className="fw-bold">
                                        <LuUsers size={14} className="me-1" />
                                        EQUIPO 1
                                      </th>
                                      <th className="fw-bold">
                                        <LuUsers size={14} className="me-1" />
                                        EQUIPO 2
                                      </th>
                                      {encuentrosCancha.some(e => (e.torneo as any)?.categoria?.nombre) && (
                                        <th className="text-center fw-bold" style={{ width: '100px' }}>CATEGORÍA</th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {horasDeEsteDia.map(hora => {
                                      const encuentrosEnHora = encuentrosCancha.filter(
                                        e => e.horario?.hora_inicio === hora
                                      )

                                      if (encuentrosEnHora.length > 0) {
                                        return encuentrosEnHora.map(encuentro => {
                                          const slotId = `${cancha}-${hora}-${encuentro.id}`
                                          const isDragging = draggedId === encuentro.id
                                          const isDragOver = dragOverId === slotId
                                          
                                          return (
                                            <tr
                                              key={encuentro.id}
                                              draggable
                                              onDragStart={event => handleDragStart(event, encuentro)}
                                              onDragEnd={handleDragEnd}
                                              onDragOver={event => handleDragOver(event, slotId)}
                                              onDragLeave={handleDragLeave}
                                              onDrop={event => handleDrop(event, hora, cancha, fechaKey)}
                                              className={`
                                                ${isDragging ? 'opacity-50' : ''}
                                                ${isDragOver ? 'bg-info bg-opacity-25' : ''}
                                                cursor-move
                                                transition-all
                                              `}
                                              style={{
                                                cursor: 'grab',
                                                userSelect: 'none'
                                              }}
                                            >
                                              <td className="text-center fw-bold bg-light align-middle">
                                                <div className="d-flex align-items-center justify-content-center">
                                                  <LuClock size={12} className="me-1 text-muted" />
                                                  <span>{encuentro.horario?.hora_inicio || '-'}</span>
                                                </div>
                                              </td>
                                              <td className="fw-bold text-primary align-middle">
                                                <div className="d-flex align-items-center">
                                                  <LuUsers size={12} className="me-1 text-primary opacity-75" />
                                                  <span>{encuentro.equipoLocal?.nombre || 'N/A'}</span>
                                                </div>
                                              </td>
                                              <td className="fw-bold text-danger align-middle">
                                                <div className="d-flex align-items-center">
                                                  <LuUsers size={12} className="me-1 text-danger opacity-75" />
                                                  <span>{encuentro.equipoVisitante?.nombre || 'N/A'}</span>
                                                </div>
                                              </td>
                                              {encuentrosCancha.some(e => (e.torneo as any)?.categoria?.nombre) && (
                                                <td className="text-center align-middle">
                                                  <Badge bg="secondary" className="text-white">
                                                    {(encuentro.torneo as any)?.categoria?.nombre || '-'}
                                                  </Badge>
                                                </td>
                                              )}
                                            </tr>
                                          )
                                        })
                                      }

                                      // Horario hueco en esta cancha (sin encuentro)
                                      const slotLibreId = `${cancha}-${hora}-libre`
                                      const isDragOverLibre = dragOverId === slotLibreId
                                      
                                      return (
                                        <tr
                                          key={slotLibreId}
                                          onDragOver={event => handleDragOver(event, slotLibreId)}
                                          onDragLeave={handleDragLeave}
                                          onDrop={event => handleDrop(event, hora, cancha, fechaKey)}
                                          className={`
                                            ${isDragOverLibre ? 'bg-success bg-opacity-25' : 'bg-light bg-opacity-50'}
                                            transition-all
                                          `}
                                          style={{
                                            minHeight: '50px'
                                          }}
                                        >
                                          <td className="text-center fw-bold text-muted align-middle bg-light">
                                            <div className="d-flex align-items-center justify-content-center">
                                              <LuClock size={12} className="me-1" />
                                              <span>{hora}</span>
                                            </div>
                                          </td>
                                          <td
                                            colSpan={encuentrosCancha.some(e => (e.torneo as any)?.categoria?.nombre) ? 3 : 2}
                                            className="text-center align-middle"
                                          >
                                            <div className="d-flex align-items-center justify-content-center py-2">
                                              <LuMove size={14} className="me-2 text-muted" />
                                              <span className={`${isDragOverLibre ? 'text-success fw-bold' : 'text-muted fst-italic'}`}>
                                                {isDragOverLibre ? 'Soltar aquí' : 'Horario libre (sin encuentro)'}
                                              </span>
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </Table>
                              </CardBody>
                            </Card>
                          </Col>
                        )
                      })}
                    </Row>
                  </div>
                )
              })}
            </div>
          )
        })}
        
        {/* Leyenda */}
        <div className="mt-4 p-3 bg-light bg-opacity-50 rounded-3 border border-secondary border-opacity-25">
          <div className="d-flex align-items-start">
            <LuMove size={18} className="me-2 text-primary mt-1" />
            <div>
              <small className="text-muted d-block mb-1">
                <strong className="text-dark">Nota:</strong> Los encuentros están organizados por fecha y cancha, 
                ordenados por hora dentro de cada cancha.
              </small>
              <small className="text-muted d-block">
                <strong className="text-dark">Arrastrar y soltar:</strong> Puedes arrastrar encuentros a horarios libres 
                o intercambiarlos con otros encuentros del mismo torneo.
              </small>
            </div>
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          .hover-shadow:hover {
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
            transform: translateY(-2px);
          }
          .transition-all {
            transition: all 0.2s ease-in-out;
          }
        `}} />
      </CardBody>
    </Card>
  )
}
