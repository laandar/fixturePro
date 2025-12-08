'use client'

import { useState, useEffect } from 'react'
import './EstadoEncuentro.css'
import { Button, Card, CardBody, Badge, Dropdown, DropdownButton } from 'react-bootstrap'
import { LuPlay, LuPause, LuCheck, LuX, LuClock, LuSettings, LuHourglass } from 'react-icons/lu'
import NotificationCard from '@/components/NotificationCard'
import { updateEstadoEncuentro } from '../../torneos/actions'
import { saveGolesEncuentro, saveTarjetasEncuentro } from '../actions'
import { aplicarWO, revertirWO, esEncuentroWO } from '../wo-actions'
import { useGestionJugadores } from './GestionJugadoresContext'
import type { EncuentroWithRelations, NewGol, NewTarjeta } from '@/db/types'

interface EstadoEncuentroProps {
  torneoId: number
  equipoLocalId: number
  equipoVisitanteId: number
  jornada: number
}

const EstadoEncuentro = ({ torneoId, equipoLocalId, equipoVisitanteId, jornada }: EstadoEncuentroProps) => {
  const { goles, tarjetas, nombreEquipoA, loadEstadoEncuentro, estadoEncuentro, isAdmin, refreshAllData, getEncuentroActual } = useGestionJugadores()
  const [encuentro, setEncuentro] = useState<EncuentroWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [lastKnownState, setLastKnownState] = useState<string | null>(null)
  const [isWO, setIsWO] = useState(false)
  const [showWOOptions, setShowWOOptions] = useState(false)


  const loadEncuentro = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Obtener el encuentro desde localStorage usando el helper del contexto
      const encuentroEncontrado = await getEncuentroActual()
      
      if (encuentroEncontrado) {
        console.log('Encuentro encontrado:', encuentroEncontrado)
        console.log('Estado actual:', encuentroEncontrado.estado)
        setEncuentro(encuentroEncontrado as any)
        
        // Verificar si es WO
        const esWO = await esEncuentroWO(encuentroEncontrado.id)
        setIsWO(esWO)
        
        // Sincronizar el último estado conocido
        if (encuentroEncontrado.estado) {
          setLastKnownState(encuentroEncontrado.estado)
        }
      } else {
        console.log('Encuentro no encontrado en localStorage')
        setError('Encuentro no encontrado')
      }
    } catch (err) {
      console.error('Error al cargar encuentro:', err)
      setError('Error al cargar el encuentro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEncuentro()
  }, [torneoId, equipoLocalId, equipoVisitanteId, jornada])

  // Detectar cambios en el estado del encuentro desde el contexto y ejecutar refresh automáticamente
  useEffect(() => {
    if (estadoEncuentro && estadoEncuentro !== lastKnownState && encuentro) {
      console.log(`🔄 Estado cambió en contexto: ${lastKnownState} → ${estadoEncuentro}`)
      
      // Ejecutar refresh automáticamente
      const ejecutarRefresh = async () => {
        try {
          await loadEncuentro()
          await loadEstadoEncuentro()
          console.log('🔄 Estado del encuentro refrescado automáticamente')
        } catch (err) {
          console.error('Error al refrescar automáticamente:', err)
        }
      }
      
      ejecutarRefresh()
      
      // Actualizar el último estado conocido
      setLastKnownState(estadoEncuentro)
    }
  }, [estadoEncuentro, lastKnownState, encuentro, loadEncuentro, loadEstadoEncuentro])

  const handleCambiarEstado = async (nuevoEstado: string) => {
    if (!encuentro) return

    try {
      setUpdating(true)
      setError(null)
      
      // Si se está finalizando el encuentro o poniendo en pendiente, guardar los goles y tarjetas primero
      if (nuevoEstado === 'finalizado' || nuevoEstado === 'pendiente') {
        console.log(`${nuevoEstado === 'finalizado' ? 'Finalizando' : 'Poniendo en pendiente'} encuentro, guardando goles y tarjetas...`)
        
        // Guardar goles si hay alguno
        if (goles.length > 0) {
          console.log('Guardando goles:', goles)
          
          // Convertir goles del contexto a formato de BD
          const golesParaGuardar: NewGol[] = goles.map(gol => ({
            encuentro_id: encuentro.id,
            jugador_id: gol.jugador, // Ya es string
            equipo_id: gol.equipo === nombreEquipoA ? equipoLocalId : equipoVisitanteId,
            minuto: gol.minuto || 0,
            tiempo: gol.tiempo || 'primer',
            tipo: gol.tipo || 'gol'
          }))
          
          // Guardar goles en la BD
          await saveGolesEncuentro(encuentro.id, golesParaGuardar)
          console.log('Goles guardados exitosamente')
          
          // Solo actualizar estadísticas del encuentro si se está finalizando
          if (nuevoEstado === 'finalizado') {
            // Calcular totales de goles por equipo
            const golesLocal = golesParaGuardar.filter(gol => gol.equipo_id === equipoLocalId).length
            const golesVisitante = golesParaGuardar.filter(gol => gol.equipo_id === equipoVisitanteId).length
            
            // Actualizar goles del encuentro
            const formData = new FormData()
            formData.append('goles_local', golesLocal.toString())
            formData.append('goles_visitante', golesVisitante.toString())
            formData.append('estado', 'finalizado')
            // Preservar la cancha y otros campos importantes
            if (encuentro.cancha) {
              formData.append('cancha', encuentro.cancha)
            }
            if (encuentro.arbitro) {
              formData.append('arbitro', encuentro.arbitro)
            }
            if (encuentro.horario_id) {
              formData.append('horario_id', encuentro.horario_id.toString())
            }
            
            // Usar la función existente para actualizar el encuentro
            const { updateEncuentro } = await import('../../torneos/actions')
            await updateEncuentro(encuentro.id, formData)
            console.log(`Goles del encuentro actualizados: ${golesLocal} - ${golesVisitante}`)
          } else {
            console.log('Estado pendiente: goles guardados pero no aplicados a estadísticas')
          }
        } else {
          // Si no hay goles, solo actualizar el estado
          const formData = new FormData()
          formData.append('estado', nuevoEstado)
          // Preservar la cancha y otros campos importantes
          if (encuentro.cancha) {
            formData.append('cancha', encuentro.cancha)
          }
          if (encuentro.arbitro) {
            formData.append('arbitro', encuentro.arbitro)
          }
          if (encuentro.horario_id) {
            formData.append('horario_id', encuentro.horario_id.toString())
          }
          
          const { updateEncuentro } = await import('../../torneos/actions')
          await updateEncuentro(encuentro.id, formData)
        }

        // Guardar tarjetas si hay alguna
        if (tarjetas.length > 0) {
          console.log('Guardando tarjetas:', tarjetas)
          
          // Convertir tarjetas del contexto a formato de BD
          const tarjetasParaGuardar: NewTarjeta[] = tarjetas.map(tarjeta => ({
            encuentro_id: encuentro.id,
            jugador_id: tarjeta.jugador, // Ya es string
            equipo_id: tarjeta.equipo === nombreEquipoA ? equipoLocalId : equipoVisitanteId,
            minuto: tarjeta.minuto || 0,
            tiempo: tarjeta.tiempo || 'primer',
            tipo: tarjeta.tipo || 'amarilla',
            motivo: tarjeta.motivo || null
          }))
          
          // Guardar tarjetas en la BD
          await saveTarjetasEncuentro(encuentro.id, tarjetasParaGuardar)
          console.log('Tarjetas guardadas exitosamente')
        }
      }
      
      // Actualizar estado del encuentro
      await updateEstadoEncuentro(encuentro.id, nuevoEstado)
      
      // Recargar el encuentro para obtener el estado actualizado
      await loadEncuentro()
    } catch (err) {
      console.error('Error al actualizar estado:', err)
    } finally {
      setUpdating(false)
    }
  }

  const getEstadoLabel = (estado: string) => {
    const estados: Record<string, string> = {
      programado: 'Programado',
      en_curso: 'En Curso',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
      aplazado: 'Aplazado',
      pendiente: 'Pendiente'
    }
    return estados[estado] || estado
  }

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { 
      variant: string; 
      icon: React.ReactNode;
    }> = {
      programado: { 
        variant: 'secondary', 
        icon: <LuClock size={16} />
      },
      en_curso: { 
        variant: 'warning', 
        icon: <LuPlay size={16} />
      },
      finalizado: { 
        variant: 'success', 
        icon: <LuCheck size={16} />
      },
      cancelado: { 
        variant: 'danger', 
        icon: <LuX size={16} />
      },
      aplazado: { 
        variant: 'info', 
        icon: <LuPause size={16} />
      },
      pendiente: { 
        variant: 'warning', 
        icon: <LuHourglass size={16} />
      }
    }
    
    const configItem = config[estado] || { 
      variant: 'secondary', 
      icon: <LuSettings size={16} />
    }
    
    return (
      <Badge bg={configItem.variant} className="d-flex align-items-center gap-1 estado-badge">
        {configItem.icon}
        {getEstadoLabel(estado)}
      </Badge>
    )
  }

  const getEstadosDisponibles = (estadoActual: string) => {
    const estados: Record<string, string[]> = {
      programado: ['en_curso', 'cancelado', 'aplazado', 'pendiente'],
      en_curso: ['finalizado', 'aplazado', 'pendiente'],
      finalizado: isAdmin() ? ['en_curso', 'pendiente'] : [], // Solo admins pueden cambiar de finalizado
      cancelado: ['programado', 'en_curso', 'pendiente'],
      aplazado: ['programado', 'en_curso', 'pendiente'],
      pendiente: ['en_curso', 'finalizado', 'cancelado', 'aplazado']
    }
    const estadosDisponibles = estados[estadoActual] || []
    console.log(`Estados disponibles para "${estadoActual}" (Admin: ${isAdmin()}):`, estadosDisponibles)
    return estadosDisponibles
  }

  // Funciones para manejar WO
  const handleAplicarWO = async (equipoGanadorId: number) => {
    if (!encuentro) return

    try {
      setUpdating(true)
      setError(null)
      
      const resultado = await aplicarWO(encuentro.id, equipoGanadorId)
      
      setSuccess(resultado.mensaje)
      setShowWOOptions(false)
      
      // Recargar todos los datos
      await loadEncuentro()
      await refreshAllData()
      
    } catch (err) {
      console.error('Error al aplicar WO:', err)
      setError(err instanceof Error ? err.message : 'Error al aplicar WO')
    } finally {
      setUpdating(false)
    }
  }

  const handleRevertirWO = async () => {
    if (!encuentro) return

    try {
      setUpdating(true)
      setError(null)
      
      const resultado = await revertirWO(encuentro.id)
      
      setSuccess(resultado.mensaje)
      
      // Recargar todos los datos
      await loadEncuentro()
      await refreshAllData()
      
    } catch (err) {
      console.error('Error al revertir WO:', err)
      setError(err instanceof Error ? err.message : 'Error al revertir WO')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardBody className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2 text-muted">Cargando estado del encuentro...</p>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <NotificationCard
            type="error"
            title="Error"
            message={error}
          />
        </CardBody>
      </Card>
    )
  }

  if (!encuentro) {
    return (
      <Card>
        <CardBody>
          <NotificationCard
            type="warning"
            title="Advertencia"
            message="No se encontró el encuentro especificado."
          />
        </CardBody>
      </Card>
    )
  }

  const estadosDisponibles = getEstadosDisponibles(encuentro.estado || 'programado')

  return (
    <Card className="estado-encuentro-card">
      <CardBody>
        {/* Sección principal: Estado y controles */}
        <div className="estado-encuentro-header">
          {/* Información del estado */}
          <div className="estado-info">
            <h6 className="estado-title mb-2">Estado del Encuentro</h6>
            <div className="d-flex flex-wrap align-items-center gap-2">
              {getEstadoBadge(encuentro.estado || 'programado')}
              {encuentro.fecha_jugada && (
                <small className="text-muted estado-fecha">
                  Jugado: {new Date(encuentro.fecha_jugada).toLocaleDateString('es-ES')}
                </small>
              )}
            </div>
          </div>
          
          {/* Controles de acción */}
          <div className="estado-controles">
            {estadosDisponibles.length > 0 && (
              <DropdownButton
                title="Cambiar Estado"
                variant="outline-primary"
                size="sm"
                disabled={updating}
                className="estado-dropdown"
              >
                {estadosDisponibles.map(estado => (
                  <Dropdown.Item
                    key={estado}
                    onClick={() => handleCambiarEstado(estado)}
                    disabled={updating}
                  >
                    {getEstadoLabel(estado)}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
            )}

            {/* Botones WO - Solo para administradores */}
            {isAdmin() && encuentro && (
              <div className="wo-buttons">
                {!isWO && encuentro.estado !== 'finalizado' && (
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => setShowWOOptions(!showWOOptions)}
                    disabled={updating}
                    className="wo-button"
                  >
                    <LuX size={16} className="me-1" />
                    <span className="d-none d-md-inline">WO</span>
                    <span className="d-md-none">Walkover</span>
                  </Button>
                )}
                
                {isWO && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleRevertirWO}
                    disabled={updating}
                    className="wo-button"
                  >
                    <LuClock size={16} className="me-1" />
                    <span className="d-none d-md-inline">Revertir WO</span>
                    <span className="d-md-none">Revertir</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Opciones WO - Sección expandible */}
        {showWOOptions && encuentro && (
          <div className="wo-options mt-3">
            <div className="wo-options-header mb-2">
              <h6 className="mb-1">Aplicar WO (Walkover)</h6>
              <p className="text-muted small mb-0">
                Esto eliminará todos los goles y tarjetas, y asignará el resultado configurado.
              </p>
            </div>
            <div className="wo-options-buttons">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleAplicarWO(encuentro.equipo_local_id)}
                disabled={updating}
                className="wo-option-button"
              >
                <span className="d-none d-sm-inline">{encuentro.equipoLocal?.nombre} gana por WO</span>
                <span className="d-sm-none">Local gana por WO</span>
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleAplicarWO(encuentro.equipo_visitante_id)}
                disabled={updating}
                className="wo-option-button"
              >
                <span className="d-none d-sm-inline">{encuentro.equipoVisitante?.nombre} gana por WO</span>
                <span className="d-sm-none">Visitante gana por WO</span>
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowWOOptions(false)}
                disabled={updating}
                className="wo-option-button"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
        
        {/* Mensajes informativos */}
        {(encuentro?.estado === 'finalizado' && !isAdmin()) || 
         (encuentro?.estado === 'pendiente') || 
         isWO ? (
          <div className="estado-mensajes mt-3">
            {encuentro?.estado === 'finalizado' && !isAdmin() && (
              <div className="estado-mensaje">
                <i className="bi bi-info-circle me-2"></i>
                <small className="text-muted">
                  Solo los administradores pueden reabrir encuentros finalizados
                </small>
              </div>
            )}
            
            {encuentro?.estado === 'pendiente' && (
              <div className="estado-mensaje">
                <i className="bi bi-clock me-2"></i>
                <small className="text-info">
                  Goles y tarjetas se guardan pero no afectan estadísticas hasta finalizar
                </small>
              </div>
            )}

            {isWO && (
              <div className="alert alert-warning mb-0 estado-alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <div>
                  <strong>Resultado por WO:</strong> Este encuentro fue decidido por walkover. 
                  Los goles y tarjetas fueron eliminados y se aplicaron los puntos configurados.
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}

export default EstadoEncuentro
