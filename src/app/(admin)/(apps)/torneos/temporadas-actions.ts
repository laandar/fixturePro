'use server'

import { revalidatePath } from 'next/cache'
import { temporadaQueries } from '@/db/queries'
import type { NewTemporada } from '@/db/types'
import { requirePermiso } from '@/lib/auth-helpers'

export async function getTemporadas() {
  try {
    return await temporadaQueries.getAll()
  } catch (error) {
    throw new Error('Error al obtener temporadas')
  }
}

export async function getTemporadasWithRelations() {
  try {
    return await temporadaQueries.getAllWithRelations()
  } catch (error) {
    throw new Error('Error al obtener temporadas con relaciones')
  }
}

export async function createTemporada(formData: FormData) {
  await requirePermiso('torneos', 'crear')
  
  try {
    const nombre = formData.get('nombre') as string
    const descripcion = formData.get('descripcion') as string | null
    const fecha_inicio = formData.get('fecha_inicio') as string | null
    const fecha_fin = formData.get('fecha_fin') as string | null
    const activa = formData.get('activa') === 'true' || formData.get('activa') === 'on'

    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre de la temporada es requerido')
    }

    const temporadaData: NewTemporada = {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      activa: activa,
    }

    await temporadaQueries.create(temporadaData)
    revalidatePath('/torneos')
    
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Error al crear temporada')
  }
}

export async function updateTemporada(id: number, formData: FormData) {
  await requirePermiso('torneos', 'editar')
  
  try {
    const nombre = formData.get('nombre') as string
    const descripcion = formData.get('descripcion') as string | null
    const fecha_inicio = formData.get('fecha_inicio') as string | null
    const fecha_fin = formData.get('fecha_fin') as string | null
    const activa = formData.get('activa') === 'true' || formData.get('activa') === 'on'

    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre de la temporada es requerido')
    }

    const temporadaData: Partial<NewTemporada> = {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      activa: activa,
    }

    await temporadaQueries.update(id, temporadaData)
    revalidatePath('/torneos')
    
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Error al actualizar temporada')
  }
}

export async function deleteTemporada(id: number) {
  await requirePermiso('torneos', 'eliminar')
  
  try {
    await temporadaQueries.delete(id)
    revalidatePath('/torneos')
    
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Error al eliminar temporada')
  }
}

export async function toggleTemporadaActiva(id: number, activa: boolean) {
  await requirePermiso('torneos', 'editar')
  
  try {
    await temporadaQueries.update(id, { activa })
    revalidatePath('/torneos')
    
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Error al cambiar estado de temporada')
  }
}
