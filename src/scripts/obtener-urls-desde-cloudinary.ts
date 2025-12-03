/**
 * Script para obtener URLs de imágenes desde Cloudinary y actualizar la base de datos
 * 
 * Este script:
 * 1. Consulta todas las imágenes en Cloudinary (carpeta jugadores)
 * 2. Extrae el public_id de cada imagen
 * 3. Genera las URLs completas
 * 4. Actualiza la base de datos con las URLs
 * 5. O exporta las URLs a un archivo JSON/CSV
 * 
 * Uso:
 * - Actualizar BD: npx tsx src/scripts/obtener-urls-desde-cloudinary.ts
 * - Solo exportar: npx tsx src/scripts/obtener-urls-desde-cloudinary.ts --export
 */

import { db } from '@/db'
import { jugadores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { v2 as cloudinary } from 'cloudinary'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { writeFile } from 'fs/promises'
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
  width: number
  height: number
  bytes: number
  created_at: string
}

interface JugadorConURL {
  jugadorId: string
  cedula: string
  apellido_nombre: string
  urlCloudinary: string
  publicId: string
  encontrado: boolean
}

/**
 * Extrae el ID del jugador del public_id
 * Formato: jugadores/jugador_1719860916 -> 1719860916
 */
function extraerJugadorId(publicId: string): string | null {
  const match = publicId.match(/^jugadores\/jugador_(.+)$/)
  return match ? match[1] : null
}

/**
 * Obtiene todas las imágenes de Cloudinary en la carpeta jugadores
 */
async function obtenerImagenesDeCloudinary(): Promise<ImagenCloudinary[]> {
  console.log('📡 Consultando imágenes en Cloudinary...\n')
  
  const imagenes: ImagenCloudinary[] = []
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
      imagenes.push(...resultado.resources)
      console.log(`   Encontradas ${imagenes.length} imágenes...`)
    }
    
    nextCursor = resultado.next_cursor
  } while (nextCursor)
  
  console.log(`\n✅ Total de imágenes encontradas: ${imagenes.length}\n`)
  return imagenes
}

/**
 * Genera la URL completa de Cloudinary con transformaciones
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

/**
 * Actualiza la base de datos con las URLs de Cloudinary
 */
async function actualizarBaseDeDatos(
  imagenes: ImagenCloudinary[],
  soloExportar: boolean = false
): Promise<JugadorConURL[]> {
  console.log('🔄 Procesando imágenes...\n')
  
  const resultados: JugadorConURL[] = []
  let actualizados = 0
  let noEncontrados = 0
  
  for (const imagen of imagenes) {
    const jugadorId = extraerJugadorId(imagen.public_id)
    
    if (!jugadorId) {
      console.log(`⚠️  No se pudo extraer ID del jugador de: ${imagen.public_id}`)
      continue
    }
    
    // Buscar jugador en la base de datos
    const jugador = await db.query.jugadores.findFirst({
      where: (jugadores, { eq }) => eq(jugadores.id, jugadorId)
    })
    
    if (!jugador) {
      // Intentar buscar por cédula si el ID es numérico
      const jugadorPorCedula = await db.query.jugadores.findFirst({
        where: (jugadores, { eq }) => eq(jugadores.cedula, jugadorId)
      })
      
      if (jugadorPorCedula) {
        const urlCompleta = generarURLCompleta(imagen.public_id)
        
        resultados.push({
          jugadorId: jugadorPorCedula.id,
          cedula: jugadorPorCedula.cedula,
          apellido_nombre: jugadorPorCedula.apellido_nombre,
          urlCloudinary: urlCompleta,
          publicId: imagen.public_id,
          encontrado: true,
        })
        
        if (!soloExportar) {
          await db
            .update(jugadores)
            .set({ foto: urlCompleta })
            .where(eq(jugadores.id, jugadorPorCedula.id))
          actualizados++
          console.log(`✅ Actualizado: ${jugadorPorCedula.apellido_nombre} (${jugadorPorCedula.cedula})`)
        }
      } else {
        resultados.push({
          jugadorId,
          cedula: 'N/A',
          apellido_nombre: 'No encontrado',
          urlCloudinary: generarURLCompleta(imagen.public_id),
          publicId: imagen.public_id,
          encontrado: false,
        })
        noEncontrados++
        console.log(`❌ Jugador no encontrado para ID: ${jugadorId}`)
      }
    } else {
      const urlCompleta = generarURLCompleta(imagen.public_id)
      
      resultados.push({
        jugadorId: jugador.id,
        cedula: jugador.cedula,
        apellido_nombre: jugador.apellido_nombre,
        urlCloudinary: urlCompleta,
        publicId: imagen.public_id,
        encontrado: true,
      })
      
      if (!soloExportar) {
        await db
          .update(jugadores)
          .set({ foto: urlCompleta })
          .where(eq(jugadores.id, jugador.id))
        actualizados++
        console.log(`✅ Actualizado: ${jugador.apellido_nombre} (${jugador.cedula})`)
      }
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN')
  console.log('='.repeat(60))
  console.log(`Total de imágenes procesadas: ${imagenes.length}`)
  if (!soloExportar) {
    console.log(`✅ Actualizados en BD: ${actualizados}`)
  }
  console.log(`❌ Jugadores no encontrados: ${noEncontrados}`)
  console.log('='.repeat(60))
  
  return resultados
}

/**
 * Exporta las URLs a un archivo JSON
 */
async function exportarURLs(resultados: JugadorConURL[]) {
  const reporte = {
    fecha: new Date().toISOString(),
    total: resultados.length,
    encontrados: resultados.filter(r => r.encontrado).length,
    noEncontrados: resultados.filter(r => !r.encontrado).length,
    urls: resultados.map(r => ({
      jugador_id: r.jugadorId,
      cedula: r.cedula,
      apellido_nombre: r.apellido_nombre,
      url_cloudinary: r.urlCloudinary,
      public_id: r.publicId,
    })),
  }
  
  const reportePath = join(process.cwd(), 'urls-cloudinary-export.json')
  await writeFile(reportePath, JSON.stringify(reporte, null, 2), 'utf-8')
  console.log(`\n✅ URLs exportadas a: ${reportePath}`)
  
  // También exportar como CSV
  const csvPath = join(process.cwd(), 'urls-cloudinary-export.csv')
  const csvHeader = 'jugador_id,cedula,apellido_nombre,url_cloudinary,public_id\n'
  const csvRows = resultados.map(r => 
    `"${r.jugadorId}","${r.cedula}","${r.apellido_nombre}","${r.urlCloudinary}","${r.publicId}"`
  ).join('\n')
  await writeFile(csvPath, csvHeader + csvRows, 'utf-8')
  console.log(`✅ URLs exportadas a CSV: ${csvPath}`)
}

// Ejecutar
async function main() {
  try {
    const soloExportar = process.argv.includes('--export') || process.argv.includes('-e')
    
    if (soloExportar) {
      console.log('📤 Modo: Solo exportar (no actualizar BD)\n')
    } else {
      console.log('💾 Modo: Actualizar base de datos\n')
    }
    
    // Obtener imágenes de Cloudinary
    const imagenes = await obtenerImagenesDeCloudinary()
    
    if (imagenes.length === 0) {
      console.log('⚠️  No se encontraron imágenes en Cloudinary')
      return
    }
    
    // Procesar y actualizar/exportar
    const resultados = await actualizarBaseDeDatos(imagenes, soloExportar)
    
    // Exportar siempre
    await exportarURLs(resultados)
    
    console.log('\n✅ Proceso completado')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

