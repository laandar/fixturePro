'use client'

import { useState, useEffect } from 'react'
import './EstadoEncuentro.css'
import { Button, Card, CardBody, Badge, Dropdown, DropdownButton } from 'react-bootstrap'
import { LuPlay, LuPause, LuCheck, LuX, LuClock, LuSettings, LuRefreshCw } from 'react-icons/lu'
import NotificationCard from '@/components/NotificationCard'
import { updateEstadoEncuentro, getEncuentrosByTorneo } from '../../torneos/actions'
import { saveGolesEncuentro, saveTarjetasEncuentro } from '../actions'
import { useGestionJugadores } from './GestionJugadoresContext'
import type { EncuentroWithRelations, NewGol, NewTarjeta } from '@/db/types'

interface EstadoEncuentroProps {
  torneoId: number
  equipoLocalId: number
  equipoVisitanteId: number
  jornada: number
}

const EstadoEncuentro = ({ torneoId, equipoLocalId, equipoVisitanteId, jornada }: EstadoEncuentroProps) => {
  const { goles, tarjetas, nombreEquipoA, loadEstadoEncuentro } = useGestionJugadores()
  const [encuentro, setEncuentro] = useState<EncuentroWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await loadEncuentro()
      await loadEstadoEncuentro() // También actualizar el contexto
    } catch (err) {
      console.error('Error al refrescar:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const loadEncuentro = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Obtener todos los encuentros del torneo y filtrar por los equipos y jornada
      const encuentros = await getEncuentrosByTorneo(torneoId)
      console.log('Encuentros encontrados:', encuentros.length)
      console.log('Buscando encuentro con:', { torneoId, equipoLocalId, equipoVisitanteId, jornada })
      
      const encuentroEncontrado = encuentros.find(e => 
        e.equipo_local_id === equipoLocalId && 
        e.equipo_visitante_id === equipoVisitanteId && 
        e.jornada === jornada
      )
      
      if (encuentroEncontrado) {
        console.log('Encuentro encontrado:', encuentroEncontrado)
        console.log('Estado actual:', encuentroEncontrado.estado)
        setEncuentro(encuentroEncontrado as EncuentroWithRelations)
      } else {
        console.log('Encuentro no encontrado. Encuentros disponibles:', encuentros.map(e => ({
          id: e.id,
          local: e.equipo_local_id,
          visitante: e.equipo_visitante_id,
          jornada: e.jornada,
          estado: e.estado
        })))
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

  const handleCambiarEstado = async (nuevoEstado: string) => {
    if (!encuentro) return

    try {
      setUpdating(true)
      setError(null)
      
      // Si se está finalizando el encuentro, guardar los goles y tarjetas primero
      if (nuevoEstado === 'finalizado') {
        console.log('Finalizando encuentro, guardando goles y tarjetas...')
        
        // Guardar goles si hay alguno
        if (goles.length > 0) {
          console.log('Guardando goles:', goles)
          
          // Convertir goles del contexto a formato de BD
          const golesParaGuardar: NewGol[] = goles.map(gol => ({
            encuentro_id: encuentro.id,
            jugador_id: parseInt(gol.jugador),
            equipo_id: gol.equipo === nombreEquipoA ? equipoLocalId : equipoVisitanteId,
            minuto: gol.minuto || 0,
            tiempo: gol.tiempo || 'primer',
            tipo: gol.tipo || 'gol'
          }))
          
          // Guardar goles en la BD
          await saveGolesEncuentro(encuentro.id, golesParaGuardar)
          console.log('Goles guardados exitosamente')
          
          // Calcular totales de goles por equipo
          const golesLocal = golesParaGuardar.filter(gol => gol.equipo_id === equipoLocalId).length
          const golesVisitante = golesParaGuardar.filter(gol => gol.equipo_id === equipoVisitanteId).length
          
          // Actualizar goles del encuentro
          const formData = new FormData()
          formData.append('goles_local', golesLocal.toString())
          formData.append('goles_visitante', golesVisitante.toString())
          formData.append('estado', 'finalizado')
          
          // Usar la función existente para actualizar el encuentro
          const { updateEncuentro } = await import('../../torneos/actions')
          await updateEncuentro(encuentro.id, formData)
          console.log(`Goles del encuentro actualizados: ${golesLocal} - ${golesVisitante}`)
        } else {
          // Si no hay goles, solo actualizar el estado
          const formData = new FormData()
          formData.append('estado', 'finalizado')
          
          const { updateEncuentro } = await import('../../torneos/actions')
          await updateEncuentro(encuentro.id, formData)
        }

        // Guardar tarjetas si hay alguna
        if (tarjetas.length > 0) {
          console.log('Guardando tarjetas:', tarjetas)
          
          // Convertir tarjetas del contexto a formato de BD
          const tarjetasParaGuardar: NewTarjeta[] = tarjetas.map(tarjeta => ({
            encuentro_id: encuentro.id,
            jugador_id: parseInt(tarjeta.jugador),
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
      const mensajeGoles = goles.length > 0 ? ' y goles guardados' : ''
      const mensajeTarjetas = tarjetas.length > 0 ? ' y tarjetas guardadas' : ''
      setSuccess(`Estado actualizado a: ${getEstadoLabel(nuevoEstado)}${nuevoEstado === 'finalizado' ? mensajeGoles + mensajeTarjetas : ''}`)
      
      // Recargar el encuentro para obtener el estado actualizado
      await loadEncuentro()
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error al actualizar estado:', err)
      setError('Error al actualizar el estado del encuentro')
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
      aplazado: 'Aplazado'
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
      }
    }
    
    const configItem = config[estado] || { 
      variant: 'secondary', 
      icon: <LuSettings size={16} />
    }
    
    return (
      <Badge bg={configItem.variant} className="d-flex align-items-center gap-1">
        {configItem.icon}
        {getEstadoLabel(estado)}
      </Badge>
    )
  }

  const getEstadosDisponibles = (estadoActual: string) => {
    const estados: Record<string, string[]> = {
      programado: ['en_curso', 'cancelado', 'aplazado'],
      en_curso: ['finalizado', 'aplazado'],
      finalizado: ['en_curso'], // Solo para corregir errores
      cancelado: ['programado', 'en_curso'],
      aplazado: ['programado', 'en_curso']
    }
    const estadosDisponibles = estados[estadoActual] || []
    console.log(`Estados disponibles para "${estadoActual}":`, estadosDisponibles)
    return estadosDisponibles
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
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-1">Estado del Encuentro</h6>
            <div className="d-flex align-items-center gap-2">
              {getEstadoBadge(encuentro.estado || 'programado')}
              {encuentro.fecha_jugada && (
                <small className="text-muted">
                  Jugado: {new Date(encuentro.fecha_jugada).toLocaleDateString('es-ES')}
                </small>
              )}
            </div>
          </div>
          
          <div className="d-flex align-items-center gap-2">
            {success && (
              <NotificationCard
                type="success"
                message={success}
                onClose={() => setSuccess('')}
                className="mb-0"
                size="sm"
              />
            )}
            
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Actualizar estado del encuentro"
            >
              <LuRefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            </Button>
            
            {estadosDisponibles.length > 0 && (
              <DropdownButton
                title="Cambiar Estado"
                variant="outline-primary"
                size="sm"
                disabled={updating}
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
          </div>
        </div>

        
         
      </CardBody>
    </Card>
  )
}

export default EstadoEncuentro
