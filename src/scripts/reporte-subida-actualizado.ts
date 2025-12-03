/**
 * Script para generar un reporte actualizado de la subida de imágenes
 * Compara lo que está en Cloudinary con el reporte original
 * 
 * Uso:
 * npx tsx src/scripts/reporte-subida-actualizado.ts
 */

import { v2 as cloudinary } from 'cloudinary'
import { db } from '@/db'
import { jugadores } from '@/db/schema'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ ERROR: Variables de entorno de Cloudinary no configuradas')
  process.exit(1)
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
})

interface ImagenCloudinary {
  public_id: string
  secure_url: string
  format: string
  created_at: string
  bytes: number
}

interface ReporteOriginal {
  fecha: string
  resumen: {
    total: number
    exitosos: number
    fallidos: number
    noEncontrados: number
  }
  resultados: any[]
}

/**
 * Extrae el ID del jugador del public_id
 */
function extraerJugadorId(publicId: string): string | null {
  const match = publicId.match(/^jugadores\/jugador_(.+)$/)
  return match ? match[1] : null
}

/**
 * Genera la URL completa con transformaciones
 */
function generarURLCompleta(publicId: string): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        fetch_format: 'auto',
      },
    ],
    secure: true,
  })
}

async function generarReporteActualizado() {
  try {
    console.log('📊 Generando reporte actualizado de subida...\n')

    // 1. Consultar imágenes en Cloudinary
    console.log('📡 Consultando imágenes en Cloudinary...')
    const imagenesCloudinary: ImagenCloudinary[] = []
    let nextCursor: string | undefined = undefined

    do {
      const resultado: any = await new Promise((resolve, reject) => {
        const options: any = {
          type: 'upload',
          prefix: 'jugadores/jugador_',
          max_results: 500,
        }
        
        if (nextCursor) {
          options.next_cursor = nextCursor
        }
        
        cloudinary.api.resources(options, (error: any, result: any) => {
          if (error) reject(error)
          else resolve(result)
        })
      })

      if (resultado.resources) {
        imagenesCloudinary.push(...resultado.resources)
        console.log(`   Encontradas ${imagenesCloudinary.length} imágenes...`)
      }

      nextCursor = resultado.next_cursor
    } while (nextCursor)

    console.log(`✅ Total en Cloudinary: ${imagenesCloudinary.length}\n`)

    // 2. Consultar jugadores en la base de datos
    console.log('📋 Consultando jugadores en la base de datos...')
    const todosJugadores = await db.select().from(jugadores)
    console.log(`✅ Total de jugadores en BD: ${todosJugadores.length}\n`)

    // 3. Procesar y asociar
    console.log('🔄 Procesando y asociando imágenes con jugadores...\n')
    
    const imagenesConJugador: any[] = []
    const imagenesSinJugador: any[] = []
    const jugadoresConFoto: Set<string> = new Set()
    const jugadoresSinFoto: string[] = []

    for (const imagen of imagenesCloudinary) {
      const jugadorId = extraerJugadorId(imagen.public_id)
      
      if (!jugadorId) {
        imagenesSinJugador.push({
          public_id: imagen.public_id,
          url: generarURLCompleta(imagen.public_id),
          error: 'No se pudo extraer ID del jugador'
        })
        continue
      }

      // Buscar jugador
      const jugador = todosJugadores.find(j => 
        j.id === jugadorId || j.cedula === jugadorId
      )

      if (jugador) {
        imagenesConJugador.push({
          public_id: imagen.public_id,
          jugador_id: jugador.id,
          cedula: jugador.cedula,
          apellido_nombre: jugador.apellido_nombre,
          url_cloudinary: generarURLCompleta(imagen.public_id),
          url_en_bd: jugador.foto,
          coincide: jugador.foto?.includes('cloudinary.com') || false,
          fecha_subida: imagen.created_at
        })
        jugadoresConFoto.add(jugador.id)
      } else {
        imagenesSinJugador.push({
          public_id: imagen.public_id,
          jugador_id_extraido: jugadorId,
          url: generarURLCompleta(imagen.public_id),
          error: 'Jugador no encontrado en la base de datos'
        })
      }
    }

    // Identificar jugadores sin foto
    todosJugadores.forEach(jugador => {
      if (!jugadoresConFoto.has(jugador.id)) {
        jugadoresSinFoto.push(jugador.id)
      }
    })

    // 4. Leer reporte original si existe
    let reporteOriginal: ReporteOriginal | null = null
    const reporteOriginalPath = join(process.cwd(), 'reporte-subida-real.json')
    if (existsSync(reporteOriginalPath)) {
      try {
        const contenido = readFileSync(reporteOriginalPath, 'utf-8')
        reporteOriginal = JSON.parse(contenido)
        console.log('📄 Reporte original encontrado\n')
      } catch (error) {
        console.log('⚠️  No se pudo leer el reporte original\n')
      }
    }

    // 5. Generar reporte
    const reporte = {
      fecha: new Date().toISOString(),
      resumen: {
        total_imagenes_cloudinary: imagenesCloudinary.length,
        imagenes_con_jugador: imagenesConJugador.length,
        imagenes_sin_jugador: imagenesSinJugador.length,
        total_jugadores_bd: todosJugadores.length,
        jugadores_con_foto: jugadoresConFoto.size,
        jugadores_sin_foto: jugadoresSinFoto.length,
        porcentaje_cobertura: ((jugadoresConFoto.size / todosJugadores.length) * 100).toFixed(2) + '%'
      },
      comparacion_con_original: reporteOriginal ? {
        original_exitosos: reporteOriginal.resumen.exitosos,
        actual_en_cloudinary: imagenesCloudinary.length,
        diferencia: imagenesCloudinary.length - reporteOriginal.resumen.exitosos
      } : null,
      imagenes_con_jugador: imagenesConJugador,
      imagenes_sin_jugador: imagenesSinJugador.slice(0, 100), // Solo primeras 100
      jugadores_sin_foto: jugadoresSinFoto.slice(0, 100) // Solo primeras 100
    }

    // 6. Mostrar resumen
    console.log('='.repeat(60))
    console.log('📊 REPORTE ACTUALIZADO DE SUBIDA')
    console.log('='.repeat(60))
    console.log(`📸 Imágenes en Cloudinary: ${imagenesCloudinary.length}`)
    console.log(`✅ Imágenes con jugador asociado: ${imagenesConJugador.length}`)
    console.log(`⚠️  Imágenes sin jugador: ${imagenesSinJugador.length}`)
    console.log(`\n👥 Jugadores:`)
    console.log(`   Total en BD: ${todosJugadores.length}`)
    console.log(`   Con foto: ${jugadoresConFoto.size}`)
    console.log(`   Sin foto: ${jugadoresSinFoto.length}`)
    console.log(`   Cobertura: ${reporte.resumen.porcentaje_cobertura}`)
    
    if (reporteOriginal) {
      console.log(`\n📊 Comparación con reporte original:`)
      console.log(`   Original exitosos: ${reporteOriginal.resumen.exitosos}`)
      console.log(`   Actual en Cloudinary: ${imagenesCloudinary.length}`)
      console.log(`   Diferencia: ${reporte.comparacion_con_original?.diferencia || 0}`)
    }
    
    console.log('='.repeat(60))

    // 7. Guardar reporte
    const reportePath = join(process.cwd(), 'reporte-subida-actualizado.json')
    writeFileSync(reportePath, JSON.stringify(reporte, null, 2), 'utf-8')
    console.log(`\n✅ Reporte guardado en: ${reportePath}`)

    // 8. Mostrar algunas imágenes sin jugador
    if (imagenesSinJugador.length > 0) {
      console.log(`\n⚠️  Primeras 10 imágenes sin jugador asociado:`)
      imagenesSinJugador.slice(0, 10).forEach(img => {
        const jugadorId = extraerJugadorId(img.public_id)
        console.log(`   - ${img.public_id} (ID extraído: ${jugadorId || 'N/A'})`)
      })
      if (imagenesSinJugador.length > 10) {
        console.log(`   ... y ${imagenesSinJugador.length - 10} más`)
      }
    }

    // 9. Mostrar algunos jugadores sin foto
    if (jugadoresSinFoto.length > 0) {
      console.log(`\n📋 Primeros 10 jugadores sin foto:`)
      jugadoresSinFoto.slice(0, 10).forEach(jugadorId => {
        const jugador = todosJugadores.find(j => j.id === jugadorId)
        if (jugador) {
          console.log(`   - ${jugador.apellido_nombre} (Cédula: ${jugador.cedula})`)
        }
      })
      if (jugadoresSinFoto.length > 10) {
        console.log(`   ... y ${jugadoresSinFoto.length - 10} más`)
      }
    }

    return reporte
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

if (require.main === module) {
  generarReporteActualizado()
    .then(() => {
      console.log('\n✅ Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

