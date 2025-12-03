/**
 * Script para subir imágenes desde una carpeta a Cloudinary
 * 
 * Este script lee imágenes de una carpeta y las asocia con jugadores
 * basándose en el nombre del archivo.
 * 
 * Formatos de nombre de archivo soportados:
 * - Por cédula: "12345678.jpg" o "cedula_12345678.jpg"
 * - Por ID: "jugador_123.jpg"
 * - Por nombre: "Juan_Perez.jpg" o "juan_perez.jpg"
 * 
 * Uso:
 * 1. Coloca todas las imágenes en una carpeta (ej: ./imagenes-jugadores)
 * 2. Configura la ruta de la carpeta en CARPETA_IMAGENES
 * 3. Ejecuta: npx tsx src/scripts/subir-imagenes-desde-carpeta.ts
 */

import { db } from '@/db'
import { jugadores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import { v2 as cloudinary } from 'cloudinary'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// ===== CONFIGURACIÓN =====
// La carpeta se puede especificar como argumento: --carpeta "ruta/a/carpeta"
// O cambiar esta constante por defecto
const CARPETA_IMAGENES_DEFAULT = join(process.cwd(), 'imagenes-jugadores')

// Extensiones de imagen permitidas
const EXTENSIONES_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

// ===== VALIDACIÓN =====

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ ERROR: Variables de entorno de Cloudinary no configuradas')
  console.error('   Asegúrate de tener en .env.local:')
  console.error('   - CLOUDINARY_CLOUD_NAME')
  console.error('   - CLOUDINARY_API_KEY')
  console.error('   - CLOUDINARY_API_SECRET')
  process.exit(1)
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
})

// ===== FUNCIONES AUXILIARES =====

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Normaliza el nombre del archivo para buscar el jugador
 */
function normalizarNombreArchivo(nombreArchivo: string): string {
  // Remover extensión
  let nombre = basename(nombreArchivo, extname(nombreArchivo))
  
  // Remover prefijos comunes
  nombre = nombre.replace(/^(cedula_|jugador_|id_|foto_)/i, '')
  
  // Convertir a minúsculas y limpiar
  nombre = nombre.toLowerCase().trim()
  
  return nombre
}

/**
 * Busca un jugador por diferentes criterios
 */
async function buscarJugador(identificador: string): Promise<typeof jugadores.$inferSelect | null> {
  const normalizado = normalizarNombreArchivo(identificador)
  
  // Obtener todos los jugadores una vez
  const todosJugadores = await db.select().from(jugadores)
  
  // Intentar por cédula (más común) - búsqueda exacta
  const porCedula = todosJugadores.find(j => 
    j.cedula.toLowerCase() === normalizado || 
    j.cedula === normalizado
  )
  if (porCedula) return porCedula
  
  // Intentar por ID - búsqueda exacta
  const porId = todosJugadores.find(j => 
    j.id.toLowerCase() === normalizado || 
    j.id === normalizado
  )
  if (porId) return porId
  
  // Intentar por nombre (búsqueda parcial)
  const porNombre = todosJugadores.find(j => {
    if (!j.apellido_nombre) return false
    const nombreNormalizado = j.apellido_nombre.toLowerCase().replace(/\s+/g, '_')
    return nombreNormalizado === normalizado || 
           nombreNormalizado.includes(normalizado) ||
           normalizado.includes(nombreNormalizado)
  })
  if (porNombre) return porNombre
  
  return null
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

// ===== FUNCIÓN PRINCIPAL =====

interface ResultadoSubida {
  archivo: string
  jugadorEncontrado: boolean
  jugadorNombre?: string
  jugadorId?: string
  exito: boolean
  urlCloudinary?: string
  error?: string
}

export async function subirImagenesDesdeCarpeta(
  carpetaImagenes: string = CARPETA_IMAGENES_DEFAULT,
  dryRun: boolean = true
) {
  try {
    console.log(`🔄 ${dryRun ? '[MODO PRUEBA] ' : '[SUBIDA REAL] '}Subiendo imágenes desde carpeta...\n`)
    console.log(`📁 Carpeta: ${carpetaImagenes}\n`)

    // Verificar que la carpeta existe
    if (!statSync(carpetaImagenes).isDirectory()) {
      throw new Error(`La carpeta no existe: ${carpetaImagenes}`)
    }

    // Verificar conexión con Cloudinary
    if (!dryRun) {
      try {
        await cloudinary.api.ping()
        console.log('✅ Conexión con Cloudinary verificada\n')
      } catch (error) {
        console.error('❌ Error al conectar con Cloudinary:', error)
        throw new Error('No se pudo conectar con Cloudinary. Verifica tus credenciales.')
      }
    }

    // Leer archivos de la carpeta
    console.log('📂 Leyendo archivos de la carpeta...')
    const archivos = readdirSync(carpetaImagenes)
      .filter(archivo => {
        const ext = extname(archivo).toLowerCase()
        return EXTENSIONES_PERMITIDAS.includes(ext)
      })
      .map(archivo => join(carpetaImagenes, archivo))

    console.log(`   Encontrados ${archivos.length} archivos de imagen\n`)

    if (archivos.length === 0) {
      console.log('⚠️  No se encontraron imágenes en la carpeta.')
      return
    }

    const resultados: ResultadoSubida[] = []
    let exitosos = 0
    let fallidos = 0
    let noEncontrados = 0

    if (!dryRun) {
      console.log('⚠️  ADVERTENCIA: Este proceso modificará la base de datos.')
      console.log('   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n')
      await delay(5000)
    }

    console.log('🚀 Iniciando proceso...\n')

    // Procesar cada archivo
    for (let i = 0; i < archivos.length; i++) {
      const rutaArchivo = archivos[i]
      const nombreArchivo = basename(rutaArchivo)
      const progreso = `[${i + 1}/${archivos.length}]`

      console.log(`${progreso} 📸 Procesando: ${nombreArchivo}`)

      try {
        // Buscar jugador asociado
        const jugador = await buscarJugador(nombreArchivo)

        if (!jugador) {
          console.log(`   ⚠️  No se encontró jugador para: ${nombreArchivo}`)
          console.log(`   💡 Sugerencia: El archivo debe nombrarse con la cédula, ID o nombre del jugador\n`)
          resultados.push({
            archivo: nombreArchivo,
            jugadorEncontrado: false,
            exito: false,
            error: 'Jugador no encontrado'
          })
          noEncontrados++
          continue
        }

        console.log(`   👤 Jugador encontrado: ${jugador.apellido_nombre} (Cédula: ${jugador.cedula})`)

        if (dryRun) {
          console.log(`   ☁️  [SIMULACIÓN] Se subiría a: jugadores/jugador_${jugador.id}`)
          console.log(`   📝 [SIMULACIÓN] Se actualizaría la foto del jugador\n`)
          resultados.push({
            archivo: nombreArchivo,
            jugadorEncontrado: true,
            jugadorNombre: jugador.apellido_nombre,
            jugadorId: jugador.id,
            exito: true,
            urlCloudinary: `https://res.cloudinary.com/${cloudName}/image/upload/jugadores/jugador_${jugador.id}.jpg`
          })
          exitosos++
        } else {
          // Subir a Cloudinary
          const fileSizeKB = (statSync(rutaArchivo).size / 1024).toFixed(2)
          console.log(`   ⬆️  Subiendo (${fileSizeKB} KB)...`)

          const urlCloudinary = await subirImagenACloudinary(rutaArchivo, jugador.id)

          // Actualizar en la base de datos
          await db
            .update(jugadores)
            .set({ foto: urlCloudinary })
            .where(eq(jugadores.id, jugador.id))

          console.log(`   ✅ Completado: ${urlCloudinary}\n`)

          resultados.push({
            archivo: nombreArchivo,
            jugadorEncontrado: true,
            jugadorNombre: jugador.apellido_nombre,
            jugadorId: jugador.id,
            exito: true,
            urlCloudinary
          })
          exitosos++

          // Delay entre subidas
          if (i < archivos.length - 1) {
            await delay(500)
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
        console.log(`   ❌ Error: ${errorMsg}\n`)
        resultados.push({
          archivo: nombreArchivo,
          jugadorEncontrado: false,
          exito: false,
          error: errorMsg
        })
        fallidos++
      }
    }

    // Resumen
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN')
    console.log('='.repeat(60))
    console.log(`Total de archivos: ${archivos.length}`)
    console.log(`✅ Exitosos: ${exitosos}`)
    console.log(`❌ Fallidos: ${fallidos}`)
    console.log(`⚠️  Jugadores no encontrados: ${noEncontrados}`)
    console.log('='.repeat(60))

    // Guardar reporte
    const { writeFile } = await import('fs/promises')
    const reportePath = join(process.cwd(), `reporte-subida-${dryRun ? 'prueba' : 'real'}.json`)
    const reporte = {
      fecha: new Date().toISOString(),
      carpeta: carpetaImagenes,
      dryRun,
      resumen: {
        total: archivos.length,
        exitosos,
        fallidos,
        noEncontrados
      },
      resultados
    }

    await writeFile(reportePath, JSON.stringify(reporte, null, 2), 'utf-8')
    console.log(`\n✅ Reporte guardado en: ${reportePath}`)

    return reporte
  } catch (error) {
    console.error('❌ Error en el proceso:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d')
  
  // Permitir especificar carpeta como argumento
  let carpetaImagenes = CARPETA_IMAGENES_DEFAULT
  const carpetaIndex = process.argv.findIndex(arg => arg === '--carpeta' || arg === '-c')
  if (carpetaIndex !== -1 && process.argv[carpetaIndex + 1]) {
    carpetaImagenes = resolve(process.cwd(), process.argv[carpetaIndex + 1])
  }

  subirImagenesDesdeCarpeta(carpetaImagenes, dryRun)
    .then(() => {
      console.log('\n✅ Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

