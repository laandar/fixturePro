import { notFound } from 'next/navigation'
import { estadisticasQueries, encuentroQueries, equiposDescansanQueries, equipoTorneoQueries } from '@/db/queries'
import EstadisticasTorneo from './components/EstadisticasTorneo'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const torneoId = parseInt(id)
  
  if (isNaN(torneoId)) {
    return {
      title: 'Torneo no encontrado',
      description: 'El torneo solicitado no existe'
    }
  }

  try {
    const torneo = await estadisticasQueries.getTorneoPublico(torneoId)
    
    if (!torneo) {
      return {
        title: 'Torneo no encontrado',
        description: 'El torneo solicitado no existe'
      }
    }

    return {
      title: `${torneo.nombre} - Estadísticas`,
      description: `Tabla de posiciones y goleadores del torneo ${torneo.nombre}`,
    }
  } catch (error) {
    return {
      title: 'Error',
      description: 'Error al cargar las estadísticas del torneo'
    }
  }
}

export default async function EstadisticasPage({ params }: PageProps) {
  const { id } = await params
  const torneoId = parseInt(id)
  
  if (isNaN(torneoId)) {
    notFound()
  }

  try {
    // Obtener datos del torneo y estadísticas
    const [torneo, tablaPosiciones, tablaGoleadores, tablaTarjetas, encuentros, descansosData, equiposTorneo] = await Promise.all([
      estadisticasQueries.getTorneoPublico(torneoId),
      estadisticasQueries.getTablaPosiciones(torneoId),
      estadisticasQueries.getTablaGoleadores(torneoId),
      estadisticasQueries.getTablaTarjetas(torneoId),
      encuentroQueries.getByTorneoId(torneoId),
      equiposDescansanQueries.getByTorneoId(torneoId),
      equipoTorneoQueries.getByTorneoId(torneoId)
    ])

    if (!torneo) {
      notFound()
    }

    // Formatear equipos que descansan por jornada
    const equiposDescansan: Record<number, number[]> = {}
    descansosData.forEach(descanso => {
      if (!equiposDescansan[descanso.jornada]) {
        equiposDescansan[descanso.jornada] = []
      }
      equiposDescansan[descanso.jornada].push(descanso.equipo_id)
    })

    // Crear mapa de todos los equipos del torneo
    const equiposMap: Record<number, { id: number; nombre: string; imagen_equipo?: string | null }> = {}
    equiposTorneo.forEach(et => {
      if (et.equipo) {
        equiposMap[et.equipo.id] = {
          id: et.equipo.id,
          nombre: et.equipo.nombre,
          imagen_equipo: et.equipo.imagen_equipo
        }
      }
    })

    return (
      <EstadisticasTorneo
        torneo={torneo}
        tablaPosiciones={tablaPosiciones}
        tablaGoleadores={tablaGoleadores}
        tablaTarjetas={tablaTarjetas}
        encuentros={encuentros}
        equiposDescansan={equiposDescansan}
        equiposMap={equiposMap}
      />
    )
  } catch (error) {
    console.error('Error al cargar estadísticas:', error)
    notFound()
  }
}
