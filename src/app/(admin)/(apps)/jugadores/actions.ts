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

// ===== FUNCIONES AUXILIARES =====

async function saveImage(file: File, jugadorId: number): Promise<string> {
  try {
    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'jugadores')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generar nombre único para la imagen
    const timestamp = Date.now()
    const fileName = `jugador_${jugadorId}_${timestamp}.jpg`
    const filePath = join(uploadDir, fileName)
    
    // Convertir File a Buffer y guardar
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    // Retornar la ruta relativa para la base de datos
    return `/uploads/jugadores/${fileName}`
  } catch (error) {
    console.error('Error al guardar imagen:', error)
    throw new Error('Error al guardar la imagen')
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

export async function getJugadorById(id: number) {
  try {
    return await jugadorQueries.getByIdWithRelations(id)
  } catch (error) {
    console.error('Error al obtener jugador:', error)
    throw new Error('Error al obtener jugador')
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

    const jugadorData = {
      cedula,
      apellido_nombre,
      nacionalidad,
      liga,
      estado,
      fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
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
        const fotoPath = await saveImage(foto, nuevoJugador.id)
        await jugadorQueries.update(nuevoJugador.id, { foto: fotoPath })
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

export async function updateJugador(id: number, formData: FormData) {
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

    const jugadorData = {
      cedula,
      apellido_nombre,
      nacionalidad,
      liga,
      estado,
      fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
      sexo: cleanString(sexo) as 'masculino' | 'femenino' | 'otro' | null,
      numero_jugador: numero_jugador ? parseInt(numero_jugador) : null,
      telefono: cleanString(telefono),
      provincia: cleanString(provincia),
      direccion: cleanString(direccion),
      observacion: cleanString(observacion),
      foraneo: foraneo || false,
      foto: null as any, // Se actualizará después si hay una nueva foto
    }

    // Si hay una nueva foto, guardarla
    if (foto && foto.size > 0) {
      try {
        const fotoPath = await saveImage(foto, id)
        jugadorData.foto = fotoPath as any
      } catch (error) {
        console.error('Error al guardar la foto:', error)
        // No lanzar error aquí para no impedir la actualización del jugador
      }
    }

    await jugadorQueries.updateWithEquiposCategorias(id, jugadorData as any, [equipo_categoria_id])
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al actualizar jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar jugador')
  }
}

export async function deleteJugador(id: number) {
  await requirePermiso('jugadores', 'eliminar')
  try {
    // Validar que el ID sea un número válido
    if (isNaN(id) || id <= 0) {
      throw new Error('ID de jugador inválido')
    }
    
    // Verificar si el jugador existe antes de eliminarlo
    const jugador = await jugadorQueries.getById(id)
    if (!jugador) {
      throw new Error('El jugador no existe')
    }
    
    await jugadorQueries.delete(id)
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

export async function getHistorialJugador(jugadorId: number) {
  try {
    const historial = await db.query.historialJugadores.findMany({
      where: eq(historialJugadores.jugador_id, jugadorId),
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
