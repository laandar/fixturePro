import { NextResponse } from 'next/server'
import { estadisticasQueries } from '@/db/queries'

export async function GET() {
  try {
    console.log('🔍 [API] Diagnóstico completo de estadísticas...')
    
    // Obtener todos los torneos (sin filtros)
    const todosLosTorneos = await estadisticasQueries.getAllTorneos()
    console.log('📊 [API] Todos los torneos:', todosLosTorneos.length)
    
    // Obtener torneos públicos (con filtros)
    const torneosPublicos = await estadisticasQueries.getTorneosPublicos()
    console.log('📊 [API] Torneos públicos:', torneosPublicos.length)
    
    // Analizar estados
    const estadosTorneos = todosLosTorneos.reduce((acc, torneo) => {
      const estado = torneo.estado || 'sin_estado'
      acc[estado] = (acc[estado] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const status = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      totalTorneos: todosLosTorneos.length,
      torneosPublicos: torneosPublicos.length,
      estadosTorneos,
      torneosPublicosData: torneosPublicos.map(t => ({
        id: t.id,
        nombre: t.nombre,
        estado: t.estado,
        equiposCount: t.equiposCount
      })),
      message: `Diagnóstico completo: ${todosLosTorneos.length} torneos totales, ${torneosPublicos.length} públicos`
    }
    
    console.log('📊 [API] Diagnóstico completo:', status)
    
    return NextResponse.json(status, { status: 200 })
    
  } catch (error) {
    console.error('❌ [API] Error en diagnóstico completo:', error)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: 'Error durante el diagnóstico completo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
