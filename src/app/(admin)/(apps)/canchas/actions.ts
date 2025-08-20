'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canchaQueries } from '@/db/queries'
import type { NewCancha } from '@/db/types'

export async function getCanchas() {
  try {
    return await canchaQueries.getAll()
  } catch (error) {
    throw new Error('Error al obtener canchas')
  }
}

export async function getCanchaById(id: number) {
  try {
    return await canchaQueries.getById(id)
  } catch (error) {
    throw new Error('Error al obtener cancha')
  }
}

export async function createCancha(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const ubicacion = formData.get('ubicacion') as string
    const tipo = formData.get('tipo') as string
    const capacidad = formData.get('capacidad') as string
    const descripcion = formData.get('descripcion') as string
    const estado = formData.get('estado') === 'true'

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

    await canchaQueries.create(canchaData)
    revalidatePath('/canchas')
  } catch (error) {
    console.error('Error al crear cancha:', error)
    throw error
  }
}

export async function updateCancha(id: number, formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const ubicacion = formData.get('ubicacion') as string
    const tipo = formData.get('tipo') as string
    const capacidad = formData.get('capacidad') as string
    const descripcion = formData.get('descripcion') as string
    const estado = formData.get('estado') === 'true'

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

    await canchaQueries.update(id, canchaData)
    revalidatePath('/canchas')
  } catch (error) {
    throw error
  }
}

export async function deleteCancha(id: number) {
  try {
    await canchaQueries.delete(id)
    revalidatePath('/canchas')
  } catch (error) {
    throw new Error('Error al eliminar cancha')
  }
}
