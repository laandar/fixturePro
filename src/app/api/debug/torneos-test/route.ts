import { NextResponse } from 'next/server'
import { estadisticasQueries } from '@/db/queries'

export async function GET() {
  try {
    console.log('🔍 [API] Probando consulta de torneos públicos...')
    
    const torneos = await estadisticasQueries.getTorneosPublicos()
    
    const status = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      queryStatus: 'success',
      torneosCount: torneos?.length || 0,
      message: `Consulta exitosa: ${torneos?.length || 0} torneos encontrados`,
      data: torneos?.slice(0, 3) // Solo los primeros 3 para no sobrecargar la respuesta
    }
    
    console.log('📊 [API] Resultado de consulta:', status)
    
    return NextResponse.json(status, { status: 200 })
    
  } catch (error) {
    console.error('❌ [API] Error en consulta de torneos:', error)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      queryStatus: 'error',
      torneosCount: 0,
      message: 'Error durante la consulta de torneos',
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
