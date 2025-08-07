'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { equipoQueries, categoriaQueries, entrenadorQueries } from '@/db/queries'
import type { NewEquipo, NewCategoria, NewEntrenador } from '@/db/types'

// ===== EQUIPOS =====

export async function getEquipos() {
  try {
    return await equipoQueries.getAll()
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    throw new Error('Error al obtener equipos')
  }
}

export async function getEquipoById(id: number) {
  try {
    return await equipoQueries.getById(id)
  } catch (error) {
    console.error('Error al obtener equipo:', error)
    throw new Error('Error al obtener equipo')
  }
}

export async function createEquipo(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const categoria_id = parseInt(formData.get('categoria_id') as string)
    const entrenador_id = parseInt(formData.get('entrenador_id') as string)
    const imagen_equipo = formData.get('imagen_equipo') as string
    const estado = formData.get('estado') === 'true'

    if (!nombre || !categoria_id || !entrenador_id) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    const equipoData: NewEquipo = {
      nombre,
      categoria_id,
      entrenador_id,
      imagen_equipo: imagen_equipo || null,
      estado,
    }

    await equipoQueries.create(equipoData)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al crear equipo:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear equipo')
  }
}

export async function updateEquipo(id: number, formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const categoria_id = parseInt(formData.get('categoria_id') as string)
    const entrenador_id = parseInt(formData.get('entrenador_id') as string)
    const imagen_equipo = formData.get('imagen_equipo') as string
    const estado = formData.get('estado') === 'true'

    if (!nombre || !categoria_id || !entrenador_id) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    const equipoData: Partial<NewEquipo> = {
      nombre,
      categoria_id,
      entrenador_id,
      imagen_equipo: imagen_equipo || null,
      estado,
    }

    await equipoQueries.update(id, equipoData)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al actualizar equipo:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar equipo')
  }
}

export async function deleteEquipo(id: number) {
  try {
    // Validar que el ID sea un número válido
    if (isNaN(id) || id <= 0) {
      throw new Error('ID de equipo inválido')
    }
    
    // Verificar si el equipo existe antes de eliminarlo
    const equipo = await equipoQueries.getById(id)
    if (!equipo) {
      throw new Error('El equipo no existe')
    }
    
    await equipoQueries.delete(id)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al eliminar equipo:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar equipo')
  }
}

export async function deleteMultipleEquipos(ids: number[]) {
  try {
    if (ids.length === 0) {
      throw new Error('No se proporcionaron IDs para eliminar')
    }
    
    // Validar que los IDs sean números válidos
    const validIds = ids.filter(id => !isNaN(id) && id > 0)
    if (validIds.length !== ids.length) {
      throw new Error('Algunos IDs no son válidos')
    }
    
    // Verificar que todos los equipos existen antes de eliminarlos
    const equipos = await Promise.all(validIds.map(id => equipoQueries.getById(id)))
    const equiposNoEncontrados = equipos.filter(equipo => !equipo)
    
    if (equiposNoEncontrados.length > 0) {
      throw new Error('Algunos equipos no existen')
    }
    
    // Eliminar equipos uno por uno para mejor control de errores
    const resultados = []
    for (const id of validIds) {
      try {
        await equipoQueries.delete(id)
        resultados.push({ id, success: true })
      } catch (error) {
        console.error(`Error al eliminar equipo ${id}:`, error)
        resultados.push({ id, success: false, error: error instanceof Error ? error.message : 'Error desconocido' })
      }
    }
    
    // Verificar si todos los equipos fueron eliminados exitosamente
    const fallidos = resultados.filter(r => !r.success)
    if (fallidos.length > 0) {
      throw new Error(`No se pudieron eliminar ${fallidos.length} equipos`)
    }
    
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al eliminar equipos:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar equipos')
  }
}

export async function searchEquipos(query: string) {
  try {
    return await equipoQueries.search(query)
  } catch (error) {
    console.error('Error al buscar equipos:', error)
    throw new Error('Error al buscar equipos')
  }
}

// ===== CATEGORÍAS =====

export async function getCategorias() {
  try {
    return await categoriaQueries.getAll()
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    throw new Error('Error al obtener categorías')
  }
}

export async function createCategoria(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const permite_revancha = formData.get('permite_revancha') === 'true'

    if (!nombre) {
      throw new Error('El nombre de la categoría es obligatorio')
    }

    const categoriaData: NewCategoria = {
      nombre,
      permite_revancha,
    }

    await categoriaQueries.create(categoriaData)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al crear categoría:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear categoría')
  }
}

// ===== ENTRENADORES =====

export async function getEntrenadores() {
  try {
    return await entrenadorQueries.getAll()
  } catch (error) {
    console.error('Error al obtener entrenadores:', error)
    throw new Error('Error al obtener entrenadores')
  }
}

export async function createEntrenador(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string

    if (!nombre) {
      throw new Error('El nombre del entrenador es obligatorio')
    }

    const entrenadorData: NewEntrenador = {
      nombre,
    }

    await entrenadorQueries.create(entrenadorData)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al crear entrenador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear entrenador')
  }
} 