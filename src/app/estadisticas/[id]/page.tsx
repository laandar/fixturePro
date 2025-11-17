import { notFound } from 'next/navigation'
import { estadisticasQueries, encuentroQueries } from '@/db/queries'
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
    const [torneo, tablaPosiciones, tablaGoleadores, encuentros] = await Promise.all([
      estadisticasQueries.getTorneoPublico(torneoId),
      estadisticasQueries.getTablaPosiciones(torneoId),
      estadisticasQueries.getTablaGoleadores(torneoId),
      encuentroQueries.getByTorneoId(torneoId)
    ])

    if (!torneo) {
      notFound()
    }

    return (
      <EstadisticasTorneo
        torneo={torneo}
        tablaPosiciones={tablaPosiciones}
        tablaGoleadores={tablaGoleadores}
        encuentros={encuentros}
      />
    )
  } catch (error) {
    console.error('Error al cargar estadísticas:', error)
    notFound()
  }
}
