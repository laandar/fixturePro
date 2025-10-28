import { NextResponse } from 'next/server'
import { testConnection } from '@/db/index'

export async function GET() {
  try {
    console.log('🔍 [API] Iniciando diagnóstico de base de datos...')
    
    const isConnected = await testConnection()
    
    const status = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrlPresent: !!process.env.DATABASE_URL,
      connectionStatus: isConnected ? 'success' : 'failed',
      message: isConnected 
        ? 'Conexión a base de datos exitosa' 
        : 'Error de conexión a base de datos'
    }
    
    console.log('📊 [API] Estado de la base de datos:', status)
    
    return NextResponse.json(status, { 
      status: isConnected ? 200 : 500 
    })
    
  } catch (error) {
    console.error('❌ [API] Error en diagnóstico:', error)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrlPresent: !!process.env.DATABASE_URL,
      connectionStatus: 'error',
      message: 'Error durante el diagnóstico',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
