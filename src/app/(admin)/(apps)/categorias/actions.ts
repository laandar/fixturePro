'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { categoriaQueries } from '@/db/queries'
import type { NewCategoria } from '@/db/types'

// ===== CATEGORÍAS =====

export async function getCategorias() {
  try {
    return await categoriaQueries.getAll()
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    throw new Error('Error al obtener categorías')
  }
}

export async function getCategoriaById(id: number) {
  try {
    return await categoriaQueries.getById(id)
  } catch (error) {
    console.error('Error al obtener categoría:', error)
    throw new Error('Error al obtener categoría')
  }
}

export async function createCategoria(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const estado = formData.get('estado') === 'true'
    const usuario_id = parseInt(formData.get('usuario_id') as string) || null

    if (!nombre) {
      throw new Error('El nombre de la categoría es obligatorio')
    }

    const categoriaData: NewCategoria = {
      nombre,
      estado,
      usuario_id,
    }

    await categoriaQueries.create(categoriaData)
    revalidatePath('/categorias')
  } catch (error) {
    console.error('Error al crear categoría:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear categoría')
  }
}

export async function updateCategoria(id: number, formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const estado = formData.get('estado') === 'true'
    const usuario_id = parseInt(formData.get('usuario_id') as string) || null

    if (!nombre) {
      throw new Error('El nombre de la categoría es obligatorio')
    }

    const categoriaData: Partial<NewCategoria> = {
      nombre,
      estado,
      usuario_id,
    }

    await categoriaQueries.update(id, categoriaData)
    revalidatePath('/categorias')
  } catch (error) {
    console.error('Error al actualizar categoría:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar categoría')
  }
}

export async function deleteCategoria(id: number) {
  try {
    // Validar que el ID sea un número válido
    if (isNaN(id) || id <= 0) {
      throw new Error('ID de categoría inválido')
    }
    
    // Verificar si la categoría existe antes de eliminarla
    const categoria = await categoriaQueries.getById(id)
    if (!categoria) {
      throw new Error('La categoría no existe')
    }
    
    try {
      await categoriaQueries.delete(id)
      revalidatePath('/categorias')
    } catch (error: any) {
      // Detectar error de restricción de clave foránea
      if (error && error.message && error.message.includes('delete') && error.message.includes('categorias')) {
        throw new Error('No se puede eliminar la categoría porque tiene equipos asociados. Elimina o reasigna los equipos antes de eliminar la categoría.')
      }
      throw error
    }
  } catch (error) {
    console.error('Error al eliminar categoría:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar categoría')
  }
}

export async function deleteMultipleCategorias(ids: number[]) {
  try {
    // Validar que todos los IDs sean números válidos
    if (!ids.every(id => !isNaN(id) && id > 0)) {
      throw new Error('IDs de categorías inválidos')
    }
    
    // Verificar que todas las categorías existan antes de eliminarlas
    for (const id of ids) {
      const categoria = await categoriaQueries.getById(id)
      if (!categoria) {
        throw new Error(`La categoría con ID ${id} no existe`)
      }
    }
    
    // Eliminar todas las categorías
    for (const id of ids) {
      await categoriaQueries.delete(id)
    }
    
    revalidatePath('/categorias')
  } catch (error) {
    console.error('Error al eliminar categorías:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar categorías')
  }
}

export async function searchCategorias(query: string) {
  try {
    const categorias = await categoriaQueries.getAll()
    return categorias.filter(categoria => 
      categoria.nombre.toLowerCase().includes(query.toLowerCase())
    )
  } catch (error) {
    console.error('Error al buscar categorías:', error)
    throw new Error('Error al buscar categorías')
  }
}
