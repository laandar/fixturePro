'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { torneoQueries, equipoTorneoQueries, encuentroQueries } from '@/db/queries'
import { generateFixture } from '@/lib/fixture-generator'
import type { NewTorneo, NewEquipoTorneo, EquipoWithRelations } from '@/db/types'

export async function getTorneos() {
  try {
    return await torneoQueries.getAllWithRelations()
  } catch (error) {
    throw new Error('Error al obtener torneos')
  }
}

export async function getTorneoById(id: number) {
  try {
    return await torneoQueries.getByIdWithRelations(id)
  } catch (error) {
    throw new Error('Error al obtener torneo')
  }
}

export async function createTorneo(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const descripcion = formData.get('descripcion') as string
    const categoria_id = parseInt(formData.get('categoria_id') as string)
    const fecha_inicio_str = formData.get('fecha_inicio') as string
    const fecha_fin_str = formData.get('fecha_fin') as string
    const tipo_torneo = formData.get('tipo_torneo') as string
    const estado = formData.get('estado') as string
    const permite_revancha = formData.get('permite_revancha') === 'true'

    if (!nombre || !categoria_id || !fecha_inicio_str || !fecha_fin_str || !tipo_torneo || !estado) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    const fecha_inicio = new Date(fecha_inicio_str)
    const fecha_fin = new Date(fecha_fin_str)
    if (fecha_inicio >= fecha_fin) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
    }

    // Crear objeto con solo los campos necesarios, dejando que la BD use los valores por defecto
    const torneoData = {
      nombre,
      descripcion: descripcion || null,
      categoria_id,
      fecha_inicio: fecha_inicio_str,
      fecha_fin: fecha_fin_str,
      estado,
      tipo_torneo,
      permite_revancha,
    }

    await torneoQueries.create(torneoData)
    revalidatePath('/torneos')
  } catch (error) {
    console.error('Error al crear torneo:', error)
    throw error
  }
}

export async function updateTorneo(id: number, formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const descripcion = formData.get('descripcion') as string
    const categoria_id = parseInt(formData.get('categoria_id') as string)
    const fecha_inicio_str = formData.get('fecha_inicio') as string
    const fecha_fin_str = formData.get('fecha_fin') as string
    const tipo_torneo = formData.get('tipo_torneo') as string
    const permite_revancha = formData.get('permite_revancha') === 'true'
    const estado = formData.get('estado') as string

    if (!nombre || !categoria_id || !fecha_inicio_str || !fecha_fin_str) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    const fecha_inicio = new Date(fecha_inicio_str)
    const fecha_fin = new Date(fecha_fin_str)
    if (fecha_inicio >= fecha_fin) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
    }

    const torneoData: Partial<NewTorneo> = {
      nombre,
      descripcion: descripcion || null,
      categoria_id,
      fecha_inicio: fecha_inicio_str,
      fecha_fin: fecha_fin_str,
      tipo_torneo,
      permite_revancha,
      estado,
    }

    await torneoQueries.update(id, torneoData)
    revalidatePath('/torneos')
  } catch (error) {
    throw error
  }
}

export async function deleteTorneo(id: number) {
  try {
    // Primero eliminar todos los encuentros del torneo
    await encuentroQueries.deleteByTorneoId(id)
    
    // Luego eliminar el torneo
    await torneoQueries.delete(id)
    revalidatePath('/torneos')
  } catch (error) {
    throw new Error('Error al eliminar torneo')
  }
}

export async function addEquiposToTorneo(torneoId: number, equipoIds: number[]) {
  try {
    const equiposTorneoData: NewEquipoTorneo[] = equipoIds.map(equipoId => ({
      torneo_id: torneoId,
      equipo_id: equipoId,
      puntos: 0,
      partidos_jugados: 0,
      partidos_ganados: 0,
      partidos_empatados: 0,
      partidos_perdidos: 0,
      goles_favor: 0,
      goles_contra: 0,
      diferencia_goles: 0,
      estado: 'activo',
    }))

    for (const equipoTorneoData of equiposTorneoData) {
      await equipoTorneoQueries.addEquipoToTorneo(equipoTorneoData)
    }

    revalidatePath(`/torneos/${torneoId}`)
  } catch (error) {
    throw new Error('Error al agregar equipos al torneo')
  }
}

export async function removeEquipoFromTorneo(torneoId: number, equipoId: number) {
  try {
    await equipoTorneoQueries.removeEquipoFromTorneo(torneoId, equipoId)
    revalidatePath(`/torneos/${torneoId}`)
  } catch (error) {
    throw new Error('Error al remover equipo del torneo')
  }
}

export async function generateFixtureForTorneo(
  torneoId: number, 
  equipos: EquipoWithRelations[],
  options: {
    fechaInicio?: Date
    diasEntreJornadas?: number
    canchas?: string[]
    arbitros?: string[]
    unavailableByJornada?: Record<number, number[]>
  } = {}
) {
  try {
    // Verificar que el torneo existe
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    // Eliminar encuentros existentes si los hay
    await encuentroQueries.deleteByTorneoId(torneoId)

    // Generar nuevo fixture
    const fixtureResult = generateFixture(equipos, torneoId, {
      permiteRevancha: Boolean(torneo.permite_revancha ?? false),
      fechaInicio: options.fechaInicio || new Date(String(torneo.fecha_inicio)),
      diasEntreJornadas: options.diasEntreJornadas || 7,
      canchas: options.canchas || ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: options.arbitros || ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      unavailableByJornada: options.unavailableByJornada,
    })

    // Crear todos los encuentros
    for (const encuentro of fixtureResult.encuentros) {
      await encuentroQueries.create(encuentro)
    }

    revalidatePath(`/torneos/${torneoId}`)
    return {
      encuentrosCreados: fixtureResult.encuentros.length,
      equiposDescansan: fixtureResult.equiposDescansan
    }
  } catch (error) {
    throw new Error('Error al generar fixture')
  }
}

export async function updateEncuentro(id: number, formData: FormData) {
  try {
    const goles_local = parseInt(formData.get('goles_local') as string) || null
    const goles_visitante = parseInt(formData.get('goles_visitante') as string) || null
    const estado = formData.get('estado') as string
    const fecha_jugada = formData.get('fecha_jugada') ? new Date(formData.get('fecha_jugada') as string) : null
    const cancha = formData.get('cancha') as string
    const arbitro = formData.get('arbitro') as string
    const observaciones = formData.get('observaciones') as string

    const encuentroData: any = {
      estado,
      cancha: cancha || null,
      arbitro: arbitro || null,
      observaciones: observaciones || null,
    }

    if (goles_local !== null && goles_visitante !== null) {
      encuentroData.goles_local = goles_local
      encuentroData.goles_visitante = goles_visitante
      encuentroData.fecha_jugada = fecha_jugada || new Date()
    }

    await encuentroQueries.update(id, encuentroData)
    revalidatePath('/torneos')
  } catch (error) {
    throw new Error('Error al actualizar encuentro')
  }
}

export async function getEncuentrosByTorneo(torneoId: number) {
  try {
    return await encuentroQueries.getByTorneoId(torneoId)
  } catch (error) {
    throw new Error('Error al obtener encuentros')
  }
}

export async function getEncuentrosByJornada(torneoId: number, jornada: number) {
  try {
    return await encuentroQueries.getByJornada(torneoId, jornada)
  } catch (error) {
    throw new Error('Error al obtener encuentros de la jornada')
  }
}
