/**
 * Script para subir las imágenes que faltan en Cloudinary
 * Lee el reporte de imágenes no subidas y las sube automáticamente
 * 
 * Uso:
 * npx tsx src/scripts/subir-imagenes-faltantes.ts [--dry-run]
 */

import { db } from '@/db'
import { jugadores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { uploadImageToCloudinary } from '@/lib/cloudinary'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ ERROR: Variables de entorno de Cloudinary no configuradas')
  process.exit(1)
}

interface ImagenNoSubida {
  archivo: string
  ruta: string
  jugador_id: string
  cedula: string
  apellido_nombre: string
  identificadores: {
    cedula?: string
    id?: string
    nombre?: string
  }
}

interface ReporteNoSubidas {
  fecha: string
  carpeta_origen: string
  resumen: {
    total_imagenes_locales: number
    imagenes_subidas: number
    imagenes_no_subidas: number
    imagenes_sin_jugador: number
    porcentaje_subidas: string
  }
  imagenes_no_subidas: ImagenNoSubida[]
}

interface ResultadoSubida {
  archivo: string
  jugador_id: string
  cedula: string
  apellido_nombre: string
  estado: 'exitoso' | 'error' | 'archivo_no_encontrado' | 'jugador_no_encontrado'
  url_cloudinary?: string
  error?: string
}

/**
 * Función principal para subir imágenes faltantes
 */
async function subirImagenesFaltantes(dryRun: boolean = false) {
  try {
    console.log('='.repeat(60))
    console.log('📤 SUBIENDO IMÁGENES FALTANTES A CLOUDINARY')
    console.log('='.repeat(60))
    console.log()

    if (dryRun) {
      console.log('⚠️  MODO DRY-RUN: No se subirán imágenes realmente\n')
    }

    // 1. Leer el reporte de imágenes no subidas
    const reportePath = join(process.cwd(), 'imagenes-no-subidas.json')
    if (!existsSync(reportePath)) {
      throw new Error(`No se encontró el archivo: ${reportePath}`)
    }

    console.log(`📄 Leyendo reporte: ${reportePath}`)
    const contenido = readFileSync(reportePath, 'utf-8')
    const reporte: ReporteNoSubidas = JSON.parse(contenido)
    
    const imagenesNoSubidas = reporte.imagenes_no_subidas
    console.log(`✅ Se encontraron ${imagenesNoSubidas.length} imágenes para subir\n`)

    if (imagenesNoSubidas.length === 0) {
      console.log('✅ No hay imágenes para subir')
      return
    }

    // 2. Procesar cada imagen
    const resultados: ResultadoSubida[] = []
    let exitosos = 0
    let errores = 0

    for (let i = 0; i < imagenesNoSubidas.length; i++) {
      const imagen = imagenesNoSubidas[i]
      const progreso = `[${i + 1}/${imagenesNoSubidas.length}]`
      
      console.log(`${progreso} 📸 Procesando: ${imagen.archivo}`)
      console.log(`   👤 Jugador: ${imagen.apellido_nombre.trim()} (Cédula: ${imagen.cedula})`)

      const resultado: ResultadoSubida = {
        archivo: imagen.archivo,
        jugador_id: imagen.jugador_id,
        cedula: imagen.cedula,
        apellido_nombre: imagen.apellido_nombre,
        estado: 'error'
      }

      try {
        // Verificar que el archivo existe
        if (!existsSync(imagen.ruta)) {
          resultado.estado = 'archivo_no_encontrado'
          resultado.error = `Archivo no encontrado: ${imagen.ruta}`
          console.log(`   ❌ ${resultado.error}`)
          errores++
          resultados.push(resultado)
          continue
        }

        // Verificar que el jugador existe en la BD
        const jugador = await db
          .select()
          .from(jugadores)
          .where(eq(jugadores.id, imagen.jugador_id))
          .limit(1)

        if (jugador.length === 0) {
          resultado.estado = 'jugador_no_encontrado'
          resultado.error = `Jugador no encontrado en BD: ${imagen.jugador_id}`
          console.log(`   ❌ ${resultado.error}`)
          errores++
          resultados.push(resultado)
          continue
        }

        if (dryRun) {
          // Simular subida
          resultado.estado = 'exitoso'
          resultado.url_cloudinary = `https://res.cloudinary.com/${cloudName}/image/upload/v1234567890/jugadores/jugador_${imagen.jugador_id}.jpg`
          console.log(`   ✅ [DRY-RUN] Simulando subida exitosa`)
          exitosos++
        } else {
          // Leer archivo y subir a Cloudinary
          const archivoBuffer = readFileSync(imagen.ruta)
          const publicId = `jugador_${imagen.jugador_id}`
          
          console.log(`   📤 Subiendo a Cloudinary...`)
          const urlCloudinary = await uploadImageToCloudinary(archivoBuffer, publicId, 'jugadores')
          
          // Actualizar base de datos
          await db
            .update(jugadores)
            .set({ foto: urlCloudinary })
            .where(eq(jugadores.id, imagen.jugador_id))
          
          resultado.estado = 'exitoso'
          resultado.url_cloudinary = urlCloudinary
          console.log(`   ✅ Subida exitosa: ${urlCloudinary}`)
          exitosos++
        }

        resultados.push(resultado)

        // Pequeño delay para no sobrecargar Cloudinary
        if (!dryRun && (i + 1) % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error: any) {
        resultado.error = error.message || 'Error desconocido'
        console.log(`   ❌ Error: ${resultado.error}`)
        errores++
        resultados.push(resultado)
      }

      console.log() // Línea en blanco
    }

    // 3. Generar reporte final
    const reporteFinal = {
      fecha: new Date().toISOString(),
      modo: dryRun ? 'dry-run' : 'real',
      resumen: {
        total_procesadas: imagenesNoSubidas.length,
        exitosas: exitosos,
        errores: errores,
        porcentaje_exito: ((exitosos / imagenesNoSubidas.length) * 100).toFixed(2) + '%'
      },
      resultados: resultados
    }

    // 4. Mostrar resumen
    console.log('='.repeat(60))
    console.log('📊 RESUMEN DE SUBIDA')
    console.log('='.repeat(60))
    console.log(`📸 Total procesadas: ${imagenesNoSubidas.length}`)
    console.log(`✅ Exitosas: ${exitosos}`)
    console.log(`❌ Errores: ${errores}`)
    console.log(`📊 Porcentaje de éxito: ${reporteFinal.resumen.porcentaje_exito}`)
    console.log('='.repeat(60))

    // 5. Guardar reporte
    const nombreReporte = dryRun 
      ? 'reporte-subida-faltantes-dry-run.json'
      : 'reporte-subida-faltantes-real.json'
    const reporteFinalPath = join(process.cwd(), nombreReporte)
    writeFileSync(reporteFinalPath, JSON.stringify(reporteFinal, null, 2), 'utf-8')
    console.log(`\n✅ Reporte guardado en: ${reporteFinalPath}`)

    // 6. Generar CSV de errores si los hay
    if (errores > 0) {
      const erroresCSV = resultados
        .filter(r => r.estado !== 'exitoso')
        .map(r => `"${r.archivo}","${r.cedula}","${r.apellido_nombre}","${r.estado}","${r.error || ''}"`)
        .join('\n')
      
      const csvHeader = 'Archivo,Cédula,Apellido y Nombre,Estado,Error\n'
      const csvContent = csvHeader + erroresCSV
      
      const csvPath = join(process.cwd(), 'errores-subida-faltantes.csv')
      writeFileSync(csvPath, csvContent, 'utf-8')
      console.log(`⚠️  CSV de errores guardado en: ${csvPath}`)
    }

    return reporteFinal
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Parsear argumentos
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

if (require.main === module) {
  subirImagenesFaltantes(dryRun)
    .then(() => {
      console.log('\n✅ Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

