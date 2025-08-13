'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { jugadorQueries, equipoQueries, categoriaQueries } from '@/db/queries'
import type { NewJugador } from '@/db/types'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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
  try {
    return await jugadorQueries.getAllWithRelations()
  } catch (error) {
    console.error('Error al obtener jugadores:', error)
    throw new Error('Error al obtener jugadores')
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
  try {
    const cedula = formData.get('cedula') as string
    const apellido_nombre = formData.get('apellido_nombre') as string
    const nacionalidad = formData.get('nacionalidad') as string
    const liga = formData.get('liga') as string
    const categoria_id = parseInt(formData.get('categoria_id') as string)
    const equipo_id = parseInt(formData.get('equipo_id') as string)
    const estado = formData.get('estado') === 'true'
    const foto = formData.get('foto') as File | null

    if (!cedula || !apellido_nombre || !nacionalidad || !liga || !categoria_id || !equipo_id) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    // Verificar si la cédula ya existe
    const jugadorExistente = await jugadorQueries.getByCedula(cedula)
    if (jugadorExistente) {
      throw new Error('Ya existe un jugador con esta cédula')
    }

    const jugadorData: NewJugador = {
      cedula,
      apellido_nombre,
      nacionalidad,
      liga,
      categoria_id,
      equipo_id,
      estado,
    }

    // Crear el jugador primero para obtener el ID
    const nuevoJugador = await jugadorQueries.create(jugadorData)
    
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
  try {
    const cedula = formData.get('cedula') as string
    const apellido_nombre = formData.get('apellido_nombre') as string
    const nacionalidad = formData.get('nacionalidad') as string
    const liga = formData.get('liga') as string
    const categoria_id = parseInt(formData.get('categoria_id') as string)
    const equipo_id = parseInt(formData.get('equipo_id') as string)
    const estado = formData.get('estado') === 'true'
    const foto = formData.get('foto') as File | null

    if (!cedula || !apellido_nombre || !nacionalidad || !liga || !categoria_id || !equipo_id) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    // Verificar si la cédula ya existe en otro jugador
    const jugadorExistente = await jugadorQueries.getByCedula(cedula)
    if (jugadorExistente && jugadorExistente.id !== id) {
      throw new Error('Ya existe otro jugador con esta cédula')
    }

    const jugadorData: Partial<NewJugador> = {
      cedula,
      apellido_nombre,
      nacionalidad,
      liga,
      categoria_id,
      equipo_id,
      estado,
    }

    // Si hay una nueva foto, guardarla
    if (foto && foto.size > 0) {
      try {
        const fotoPath = await saveImage(foto, id)
        jugadorData.foto = fotoPath
      } catch (error) {
        console.error('Error al guardar la foto:', error)
        // No lanzar error aquí para no impedir la actualización del jugador
      }
    }

    await jugadorQueries.update(id, jugadorData)
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al actualizar jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar jugador')
  }
}

export async function deleteJugador(id: number) {
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
