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
      error: error.message,
      type: error.constructor.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
