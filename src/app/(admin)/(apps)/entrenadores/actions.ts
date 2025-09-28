'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { entrenadorQueries } from '@/db/queries'
import type { NewEntrenador } from '@/db/types'

// ===== ENTRENADORES =====

export async function getEntrenadores() {
  try {
    return await entrenadorQueries.getAll()
  } catch (error) {
    console.error('Error al obtener entrenadores:', error)
    throw new Error('Error al obtener entrenadores')
  }
}

export async function getEntrenadorById(id: number) {
  try {
    return await entrenadorQueries.getById(id)
  } catch (error) {
    console.error('Error al obtener entrenador:', error)
    throw new Error('Error al obtener entrenador')
  }
}

export async function createEntrenador(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string

    if (!nombre) {
      throw new Error('El nombre es obligatorio')
    }

    // Verificar si el nombre ya existe
    const entrenadores = await entrenadorQueries.getAll()
    const entrenadorExistente = entrenadores.find(e => e.nombre.toLowerCase() === nombre.toLowerCase())
    if (entrenadorExistente) {
      throw new Error('Ya existe un entrenador con este nombre')
    }

    const entrenadorData: NewEntrenador = {
      nombre,
    }

    await entrenadorQueries.create(entrenadorData)
    revalidatePath('/entrenadores')
  } catch (error) {
    console.error('Error al crear entrenador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear entrenador')
  }
}

export async function updateEntrenador(id: number, formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string

    if (!nombre) {
      throw new Error('El nombre es obligatorio')
    }

    // Verificar si el nombre ya existe en otro entrenador
    const entrenadores = await entrenadorQueries.getAll()
    const entrenadorExistente = entrenadores.find(e => e.nombre.toLowerCase() === nombre.toLowerCase() && e.id !== id)
    if (entrenadorExistente) {
      throw new Error('Ya existe otro entrenador con este nombre')
    }

    const entrenadorData: Partial<NewEntrenador> = {
      nombre,
    }

    await entrenadorQueries.update(id, entrenadorData)
    revalidatePath('/entrenadores')
  } catch (error) {
    console.error('Error al actualizar entrenador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar entrenador')
  }
}

export async function deleteEntrenador(id: number) {
  try {
    // Validar que el ID sea un número válido
    if (isNaN(id) || id <= 0) {
      throw new Error('ID de entrenador inválido')
    }
    
    // Verificar si el entrenador existe antes de eliminarlo
    const entrenador = await entrenadorQueries.getById(id)
    if (!entrenador) {
      throw new Error('El entrenador no existe')
    }
    
    await entrenadorQueries.delete(id)
    revalidatePath('/entrenadores')
  } catch (error) {
    console.error('Error al eliminar entrenador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar entrenador')
  }
}

export async function deleteMultipleEntrenadores(ids: number[]) {
  try {
    // Validar que todos los IDs sean números válidos
    if (!ids.every(id => !isNaN(id) && id > 0)) {
      throw new Error('IDs de entrenadores inválidos')
    }
    
    // Verificar que todos los entrenadores existan antes de eliminarlos
    for (const id of ids) {
      const entrenador = await entrenadorQueries.getById(id)
      if (!entrenador) {
        throw new Error(`El entrenador con ID ${id} no existe`)
      }
    }
    
    // Eliminar todos los entrenadores
    for (const id of ids) {
      await entrenadorQueries.delete(id)
    }
    
    revalidatePath('/entrenadores')
  } catch (error) {
    console.error('Error al eliminar entrenadores:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar entrenadores')
  }
}

export async function searchEntrenadores(query: string) {
  try {
    const entrenadores = await entrenadorQueries.getAll()
    return entrenadores.filter(entrenador => 
      entrenador.nombre.toLowerCase().includes(query.toLowerCase())
    )
  } catch (error) {
    console.error('Error al buscar entrenadores:', error)
    throw new Error('Error al buscar entrenadores')
  }
}
