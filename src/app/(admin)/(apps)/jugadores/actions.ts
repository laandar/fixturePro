'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { jugadorQueries, equipoQueries, categoriaQueries, equipoCategoriaQueries, jugadorEquipoCategoriaQueries } from '@/db/queries'
import type { NewJugador, NewHistorialJugador } from '@/db/types'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { db } from '@/db'
import { verificarRangoEdad, obtenerMensajeErrorEdad } from '@/lib/age-helpers'
import { historialJugadores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requirePermiso } from '@/lib/auth-helpers'
import { uploadFileToCloudinary, isCloudinaryUrl, extractPublicIdFromUrl, deleteImageFromCloudinary } from '@/lib/cloudinary'

// ===== FUNCIONES AUXILIARES =====

/**
 * Guarda una imagen usando Cloudinary (preferido) o almacenamiento local (fallback)
 * @param file Archivo de imagen
 * @param jugadorId ID del jugador
 * @returns URL de la imagen (Cloudinary o ruta local)
 */
async function saveImage(file: File, jugadorId: number): Promise<string> {
  try {
    // SIEMPRE intentar usar Cloudinary primero
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary no está configurado. Verifica que .env.local tenga:\n' +
        'CLOUDINARY_CLOUD_NAME=dj2qhm6ru\n' +
        'CLOUDINARY_API_KEY=647218391852358\n' +
        'CLOUDINARY_API_SECRET=Cq6tRH_Dy8je_QaMybQbydsBN-M'
      )
    }
    
    // Subir a Cloudinary
    // Asegurar que jugadorId sea string para el public_id
    const jugadorIdStr = typeof jugadorId === 'number' ? jugadorId.toString() : jugadorId
    const publicId = `jugador_${jugadorIdStr}`
    console.log(`📤 Subiendo imagen a Cloudinary para jugador ${jugadorIdStr}...`)
    console.log(`   Public ID: ${publicId}`)
    const cloudinaryUrl = await uploadFileToCloudinary(file, publicId, 'jugadores')
    console.log(`✅ Imagen subida a Cloudinary: ${cloudinaryUrl}`)
    console.log(`   Verifica que la URL sea accesible antes de continuar`)
    return cloudinaryUrl

    // Fallback: Almacenamiento local
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'jugadores')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const timestamp = Date.now()
    const fileName = `jugador_${jugadorId}_${timestamp}.jpg`
    const filePath = join(uploadDir, fileName)
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    return `/uploads/jugadores/${fileName}`
  } catch (error) {
    console.error('Error al guardar imagen:', error)
    throw new Error('Error al guardar la imagen')
  }
}

/**
 * Elimina una imagen (Cloudinary o local)
 * @param imageUrl URL de la imagen a eliminar
 */
async function deleteImage(imageUrl: string): Promise<void> {
  try {
    if (isCloudinaryUrl(imageUrl)) {
      // Eliminar de Cloudinary
      const publicId = extractPublicIdFromUrl(imageUrl)
      if (publicId) {
        await deleteImageFromCloudinary(publicId, 'jugadores')
        console.log(`✅ Imagen eliminada de Cloudinary: ${publicId}`)
      }
    } else if (imageUrl.startsWith('/uploads/')) {
      // Eliminar archivo local
      const { unlink } = await import('fs/promises')
      const filePath = join(process.cwd(), 'public', imageUrl)
      if (existsSync(filePath)) {
        await unlink(filePath)
        console.log(`✅ Imagen local eliminada: ${imageUrl}`)
      }
    }
  } catch (error) {
    console.error('Error al eliminar imagen:', error)
    // No lanzar error para no interrumpir el flujo principal
  }
}

// ===== JUGADORES =====

export async function getJugadores() {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    return await jugadorQueries.getAllWithRelations()
  } catch (error) {
    console.error('Error al obtener jugadores:', error)
    throw new Error('Error al obtener jugadores')
  }
}

export async function getJugadoresCount() {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    return await jugadorQueries.getCount()
  } catch (error) {
    console.error('Error al obtener contador de jugadores:', error)
    throw new Error('Error al obtener contador de jugadores')
  }
}

export async function getJugadoresActivos() {
  // Obtener solo jugadores activos para gestión de encuentros
  try {
    return await jugadorQueries.getActiveWithRelations()
  } catch (error) {
    console.error('Error al obtener jugadores activos:', error)
    throw new Error('Error al obtener jugadores activos')
  }
}

export async function getJugadoresActivosByEquipos(equipoIds: number[], categoriaId?: number) {
  // Obtener solo jugadores activos de equipos específicos (optimizado para gestión de encuentros)
  try {
    if (equipoIds.length === 0) {
      return []
    }
    return await jugadorQueries.getActiveByEquiposIds(equipoIds, categoriaId)
  } catch (error) {
    console.error('Error al obtener jugadores activos por equipos:', error)
    throw new Error('Error al obtener jugadores activos por equipos')
  }
}

export async function getEquiposCategorias() {
  // Obtener todas las combinaciones equipo-categoría disponibles
  try {
    const equiposCategorias = await db.query.equipoCategoria.findMany({
      with: {
        equipo: true,
        categoria: true
      }
    })
    return equiposCategorias
  } catch (error) {
    console.error('Error al obtener equipos-categorías:', error)
    throw new Error('Error al obtener equipos-categorías')
  }
}

export async function getJugadorById(id: number | string) {
  try {
    const jugadorId = typeof id === 'string' ? parseInt(id) : id
    return await jugadorQueries.getByIdWithRelations(jugadorId)
  } catch (error) {
    console.error('Error al obtener jugador:', error)
    throw new Error('Error al obtener jugador')
  }
}

export async function getJugadoresByIds(ids: string[]) {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    if (ids.length === 0) {
      return []
    }
    return await jugadorQueries.getByIdsWithRelations(ids)
  } catch (error) {
    console.error('Error al obtener jugadores por IDs:', error)
    throw new Error('Error al obtener jugadores por IDs')
  }
}

export async function createJugador(formData: FormData) {
  await requirePermiso('jugadores', 'crear')
  try {
    const cedula = formData.get('cedula') as string
    const apellido_nombre = formData.get('apellido_nombre') as string
    const nacionalidad = formData.get('nacionalidad') as string
    const liga = formData.get('liga') as string
    const equipo_categoria_id = parseInt(formData.get('equipo_categoria_id') as string)
    const estado = formData.get('estado') === 'true'
    const fecha_nacimiento = formData.get('fecha_nacimiento') as string
    const foto = formData.get('foto') as File | null
    
    // Nuevos campos
    const sexo = formData.get('sexo') as string
    const numero_jugador = formData.get('numero_jugador') as string
    const telefono = formData.get('telefono') as string
    const provincia = formData.get('provincia') as string
    const direccion = formData.get('direccion') as string
    const observacion = formData.get('observacion') as string
    const foraneo = formData.get('foraneo') === 'true'

    if (!cedula || !apellido_nombre || !nacionalidad || !liga || !equipo_categoria_id) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    // Verificar si la cédula ya existe
    const jugadorExistente = await jugadorQueries.getByCedula(cedula)
    if (jugadorExistente) {
      throw new Error('Ya existe un jugador con esta cédula')
    }

    // Validar rango de edad si se proporciona fecha de nacimiento y la categoría tiene rango definido
    if (fecha_nacimiento) {
      // Obtener la categoría desde la relación equipo-categoría
      const equipoCategoria = await db.query.equipoCategoria.findFirst({
        where: (equipoCategoria, { eq }) => eq(equipoCategoria.id, equipo_categoria_id),
        with: {
          categoria: true
        }
      })
      const categoria = equipoCategoria?.categoria
      if (categoria && categoria.edad_minima_anos !== null && categoria.edad_maxima_anos !== null) {
        const rango = {
          edadMinimaAnos: categoria.edad_minima_anos,
          edadMinimaMeses: categoria.edad_minima_meses || 0,
          edadMaximaAnos: categoria.edad_maxima_anos,
          edadMaximaMeses: categoria.edad_maxima_meses || 0
        }
        
        const fechaNacimiento = new Date(fecha_nacimiento)
        if (!verificarRangoEdad(fechaNacimiento, rango)) {
          throw new Error(obtenerMensajeErrorEdad(fechaNacimiento, rango, apellido_nombre))
        }
      }
    }

    // Función helper para limpiar strings
    const cleanString = (value: string | null | undefined): string | null => {
      if (!value || value.trim() === '' || value === 'NULL') return null;
      return value.trim();
    };

    // Convertir fecha_nacimiento a string en formato YYYY-MM-DD para PostgreSQL
    const formatFechaNacimiento = (fecha: string | null): string | null => {
      if (!fecha) return null;
      try {
        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) return null;
        // Convertir a formato YYYY-MM-DD
        const year = fechaObj.getFullYear();
        const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const day = String(fechaObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return null;
      }
    };

    // Generar ID único para el jugador
    const generateJugadorId = (): string => {
      // Usar crypto de Node.js para generar UUID
      const { randomUUID } = require('crypto');
      return randomUUID();
    };

    const jugadorData = {
      id: generateJugadorId(),
      cedula,
      apellido_nombre,
      nacionalidad,
      liga,
      estado,
      fecha_nacimiento: formatFechaNacimiento(fecha_nacimiento),
      sexo: cleanString(sexo) as 'masculino' | 'femenino' | 'otro' | null,
      numero_jugador: numero_jugador ? parseInt(numero_jugador) : null,
      telefono: cleanString(telefono),
      provincia: cleanString(provincia),
      direccion: cleanString(direccion),
      observacion: cleanString(observacion),
      foraneo: foraneo || false,
    }

    // Crear el jugador con equipos-categorías usando la nueva función
    const nuevoJugador = await jugadorEquipoCategoriaQueries.crearJugadorConEquiposCategorias(jugadorData as any, [equipo_categoria_id])
    
    // Si hay una foto, guardarla y actualizar el jugador
    if (foto && foto.size > 0) {
      try {
        const fotoPath = await saveImage(foto, parseInt(nuevoJugador.id))
        await jugadorQueries.update(parseInt(nuevoJugador.id), { foto: fotoPath })
      } catch (error) {
        console.error('Error al guardar la foto:', error)
        // No lanzar error aquí para no impedir la creación del jugador
      }
    }

    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al crear jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear jugador')
  }
}

export async function updateJugador(id: number | string, formData: FormData) {
  await requirePermiso('jugadores', 'editar')
  try {
    const cedula = formData.get('cedula') as string
    const apellido_nombre = formData.get('apellido_nombre') as string
    const nacionalidad = formData.get('nacionalidad') as string
    const liga = formData.get('liga') as string
    const equipo_categoria_id = parseInt(formData.get('equipo_categoria_id') as string)
    const estado = formData.get('estado') === 'true'
    const fecha_nacimiento = formData.get('fecha_nacimiento') as string
    const foto = formData.get('foto') as File | null
    
    // Nuevos campos
    const sexo = formData.get('sexo') as string
    const numero_jugador = formData.get('numero_jugador') as string
    const telefono = formData.get('telefono') as string
    const provincia = formData.get('provincia') as string
    const direccion = formData.get('direccion') as string
    const observacion = formData.get('observacion') as string
    const foraneo = formData.get('foraneo') === 'true'

    if (!cedula || !apellido_nombre || !nacionalidad || !liga || !equipo_categoria_id) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    // Verificar si la cédula ya existe en otro jugador
    const jugadorExistente = await jugadorQueries.getByCedula(cedula)
    if (jugadorExistente && jugadorExistente.id !== id) {
      throw new Error('Ya existe otro jugador con esta cédula')
    }

    // Validar rango de edad si se proporciona fecha de nacimiento y la categoría tiene rango definido
    if (fecha_nacimiento) {
      // Obtener la categoría desde la relación equipo-categoría
      const equipoCategoria = await db.query.equipoCategoria.findFirst({
        where: (equipoCategoria, { eq }) => eq(equipoCategoria.id, equipo_categoria_id),
        with: {
          categoria: true
        }
      })
      const categoria = equipoCategoria?.categoria
      if (categoria && categoria.edad_minima_anos !== null && categoria.edad_maxima_anos !== null) {
        const rango = {
          edadMinimaAnos: categoria.edad_minima_anos,
          edadMinimaMeses: categoria.edad_minima_meses || 0,
          edadMaximaAnos: categoria.edad_maxima_anos,
          edadMaximaMeses: categoria.edad_maxima_meses || 0
        }
        
        const fechaNacimiento = new Date(fecha_nacimiento)
        if (!verificarRangoEdad(fechaNacimiento, rango)) {
          throw new Error(obtenerMensajeErrorEdad(fechaNacimiento, rango, apellido_nombre))
        }
      }
    }

    // Función helper para limpiar strings
    const cleanString = (value: string | null | undefined): string | null => {
      if (!value || value.trim() === '' || value === 'NULL') return null;
      return value.trim();
    };

    // Convertir fecha_nacimiento a string en formato YYYY-MM-DD para PostgreSQL
    const formatFechaNacimiento = (fecha: string | null): string | null => {
      if (!fecha) return null;
      try {
        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) return null;
        // Convertir a formato YYYY-MM-DD
        const year = fechaObj.getFullYear();
        const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const day = String(fechaObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return null;
      }
    };

    // Obtener el jugador actual para eliminar su foto anterior si existe
    const jugadorActual = await jugadorQueries.getById(typeof id === 'string' ? parseInt(id) : id)
    const fotoAnterior = jugadorActual?.foto

    const jugadorData = {
      cedula,
      apellido_nombre,
      nacionalidad,
      liga,
      estado,
      fecha_nacimiento: formatFechaNacimiento(fecha_nacimiento),
      sexo: cleanString(sexo) as 'masculino' | 'femenino' | 'otro' | null,
      numero_jugador: numero_jugador ? parseInt(numero_jugador) : null,
      telefono: cleanString(telefono),
      provincia: cleanString(provincia),
      direccion: cleanString(direccion),
      observacion: cleanString(observacion),
      foraneo: foraneo || false,
      foto: null as any, // Se actualizará después si hay una nueva foto
    }

    // Si hay una nueva foto, guardarla y eliminar la anterior
    if (foto && foto.size > 0) {
      try {
        const jugadorIdNum = typeof id === 'string' ? parseInt(id) : id
        const fotoPath = await saveImage(foto, jugadorIdNum)
        jugadorData.foto = fotoPath as any
        
        // Eliminar la foto anterior solo si es diferente
        // IMPORTANTE: Si ambas son de Cloudinary con el mismo public_id, NO eliminar
        // porque Cloudinary ya la reemplazó con overwrite: true
        if (fotoAnterior && fotoAnterior !== fotoPath) {
          // Si ambas son de Cloudinary, verificar el public_id
          if (isCloudinaryUrl(fotoAnterior) && isCloudinaryUrl(fotoPath)) {
            const publicIdAnterior = extractPublicIdFromUrl(fotoAnterior)
            const publicIdNuevo = extractPublicIdFromUrl(fotoPath)
            // NO eliminar si tienen el mismo public_id (Cloudinary ya la reemplazó)
            if (publicIdAnterior && publicIdNuevo && publicIdAnterior === publicIdNuevo) {
              console.log(`ℹ️  No se elimina la imagen anterior (mismo public_id, Cloudinary la reemplazó): ${publicIdAnterior}`)
            } else if (publicIdAnterior && publicIdNuevo && publicIdAnterior !== publicIdNuevo) {
              // Solo eliminar si el public_id es diferente
              console.log(`🗑️  Eliminando imagen anterior con public_id diferente: ${publicIdAnterior} (nueva: ${publicIdNuevo})`)
              await deleteImage(fotoAnterior)
            }
          } else {
            // Si la anterior es local y la nueva es Cloudinary, eliminar la local
            if (!isCloudinaryUrl(fotoAnterior) && isCloudinaryUrl(fotoPath)) {
              console.log(`🗑️  Eliminando imagen local anterior: ${fotoAnterior}`)
              await deleteImage(fotoAnterior)
            }
          }
        }
      } catch (error) {
        console.error('Error al guardar la foto:', error)
        // No lanzar error aquí para no impedir la actualización del jugador
      }
    }

    await jugadorQueries.updateWithEquiposCategorias(typeof id === 'string' ? parseInt(id) : id, jugadorData as any, [equipo_categoria_id])
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al actualizar jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar jugador')
  }
}

export async function deleteJugador(id: number | string) {
  await requirePermiso('jugadores', 'eliminar')
  try {
    // Convertir a string si es number para mantener consistencia
    const jugadorId = typeof id === 'number' ? id.toString() : id
    
    // Verificar si el ID es válido
    if (!jugadorId || jugadorId.trim() === '') {
      throw new Error('ID de jugador inválido')
    }
    
    // Verificar si el jugador existe antes de eliminarlo
    const jugador = await jugadorQueries.getById(jugadorId)
    if (!jugador) {
      throw new Error('El jugador no existe')
    }
    
    // Eliminar la foto del jugador si existe
    if (jugador.foto) {
      await deleteImage(jugador.foto)
    }
    
    await jugadorQueries.delete(parseInt(jugadorId))
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al eliminar jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar jugador')
  }
}

export async function deleteMultipleJugadores(ids: number[]) {
  try {
    // Validar que todos los IDs sean números válidos
    if (!ids.every(id => !isNaN(id) && id > 0)) {
      throw new Error('IDs de jugadores inválidos')
    }
    
    // Verificar que todos los jugadores existan antes de eliminarlos
    for (const id of ids) {
      const jugador = await jugadorQueries.getById(id)
      if (!jugador) {
        throw new Error(`El jugador con ID ${id} no existe`)
      }
    }
    
    // Eliminar todos los jugadores
    for (const id of ids) {
      await jugadorQueries.delete(id)
    }
    
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al eliminar jugadores:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar jugadores')
  }
}

export async function searchJugadores(query: string) {
  try {
    const jugadores = await jugadorQueries.getAllWithRelations()
    return jugadores.filter(jugador => 
      jugador.cedula.toLowerCase().includes(query.toLowerCase()) ||
      jugador.apellido_nombre.toLowerCase().includes(query.toLowerCase()) ||
      jugador.nacionalidad.toLowerCase().includes(query.toLowerCase()) ||
      jugador.liga.toLowerCase().includes(query.toLowerCase())
    )
  } catch (error) {
    console.error('Error al buscar jugadores:', error)
    throw new Error('Error al buscar jugadores')
  }
}

export async function searchJugadoresByCedula(cedula: string) {
  try {
    const jugadores = await jugadorQueries.getAllWithRelations()
    return jugadores.filter(jugador => 
      jugador.cedula.toLowerCase().includes(cedula.toLowerCase())
    )
  } catch (error) {
    console.error('Error al buscar jugadores por cédula:', error)
    throw new Error('Error al buscar jugadores por cédula')
  }
}

export async function searchJugadoresByNombre(nombre: string) {
  try {
    const jugadores = await jugadorQueries.getAllWithRelations()
    return jugadores.filter(jugador => 
      jugador.apellido_nombre.toLowerCase().includes(nombre.toLowerCase())
    )
  } catch (error) {
    console.error('Error al buscar jugadores por nombre:', error)
    throw new Error('Error al buscar jugadores por nombre')
  }
}

// ===== EQUIPOS (para formularios) =====

export async function getEquipos() {
  try {
    return await equipoQueries.getAll()
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    throw new Error('Error al obtener equipos')
  }
}

// ===== CATEGORÍAS (para formularios) =====

export async function getCategorias() {
  try {
    return await categoriaQueries.getAll()
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    throw new Error('Error al obtener categorías')
  }
}

// ===== HISTORIAL DE JUGADORES =====

export async function getHistorialJugador(jugadorId: number | string) {
  try {
    const historial = await db.query.historialJugadores.findMany({
      where: eq(historialJugadores.jugador_id, jugadorId.toString()),
      orderBy: (historialJugadores, { desc }) => [desc(historialJugadores.fecha_calificacion)],
    })
    return historial
  } catch (error) {
    console.error('Error al obtener historial del jugador:', error)
    throw new Error('Error al obtener historial del jugador')
  }
}

export async function createHistorialJugador(data: NewHistorialJugador) {
  try {
    if (!data.jugador_id || !data.liga) {
      throw new Error('Jugador y Liga son campos obligatorios')
    }

    const nuevoHistorial = await db.insert(historialJugadores).values(data).returning()
    revalidatePath('/jugadores')
    return nuevoHistorial[0]
  } catch (error) {
    console.error('Error al crear historial:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear historial')
  }
}

export async function updateHistorialJugador(id: number, data: Partial<NewHistorialJugador>) {
  try {
    const historialActualizado = await db.update(historialJugadores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(historialJugadores.id, id))
      .returning()
    
    if (historialActualizado.length === 0) {
      throw new Error('Registro de historial no encontrado')
    }
    
    revalidatePath('/jugadores')
    return historialActualizado[0]
  } catch (error) {
    console.error('Error al actualizar historial:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar historial')
  }
}

export async function deleteHistorialJugador(id: number) {
  try {
    if (isNaN(id) || id <= 0) {
      throw new Error('ID de historial inválido')
    }
    
    await db.delete(historialJugadores).where(eq(historialJugadores.id, id))
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al eliminar historial:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar historial')
  }
}
