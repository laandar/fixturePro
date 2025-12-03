/**
 * Script para reintentar subir imágenes de jugadores que no se encontraron anteriormente
 * 
 * Este script:
 * 1. Lee el CSV de jugadores no encontrados
 * 2. Verifica si ahora existen en la base de datos
 * 3. Sube las imágenes a Cloudinary si el jugador existe
 * 4. Actualiza la base de datos con las URLs
 * 
 * Uso:
 * npx tsx src/scripts/reintentar-jugadores-no-encontrados.ts
 */

import { db } from '@/db'
import { jugadores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { readFileSync, existsSync, readFile } from 'fs'
import { join } from 'path'
import { v2 as cloudinary } from 'cloudinary'
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

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
})

// Ruta de la carpeta de imágenes
const CARPETA_IMAGENES = 'C:\\D\\imagenes_calificación\\imagenes_calificación'

interface ResultadoReintento {
  archivo: string
  cedula: string
  jugadorEncontrado: boolean
  jugadorNombre?: string
  jugadorId?: string
  exito: boolean
  urlCloudinary?: string
  error?: string
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Busca un jugador por cédula
 */
async function buscarJugadorPorCedula(cedula: string) {
  const todosJugadores = await db.select().from(jugadores)
  return todosJugadores.find(j => j.cedula === cedula || j.cedula === cedula.trim())
}

/**
 * Sube una imagen a Cloudinary
 */
async function subirImagenACloudinary(
  rutaArchivo: string,
  jugadorId: string
): Promise<string> {
  const archivoBuffer = readFileSync(rutaArchivo)
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'jugadores',
        public_id: `jugador_${jugadorId}`,
        overwrite: true,
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        resource_type: 'image'
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result!.secure_url)
      }
    ).end(archivoBuffer)
  })
}

async function reintentarJugadoresNoEncontrados() {
  try {
    console.log('🔄 Reintentando subir imágenes de jugadores no encontrados...\n')

    // Leer el CSV de jugadores no encontrados
    const csvPath = join(process.cwd(), 'jugadores-no-encontrados.csv')
    if (!existsSync(csvPath)) {
      throw new Error('No se encontró el archivo jugadores-no-encontrados.csv')
    }

    const csvContent = readFileSync(csvPath, 'utf-8')
    const lineas = csvContent.split('\n').filter(line => line.trim() && !line.startsWith('archivo'))
    
    console.log(`📋 Archivos a verificar: ${lineas.length}\n`)

    const resultados: ResultadoReintento[] = []
    let encontrados = 0
    let subidos = 0
    let aunNoEncontrados = 0
    let errores = 0

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim()
      if (!linea) continue

      // Parsear CSV: "archivo","cedula","error"
      const match = linea.match(/^"([^"]+)","([^"]+)","([^"]+)"$/)
      if (!match) continue

      const [, archivo, cedula, error] = match
      const progreso = `[${i + 1}/${lineas.length}]`

      console.log(`${progreso} 🔍 Verificando: ${archivo} (Cédula: ${cedula})`)

      // Buscar jugador
      const jugador = await buscarJugadorPorCedula(cedula)

      if (!jugador) {
        console.log(`   ⚠️  Jugador aún no encontrado\n`)
        resultados.push({
          archivo,
          cedula,
          jugadorEncontrado: false,
          exito: false,
          error: 'Jugador no encontrado en la base de datos'
        })
        aunNoEncontrados++
        continue
      }

      encontrados++
      console.log(`   ✅ Jugador encontrado: ${jugador.apellido_nombre}`)

      // Verificar que el archivo existe
      const rutaArchivo = join(CARPETA_IMAGENES, archivo)
      if (!existsSync(rutaArchivo)) {
        console.log(`   ❌ Archivo no existe: ${rutaArchivo}\n`)
        resultados.push({
          archivo,
          cedula,
          jugadorEncontrado: true,
          jugadorNombre: jugador.apellido_nombre,
          jugadorId: jugador.id,
          exito: false,
          error: 'Archivo no existe físicamente'
        })
        errores++
        continue
      }

      try {
        // Subir a Cloudinary
        const fileSizeKB = (readFileSync(rutaArchivo).length / 1024).toFixed(2)
        console.log(`   ⬆️  Subiendo (${fileSizeKB} KB)...`)

        const urlCloudinary = await subirImagenACloudinary(rutaArchivo, jugador.id)

        // Actualizar base de datos
        await db
          .update(jugadores)
          .set({ foto: urlCloudinary })
          .where(eq(jugadores.id, jugador.id))

        console.log(`   ✅ Completado: ${urlCloudinary}\n`)

        resultados.push({
          archivo,
          cedula,
          jugadorEncontrado: true,
          jugadorNombre: jugador.apellido_nombre,
          jugadorId: jugador.id,
          exito: true,
          urlCloudinary
        })
        subidos++

        // Delay entre subidas
        if (i < lineas.length - 1) {
          await delay(500)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
        console.log(`   ❌ Error: ${errorMsg}\n`)
        resultados.push({
          archivo,
          cedula,
          jugadorEncontrado: true,
          jugadorNombre: jugador.apellido_nombre,
          jugadorId: jugador.id,
          exito: false,
          error: errorMsg
        })
        errores++
      }
    }

    // Resumen
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN DE REINTENTO')
    console.log('='.repeat(60))
    console.log(`Total verificados: ${lineas.length}`)
    console.log(`✅ Jugadores encontrados: ${encontrados}`)
    console.log(`☁️  Imágenes subidas exitosamente: ${subidos}`)
    console.log(`⚠️  Aún no encontrados: ${aunNoEncontrados}`)
    console.log(`❌ Errores: ${errores}`)
    console.log('='.repeat(60))

    // Guardar reporte
    const { writeFile } = await import('fs/promises')
    const reportePath = join(process.cwd(), 'reporte-reintento.json')
    const reporte = {
      fecha: new Date().toISOString(),
      resumen: {
        total: lineas.length,
        encontrados,
        subidos,
        aunNoEncontrados,
        errores
      },
      resultados
    }

    await writeFile(reportePath, JSON.stringify(reporte, null, 2), 'utf-8')
    console.log(`\n✅ Reporte guardado en: ${reportePath}`)

    return reporte
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

if (require.main === module) {
  reintentarJugadoresNoEncontrados()
    .then(() => {
      console.log('\n✅ Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

