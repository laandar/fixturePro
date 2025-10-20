'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canchaQueries } from '@/db/queries'
import type { NewCancha } from '@/db/types'
import { requirePermiso } from '@/lib/auth-helpers'

export async function getCanchas() {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    return await canchaQueries.getAll()
  } catch (error) {
    throw new Error('Error al obtener canchas')
  }
}

export async function getCanchasWithCategorias() {
  try {
    return await canchaQueries.getAllWithCategorias()
  } catch (error) {
    throw new Error('Error al obtener canchas con categorías')
  }
}

export async function getCanchaById(id: number) {
  try {
    return await canchaQueries.getById(id)
  } catch (error) {
    throw new Error('Error al obtener cancha')
  }
}

export async function getCanchaByIdWithCategorias(id: number) {
  try {
    return await canchaQueries.getByIdWithCategorias(id)
  } catch (error) {
    throw new Error('Error al obtener cancha con categorías')
  }
}

export async function createCancha(formData: FormData) {
  await requirePermiso('canchas', 'crear')
  try {
    const nombre = formData.get('nombre') as string
    const ubicacion = formData.get('ubicacion') as string
    const tipo = formData.get('tipo') as string
    const capacidad = formData.get('capacidad') as string
    const descripcion = formData.get('descripcion') as string
    const estado = formData.get('estado') === 'true'
    const categorias = formData.getAll('categorias') as string[]

    if (!nombre || !tipo) {
      throw new Error('Nombre y tipo son campos obligatorios')
    }

    const canchaData: NewCancha = {
      nombre,
      ubicacion: ubicacion || null,
      tipo,
      capacidad: capacidad ? parseInt(capacidad) : null,
      descripcion: descripcion || null,
      estado,
    }

    // Convertir IDs de categorías a números
    const categoriaIds = categorias
      .filter(cat => cat && cat !== '')
      .map(cat => parseInt(cat))

    await canchaQueries.createWithCategorias(canchaData, categoriaIds)
    revalidatePath('/canchas')
  } catch (error) {
    console.error('Error al crear cancha:', error)
    throw error
  }
}

export async function updateCancha(id: number, formData: FormData) {
  await requirePermiso('canchas', 'editar')
  try {
    const nombre = formData.get('nombre') as string
    const ubicacion = formData.get('ubicacion') as string
    const tipo = formData.get('tipo') as string
    const capacidad = formData.get('capacidad') as string
    const descripcion = formData.get('descripcion') as string
    const estado = formData.get('estado') === 'true'
    const categorias = formData.getAll('categorias') as string[]

    if (!nombre || !tipo) {
      throw new Error('Nombre y tipo son campos obligatorios')
    }

    const canchaData: Partial<NewCancha> = {
      nombre,
      ubicacion: ubicacion || null,
      tipo,
      capacidad: capacidad ? parseInt(capacidad) : null,
      descripcion: descripcion || null,
      estado,
    }

    // Convertir IDs de categorías a números
    const categoriaIds = categorias
      .filter(cat => cat && cat !== '')
      .map(cat => parseInt(cat))

    await canchaQueries.updateWithCategorias(id, canchaData, categoriaIds)
    revalidatePath('/canchas')
  } catch (error) {
    throw error
  }
}

export async function deleteCancha(id: number) {
  await requirePermiso('canchas', 'eliminar')
  try {
    await canchaQueries.delete(id)
    revalidatePath('/canchas')
  } catch (error) {
    throw new Error('Error al eliminar cancha')
  }
}

export async function assignCategoriasToCancha(canchaId: number, categoriaIds: number[]) {
  try {
    await canchaQueries.assignCategorias(canchaId, categoriaIds)
    revalidatePath('/canchas')
  } catch (error) {
    throw new Error('Error al asignar categorías a la cancha')
  }
}

export async function unassignCategoriasFromCancha(canchaId: number, categoriaIds: number[]) {
  try {
    await canchaQueries.unassignCategorias(canchaId, categoriaIds)
    revalidatePath('/canchas')
  } catch (error) {
    throw new Error('Error al desasignar categorías de la cancha')
  }
}
