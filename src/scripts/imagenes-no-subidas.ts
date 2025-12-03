/**
 * Script para identificar imágenes que están en la carpeta local
 * pero NO fueron subidas a Cloudinary
 * 
 * Uso:
 * npx tsx src/scripts/imagenes-no-subidas.ts --carpeta "C:\D\imagenes_calificación\imagenes_calificación"
 */

import { v2 as cloudinary } from 'cloudinary'
import { db } from '@/db'
import { jugadores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { readdirSync, statSync, writeFileSync } from 'fs'
import { join, basename, extname } from 'path'

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

interface ImagenLocal {
  ruta: string
  nombre: string
  extension: string
  identificadores: {
    cedula?: string
    id?: string
    nombre?: string
  }
}

interface ImagenCloudinary {
  public_id: string
  jugador_id: string
}

/**
 * Extrae identificadores posibles del nombre del archivo
 */
function extraerIdentificadores(nombreArchivo: string): {
  cedula?: string
  id?: string
  nombre?: string
} {
  const sinExtension = nombreArchivo.replace(/\.[^/.]+$/, '')
  const identificadores: any = {}

  // Intentar extraer cédula (número de 10 dígitos o más)
  const cedulaMatch = sinExtension.match(/\d{10,}/)
  if (cedulaMatch) {
    identificadores.cedula = cedulaMatch[0]
  }

  // Intentar extraer ID numérico corto
  const idMatch = sinExtension.match(/^(\d{1,9})/)
  if (idMatch) {
    identificadores.id = idMatch[0]
  }

  // Guardar el nombre completo como referencia
  identificadores.nombre = sinExtension

  return identificadores
}

/**
 * Busca un jugador en la BD por cédula, ID o nombre
 */
async function buscarJugador(identificadores: {
  cedula?: string
  id?: string
  nombre?: string
}): Promise<any | null> {
  // Buscar por cédula
  if (identificadores.cedula) {
    const porCedula = await db
      .select()
      .from(jugadores)
      .where(eq(jugadores.cedula, identificadores.cedula))
      .limit(1)
    
    if (porCedula.length > 0) {
      return porCedula[0]
    }
  }

  // Buscar por ID
  if (identificadores.id) {
    const porId = await db
      .select()
      .from(jugadores)
      .where(eq(jugadores.id, identificadores.id))
      .limit(1)
    
    if (porId.length > 0) {
      return porId[0]
    }
  }

  return null
}

/**
 * Obtiene todas las imágenes de Cloudinary
 */
async function obtenerImagenesCloudinary(): Promise<Map<string, ImagenCloudinary>> {
  console.log('📡 Consultando imágenes en Cloudinary...')
  const imagenesMap = new Map<string, ImagenCloudinary>()
  let nextCursor: string | undefined = undefined
  let total = 0

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
      for (const resource of resultado.resources) {
        // Extraer ID del jugador del public_id
        const match = resource.public_id.match(/^jugadores\/jugador_(.+)$/)
        if (match) {
          const jugadorId = match[1]
          imagenesMap.set(jugadorId, {
            public_id: resource.public_id,
            jugador_id: jugadorId,
          })
        }
      }
      total += resultado.resources.length
      console.log(`   Procesadas ${total} imágenes...`)
    }

    nextCursor = resultado.next_cursor
  } while (nextCursor)

  console.log(`✅ Total de imágenes en Cloudinary: ${imagenesMap.size}\n`)
  return imagenesMap
}

/**
 * Lee todas las imágenes de la carpeta local
 */
function leerImagenesLocales(carpetaRuta: string): ImagenLocal[] {
  console.log(`📁 Leyendo imágenes de la carpeta: ${carpetaRuta}\n`)
  
  if (!statSync(carpetaRuta).isDirectory()) {
    throw new Error(`La ruta no es un directorio: ${carpetaRuta}`)
  }

  const archivos = readdirSync(carpetaRuta)
  const imagenes: ImagenLocal[] = []
  const extensionesImagen = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

  for (const archivo of archivos) {
    const rutaCompleta = join(carpetaRuta, archivo)
    const stats = statSync(rutaCompleta)

    if (stats.isFile()) {
      const extension = extname(archivo).toLowerCase()
      if (extensionesImagen.includes(extension)) {
        const identificadores = extraerIdentificadores(archivo)
        imagenes.push({
          ruta: rutaCompleta,
          nombre: archivo,
          extension,
          identificadores,
        })
      }
    }
  }

  console.log(`✅ Total de imágenes encontradas en carpeta: ${imagenes.length}\n`)
  return imagenes
}

/**
 * Función principal
 */
async function encontrarImagenesNoSubidas(carpetaRuta: string) {
  try {
    console.log('='.repeat(60))
    console.log('🔍 BUSCANDO IMÁGENES NO SUBIDAS A CLOUDINARY')
    console.log('='.repeat(60))
    console.log()

    // 1. Obtener imágenes de Cloudinary
    const imagenesCloudinary = await obtenerImagenesCloudinary()

    // 2. Leer imágenes locales
    const imagenesLocales = leerImagenesLocales(carpetaRuta)

    // 3. Consultar todos los jugadores de la BD
    console.log('📋 Consultando jugadores en la base de datos...')
    const todosJugadores = await db.select().from(jugadores)
    console.log(`✅ Total de jugadores en BD: ${todosJugadores.length}\n`)

    // 4. Procesar cada imagen local
    console.log('🔄 Comparando imágenes locales con Cloudinary...\n')
    const imagenesNoSubidas: any[] = []
    const imagenesSubidas: any[] = []
    const imagenesSinJugador: any[] = []

    for (let i = 0; i < imagenesLocales.length; i++) {
      const imagenLocal = imagenesLocales[i]
      const progreso = `[${i + 1}/${imagenesLocales.length}]`
      
      // Buscar jugador asociado
      const jugador = await buscarJugador(imagenLocal.identificadores)

      if (!jugador) {
        imagenesSinJugador.push({
          archivo: imagenLocal.nombre,
          ruta: imagenLocal.ruta,
          identificadores: imagenLocal.identificadores,
          razon: 'Jugador no encontrado en BD'
        })
        continue
      }

      // Verificar si está en Cloudinary
      const jugadorIdStr = jugador.id.toString()
      const estaEnCloudinary = imagenesCloudinary.has(jugadorIdStr)

      if (estaEnCloudinary) {
        imagenesSubidas.push({
          archivo: imagenLocal.nombre,
          jugador_id: jugador.id,
          cedula: jugador.cedula,
          apellido_nombre: jugador.apellido_nombre,
          public_id: imagenesCloudinary.get(jugadorIdStr)?.public_id
        })
      } else {
        imagenesNoSubidas.push({
          archivo: imagenLocal.nombre,
          ruta: imagenLocal.ruta,
          jugador_id: jugador.id,
          cedula: jugador.cedula,
          apellido_nombre: jugador.apellido_nombre,
          identificadores: imagenLocal.identificadores
        })
      }

      if ((i + 1) % 100 === 0) {
        console.log(`${progreso} Procesadas ${i + 1} imágenes...`)
      }
    }

    // 5. Generar reporte
    const reporte = {
      fecha: new Date().toISOString(),
      carpeta_origen: carpetaRuta,
      resumen: {
        total_imagenes_locales: imagenesLocales.length,
        imagenes_subidas: imagenesSubidas.length,
        imagenes_no_subidas: imagenesNoSubidas.length,
        imagenes_sin_jugador: imagenesSinJugador.length,
        porcentaje_subidas: ((imagenesSubidas.length / imagenesLocales.length) * 100).toFixed(2) + '%'
      },
      imagenes_no_subidas: imagenesNoSubidas,
      imagenes_sin_jugador: imagenesSinJugador.slice(0, 100) // Solo primeras 100
    }

    // 6. Mostrar resumen
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN')
    console.log('='.repeat(60))
    console.log(`📁 Total de imágenes en carpeta: ${imagenesLocales.length}`)
    console.log(`✅ Imágenes subidas a Cloudinary: ${imagenesSubidas.length}`)
    console.log(`❌ Imágenes NO subidas: ${imagenesNoSubidas.length}`)
    console.log(`⚠️  Imágenes sin jugador en BD: ${imagenesSinJugador.length}`)
    console.log(`📊 Porcentaje subidas: ${reporte.resumen.porcentaje_subidas}`)
    console.log('='.repeat(60))

    // 7. Guardar reporte JSON
    const reporteJsonPath = join(process.cwd(), 'imagenes-no-subidas.json')
    writeFileSync(reporteJsonPath, JSON.stringify(reporte, null, 2), 'utf-8')
    console.log(`\n✅ Reporte JSON guardado en: ${reporteJsonPath}`)

    // 8. Guardar CSV de imágenes no subidas
    if (imagenesNoSubidas.length > 0) {
      const csvHeader = 'Archivo,Cédula,Apellido y Nombre,ID Jugador,Ruta\n'
      const csvRows = imagenesNoSubidas.map(img => {
        const ruta = img.ruta.replace(/\\/g, '/')
        return `"${img.archivo}","${img.cedula}","${img.apellido_nombre}","${img.jugador_id}","${ruta}"`
      }).join('\n')
      const csvContent = csvHeader + csvRows
      
      const reporteCsvPath = join(process.cwd(), 'imagenes-no-subidas.csv')
      writeFileSync(reporteCsvPath, csvContent, 'utf-8')
      console.log(`✅ Reporte CSV guardado en: ${reporteCsvPath}`)
    }

    // 9. Mostrar primeras 10 imágenes no subidas
    if (imagenesNoSubidas.length > 0) {
      console.log(`\n❌ Primeras 10 imágenes NO subidas:`)
      imagenesNoSubidas.slice(0, 10).forEach(img => {
        console.log(`   - ${img.archivo} → ${img.apellido_nombre} (Cédula: ${img.cedula})`)
      })
      if (imagenesNoSubidas.length > 10) {
        console.log(`   ... y ${imagenesNoSubidas.length - 10} más`)
      }
    } else {
      console.log(`\n✅ ¡Todas las imágenes de la carpeta están subidas a Cloudinary!`)
    }

    return reporte
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Parsear argumentos
const args = process.argv.slice(2)
let carpetaRuta = 'C:\\D\\imagenes_calificación\\imagenes_calificación'

const carpetaIndex = args.indexOf('--carpeta')
if (carpetaIndex !== -1 && args[carpetaIndex + 1]) {
  carpetaRuta = args[carpetaIndex + 1]
}

if (require.main === module) {
  encontrarImagenesNoSubidas(carpetaRuta)
    .then(() => {
      console.log('\n✅ Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

