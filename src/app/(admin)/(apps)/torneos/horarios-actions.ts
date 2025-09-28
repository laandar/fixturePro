'use server'

import { db } from '@/db'
import { horarios } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function getHorarios() {
  try {
    const horariosData = await db
      .select()
      .from(horarios)
      .orderBy(asc(horarios.orden), asc(horarios.hora_inicio))
    
    return horariosData
  } catch (error) {
    console.error('Error al obtener horarios:', error)
    throw new Error('Error al obtener horarios')
  }
}

export async function createHorario(formData: FormData) {
  try {
    const horaInicio = formData.get('hora_inicio') as string
    const color = formData.get('color') as string || '#007bff'
    const orden = parseInt(formData.get('orden') as string) || 0

    if (!horaInicio) {
      throw new Error('La hora de inicio es obligatoria')
    }

    const nuevoHorario = await db
      .insert(horarios)
      .values({
        hora_inicio: horaInicio,
        color,
        orden
      })
      .returning()

    return { success: true, horario: nuevoHorario[0] }
  } catch (error) {
    console.error('Error al crear horario:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear horario')
  }
}

export async function updateHorario(id: number, formData: FormData) {
  try {
    const horaInicio = formData.get('hora_inicio') as string
    const color = formData.get('color') as string || '#007bff'
    const orden = parseInt(formData.get('orden') as string) || 0

    if (!horaInicio) {
      throw new Error('La hora de inicio es obligatoria')
    }

    const horarioActualizado = await db
      .update(horarios)
      .set({
        hora_inicio: horaInicio,
        color,
        orden,
        updatedAt: new Date()
      })
      .where(eq(horarios.id, id))
      .returning()

    return { success: true, horario: horarioActualizado[0] }
  } catch (error) {
    console.error('Error al actualizar horario:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar horario')
  }
}

export async function deleteHorario(id: number) {
  try {
    await db
      .delete(horarios)
      .where(eq(horarios.id, id))

    return { success: true }
  } catch (error) {
    console.error('Error al eliminar horario:', error)
    throw new Error('Error al eliminar horario')
  }
}

export async function asignarHorarioAEncuentro(encuentroId: number, horarioId: number) {
  try {
    const { encuentros } = await import('@/db/schema')
    
    await db
      .update(encuentros)
      .set({ 
        horario_id: horarioId,
        updatedAt: new Date()
      })
      .where(eq(encuentros.id, encuentroId))

    return { success: true }
  } catch (error) {
    console.error('Error al asignar horario:', error)
    throw new Error('Error al asignar horario al encuentro')
  }
}

export async function asignarHorariosAutomaticamente(torneoId: number, configuracion: {
  reiniciarAsignaciones?: boolean;
  soloEncuentrosSinHorario?: boolean;
  ordenPorJornada?: boolean;
}) {
  try {
    const { encuentros } = await import('@/db/schema')
    
    // Obtener todos los horarios ordenados
    const horariosDisponibles = await db
      .select()
      .from(horarios)
      .orderBy(asc(horarios.orden), asc(horarios.hora_inicio))
    
    if (horariosDisponibles.length === 0) {
      throw new Error('No hay horarios disponibles para asignar')
    }

    // Obtener encuentros del torneo
    let encuentrosDelTorneo = await db
      .select()
      .from(encuentros)
      .where(eq(encuentros.torneo_id, torneoId))
      .orderBy(asc(encuentros.jornada), asc(encuentros.id))

    // Si solo queremos encuentros sin horario, filtrar en JavaScript
    if (configuracion.soloEncuentrosSinHorario) {
      encuentrosDelTorneo = encuentrosDelTorneo.filter(encuentro => encuentro.horario_id === null)
    }

    if (encuentrosDelTorneo.length === 0) {
      throw new Error('No hay encuentros para asignar horarios')
    }

    let asignacionesRealizadas = 0
    let horarioIndex = 0

    // Si queremos reiniciar asignaciones, primero limpiamos todas
    if (configuracion.reiniciarAsignaciones) {
      await db
        .update(encuentros)
        .set({ 
          horario_id: null,
          updatedAt: new Date()
        })
        .where(eq(encuentros.torneo_id, torneoId))
    }

    // Asignar horarios secuencialmente
    for (const encuentro of encuentrosDelTorneo) {
      // Si solo queremos asignar a encuentros sin horario y ya tiene uno, saltamos
      if (configuracion.soloEncuentrosSinHorario && encuentro.horario_id) {
        continue
      }

      // Si ya tiene horario y no queremos reiniciar, saltamos
      if (!configuracion.reiniciarAsignaciones && encuentro.horario_id) {
        continue
      }

      const horarioAsignar = horariosDisponibles[horarioIndex % horariosDisponibles.length]
      
      await db
        .update(encuentros)
        .set({ 
          horario_id: horarioAsignar.id,
          updatedAt: new Date()
        })
        .where(eq(encuentros.id, encuentro.id))

      asignacionesRealizadas++
      horarioIndex++
    }

    return { 
      success: true, 
      asignacionesRealizadas,
      totalEncuentros: encuentrosDelTorneo.length,
      horariosUtilizados: horariosDisponibles.length
    }
  } catch (error) {
    console.error('Error al asignar horarios automáticamente:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al asignar horarios automáticamente')
  }
}

export async function asignarHorariosPorJornada(torneoId: number, jornada: number) {
  try {
    const { encuentros } = await import('@/db/schema')
    
    // Obtener horarios ordenados
    const horariosDisponibles = await db
      .select()
      .from(horarios)
      .orderBy(asc(horarios.orden), asc(horarios.hora_inicio))
    
    if (horariosDisponibles.length === 0) {
      throw new Error('No hay horarios disponibles para asignar')
    }

    // Obtener encuentros de la jornada específica
    const encuentrosJornada = await db
      .select()
      .from(encuentros)
      .where(
        and(
          eq(encuentros.torneo_id, torneoId),
          eq(encuentros.jornada, jornada)
        )
      )
      .orderBy(asc(encuentros.id))

    if (encuentrosJornada.length === 0) {
      throw new Error(`No hay encuentros en la jornada ${jornada}`)
    }

    let asignacionesRealizadas = 0
    let horarioIndex = 0

    // Asignar horarios secuencialmente a los encuentros de la jornada
    for (const encuentro of encuentrosJornada) {
      const horarioAsignar = horariosDisponibles[horarioIndex % horariosDisponibles.length]
      
      await db
        .update(encuentros)
        .set({ 
          horario_id: horarioAsignar.id,
          updatedAt: new Date()
        })
        .where(eq(encuentros.id, encuentro.id))

      asignacionesRealizadas++
      horarioIndex++
    }

    return { 
      success: true, 
      asignacionesRealizadas,
      totalEncuentros: encuentrosJornada.length,
      jornada
    }
  } catch (error) {
    console.error('Error al asignar horarios por jornada:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al asignar horarios por jornada')
  }
}
