/**
 * Script para extraer las imágenes que no encontraron jugador del reporte
 * 
 * Uso:
 * npx tsx src/scripts/extraer-jugadores-no-encontrados.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface ResultadoSubida {
  archivo: string
  jugadorEncontrado: boolean
  jugadorNombre?: string
  jugadorId?: string
  exito: boolean
  error?: string
}

interface Reporte {
  fecha: string
  carpeta: string
  dryRun: boolean
  resumen: {
    total: number
    exitosos: number
    fallidos: number
    noEncontrados: number
  }
  resultados: ResultadoSubida[]
}

function extraerNoEncontrados() {
  try {
    console.log('📊 Analizando reporte de subida...\n')

    // Leer el reporte
    const reportePath = join(process.cwd(), 'reporte-subida-real.json')
    const reporteContent = readFileSync(reportePath, 'utf-8')
    const reporte: Reporte = JSON.parse(reporteContent)

    console.log(`Total de archivos procesados: ${reporte.resumen.total}`)
    console.log(`✅ Exitosos: ${reporte.resumen.exitosos}`)
    console.log(`❌ Fallidos: ${reporte.resumen.fallidos}`)
    console.log(`⚠️  No encontrados: ${reporte.resumen.noEncontrados}\n`)

    // Filtrar los que no encontraron jugador
    const noEncontrados = reporte.resultados.filter(
      r => !r.jugadorEncontrado || r.error === 'Jugador no encontrado'
    )

    console.log(`\n📋 IMÁGENES SIN JUGADOR ASOCIADO (${noEncontrados.length}):\n`)
    console.log('='.repeat(80))

    // Agrupar por tipo de error
    const porError: Record<string, string[]> = {}
    
    noEncontrados.forEach(item => {
      const error = item.error || 'Sin error específico'
      if (!porError[error]) {
        porError[error] = []
      }
      porError[error].push(item.archivo)
    })

    // Mostrar por tipo de error
    Object.entries(porError).forEach(([error, archivos]) => {
      console.log(`\n${error} (${archivos.length} archivos):`)
      console.log('-'.repeat(80))
      archivos.slice(0, 50).forEach(archivo => {
        // Extraer cédula del nombre del archivo
        const cedula = archivo.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
        console.log(`  - ${archivo} (Cédula: ${cedula})`)
      })
      if (archivos.length > 50) {
        console.log(`  ... y ${archivos.length - 50} más`)
      }
    })

    // Guardar reporte detallado
    const reporteNoEncontrados = {
      fecha: new Date().toISOString(),
      total: noEncontrados.length,
      resumen: {
        porError: Object.fromEntries(
          Object.entries(porError).map(([error, archivos]) => [error, archivos.length])
        )
      },
      archivos: noEncontrados.map(item => ({
        archivo: item.archivo,
        cedula: item.archivo.replace(/\.(jpg|jpeg|png|gif|webp)$/i, ''),
        error: item.error || 'Jugador no encontrado'
      }))
    }

    const outputPath = join(process.cwd(), 'jugadores-no-encontrados.json')
    writeFileSync(outputPath, JSON.stringify(reporteNoEncontrados, null, 2), 'utf-8')
    console.log(`\n\n✅ Reporte guardado en: ${outputPath}`)

    // Guardar también como CSV
    const csvPath = join(process.cwd(), 'jugadores-no-encontrados.csv')
    const csvHeader = 'archivo,cedula,error\n'
    const csvRows = noEncontrados.map(item => {
      const cedula = item.archivo.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
      return `"${item.archivo}","${cedula}","${item.error || 'Jugador no encontrado'}"`
    }).join('\n')
    writeFileSync(csvPath, csvHeader + csvRows, 'utf-8')
    console.log(`✅ CSV guardado en: ${csvPath}`)

    // Mostrar estadísticas
    console.log('\n' + '='.repeat(80))
    console.log('📊 ESTADÍSTICAS')
    console.log('='.repeat(80))
    console.log(`Total de imágenes sin jugador: ${noEncontrados.length}`)
    console.log(`Porcentaje: ${((noEncontrados.length / reporte.resumen.total) * 100).toFixed(2)}%`)
    
    // Mostrar primeras 10 cédulas para verificar
    console.log('\n🔍 Primeras 10 cédulas que no se encontraron:')
    noEncontrados.slice(0, 10).forEach(item => {
      const cedula = item.archivo.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
      console.log(`  - ${cedula}`)
    })

    console.log('\n💡 SUGERENCIAS:')
    console.log('   1. Verifica que estas cédulas existan en la base de datos')
    console.log('   2. Verifica que el formato del nombre del archivo sea correcto')
    console.log('   3. Puedes crear estos jugadores en la BD y volver a ejecutar el script')
    console.log('   4. O renombrar los archivos con la cédula correcta')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  extraerNoEncontrados()
}

