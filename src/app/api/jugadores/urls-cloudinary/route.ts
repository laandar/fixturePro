import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configurar Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

interface ImagenCloudinary {
  public_id: string
  secure_url: string
  format: string
  created_at: string
}

interface JugadorURL {
  jugador_id: string
  cedula: string
  apellido_nombre: string
  url_cloudinary: string
  public_id: string
  encontrado: boolean
}

/**
 * Extrae el ID del jugador del public_id
 */
function extraerJugadorId(publicId: string): string | null {
  const match = publicId.match(/^jugadores\/jugador_(.+)$/)
  return match ? match[1] : null
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

// GET: Obtener URLs de Cloudinary
export async function GET() {
  try {
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary no está configurado' },
        { status: 500 }
      )
    }

    // Consultar imágenes de Cloudinary usando Admin API
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
      }

      nextCursor = resultado.next_cursor
    } while (nextCursor)

    // Importar la base de datos dinámicamente
    const { db } = await import('@/db')
    const { jugadores } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    // Procesar imágenes y buscar jugadores
    const resultados: JugadorURL[] = []

    for (const imagen of imagenes) {
      const jugadorId = extraerJugadorId(imagen.public_id)

      if (!jugadorId) {
        resultados.push({
          jugador_id: 'N/A',
          cedula: 'N/A',
          apellido_nombre: 'No se pudo extraer ID',
          url_cloudinary: generarURLCompleta(imagen.public_id),
          public_id: imagen.public_id,
          encontrado: false,
        })
        continue
      }

      // Buscar jugador en la base de datos
      const jugador = await db.query.jugadores.findFirst({
        where: (jugadores, { eq }) => eq(jugadores.id, jugadorId),
      })

      if (!jugador) {
        // Intentar buscar por cédula
        const jugadorPorCedula = await db.query.jugadores.findFirst({
          where: (jugadores, { eq }) => eq(jugadores.cedula, jugadorId),
        })

        if (jugadorPorCedula) {
          resultados.push({
            jugador_id: jugadorPorCedula.id,
            cedula: jugadorPorCedula.cedula,
            apellido_nombre: jugadorPorCedula.apellido_nombre,
            url_cloudinary: generarURLCompleta(imagen.public_id),
            public_id: imagen.public_id,
            encontrado: true,
          })
        } else {
          resultados.push({
            jugador_id: jugadorId,
            cedula: 'N/A',
            apellido_nombre: 'Jugador no encontrado',
            url_cloudinary: generarURLCompleta(imagen.public_id),
            public_id: imagen.public_id,
            encontrado: false,
          })
        }
      } else {
        resultados.push({
          jugador_id: jugador.id,
          cedula: jugador.cedula,
          apellido_nombre: jugador.apellido_nombre,
          url_cloudinary: generarURLCompleta(imagen.public_id),
          public_id: imagen.public_id,
          encontrado: true,
        })
      }
    }

    return NextResponse.json({
      success: true,
      total: resultados.length,
      urls: resultados,
    })
  } catch (error) {
    console.error('Error al obtener URLs de Cloudinary:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener URLs de Cloudinary',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

// POST: Actualizar base de datos con URLs de Cloudinary
export async function POST() {
  try {
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary no está configurado' },
        { status: 500 }
      )
    }

    // Consultar imágenes de Cloudinary
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
      }

      nextCursor = resultado.next_cursor
    } while (nextCursor)

    // Importar la base de datos
    const { db } = await import('@/db')
    const { jugadores } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    let actualizados = 0
    let noEncontrados = 0
    const resultados: any[] = []

    // Actualizar base de datos
    for (const imagen of imagenes) {
      const jugadorId = extraerJugadorId(imagen.public_id)

      if (!jugadorId) {
        noEncontrados++
        continue
      }

      const urlCompleta = generarURLCompleta(imagen.public_id)

      // Buscar jugador
      const jugador = await db.query.jugadores.findFirst({
        where: (jugadores, { eq }) => eq(jugadores.id, jugadorId),
      })

      if (!jugador) {
        // Intentar por cédula
        const jugadorPorCedula = await db.query.jugadores.findFirst({
          where: (jugadores, { eq }) => eq(jugadores.cedula, jugadorId),
        })

        if (jugadorPorCedula) {
          await db
            .update(jugadores)
            .set({ foto: urlCompleta })
            .where(eq(jugadores.id, jugadorPorCedula.id))
          
          actualizados++
          resultados.push({
            jugador_id: jugadorPorCedula.id,
            cedula: jugadorPorCedula.cedula,
            apellido_nombre: jugadorPorCedula.apellido_nombre,
            url: urlCompleta,
            exito: true,
          })
        } else {
          noEncontrados++
        }
      } else {
        await db
          .update(jugadores)
          .set({ foto: urlCompleta })
          .where(eq(jugadores.id, jugador.id))
        
        actualizados++
        resultados.push({
          jugador_id: jugador.id,
          cedula: jugador.cedula,
          apellido_nombre: jugador.apellido_nombre,
          url: urlCompleta,
          exito: true,
        })
      }
    }

    return NextResponse.json({
      success: true,
      total: imagenes.length,
      actualizados,
      noEncontrados,
      resultados,
    })
  } catch (error) {
    console.error('Error al actualizar base de datos:', error)
    return NextResponse.json(
      {
        error: 'Error al actualizar base de datos',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
