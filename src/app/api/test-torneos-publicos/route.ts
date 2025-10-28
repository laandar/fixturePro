import { NextRequest, NextResponse } from 'next/server'
import { estadisticasQueries } from '@/db/queries'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Probando getTorneosPublicos...')
    
    const torneos = await estadisticasQueries.getTorneosPublicos()
    
    console.log('✅ Función ejecutada exitosamente, torneos encontrados:', torneos.length)
    
    return NextResponse.json({
      success: true,
      message: 'Función getTorneosPublicos ejecutada correctamente',
      count: torneos.length,
      data: torneos,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error en getTorneosPublicos:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Error en función getTorneosPublicos',
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
