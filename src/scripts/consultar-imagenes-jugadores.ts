/**
 * Script para consultar y analizar las imágenes de jugadores
 * Este script permite:
 * 1. Ver todas las imágenes almacenadas en la base de datos
 * 2. Verificar qué imágenes existen físicamente
 * 3. Generar un reporte para migración a plataforma en la nube
 */

import { db } from '@/db'
import { jugadores } from '@/db/schema'
import { existsSync } from 'fs'
import { join } from 'path'
import { writeFile } from 'fs/promises'

interface JugadorImagen {
  id: string
  cedula: string
  apellido_nombre: string
  foto: string | null
  fotoExiste: boolean
  tipoFoto: 'local' | 'url' | 'null'
}

export async function consultarImagenesJugadores() {
  try {
    console.log('🔍 Consultando imágenes de jugadores...\n')

    // Obtener todos los jugadores
    const todosJugadores = await db.select().from(jugadores)

    const reporte: JugadorImagen[] = []
    let conFoto = 0
    let sinFoto = 0
    let fotosLocales = 0
    let fotosURL = 0
    let fotosExistentes = 0
    let fotosNoExistentes = 0

    for (const jugador of todosJugadores) {
      let fotoExiste = false
      let tipoFoto: 'local' | 'url' | 'null' = 'null'

      if (jugador.foto) {
        conFoto++
        
        // Determinar si es URL externa o ruta local
        if (jugador.foto.startsWith('http://') || jugador.foto.startsWith('https://')) {
          tipoFoto = 'url'
          fotosURL++
          // Para URLs externas, asumimos que existen (no podemos verificarlas fácilmente)
          fotoExiste = true
        } else if (jugador.foto.startsWith('/uploads/')) {
          tipoFoto = 'local'
          fotosLocales++
          // Verificar si el archivo existe físicamente
          const rutaCompleta = join(process.cwd(), 'public', jugador.foto)
          fotoExiste = existsSync(rutaCompleta)
          
          if (fotoExiste) {
            fotosExistentes++
          } else {
            fotosNoExistentes++
          }
        } else {
          // Otra ruta relativa
          tipoFoto = 'local'
          fotosLocales++
          const rutaCompleta = join(process.cwd(), 'public', jugador.foto)
          fotoExiste = existsSync(rutaCompleta)
          
          if (fotoExiste) {
            fotosExistentes++
          } else {
            fotosNoExistentes++
          }
        }
      } else {
        sinFoto++
      }

      reporte.push({
        id: jugador.id,
        cedula: jugador.cedula,
        apellido_nombre: jugador.apellido_nombre,
        foto: jugador.foto,
        fotoExiste,
        tipoFoto
      })
    }

    // Generar reporte en consola
    console.log('📊 RESUMEN DE IMÁGENES DE JUGADORES')
    console.log('=' .repeat(50))
    console.log(`Total de jugadores: ${todosJugadores.length}`)
    console.log(`Jugadores con foto: ${conFoto}`)
    console.log(`Jugadores sin foto: ${sinFoto}`)
    console.log(`\n📁 Tipos de fotos:`)
    console.log(`  - Fotos locales: ${fotosLocales}`)
    console.log(`  - Fotos URL externas: ${fotosURL}`)
    console.log(`\n✅ Fotos que existen físicamente: ${fotosExistentes}`)
    console.log(`❌ Fotos que NO existen físicamente: ${fotosNoExistentes}`)
    console.log('\n')

    // Generar reporte detallado en JSON
    const reporteJSON = {
      fecha: new Date().toISOString(),
      resumen: {
        totalJugadores: todosJugadores.length,
        conFoto,
        sinFoto,
        fotosLocales,
        fotosURL,
        fotosExistentes,
        fotosNoExistentes
      },
      jugadores: reporte
    }

    // Guardar reporte en archivo
    const reportePath = join(process.cwd(), 'reporte-imagenes-jugadores.json')
    await writeFile(reportePath, JSON.stringify(reporteJSON, null, 2), 'utf-8')
    console.log(`✅ Reporte guardado en: ${reportePath}`)

    // Mostrar jugadores sin foto
    if (sinFoto > 0) {
      console.log('\n📋 JUGADORES SIN FOTO:')
      console.log('-'.repeat(50))
      reporte
        .filter(j => j.tipoFoto === 'null')
        .slice(0, 10) // Mostrar solo los primeros 10
        .forEach(j => {
          console.log(`  - ${j.apellido_nombre} (Cédula: ${j.cedula})`)
        })
      if (sinFoto > 10) {
        console.log(`  ... y ${sinFoto - 10} más`)
      }
    }

    // Mostrar fotos que no existen físicamente
    if (fotosNoExistentes > 0) {
      console.log('\n⚠️  FOTOS QUE NO EXISTEN FÍSICAMENTE:')
      console.log('-'.repeat(50))
      reporte
        .filter(j => j.tipoFoto === 'local' && !j.fotoExiste)
        .slice(0, 10) // Mostrar solo los primeros 10
        .forEach(j => {
          console.log(`  - ${j.apellido_nombre} (Cédula: ${j.cedula})`)
          console.log(`    Ruta: ${j.foto}`)
        })
      if (fotosNoExistentes > 10) {
        console.log(`  ... y ${fotosNoExistentes - 10} más`)
      }
    }

    return reporteJSON
  } catch (error) {
    console.error('❌ Error al consultar imágenes:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  consultarImagenesJugadores()
    .then(() => {
      console.log('\n✅ Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

