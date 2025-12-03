/**
 * Script de migración de imágenes de jugadores a Cloudinary
 * 
 * Este script migra todas las imágenes locales de jugadores a Cloudinary.
 * 
 * Uso:
 * 1. Asegúrate de tener las variables de entorno configuradas en .env.local
 * 2. Ejecutar en modo prueba: npx tsx src/scripts/ejemplo-migracion-cloudinary.ts --dry-run
 * 3. Ejecutar migración real: npx tsx src/scripts/ejemplo-migracion-cloudinary.ts
 */

import { db } from '@/db'
import { jugadores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { v2 as cloudinary } from 'cloudinary'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// Validar configuración de Cloudinary
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

// Configurar Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
})

interface MigracionResultado {
  jugadorId: string
  cedula: string
  apellido_nombre: string
  fotoAnterior: string | null
  fotoNueva: string | null
  exito: boolean
  error?: string
}

// Función para hacer delay entre subidas (evitar rate limits)
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function migrarImagenesACloudinary(dryRun: boolean = true) {
  try {
    console.log(`🔄 ${dryRun ? '[MODO PRUEBA] ' : '[MIGRACIÓN REAL] '}Iniciando migración a Cloudinary...\n`)
    console.log(`📋 Cloud Name: ${cloudName}\n`)

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

    // Obtener todos los jugadores
    console.log('📊 Consultando jugadores en la base de datos...')
    const todosJugadores = await db.select().from(jugadores)
    console.log(`   Total de jugadores encontrados: ${todosJugadores.length}\n`)
    
    const resultados: MigracionResultado[] = []
    let exitosos = 0
    let fallidos = 0
    let omitidos = 0
    let yaEnCloudinary = 0

    // Filtrar jugadores que necesitan migración
    const jugadoresAMigrar = todosJugadores.filter(jugador => {
      if (!jugador.foto) return false
      // Saltar si ya está en Cloudinary
      if (jugador.foto.includes('cloudinary.com')) {
        yaEnCloudinary++
        return false
      }
      // Solo procesar rutas locales
      return !jugador.foto.startsWith('http://') && !jugador.foto.startsWith('https://')
    })

    console.log(`📸 Jugadores a migrar: ${jugadoresAMigrar.length}`)
    console.log(`⏭️  Ya en Cloudinary: ${yaEnCloudinary}`)
    console.log(`📝 Sin foto: ${todosJugadores.length - jugadoresAMigrar.length - yaEnCloudinary}\n`)

    if (jugadoresAMigrar.length === 0) {
      console.log('✅ No hay imágenes para migrar. Todas las imágenes ya están en Cloudinary o no tienen foto.\n')
      return {
        fecha: new Date().toISOString(),
        dryRun,
        resumen: {
          total: 0,
          exitosos: 0,
          fallidos: 0,
          omitidos: 0,
          yaEnCloudinary
        },
        resultados: []
      }
    }

    if (!dryRun) {
      console.log('⚠️  ADVERTENCIA: Este proceso modificará la base de datos.')
      console.log('   Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n')
      await delay(5000)
    }

    console.log('🚀 Iniciando migración...\n')

    for (let i = 0; i < jugadoresAMigrar.length; i++) {
      const jugador = jugadoresAMigrar[i]
      const progreso = `[${i + 1}/${jugadoresAMigrar.length}]`
      
      // Verificar que el jugador tiene foto
      if (!jugador.foto) {
        console.log(`${progreso} ⚠️  ${jugador.apellido_nombre}: Sin foto asignada`)
        resultados.push({
          jugadorId: jugador.id,
          cedula: jugador.cedula,
          apellido_nombre: jugador.apellido_nombre,
          fotoAnterior: null,
          fotoNueva: null,
          exito: false,
          error: 'Jugador no tiene foto asignada'
        })
        fallidos++
        continue
      }
      
      // Verificar que el archivo existe
      const rutaCompleta = join(process.cwd(), 'public', jugador.foto)
      if (!existsSync(rutaCompleta)) {
        console.log(`${progreso} ❌ ${jugador.apellido_nombre}: Archivo no encontrado`)
        resultados.push({
          jugadorId: jugador.id,
          cedula: jugador.cedula,
          apellido_nombre: jugador.apellido_nombre,
          fotoAnterior: jugador.foto,
          fotoNueva: null,
          exito: false,
          error: 'Archivo no existe físicamente'
        })
        fallidos++
        continue
      }

      try {
        if (dryRun) {
          // En modo dry run, solo simular
          console.log(`${progreso} [SIMULACIÓN] ${jugador.apellido_nombre}`)
          console.log(`   📁 Archivo: ${jugador.foto}`)
          console.log(`   ☁️  URL simulada: https://res.cloudinary.com/${cloudName}/image/upload/jugadores/jugador_${jugador.id}.jpg\n`)
          resultados.push({
            jugadorId: jugador.id,
            cedula: jugador.cedula,
            apellido_nombre: jugador.apellido_nombre,
            fotoAnterior: jugador.foto,
            fotoNueva: `https://res.cloudinary.com/${cloudName}/image/upload/jugadores/jugador_${jugador.id}.jpg`,
            exito: true
          })
          exitosos++
        } else {
          // Leer el archivo
          const archivoBuffer = readFileSync(rutaCompleta)
          const fileSizeKB = (archivoBuffer.length / 1024).toFixed(2)

          console.log(`${progreso} ⬆️  Subiendo: ${jugador.apellido_nombre} (${fileSizeKB} KB)...`)

          // Subir a Cloudinary
          const resultado = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                folder: 'jugadores',
                public_id: `jugador_${jugador.id}`,
                overwrite: true, // Sobrescribir si ya existe
                transformation: [
                  { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                  { quality: 'auto', fetch_format: 'auto' }
                ],
                resource_type: 'image'
              },
              (error, result) => {
                if (error) reject(error)
                else resolve(result)
              }
            ).end(archivoBuffer)
          })

          // Actualizar en la base de datos
          await db
            .update(jugadores)
            .set({ foto: resultado.secure_url })
            .where(eq(jugadores.id, jugador.id))

          resultados.push({
            jugadorId: jugador.id,
            cedula: jugador.cedula,
            apellido_nombre: jugador.apellido_nombre,
            fotoAnterior: jugador.foto,
            fotoNueva: resultado.secure_url,
            exito: true
          })

          exitosos++
          console.log(`   ✅ Completado: ${resultado.secure_url}\n`)

          // Delay entre subidas para evitar rate limits (solo si no es el último)
          if (i < jugadoresAMigrar.length - 1) {
            await delay(500) // 500ms entre subidas
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
        console.log(`   ❌ Error: ${errorMsg}\n`)
        resultados.push({
          jugadorId: jugador.id,
          cedula: jugador.cedula,
          apellido_nombre: jugador.apellido_nombre,
          fotoAnterior: jugador.foto,
          fotoNueva: null,
          exito: false,
          error: errorMsg
        })
        fallidos++
      }
    }

    // Resumen
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN DE MIGRACIÓN')
    console.log('='.repeat(60))
    console.log(`Total de jugadores: ${todosJugadores.length}`)
    console.log(`📸 Procesados para migración: ${jugadoresAMigrar.length}`)
    console.log(`✅ Exitosos: ${exitosos}`)
    console.log(`❌ Fallidos: ${fallidos}`)
    console.log(`⏭️  Ya en Cloudinary: ${yaEnCloudinary}`)
    console.log(`📝 Sin foto: ${todosJugadores.length - jugadoresAMigrar.length - yaEnCloudinary}`)
    console.log('='.repeat(60))

    // Guardar reporte
    const reportePath = join(process.cwd(), `reporte-migracion-${dryRun ? 'dry-run' : 'real'}.json`)
    const reporte = {
      fecha: new Date().toISOString(),
      dryRun,
      resumen: {
        totalJugadores: todosJugadores.length,
        procesados: jugadoresAMigrar.length,
        exitosos,
        fallidos,
        yaEnCloudinary,
        sinFoto: todosJugadores.length - jugadoresAMigrar.length - yaEnCloudinary
      },
      resultados
    }

    const fs = await import('fs/promises')
    await fs.writeFile(reportePath, JSON.stringify(reporte, null, 2), 'utf-8')
    console.log(`\n✅ Reporte guardado en: ${reportePath}`)

    return reporte
  } catch (error) {
    console.error('❌ Error en la migración:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d')
  
  if (!dryRun) {
    console.log('⚠️  ADVERTENCIA: Este script modificará la base de datos.')
    console.log('   Ejecuta con --dry-run primero para ver qué haría.\n')
  }

  migrarImagenesACloudinary(dryRun)
    .then(() => {
      console.log('\n✅ Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

