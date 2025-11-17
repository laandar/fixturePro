'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { torneoQueries, equipoTorneoQueries, encuentroQueries, equiposDescansanQueries } from '@/db/queries'
import { generateFixture } from '@/lib/fixture-generator'
import type { NewTorneo, NewEquipoTorneo, EquipoWithRelations } from '@/db/types'
import { requirePermiso } from '@/lib/auth-helpers'
import { db } from '@/db'
import { tarjetas, goles, equiposTorneo, jugadoresParticipantes, cambiosJugadores, firmasEncuentros, torneos, horarios, encuentros, categorias, canchas, canchasCategorias } from '@/db/schema'
import { eq, count, inArray, and, isNotNull, asc, sql } from 'drizzle-orm'
import { getJugadoresActivosByEquipos } from '@/app/(admin)/(apps)/jugadores/actions'

const DIAS_HORARIOS = ['viernes', 'sabado', 'domingo'] as const
const DIA_LABELS: Record<(typeof DIAS_HORARIOS)[number], string> = {
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo'
}

export async function getTorneos() {
  // No requiere permiso - función auxiliar usada por otros módulos
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

export async function getJugadoresByTorneo(torneoId: number) {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo || !torneo.categoria_id) {
      return []
    }

    // Obtener los IDs de los equipos participantes del torneo
    const equiposParticipantesIds: number[] = []
    if (torneo.equiposTorneo) {
      torneo.equiposTorneo.forEach(et => {
        if (et.equipo_id) {
          equiposParticipantesIds.push(et.equipo_id)
        }
      })
    }

    // Si no hay equipos participantes, retornar array vacío
    if (equiposParticipantesIds.length === 0) {
      return []
    }
    
    // Cargar solo los jugadores de los equipos participantes del torneo
    return await getJugadoresActivosByEquipos(equiposParticipantesIds, torneo.categoria_id)
  } catch (error) {
    console.error('Error al obtener jugadores del torneo:', error)
    throw new Error('Error al obtener jugadores del torneo')
  }
}

export async function getMapaGeneralHorarios() {
  try {
    const torneosActivos = await db
      .select({
        id: torneos.id,
        nombre: torneos.nombre,
        estado: torneos.estado,
        categoriaNombre: categorias.nombre
      })
      .from(torneos)
      .leftJoin(categorias, eq(torneos.categoria_id, categorias.id))
      .where(inArray(torneos.estado, ['planificado', 'en_curso']))
      .orderBy(asc(torneos.fecha_inicio))

    if (torneosActivos.length === 0) {
      return []
    }

    const torneoIds = torneosActivos.map(t => t.id)

    const horariosData = await db
      .select({
        id: horarios.id,
        torneoId: horarios.torneo_id,
        dia: horarios.dia_semana,
        hora: horarios.hora_inicio,
        orden: horarios.orden
      })
      .from(horarios)
      .where(inArray(horarios.torneo_id, torneoIds))
      .orderBy(sql`CASE ${horarios.dia_semana}
        WHEN 'viernes' THEN 1
        WHEN 'sabado' THEN 2
        WHEN 'domingo' THEN 3
        ELSE 4
      END`, asc(horarios.orden), asc(horarios.hora_inicio))

    const encuentrosPorHorario = await db
      .select({
        torneoId: encuentros.torneo_id,
        horarioId: encuentros.horario_id,
        total: count(encuentros.id)
      })
      .from(encuentros)
      .where(
        and(
          inArray(encuentros.torneo_id, torneoIds),
          isNotNull(encuentros.horario_id)
        )
      )
      .groupBy(encuentros.torneo_id, encuentros.horario_id)

    const usosPorHorario = new Map<number, number>()
    encuentrosPorHorario.forEach(item => {
      if (item.horarioId) {
        usosPorHorario.set(item.horarioId, Number(item.total) || 0)
      }
    })

    const resultado = torneosActivos.map(torneo => {
      const horariosDelTorneo = horariosData.filter(h => h.torneoId === torneo.id)
      const detallesHorarios = horariosDelTorneo.map(horario => {
        const totalEncuentros = usosPorHorario.get(horario.id) || 0
        const dia = (horario.dia as (typeof DIAS_HORARIOS)[number]) || 'viernes'
        return {
          id: horario.id,
          dia,
          labelDia: DIA_LABELS[dia],
          hora: horario.hora,
          cubierto: totalEncuentros > 0,
          totalEncuentros
        }
      })

      const totalHorarios = detallesHorarios.length
      const horariosCubiertos = detallesHorarios.filter(h => h.cubierto).length
      const dias = DIAS_HORARIOS.map(dia => {
        const itemsDia = detallesHorarios.filter(h => h.dia === dia)
        const cubiertosDia = itemsDia.filter(h => h.cubierto).length
        return {
          dia,
          label: DIA_LABELS[dia],
          totalHorarios: itemsDia.length,
          cubiertos: cubiertosDia,
          libres: itemsDia.length - cubiertosDia
        }
      })

      return {
        torneoId: torneo.id,
        torneo: torneo.nombre,
        estado: torneo.estado,
        categoria: torneo.categoriaNombre,
        totales: {
          totalHorarios,
          horariosCubiertos,
          horariosLibres: Math.max(totalHorarios - horariosCubiertos, 0),
          coberturaPorcentaje: totalHorarios === 0 ? 0 : Math.round((horariosCubiertos / totalHorarios) * 100)
        },
        dias,
        horarios: detallesHorarios
      }
    })

    return resultado
  } catch (error) {
    console.error('Error al generar mapa general de horarios:', error)
    throw new Error('No se pudo generar el mapa general de horarios')
  }
}

export async function getMapaHorariosCanchasGeneral() {
  try {
    const torneosActivos = await db
      .select({
        id: torneos.id,
        nombre: torneos.nombre,
        estado: torneos.estado,
        categoriaId: torneos.categoria_id,
        categoriaNombre: categorias.nombre
      })
      .from(torneos)
      .leftJoin(categorias, eq(torneos.categoria_id, categorias.id))
      .where(inArray(torneos.estado, ['planificado', 'en_curso']))
      .orderBy(asc(torneos.fecha_inicio))

    if (torneosActivos.length === 0) return []

    const torneoIds = torneosActivos.map(t => t.id)

    // Horarios por torneo
    const horariosData = await db
      .select({
        id: horarios.id,
        torneoId: horarios.torneo_id,
        dia: horarios.dia_semana,
        hora: horarios.hora_inicio,
        orden: horarios.orden
      })
      .from(horarios)
      .where(inArray(horarios.torneo_id, torneoIds))
      .orderBy(sql`CASE ${horarios.dia_semana}
        WHEN 'viernes' THEN 1
        WHEN 'sabado' THEN 2
        WHEN 'domingo' THEN 3
        ELSE 4
      END`, asc(horarios.orden), asc(horarios.hora_inicio))

    // Canchas por categoría (activas)
    const canchasData = await db
      .select({
        torneoId: torneos.id,
        canchaId: canchas.id,
        canchaNombre: canchas.nombre,
        canchaEstado: canchas.estado
      })
      .from(torneos)
      .innerJoin(canchasCategorias, eq(torneos.categoria_id, canchasCategorias.categoria_id))
      .innerJoin(canchas, eq(canchasCategorias.cancha_id, canchas.id))
      .where(inArray(torneos.id, torneoIds))

    // Encuentros: necesitamos (torneo, horario_id, cancha_nombre) -> count
    const encuentrosData = await db
      .select({
        torneoId: encuentros.torneo_id,
        horarioId: encuentros.horario_id,
        cancha: encuentros.cancha,
        total: count(encuentros.id)
      })
      .from(encuentros)
      .where(and(inArray(encuentros.torneo_id, torneoIds), isNotNull(encuentros.horario_id)))
      .groupBy(encuentros.torneo_id, encuentros.horario_id, encuentros.cancha)

    // Indexar usos por (torneoId, horarioId, canchaNombre)
    const usos = new Map<string, number>()
    for (const e of encuentrosData) {
      if (!e.horarioId || !e.cancha) continue
      usos.set(`${e.torneoId}-${e.horarioId}-${e.cancha}`, Number(e.total) || 0)
    }

    // Armar resultado
    const resultado = torneosActivos.map(t => {
      const horariosTorneo = horariosData.filter(h => h.torneoId === t.id)
      const canchasTorneo = canchasData
        .filter(c => c.torneoId === t.id && c.canchaEstado)
        .map(c => ({ id: c.canchaId, nombre: c.canchaNombre }))
        // ordenar por nombre para consistencia
        .sort((a, b) => a.nombre.localeCompare(b.nombre))

      // Filas = horarios, Columnas = canchas
      const filas = horariosTorneo.map(h => {
        const dia = (h.dia as (typeof DIAS_HORARIOS)[number]) || 'viernes'
        const celdas = canchasTorneo.map(c => {
          const key = `${t.id}-${h.id}-${c.nombre}`
          const total = usos.get(key) || 0
          return {
            canchaId: c.id,
            cancha: c.nombre,
            cubierto: total > 0,
            totalEncuentros: total
          }
        })
        const cubiertas = celdas.filter(c => c.cubierto).length
        return {
          horarioId: h.id,
          dia,
          labelDia: DIA_LABELS[dia],
          hora: h.hora,
          celdas,
          resumen: {
            cubiertas,
            libres: Math.max(canchasTorneo.length - cubiertas, 0)
          }
        }
      })

      return {
        torneoId: t.id,
        torneo: t.nombre,
        estado: t.estado,
        categoria: t.categoriaNombre,
        canchas: canchasTorneo,
        filas
      }
    })

    return resultado
  } catch (error) {
    console.error('Error al generar mapa horarios-canchas:', error)
    throw new Error('No se pudo generar el mapa de horarios y canchas')
  }
}
export async function getEquiposDescansan(torneoId: number) {
  try {
    const descansos = await equiposDescansanQueries.getByTorneoId(torneoId)
    const equiposDescansanFromDB: Record<number, number[]> = {}
    
    descansos.forEach((descanso: any) => {
      if (!equiposDescansanFromDB[descanso.jornada]) {
        equiposDescansanFromDB[descanso.jornada] = []
      }
      equiposDescansanFromDB[descanso.jornada].push(descanso.equipo_id)
    })
    
    return equiposDescansanFromDB
  } catch (error) {
    throw new Error('Error al obtener equipos que descansan')
  }
}

export async function limpiarDescansos(torneoId: number) {
  try {
    await equiposDescansanQueries.deleteByTorneoId(torneoId)
    revalidatePath(`/torneos/${torneoId}`)
    return { mensaje: 'Descansos limpiados exitosamente' }
  } catch (error) {
    throw new Error('Error al limpiar descansos')
  }
}

export async function createTorneo(formData: FormData) {
  await requirePermiso('torneos', 'crear')
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
  await requirePermiso('torneos', 'editar')
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
  await requirePermiso('torneos', 'eliminar')
  try {
    // 1. Obtener todos los encuentros del torneo
    const encuentros = await encuentroQueries.getByTorneoId(id)
    
    // 2. Eliminar datos relacionados de cada encuentro
    for (const encuentro of encuentros) {
      // Eliminar tarjetas del encuentro
      await db.delete(tarjetas).where(eq(tarjetas.encuentro_id, encuentro.id))
      // Eliminar goles del encuentro
      await db.delete(goles).where(eq(goles.encuentro_id, encuentro.id))
      // Eliminar jugadores participantes del encuentro
      await db.delete(jugadoresParticipantes).where(eq(jugadoresParticipantes.encuentro_id, encuentro.id))
      // Eliminar cambios de jugadores del encuentro
      await db.delete(cambiosJugadores).where(eq(cambiosJugadores.encuentro_id, encuentro.id))
      // Eliminar firmas del encuentro
      await db.delete(firmasEncuentros).where(eq(firmasEncuentros.encuentro_id, encuentro.id))
    }
    
    // 3. Eliminar todos los encuentros del torneo
    await encuentroQueries.deleteByTorneoId(id)
    
    // 4. Eliminar equipos del torneo
    await db.delete(equiposTorneo).where(eq(equiposTorneo.torneo_id, id))
    
    // 5. Eliminar descansos del torneo
    await equiposDescansanQueries.deleteByTorneoId(id)
    
    // 6. Finalmente eliminar el torneo
    await torneoQueries.delete(id)
    revalidatePath('/torneos')
  } catch (error) {
    console.error('Error al eliminar torneo:', error)
    throw new Error(`Error al eliminar torneo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
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
    intercambiosInteligentes?: boolean
  } = {}
) {
  try {
    // Verificar que el torneo existe
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    // Verificar si hay encuentros existentes
    const encuentrosExistentes = await encuentroQueries.getByTorneoId(torneoId)
    
    if (encuentrosExistentes.length > 0) {
      // Verificar si hay dependencias asociadas a los encuentros
      const encuentrosIds = encuentrosExistentes.map(e => e.id)
      
      // Verificar tarjetas
      const tarjetasExistentes = await db.select({ count: count() })
        .from(tarjetas)
        .where(inArray(tarjetas.encuentro_id, encuentrosIds))
      
      // Verificar goles
      const golesExistentes = await db.select({ count: count() })
        .from(goles)
        .where(inArray(goles.encuentro_id, encuentrosIds))
      
      // Verificar jugadores participantes
      const jugadoresParticipantesExistentes = await db.select({ count: count() })
        .from(jugadoresParticipantes)
        .where(inArray(jugadoresParticipantes.encuentro_id, encuentrosIds))
      
      // Verificar cambios de jugadores
      const cambiosJugadoresExistentes = await db.select({ count: count() })
        .from(cambiosJugadores)
        .where(inArray(cambiosJugadores.encuentro_id, encuentrosIds))
      
      // Verificar firmas
      const firmasExistentes = await db.select({ count: count() })
        .from(firmasEncuentros)
        .where(inArray(firmasEncuentros.encuentro_id, encuentrosIds))
      
      // Construir lista de dependencias encontradas
      const dependenciasEncontradas: string[] = []
      if (tarjetasExistentes.length > 0 && tarjetasExistentes[0].count > 0) {
        dependenciasEncontradas.push('tarjetas')
      }
      if (golesExistentes.length > 0 && golesExistentes[0].count > 0) {
        dependenciasEncontradas.push('goles')
      }
      if (jugadoresParticipantesExistentes.length > 0 && jugadoresParticipantesExistentes[0].count > 0) {
        dependenciasEncontradas.push('jugadores participantes')
      }
      if (cambiosJugadoresExistentes.length > 0 && cambiosJugadoresExistentes[0].count > 0) {
        dependenciasEncontradas.push('cambios de jugadores')
      }
      if (firmasExistentes.length > 0 && firmasExistentes[0].count > 0) {
        dependenciasEncontradas.push('firmas')
      }
      
      // Si hay dependencias, bloquear la generación
      if (dependenciasEncontradas.length > 0) {
        const dependenciasTexto = dependenciasEncontradas.join(', ')
        throw new Error(
          `No se puede generar el fixture porque hay dependencias asociadas a los encuentros existentes: ${dependenciasTexto}. ` +
          'Por favor, elimina manualmente estas dependencias antes de regenerar el fixture.'
        )
      }

      // Si no hay dependencias, eliminar encuentros existentes
      await encuentroQueries.deleteByTorneoId(torneoId)
    }

    // Generar nuevo fixture
    const fixtureResult = await generateFixture(equipos, torneoId, {
      permiteRevancha: Boolean(torneo.permite_revancha ?? false),
      fechaInicio: options.fechaInicio || new Date(String(torneo.fecha_inicio)),
      diasEntreJornadas: options.diasEntreJornadas || 7,
      canchas: options.canchas || ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: options.arbitros || ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      intercambiosInteligentes: options.intercambiosInteligentes ?? true,
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
    console.error('❌ Error al generar fixture:', {
      torneoId,
      equiposCount: equipos.length,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      options
    })
    
    // Si el error ya tiene un mensaje descriptivo sobre dependencias, lanzarlo tal cual
    if (error instanceof Error && error.message.includes('dependencias')) {
      throw error
    }
    
    // Si es otro tipo de error, agregar información sobre dependencias
    const errorMessage = error instanceof Error 
      ? `Error al generar fixture: ${error.message}. Si el problema persiste, verifica que no haya dependencias (tarjetas, goles, jugadores participantes, cambios o firmas) asociadas a los encuentros existentes.`
      : 'Error al generar fixture: Error desconocido. Verifica que no haya dependencias asociadas a los encuentros existentes.'
    
    throw new Error(errorMessage)
  }
}

export async function updateEncuentro(id: number, formData: FormData) {
  try {
    const goles_local = parseInt(formData.get('goles_local') as string) || null
    const goles_visitante = parseInt(formData.get('goles_visitante') as string) || null
    const estado = formData.get('estado') as string
    const fecha_jugada = formData.get('fecha_jugada') ? new Date(formData.get('fecha_jugada') as string) : null
    const fecha_programada = formData.get('fecha_programada') ? (formData.get('fecha_programada') as string === '' ? null : new Date(formData.get('fecha_programada') as string)) : undefined
    const cancha = formData.get('cancha') as string
    const arbitro = formData.get('arbitro') as string
    const observaciones = formData.get('observaciones') as string
    const horario_id = formData.get('horario_id') ? (formData.get('horario_id') as string === '' ? null : parseInt(formData.get('horario_id') as string)) : undefined

    const encuentroData: any = {
      estado,
      cancha: cancha || null,
      arbitro: arbitro || null,
      observaciones: observaciones || null,
    }

    if (fecha_programada !== undefined) {
      encuentroData.fecha_programada = fecha_programada
    }

    if (horario_id !== undefined) {
      encuentroData.horario_id = horario_id
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

export async function updateEstadoEncuentro(id: number, estado: string) {
  try {
    const encuentroData: any = {
      estado,
    }

    // Si el estado es 'finalizado' o 'en_curso', actualizar fecha_jugada
    if (estado === 'finalizado' || estado === 'en_curso') {
      encuentroData.fecha_jugada = new Date()
    }

    await encuentroQueries.update(id, encuentroData)
    revalidatePath('/torneos')
    return { success: true, message: `Estado del encuentro actualizado a: ${estado}` }
  } catch (error) {
    throw new Error('Error al actualizar estado del encuentro')
  }
}

export async function deleteEncuentro(id: number) {
  try {
    await encuentroQueries.delete(id)
    revalidatePath('/torneos')
    return { success: true, message: 'Encuentro eliminado exitosamente' }
  } catch (error) {
    throw new Error('Error al eliminar encuentro')
  }
}

export async function getEncuentrosByTorneo(torneoId: number) {
  try {
    return await encuentroQueries.getByTorneoId(torneoId)
  } catch (error) {
    throw new Error('Error al obtener encuentros')
  }
}

export async function getEncuentroById(id: number) {
  try {
    // Obtener todos los encuentros y filtrar por ID
    const encuentros = await encuentroQueries.getByTorneoId(0) // Obtener todos
    return encuentros.find(e => e.id === id)
  } catch (error) {
    throw new Error('Error al obtener encuentro')
  }
}

export async function getEncuentrosByJornada(torneoId: number, jornada: number) {
  try {
    return await encuentroQueries.getByJornada(torneoId, jornada)
  } catch (error) {
    throw new Error('Error al obtener encuentros de la jornada')
  }
}

export async function regenerateFixtureFromJornada(
  torneoId: number,
  desdeJornada: number,
  options: {
    diasEntreJornadas?: number
    canchas?: string[]
    arbitros?: string[]
    intercambiosInteligentes?: boolean
  } = {}
) {
  try {
    // Verificar que el torneo existe
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    // Obtener todos los encuentros del torneo
    const todosEncuentros = await encuentroQueries.getByTorneoId(torneoId)
    
    // Separar encuentros jugados y futuros
    const encuentrosJugados = todosEncuentros.filter(e => 
      e.jornada! < desdeJornada || 
      e.estado === 'finalizado' || 
      e.estado === 'en_curso'
    )
    
    const encuentrosAFuturo = todosEncuentros.filter(e => 
      e.jornada! >= desdeJornada && 
      e.estado === 'programado'
    )

    // Eliminar solo los encuentros futuros
    for (const encuentro of encuentrosAFuturo) {
      await encuentroQueries.delete(encuentro.id)
    }

    // Obtener equipos del torneo
    const equiposTorneo = torneo.equiposTorneo || []
    const equipos = equiposTorneo.map(et => et.equipo!).filter(e => e)

    // Calcular la fecha de inicio para las nuevas jornadas
    const ultimaFechaJugada = encuentrosJugados.length > 0 
      ? Math.max(...encuentrosJugados.map(e => e.fecha_programada ? new Date(e.fecha_programada).getTime() : 0))
      : new Date(String(torneo.fecha_inicio)).getTime()
    
    const fechaInicioNuevas = new Date(ultimaFechaJugada)
    fechaInicioNuevas.setDate(fechaInicioNuevas.getDate() + (options.diasEntreJornadas || 7))

    // Generar nuevo fixture solo para las jornadas futuras
    const fixtureResult = await generateFixture(equipos, torneoId, {
      permiteRevancha: Boolean(torneo.permite_revancha ?? false),
      fechaInicio: fechaInicioNuevas,
      diasEntreJornadas: options.diasEntreJornadas || 7,
      canchas: options.canchas || ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: options.arbitros || ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      jornadaInicial: desdeJornada, // Nueva opción para empezar desde una jornada específica
      intercambiosInteligentes: options.intercambiosInteligentes ?? true,
      encuentrosExistentes: encuentrosJugados, // Pasar encuentros ya jugados para evitar repeticiones
    })

    // Filtrar solo los encuentros de las jornadas futuras
    const encuentrosFuturos = fixtureResult.encuentros.filter(e => e.jornada! >= desdeJornada)

    // Crear los nuevos encuentros
    for (const encuentro of encuentrosFuturos) {
      await encuentroQueries.create(encuentro)
    }

    revalidatePath(`/torneos/${torneoId}`)
    return {
      encuentrosCreados: encuentrosFuturos.length,
      encuentrosEliminados: encuentrosAFuturo.length,
      equiposDescansan: fixtureResult.equiposDescansan
    }
  } catch (error) {
    throw new Error('Error al regenerar fixture')
  }
}

export async function generateSingleJornada(
  torneoId: number,
  jornada: number,
  options: {
    diasEntreJornadas?: number
    canchas?: string[]
    arbitros?: string[]
  } = {}
) {
  try {
    // Verificar que el torneo existe
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    // Verificar que la jornada no existe ya
    const jornadaExistente = await encuentroQueries.getByJornada(torneoId, jornada)
    if (jornadaExistente.length > 0) {
      throw new Error(`La jornada ${jornada} ya existe`)
    }

    // Obtener todos los encuentros del torneo para validar emparejamientos
    const todosEncuentros = await encuentroQueries.getByTorneoId(torneoId)
    
    // Obtener descansos guardados en la base de datos
    const descansosGuardados = await equiposDescansanQueries.getByTorneoId(torneoId)
    console.log(`Descansos guardados en BD para torneo ${torneoId}:`, descansosGuardados)
    
    // Obtener equipos del torneo
    const equiposTorneo = torneo.equiposTorneo || []
    const equipos = equiposTorneo.map(et => et.equipo!).filter(e => e)

    // Calcular la fecha para esta jornada
    const fechaInicio = new Date(String(torneo.fecha_inicio))
    const fechaJornada = new Date(fechaInicio)
    fechaJornada.setDate(fechaInicio.getDate() + (jornada - 1) * (options.diasEntreJornadas || 7))

    console.log(`Generando fixture para jornada ${jornada} con ${equipos.length} equipos`)
    console.log(`Número de equipos: ${equipos.length} (${equipos.length % 2 === 0 ? 'par' : 'impar'})`)
    
    // Generar solo esta jornada
    const fixtureResult = await generateFixture(equipos, torneoId, {
      permiteRevancha: Boolean(torneo.permite_revancha ?? false),
      fechaInicio: fechaJornada,
      diasEntreJornadas: options.diasEntreJornadas || 7,
      canchas: options.canchas || ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: options.arbitros || ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      jornadaInicial: jornada,
      jornadaFinal: jornada, // Solo generar esta jornada
      encuentrosExistentes: todosEncuentros, // Pasar todos los encuentros existentes
    })

    // Filtrar solo los encuentros de esta jornada
    const encuentrosJornada = fixtureResult.encuentros.filter(e => e.jornada === jornada)

    // Guardar los encuentros de esta jornada
    for (const encuentro of encuentrosJornada) {
      await encuentroQueries.create(encuentro)
    }

    // Guardar el descanso en la base de datos
    console.log(`FixtureResult equiposDescansan:`, fixtureResult.equiposDescansan)
    console.log(`Jornada ${jornada} - Equipo que descansa:`, fixtureResult.equiposDescansan?.[jornada])
    
    if (fixtureResult.equiposDescansan?.[jornada]) {
      const equipoQueDescansa = fixtureResult.equiposDescansan[jornada]
      console.log(`Intentando guardar descanso para equipo ${equipoQueDescansa} en jornada ${jornada}`)
      
      try {
        // Verificar si ya existe un descanso para esta jornada
        const descansoExistente = await equiposDescansanQueries.getByJornada(torneoId, jornada)
        console.log(`Descanso existente para jornada ${jornada}:`, descansoExistente)
        
        if (descansoExistente) {
          // Actualizar el descanso existente
          console.log(`Eliminando descanso existente para jornada ${jornada}`)
          await equiposDescansanQueries.deleteByJornada(torneoId, jornada)
        }
        
        // Crear el nuevo registro de descanso
        console.log(`Creando nuevo descanso:`, { torneo_id: torneoId, equipo_id: equipoQueDescansa, jornada: jornada })
        const descansoCreado = await equiposDescansanQueries.create({
          torneo_id: torneoId,
          equipo_id: equipoQueDescansa,
          jornada: jornada
        })
        
        console.log(`Descanso guardado exitosamente en BD:`, descansoCreado)
      } catch (error) {
        console.error(`Error al guardar descanso:`, error)
        throw new Error(`Error al guardar descanso: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    } else {
      console.log(`No hay descanso para guardar en jornada ${jornada}`)
    }

    revalidatePath(`/torneos/${torneoId}`)
    return {
      encuentrosCreados: encuentrosJornada.length,
      equipoQueDescansa: fixtureResult.equiposDescansan?.[jornada],
      jornada: jornada
    }
  } catch (error) {
    throw new Error(`Error al generar jornada ${jornada}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

export async function regenerateSingleJornada(
  torneoId: number,
  jornada: number,
  options: {
    diasEntreJornadas?: number
    canchas?: string[]
    arbitros?: string[]
  } = {}
) {
  try {
    // Verificar que el torneo existe
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    // Verificar que la jornada existe
    const jornadaExistente = await encuentroQueries.getByJornada(torneoId, jornada)
    if (jornadaExistente.length === 0) {
      throw new Error(`La jornada ${jornada} no existe`)
    }

    // Verificar que la jornada no esté cerrada (jugada)
    const jornadaCerrada = jornadaExistente.every(encuentro => 
      encuentro.estado === 'finalizado' || encuentro.estado === 'en_curso'
    )
    if (jornadaCerrada) {
      throw new Error(`La jornada ${jornada} está cerrada (ya fue jugada) y no se puede regenerar`)
    }

    // Obtener todos los encuentros del torneo para validar emparejamientos
    const todosEncuentros = await encuentroQueries.getByTorneoId(torneoId)
    
    // Obtener descansos guardados en la base de datos
    const descansosGuardados = await equiposDescansanQueries.getByTorneoId(torneoId)
    console.log(`Descansos guardados en BD para torneo ${torneoId}:`, descansosGuardados)
    
    // Obtener equipos del torneo
    const equiposTorneo = torneo.equiposTorneo || []
    const equipos = equiposTorneo.map(et => et.equipo!).filter(e => e)

    // Calcular la fecha para esta jornada
    const fechaInicio = new Date(String(torneo.fecha_inicio))
    const fechaJornada = new Date(fechaInicio)
    fechaJornada.setDate(fechaInicio.getDate() + (jornada - 1) * (options.diasEntreJornadas || 7))

    console.log(`Regenerando fixture para jornada ${jornada} con ${equipos.length} equipos`)
    console.log(`Número de equipos: ${equipos.length} (${equipos.length % 2 === 0 ? 'par' : 'impar'})`)
    
    // Eliminar encuentros existentes de esta jornada
    for (const encuentro of jornadaExistente) {
      await encuentroQueries.delete(encuentro.id)
    }

    // Eliminar descanso existente de esta jornada
    const descansoExistente = await equiposDescansanQueries.getByJornada(torneoId, jornada)
    if (descansoExistente) {
      await equiposDescansanQueries.deleteByJornada(torneoId, jornada)
    }
    
    // Generar solo esta jornada
    const fixtureResult = await generateFixture(equipos, torneoId, {
      permiteRevancha: Boolean(torneo.permite_revancha ?? false),
      fechaInicio: fechaJornada,
      diasEntreJornadas: options.diasEntreJornadas || 7,
      canchas: options.canchas || ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: options.arbitros || ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      jornadaInicial: jornada,
      jornadaFinal: jornada, // Solo generar esta jornada
      encuentrosExistentes: todosEncuentros.filter(e => e.jornada !== jornada), // Excluir encuentros de esta jornada
    })

    // Filtrar solo los encuentros de esta jornada
    const encuentrosJornada = fixtureResult.encuentros.filter(e => e.jornada === jornada)

    // Guardar los encuentros de esta jornada
    for (const encuentro of encuentrosJornada) {
      await encuentroQueries.create(encuentro)
    }

    // Guardar el descanso en la base de datos
    console.log(`FixtureResult equiposDescansan:`, fixtureResult.equiposDescansan)
    console.log(`Jornada ${jornada} - Equipo que descansa:`, fixtureResult.equiposDescansan?.[jornada])
    
    if (fixtureResult.equiposDescansan?.[jornada]) {
      const equipoQueDescansa = fixtureResult.equiposDescansan[jornada]
      console.log(`Intentando guardar descanso para equipo ${equipoQueDescansa} en jornada ${jornada}`)
      
      try {
        // Crear el nuevo registro de descanso
        console.log(`Creando nuevo descanso:`, { torneo_id: torneoId, equipo_id: equipoQueDescansa, jornada: jornada })
        const descansoCreado = await equiposDescansanQueries.create({
          torneo_id: torneoId,
          equipo_id: equipoQueDescansa,
          jornada: jornada
        })
        
        console.log(`Descanso guardado exitosamente en BD:`, descansoCreado)
      } catch (error) {
        console.error(`Error al guardar descanso:`, error)
        throw new Error(`Error al guardar descanso: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    } else {
      console.log(`No hay descanso para guardar en jornada ${jornada}`)
    }

    revalidatePath(`/torneos/${torneoId}`)
    return {
      encuentrosCreados: encuentrosJornada.length,
      encuentrosEliminados: jornadaExistente.length,
      equipoQueDescansa: fixtureResult.equiposDescansan?.[jornada],
      jornada: jornada
    }
  } catch (error) {
    throw new Error(`Error al regenerar jornada ${jornada}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

export async function deleteJornada(
  torneoId: number,
  jornada: number
) {
  try {
    // Verificar que el torneo existe
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    // Obtener todos los encuentros de la jornada
    const encuentrosJornada = await encuentroQueries.getByJornada(torneoId, jornada)
    if (encuentrosJornada.length === 0) {
      throw new Error(`La jornada ${jornada} no existe`)
    }

    // Verificar que la jornada no esté cerrada (jugada)
    const jornadaCerrada = encuentrosJornada.every(encuentro => 
      encuentro.estado === 'finalizado' || encuentro.estado === 'en_curso'
    )
    if (jornadaCerrada) {
      throw new Error(`La jornada ${jornada} está cerrada (ya fue jugada) y no se puede eliminar`)
    }

    // Verificar si hay dependencias asociadas a los encuentros
    const encuentrosIds = encuentrosJornada.map(e => e.id)
    
    // Verificar tarjetas
    const tarjetasExistentes = await db.select({ count: count() })
      .from(tarjetas)
      .where(inArray(tarjetas.encuentro_id, encuentrosIds))
    
    // Verificar goles
    const golesExistentes = await db.select({ count: count() })
      .from(goles)
      .where(inArray(goles.encuentro_id, encuentrosIds))
    
    // Verificar jugadores participantes
    const jugadoresParticipantesExistentes = await db.select({ count: count() })
      .from(jugadoresParticipantes)
      .where(inArray(jugadoresParticipantes.encuentro_id, encuentrosIds))
    
    // Verificar cambios de jugadores
    const cambiosJugadoresExistentes = await db.select({ count: count() })
      .from(cambiosJugadores)
      .where(inArray(cambiosJugadores.encuentro_id, encuentrosIds))
    
    // Verificar firmas
    const firmasExistentes = await db.select({ count: count() })
      .from(firmasEncuentros)
      .where(inArray(firmasEncuentros.encuentro_id, encuentrosIds))
    
    // Construir lista de dependencias encontradas
    const dependenciasEncontradas: string[] = []
    if (tarjetasExistentes.length > 0 && tarjetasExistentes[0].count > 0) {
      dependenciasEncontradas.push('tarjetas')
    }
    if (golesExistentes.length > 0 && golesExistentes[0].count > 0) {
      dependenciasEncontradas.push('goles')
    }
    if (jugadoresParticipantesExistentes.length > 0 && jugadoresParticipantesExistentes[0].count > 0) {
      dependenciasEncontradas.push('jugadores participantes')
    }
    if (cambiosJugadoresExistentes.length > 0 && cambiosJugadoresExistentes[0].count > 0) {
      dependenciasEncontradas.push('cambios de jugadores')
    }
    if (firmasExistentes.length > 0 && firmasExistentes[0].count > 0) {
      dependenciasEncontradas.push('firmas')
    }
    
    // Si hay dependencias, bloquear la eliminación
    if (dependenciasEncontradas.length > 0) {
      const dependenciasTexto = dependenciasEncontradas.join(', ')
      throw new Error(
        `No se puede eliminar la jornada ${jornada} porque hay dependencias asociadas a los encuentros: ${dependenciasTexto}. ` +
        'Por favor, elimina manualmente estas dependencias antes de eliminar la jornada.'
      )
    }

    // Eliminar todos los encuentros de la jornada
    let encuentrosEliminados = 0
    for (const encuentro of encuentrosJornada) {
      await encuentroQueries.delete(encuentro.id)
      encuentrosEliminados++
    }

    // Eliminar el registro de descanso de esta jornada si existe
    let descansoEliminado = false
    const descansoExistente = await equiposDescansanQueries.getByJornada(torneoId, jornada)
    if (descansoExistente) {
      await equiposDescansanQueries.deleteByJornada(torneoId, jornada)
      descansoEliminado = true
    }

    revalidatePath(`/torneos/${torneoId}`)
    return {
      jornada: jornada,
      encuentrosEliminados: encuentrosEliminados,
      descansoEliminado: descansoEliminado,
      mensaje: `Jornada ${jornada} eliminada exitosamente`
    }
  } catch (error) {
    console.error('❌ Error al eliminar jornada:', {
      torneoId,
      jornada,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Si el error ya tiene un mensaje descriptivo sobre dependencias, lanzarlo tal cual
    if (error instanceof Error && error.message.includes('dependencias')) {
      throw error
    }
    
    const errorMessage = error instanceof Error 
      ? `Error al eliminar jornada ${jornada}: ${error.message}`
      : `Error al eliminar jornada ${jornada}: Error desconocido`
    
    throw new Error(errorMessage)
  }
}

export async function crearJornadaConEmparejamientos(
  torneoId: number,
  emparejamientos: Array<{equipo1: {id: number, nombre: string}, equipo2: {id: number, nombre: string}}>,
  fecha?: Date
) {
  try {
    // Obtener encuentros existentes para calcular la próxima jornada
    const encuentrosExistentes = await encuentroQueries.getByTorneoId(torneoId)
    const jornadasExistentes = [...new Set(encuentrosExistentes.map(e => e.jornada).filter((j): j is number => j !== null))]
    const proximaJornada = jornadasExistentes.length > 0 ? Math.max(...jornadasExistentes) + 1 : 1
    
    let encuentrosCreados = 0
    
    // Usar la fecha proporcionada o la fecha actual como fallback
    const fechaEncuentros = fecha || new Date()
    
    // Crear encuentros para cada emparejamiento
    for (const emparejamiento of emparejamientos) {
      const nuevoEncuentro = {
        torneo_id: torneoId,
        jornada: proximaJornada,
        equipo_local_id: emparejamiento.equipo1.id,
        equipo_visitante_id: emparejamiento.equipo2.id,
        fecha_programada: fechaEncuentros,
        estado: 'programado' as const,
        cancha: '',
        observaciones: `Emparejamiento seleccionado manualmente`
      }
      
      await encuentroQueries.create(nuevoEncuentro)
      encuentrosCreados++
    }
    
    // Manejar equipos que descansan si hay número impar de equipos
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    const equiposParticipantes = torneo?.equiposTorneo || []
    const equiposEnJornada = new Set<number>()
    
    // Recopilar todos los equipos que juegan en esta jornada
    emparejamientos.forEach(emp => {
      equiposEnJornada.add(emp.equipo1.id)
      equiposEnJornada.add(emp.equipo2.id)
    })
    
    // Si hay número impar de equipos, identificar quién descansa
    if (equiposParticipantes.length % 2 === 1) {
      const equiposQueDescansan = equiposParticipantes
        .filter(et => !equiposEnJornada.has(et.equipo_id))
        .map(et => et.equipo_id)
      
      if (equiposQueDescansan.length > 0) {
        // Guardar el descanso en la base de datos
        for (const equipoId of equiposQueDescansan) {
          await equiposDescansanQueries.create({
            torneo_id: torneoId,
            jornada: proximaJornada,
            equipo_id: equipoId
          })
        }
      }
    }
    
    revalidatePath(`/torneos/${torneoId}`)
    
    return {
      mensaje: `Jornada ${proximaJornada} creada con ${encuentrosCreados} encuentro(s) seleccionado(s)`,
      encuentrosCreados,
      jornada: proximaJornada
    }
  } catch (error) {
    throw new Error(`Error al crear jornada con emparejamientos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

export async function updateFechaJornada(
  torneoId: number,
  jornada: number,
  fecha: Date
) {
  try {
    await requirePermiso('torneos', 'editar')
    
    const encuentrosActualizados = await encuentroQueries.updateFechaByJornada(
      torneoId,
      jornada,
      fecha
    )

    revalidatePath(`/torneos/${torneoId}`)
    revalidatePath('/fixture')

    return {
      success: true,
      mensaje: `Fecha de la jornada ${jornada} actualizada correctamente`,
      encuentrosActualizados: encuentrosActualizados.length
    }
  } catch (error) {
    throw new Error(`Error al actualizar fecha de jornada: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

export async function generarTablaDistribucionCanchas(torneoId: number) {
  try {
    const { db } = await import('@/db')
    const { encuentros, equipos, equiposTorneo } = await import('@/db/schema')
    const { eq, and, isNotNull } = await import('drizzle-orm')
    
    // Obtener todos los encuentros del torneo con canchas asignadas
    const encuentrosData = await db
      .select({
        id: encuentros.id,
        equipo_local_id: encuentros.equipo_local_id,
        equipo_visitante_id: encuentros.equipo_visitante_id,
        cancha: encuentros.cancha,
        jornada: encuentros.jornada
      })
      .from(encuentros)
      .where(
        and(
          eq(encuentros.torneo_id, torneoId),
          isNotNull(encuentros.cancha)
        )
      )
      .orderBy(encuentros.jornada, encuentros.id)

    // Obtener equipos del torneo
    const equiposData = await db
      .select({
        id: equipos.id,
        nombre: equipos.nombre
      })
      .from(equipos)
      .innerJoin(equiposTorneo, eq(equipos.id, equiposTorneo.equipo_id))
      .where(eq(equiposTorneo.torneo_id, torneoId))
      .orderBy(equipos.nombre)

    // Obtener canchas únicas del torneo (las que se han usado en encuentros)
    const canchasUsadas = [...new Set(encuentrosData
      .map(e => e.cancha)
      .filter((cancha): cancha is string => cancha !== null && cancha.trim() !== '')
    )].sort()

    // Crear mapa de distribución
    const distribucion: Record<number, Record<string, number>> = {}
    
    // Inicializar contadores en 0
    equiposData.forEach(equipo => {
      distribucion[equipo.id] = {}
      canchasUsadas.forEach(cancha => {
        distribucion[equipo.id][cancha] = 0
      })
    })

    // Contar encuentros por equipo y cancha
    encuentrosData.forEach(encuentro => {
      if (encuentro.cancha && encuentro.cancha.trim() !== '') {
        // Contar para equipo local
        if (distribucion[encuentro.equipo_local_id]) {
          distribucion[encuentro.equipo_local_id][encuentro.cancha] = 
            (distribucion[encuentro.equipo_local_id][encuentro.cancha] || 0) + 1
        }
        // Contar para equipo visitante
        if (distribucion[encuentro.equipo_visitante_id]) {
          distribucion[encuentro.equipo_visitante_id][encuentro.cancha] = 
            (distribucion[encuentro.equipo_visitante_id][encuentro.cancha] || 0) + 1
        }
      }
    })

    // Calcular estadísticas
    const totalJornadas = Math.max(...encuentrosData.map(e => e.jornada || 0), 0)
    const totalCanchas = canchasUsadas.length
    const vecesPorCancha = totalJornadas > 0 && totalCanchas > 0 ? totalJornadas / totalCanchas : 0
    const vecesMinimas = Math.floor(vecesPorCancha)
    const vecesMaximas = Math.ceil(vecesPorCancha)

    // Generar tabla
    const tabla = {
      equipos: equiposData.map(equipo => ({
        id: equipo.id,
        nombre: equipo.nombre,
        distribucion: canchasUsadas.map(cancha => ({
          cancha: cancha,
          veces: distribucion[equipo.id][cancha] || 0
        })),
        totalEncuentros: Object.values(distribucion[equipo.id] || {}).reduce((sum, count) => sum + count, 0)
      })),
      canchas: canchasUsadas.map(cancha => ({
        nombre: cancha,
        totalUsos: equiposData.reduce((sum, equipo) => 
          sum + (distribucion[equipo.id][cancha] || 0), 0
        )
      })),
      estadisticas: {
        totalJornadas,
        totalCanchas,
        vecesPorCancha: Math.round(vecesPorCancha * 100) / 100,
        vecesMinimas,
        vecesMaximas,
        equiposConDistribucionEquitativa: equiposData.filter(equipo => {
          const distribucionEquipo = distribucion[equipo.id]
          return Object.values(distribucionEquipo).every(veces => 
            veces >= vecesMinimas && veces <= vecesMaximas
          )
        }).length,
        totalEquipos: equiposData.length
      }
    }

    return {
      success: true,
      tabla,
      resumen: {
        mensaje: `Distribución de canchas para ${equiposData.length} equipos en ${totalJornadas} jornadas`,
        distribucionEquitativa: tabla.estadisticas.equiposConDistribucionEquitativa === equiposData.length,
        porcentajeEquitativo: equiposData.length > 0 
          ? Math.round((tabla.estadisticas.equiposConDistribucionEquitativa / equiposData.length) * 100)
          : 0
      }
    }

  } catch (error) {
    console.error('Error al generar tabla de distribución de canchas:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al generar tabla de distribución de canchas')
  }
}

export async function asignarCanchasAutomaticamente(
  torneoId: number,
  configuracion: {
    reiniciarAsignaciones?: boolean
    soloEncuentrosSinCancha?: boolean
    ordenPorJornada?: boolean
    canchaPrioritariaId?: number | null
  } = {}
) {
  try {
    await requirePermiso('torneos', 'editar')
    
    // Obtener el torneo para obtener su categoría
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }
    
    if (!torneo.categoria_id) {
      throw new Error('El torneo no tiene una categoría asignada')
    }
    
    // Obtener canchas disponibles de la categoría del torneo (solo activas)
    const { getCanchasByCategoriaId } = await import('@/app/(admin)/(apps)/canchas/actions')
    const canchasDisponibles = await getCanchasByCategoriaId(torneo.categoria_id)
    // El resultado del join tiene la estructura { canchas: {...}, canchas_categorias: {...} }
    const canchasActivas = canchasDisponibles
      .map((item: any) => item.canchas || item)
      .filter((cancha: any) => cancha.estado)
    
    if (canchasActivas.length === 0) {
      throw new Error('No hay canchas disponibles para asignar')
    }
    
    // Obtener todos los encuentros del torneo
    let encuentrosDelTorneo = await encuentroQueries.getByTorneoId(torneoId)
    
    if (encuentrosDelTorneo.length === 0) {
      throw new Error('No hay encuentros en el torneo')
    }
    
    // Filtrar encuentros según configuración
    let encuentrosAAsignar = encuentrosDelTorneo
    
    if (configuracion.soloEncuentrosSinCancha) {
      encuentrosAAsignar = encuentrosDelTorneo.filter(
        encuentro => !encuentro.cancha || encuentro.cancha.trim() === ''
      )
    }
    
    if (encuentrosAAsignar.length === 0) {
      return {
        success: true,
        asignacionesRealizadas: 0,
        mensaje: 'No hay encuentros para asignar canchas'
      }
    }
    
    // Si reiniciar asignaciones, limpiar todas las canchas primero
    if (configuracion.reiniciarAsignaciones) {
      for (const encuentro of encuentrosDelTorneo) {
        if (encuentro.cancha) {
          const formData = new FormData()
          formData.append('cancha', '')
          await updateEncuentro(encuentro.id, formData)
        }
      }
      // Recargar los encuentros después de limpiar para tener datos actualizados
      encuentrosDelTorneo = await encuentroQueries.getByTorneoId(torneoId)
      // Actualizar también encuentrosAAsignar si es necesario
      if (configuracion.soloEncuentrosSinCancha) {
        encuentrosAAsignar = encuentrosDelTorneo.filter(
          encuentro => !encuentro.cancha || encuentro.cancha.trim() === ''
        )
      } else {
        encuentrosAAsignar = encuentrosDelTorneo
      }
    }
    
    // Agrupar encuentros por jornada
    const encuentrosPorJornada: Record<number, typeof encuentrosAAsignar> = {}
    for (const encuentro of encuentrosAAsignar) {
      const jornada = encuentro.jornada || 1
      if (!encuentrosPorJornada[jornada]) {
        encuentrosPorJornada[jornada] = []
      }
      encuentrosPorJornada[jornada].push(encuentro)
    }
    
    // Ordenar jornadas
    const jornadasOrdenadas = Object.keys(encuentrosPorJornada)
      .map(Number)
      .sort((a, b) => a - b)
    
    if (canchasActivas.length === 0) {
      throw new Error('No hay canchas disponibles para asignar')
    }
    
    // Verificar si hay cancha prioritaria seleccionada
    const tieneCanchaPrioritaria = configuracion.canchaPrioritariaId !== null && configuracion.canchaPrioritariaId !== undefined
    
    let canchaPrioritaria: any = null
    let canchasRestantes: any[] = []
    let capacidadCanchaPrioritaria = 0
    
    if (tieneCanchaPrioritaria) {
      // Buscar la cancha prioritaria seleccionada
      canchaPrioritaria = canchasActivas.find((cancha: any) => cancha.id === configuracion.canchaPrioritariaId)
      
      if (!canchaPrioritaria) {
        throw new Error('La cancha prioritaria seleccionada no está disponible')
      }
      
      // Separar la cancha prioritaria de las restantes
      canchasRestantes = canchasActivas.filter((cancha: any) => cancha.id !== configuracion.canchaPrioritariaId)
      
      // Obtener el número total de horarios disponibles (capacidad de la cancha prioritaria)
      const { getHorarios } = await import('./horarios-actions')
      const horariosDisponibles = await getHorarios(torneoId)
      capacidadCanchaPrioritaria = horariosDisponibles.length
    } else {
      // Si no hay cancha prioritaria, usar todas las canchas para distribución equitativa
      canchasRestantes = [...canchasActivas]
    }
    
    // Obtener todos los equipos del torneo para rastrear su uso de canchas secundarias
    const { db } = await import('@/db')
    const { equipos, equiposTorneo } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    
    const equiposDelTorneo = await db
      .select({
        id: equipos.id,
        nombre: equipos.nombre
      })
      .from(equipos)
      .innerJoin(equiposTorneo, eq(equipos.id, equiposTorneo.equipo_id))
      .where(eq(equiposTorneo.torneo_id, torneoId))
    
    // Contador total de veces que cada equipo ha jugado en canchas NO priorizadas
    // Estructura: { equipo_id: cantidad_total }
    const contadorEquipoCanchasSecundarias: Record<number, number> = {}
    
    // Contador por equipo y por cancha secundaria específica
    // Estructura: { equipo_id: { cancha_nombre: cantidad } }
    const contadorEquipoCanchaEspecifica: Record<number, Record<string, number>> = {}
    
    // Inicializar contadores
    equiposDelTorneo.forEach(equipo => {
      contadorEquipoCanchasSecundarias[equipo.id] = 0
      contadorEquipoCanchaEspecifica[equipo.id] = {}
      canchasRestantes.forEach((cancha: any) => {
        contadorEquipoCanchaEspecifica[equipo.id][cancha.nombre] = 0
      })
    })
    
    // Contar asignaciones existentes en canchas secundarias
    // Si se reiniciaron las asignaciones, los contadores ya están en 0, así que no hay nada que contar
    if (!configuracion.reiniciarAsignaciones) {
      const nombreCanchaPrioritaria = tieneCanchaPrioritaria ? (canchaPrioritaria as any).nombre : null
      for (const encuentro of encuentrosDelTorneo) {
        if (encuentro.cancha && encuentro.cancha.trim() !== '' && encuentro.cancha !== nombreCanchaPrioritaria) {
          // Es una cancha secundaria
          if (encuentro.equipo_local_id) {
            contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] = 
              (contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0) + 1
            contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][encuentro.cancha] = 
              (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][encuentro.cancha] || 0) + 1
          }
          if (encuentro.equipo_visitante_id) {
            contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] = 
              (contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0) + 1
            contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][encuentro.cancha] = 
              (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][encuentro.cancha] || 0) + 1
          }
        }
      }
    }
    
    // Obtener horarios disponibles ordenados (para asignación dinámica)
    const { getHorarios } = await import('./horarios-actions')
    const horariosDisponibles = await getHorarios(torneoId)
    const horariosOrdenados = horariosDisponibles.sort((a: any, b: any) => {
      // Ordenar por orden si existe, sino por hora_inicio
      if (a.orden !== undefined && b.orden !== undefined) {
        return a.orden - b.orden
      }
      if (a.hora_inicio && b.hora_inicio) {
        return a.hora_inicio.localeCompare(b.hora_inicio)
      }
      return 0
    })
    
    // Máximo estricto: cada equipo puede jugar máximo 2 veces en canchas NO priorizadas (total)
    const maxAparicionesSecundarias = 2
    // Máximo por cancha específica: cada equipo puede jugar máximo 1 vez en cada cancha secundaria
    const maxAparicionesPorCancha = 1
    
    // Contador rotativo para distribución equitativa entre canchas secundarias
    const contadorUsoCanchasSecundarias: Record<string, number> = {}
    canchasRestantes.forEach((cancha: any) => {
      contadorUsoCanchasSecundarias[cancha.nombre] = 0
    })
    
    // Contador de uso de horarios por cancha (para distribución ordenada)
    const usoHorariosPorCancha: Record<string, number> = {}
    if (tieneCanchaPrioritaria) {
      usoHorariosPorCancha[(canchaPrioritaria as any).nombre] = 0
    }
    canchasRestantes.forEach((cancha: any) => {
      usoHorariosPorCancha[cancha.nombre] = 0
    })
    
    let asignacionesRealizadas = 0
    
    // Asignar canchas por jornada
    for (const jornada of jornadasOrdenadas) {
      const encuentrosJornada = encuentrosPorJornada[jornada]
      
      // Filtrar encuentros que aún no tienen cancha asignada
      const encuentrosSinCancha = encuentrosJornada.filter(
        e => !e.cancha || e.cancha.trim() === ''
      )
      
      if (encuentrosSinCancha.length === 0) continue
      
      // Rastrear qué canchas ya tienen encuentros asignados por horario en esta jornada
      // Estructura: { horario_id: { cancha_nombre: true } }
      const canchasPorHorarioEnJornada: Record<number | string, Record<string, boolean>> = {}
      
      // Inicializar con los encuentros que ya tienen cancha asignada en esta jornada
      for (const encuentro of encuentrosJornada) {
        if (encuentro.cancha && encuentro.cancha.trim() !== '') {
          const horarioKey = encuentro.horario_id || 'sin_horario'
          if (!canchasPorHorarioEnJornada[horarioKey]) {
            canchasPorHorarioEnJornada[horarioKey] = {}
          }
          canchasPorHorarioEnJornada[horarioKey][encuentro.cancha] = true
        }
      }
      
      // ESTRATEGIA NUEVA: Asignar primero a la cancha prioritaria hasta completar su capacidad
      // Luego distribuir el resto equitativamente en canchas secundarias
      
      const encuentrosPendientes = [...encuentrosSinCancha]
      const nombreCanchaPrioritaria = tieneCanchaPrioritaria ? (canchaPrioritaria as any).nombre : null
      
      // PASO 1: Asignar encuentros a la cancha prioritaria (uno por cada horario disponible)
      // PRIORIDAD: Llenar la cancha prioritaria hasta completar su capacidad (todos los horarios disponibles)
      if (tieneCanchaPrioritaria && encuentrosPendientes.length > 0) {
        // FASE 1: Asignar encuentros que ya tienen horario a la cancha prioritaria en ese horario
        // IMPORTANTE: Procesar uno por uno y actualizar el registro inmediatamente para evitar conflictos
        const encuentrosConHorario = encuentrosPendientes.filter(e => e.horario_id)
        for (const encuentro of encuentrosConHorario) {
          const horarioKey = encuentro.horario_id ?? 'sin_horario'
          
          // Verificar si la cancha prioritaria ya está ocupada en este horario
          // (verificar después de cada asignación para evitar conflictos)
          const canchaOcupadaEnHorario = nombreCanchaPrioritaria
            ? (canchasPorHorarioEnJornada[horarioKey]?.[nombreCanchaPrioritaria] || false)
            : false
          
          if (!canchaOcupadaEnHorario && nombreCanchaPrioritaria) {
            // Verificar que el encuentro aún está en pendientes (no fue asignado en otra iteración)
            const indexEnPendientes = encuentrosPendientes.indexOf(encuentro)
            if (indexEnPendientes === -1) {
              continue // El encuentro ya fue procesado, saltar
            }
            
            // Asignar cancha prioritaria a este encuentro
            const formData = new FormData()
            formData.append('cancha', nombreCanchaPrioritaria)
            await updateEncuentro(encuentro.id, formData)
            asignacionesRealizadas++
            
            // Registrar la asignación INMEDIATAMENTE para evitar conflictos
            if (!canchasPorHorarioEnJornada[horarioKey]) {
              canchasPorHorarioEnJornada[horarioKey] = {}
            }
            canchasPorHorarioEnJornada[horarioKey][nombreCanchaPrioritaria] = true
            
            // Remover de pendientes INMEDIATAMENTE
            encuentrosPendientes.splice(indexEnPendientes, 1)
            
            usoHorariosPorCancha[nombreCanchaPrioritaria] = 
              (usoHorariosPorCancha[nombreCanchaPrioritaria] || 0) + 1
          }
        }
        
        // FASE 2: Llenar los horarios restantes con encuentros sin horario o reasignar encuentros con horario
        // IMPORTANTE: Solo llenar hasta completar la capacidad de la cancha prioritaria (cantidad de horarios)
        for (let i = 0; i < horariosOrdenados.length && encuentrosPendientes.length > 0; i++) {
          const horario = horariosOrdenados[i]
          const horarioKey = horario.id
          
          // Verificar si la cancha prioritaria ya está ocupada en este horario
          const canchaOcupadaEnHorario = canchasPorHorarioEnJornada[horarioKey]?.[nombreCanchaPrioritaria] || false
          
          if (!canchaOcupadaEnHorario) {
            // PRIORIDAD 1: Buscar un encuentro sin horario
            let encuentroParaAsignar = encuentrosPendientes.find(e => !e.horario_id)
            
            // PRIORIDAD 2: Si no hay encuentro sin horario, buscar cualquier encuentro pendiente
            // (esto asegura que se llene la cancha prioritaria en todos los horarios)
            if (!encuentroParaAsignar && encuentrosPendientes.length > 0) {
              encuentroParaAsignar = encuentrosPendientes[0]
            }
            
            if (encuentroParaAsignar) {
              // Verificar que el encuentro aún está en pendientes (no fue asignado en otra iteración)
              const indexEnPendientes = encuentrosPendientes.indexOf(encuentroParaAsignar)
              if (indexEnPendientes === -1) {
                continue // El encuentro ya fue procesado, saltar
              }
              
              // Asignar cancha
              const formData = new FormData()
              formData.append('cancha', nombreCanchaPrioritaria)
              await updateEncuentro(encuentroParaAsignar.id, formData)
              
              // Asignar o reasignar horario (si el encuentro ya tenía un horario diferente, lo cambiamos)
              const { asignarHorarioAEncuentro } = await import('./horarios-actions')
              await asignarHorarioAEncuentro(encuentroParaAsignar.id, horario.id)
              
              asignacionesRealizadas++
              
              // Si el encuentro tenía un horario diferente, liberar ese horario en el registro
              if (encuentroParaAsignar.horario_id && encuentroParaAsignar.horario_id !== horario.id) {
                const horarioAnterior = encuentroParaAsignar.horario_id
                if (canchasPorHorarioEnJornada[horarioAnterior]) {
                  delete canchasPorHorarioEnJornada[horarioAnterior][nombreCanchaPrioritaria]
                }
              }
              
              // Registrar la asignación INMEDIATAMENTE para evitar conflictos
              if (!canchasPorHorarioEnJornada[horarioKey]) {
                canchasPorHorarioEnJornada[horarioKey] = {}
              }
              canchasPorHorarioEnJornada[horarioKey][nombreCanchaPrioritaria] = true
              
              // Remover de pendientes INMEDIATAMENTE
              encuentrosPendientes.splice(indexEnPendientes, 1)
              
              usoHorariosPorCancha[nombreCanchaPrioritaria] = 
                (usoHorariosPorCancha[nombreCanchaPrioritaria] || 0) + 1
            }
          }
        }
      }
      
      // PASO 2: Asignar encuentros restantes a canchas secundarias (distribución equitativa)
      if (encuentrosPendientes.length > 0) {
        // Si no hay cancha prioritaria, distribuir equitativamente entre todas las canchas
        if (!tieneCanchaPrioritaria) {
          // Distribuir equitativamente entre todas las canchas
          for (const encuentro of encuentrosPendientes) {
            let canchaAsignada: string | null = null
            const horarioKey = encuentro.horario_id || 'sin_horario'
            const canchasOcupadasParaEsteHorario = canchasPorHorarioEnJornada[horarioKey] || {}
            
            // Buscar canchas disponibles para este horario
            const canchasDisponiblesParaHorario = canchasRestantes.filter((cancha: any) => {
              return !canchasOcupadasParaEsteHorario[cancha.nombre]
            })
            
            if (canchasDisponiblesParaHorario.length > 0) {
              // Encontrar la cancha menos usada
              let mejorCancha = canchasDisponiblesParaHorario[0]
              let menorUso = Infinity
              
              for (const cancha of canchasDisponiblesParaHorario) {
                const usoTotal = usoHorariosPorCancha[cancha.nombre] || 0
                if (usoTotal < menorUso) {
                  menorUso = usoTotal
                  mejorCancha = cancha
                }
              }
              
              canchaAsignada = mejorCancha.nombre
              
              // Actualizar contadores
              if (canchaAsignada) {
                if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                  contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                }
                if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                  contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                }
                contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][canchaAsignada] = 
                  (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][canchaAsignada] || 0) + 1
                contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][canchaAsignada] = 
                (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][canchaAsignada] || 0) + 1
              }
              if (canchaAsignada) {
                usoHorariosPorCancha[canchaAsignada] = (usoHorariosPorCancha[canchaAsignada] || 0) + 1
              }
            }
            
            // FALLBACK FINAL: Si aún no se asignó ninguna cancha, usar la primera disponible
            if (!canchaAsignada && canchasRestantes.length > 0) {
              const candidataFallback = canchasRestantes[0]?.nombre ?? null
              if (candidataFallback) {
                canchaAsignada = candidataFallback
                usoHorariosPorCancha[candidataFallback] = (usoHorariosPorCancha[candidataFallback] || 0) + 1
                
                // Actualizar contadores
                if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                  contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                }
                if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                  contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                }
                contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][candidataFallback] = 
                  (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][candidataFallback] || 0) + 1
                contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][candidataFallback] = 
                  (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][candidataFallback] || 0) + 1
              }
            }
            
            // Asignar cancha (ahora siempre debería tener un valor)
            if (canchaAsignada) {
              if (!canchasPorHorarioEnJornada[horarioKey]) {
                canchasPorHorarioEnJornada[horarioKey] = {}
              }
              canchasPorHorarioEnJornada[horarioKey][canchaAsignada] = true
              
              const formData = new FormData()
              formData.append('cancha', canchaAsignada)
              await updateEncuentro(encuentro.id, formData)
              asignacionesRealizadas++
            }
          }
        } else {
          // Si hay cancha prioritaria, asignar a canchas secundarias con restricciones
          for (const encuentro of encuentrosPendientes) {
            let canchaAsignada: string | null = null
            const horarioKey = encuentro.horario_id || 'sin_horario'
            const canchasOcupadasParaEsteHorario = canchasPorHorarioEnJornada[horarioKey] || {}
            
            // Verificar si alguno de los equipos ya alcanzó el límite de 2 apariciones
            const vecesSecundariasLocal = contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0
            const vecesSecundariasVisitante = contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0
            
            // REGLA ESTRICTA: Si CUALQUIERA de los equipos ya alcanzó el límite de 2, NO usar canchas secundarias
            const algunEquipoAlcanzoLimite = 
              vecesSecundariasLocal >= maxAparicionesSecundarias || 
              vecesSecundariasVisitante >= maxAparicionesSecundarias
            
            // Solo usar canchas secundarias si AMBOS equipos tienen menos de 2 apariciones
            const ambosEquiposPuedenUsarSecundarias = 
              vecesSecundariasLocal < maxAparicionesSecundarias && 
              vecesSecundariasVisitante < maxAparicionesSecundarias
            
            if (ambosEquiposPuedenUsarSecundarias) {
              // Buscar canchas secundarias disponibles para este horario
              const canchasDisponiblesParaHorario = canchasRestantes.filter((cancha: any) => {
                return !canchasOcupadasParaEsteHorario[cancha.nombre]
              })
              
              if (canchasDisponiblesParaHorario.length > 0) {
                // Calcular puntuación para cada cancha secundaria
                const puntuacionesCanchas: Array<{ cancha: any, puntuacion: number }> = []
                
                for (const cancha of canchasDisponiblesParaHorario) {
                  const nombreCancha = cancha.nombre
                  
                  // Verificar si algún equipo ya jugó en esta cancha específica
                  const vecesLocalEnEstaCancha = contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]?.[nombreCancha] || 0
                  const vecesVisitanteEnEstaCancha = contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]?.[nombreCancha] || 0
                  
                  // Penalización muy alta si algún equipo ya jugó en esta cancha específica
                  const penalizacionCanchaRepetida = 
                    (vecesLocalEnEstaCancha >= maxAparicionesPorCancha ? 10000 : 0) +
                    (vecesVisitanteEnEstaCancha >= maxAparicionesPorCancha ? 10000 : 0)
                  
                  // Calcular suma de apariciones de ambos equipos en canchas secundarias
                  const sumaAparicionesEquipos = vecesSecundariasLocal + vecesSecundariasVisitante
                  
                  // Uso rotativo de la cancha (distribución equitativa)
                  const usoRotativoCancha = contadorUsoCanchasSecundarias[nombreCancha] || 0
                  
                  // Puntuación: menor es mejor
                  const puntuacion = penalizacionCanchaRepetida + sumaAparicionesEquipos * 100 + usoRotativoCancha
                  
                  puntuacionesCanchas.push({ cancha, puntuacion })
                }
                
                // Ordenar por puntuación (menor es mejor) y seleccionar la mejor
                puntuacionesCanchas.sort((a, b) => a.puntuacion - b.puntuacion)
                const mejorCancha = puntuacionesCanchas[0]?.cancha
                
                if (mejorCancha) {
                  const nombreMejorCancha = mejorCancha.nombre
                  
                  // Verificar una vez más que AMBOS equipos pueden usar canchas secundarias
                  const vecesSecundariasLocalActual = contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0
                  const vecesSecundariasVisitanteActual = contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0
                  
                  // Verificar que ningún equipo ya jugó en esta cancha específica
                  const vecesLocalEnEstaCanchaActual = contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]?.[nombreMejorCancha] || 0
                  const vecesVisitanteEnEstaCanchaActual = contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]?.[nombreMejorCancha] || 0
                  
                  // SOLO asignar si AMBOS equipos tienen menos de 2 apariciones Y ninguno ya jugó en esta cancha
                  if (vecesSecundariasLocalActual < maxAparicionesSecundarias && 
                      vecesSecundariasVisitanteActual < maxAparicionesSecundarias &&
                      vecesLocalEnEstaCanchaActual < maxAparicionesPorCancha &&
                      vecesVisitanteEnEstaCanchaActual < maxAparicionesPorCancha) {
                    canchaAsignada = nombreMejorCancha
                    
                    // Actualizar contadores
                    contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] = 
                      (contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0) + 1
                    contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] = 
                      (contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0) + 1
                    
                    if (canchaAsignada) {
                      if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                        contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                      }
                      if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                        contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                      }
                      contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][canchaAsignada] = 
                        (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][canchaAsignada] || 0) + 1
                      contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][canchaAsignada] = 
                        (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][canchaAsignada] || 0) + 1
                    }
                    
                    if (canchaAsignada) {
                      contadorUsoCanchasSecundarias[canchaAsignada] = 
                        (contadorUsoCanchasSecundarias[canchaAsignada] || 0) + 1
                      usoHorariosPorCancha[canchaAsignada] = 
                        (usoHorariosPorCancha[canchaAsignada] || 0) + 1
                    }
                  }
                }
              }
            }
            
            // Si no se pudo asignar a cancha secundaria, usar la prioritaria como fallback
            if (!canchaAsignada && tieneCanchaPrioritaria) {
              const nombreCanchaPrioritaria = (canchaPrioritaria as any).nombre
              if (!canchasOcupadasParaEsteHorario[nombreCanchaPrioritaria]) {
                canchaAsignada = nombreCanchaPrioritaria
                usoHorariosPorCancha[nombreCanchaPrioritaria] = 
                  (usoHorariosPorCancha[nombreCanchaPrioritaria] || 0) + 1
              }
            }
            
            // FALLBACK FINAL: Si aún no se asignó ninguna cancha, buscar cualquier cancha disponible
            // Esto asegura que todos los encuentros tengan cancha asignada
            if (!canchaAsignada) {
              // Buscar todas las canchas disponibles (incluyendo la prioritaria si existe)
              const todasLasCanchas = tieneCanchaPrioritaria 
                ? [canchaPrioritaria, ...canchasRestantes]
                : canchasRestantes
              
              // Primero intentar encontrar una cancha que no esté ocupada en este horario
              const canchaDisponible = todasLasCanchas.find((cancha: any) => {
                const nombreCancha = cancha.nombre || cancha
                return !canchasOcupadasParaEsteHorario[nombreCancha]
              })
              
              if (canchaDisponible) {
                const candidataCancha = (typeof canchaDisponible === 'string')
                  ? canchaDisponible
                  : (canchaDisponible?.nombre ?? null)
                if (candidataCancha) {
                  canchaAsignada = candidataCancha
                  usoHorariosPorCancha[candidataCancha] = (usoHorariosPorCancha[candidataCancha] || 0) + 1
                }
                
                // Si es una cancha secundaria, actualizar contadores
                if (tieneCanchaPrioritaria && canchaAsignada !== nombreCanchaPrioritaria) {
                  contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] = 
                    (contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0) + 1
                  contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] = 
                    (contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0) + 1
                  
                  if (canchaAsignada) {
                    if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                      contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                    }
                    if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                      contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                    }
                    contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][canchaAsignada] = 
                      (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][canchaAsignada] || 0) + 1
                    contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][canchaAsignada] = 
                      (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][canchaAsignada] || 0) + 1
                  }
                  
                  if (canchaAsignada) {
                    contadorUsoCanchasSecundarias[canchaAsignada] = 
                      (contadorUsoCanchasSecundarias[canchaAsignada] || 0) + 1
                  }
                }
              } else if (todasLasCanchas.length > 0) {
                // Si todas las canchas están ocupadas en este horario, usar la cancha prioritaria
                // como último recurso (habrá conflicto pero al menos se asigna)
                if (tieneCanchaPrioritaria) {
                  if (nombreCanchaPrioritaria) {
                    canchaAsignada = nombreCanchaPrioritaria
                    usoHorariosPorCancha[nombreCanchaPrioritaria] = (usoHorariosPorCancha[nombreCanchaPrioritaria] || 0) + 1
                  }
                } else {
                  // Si no hay cancha prioritaria, usar la primera disponible
                  const primera = (todasLasCanchas[0] as any)
                  const candidata = (primera && typeof primera === 'object' && 'nombre' in primera)
                    ? (primera.nombre as string | null)
                    : (typeof primera === 'string' ? primera : null)
                  if (candidata) {
                    canchaAsignada = candidata
                    usoHorariosPorCancha[candidata] = (usoHorariosPorCancha[candidata] || 0) + 1
                  }
                }
              }
            }
            
            // Asignar cancha (ahora siempre debería tener un valor)
            if (canchaAsignada) {
              if (!canchasPorHorarioEnJornada[horarioKey]) {
                canchasPorHorarioEnJornada[horarioKey] = {}
              }
              canchasPorHorarioEnJornada[horarioKey][canchaAsignada] = true
              
              const formData = new FormData()
              formData.append('cancha', canchaAsignada)
              await updateEncuentro(encuentro.id, formData)
              asignacionesRealizadas++
            }
          }
        }
      }
    }
    
    revalidatePath(`/torneos/${torneoId}`)
    
    return {
      success: true,
      asignacionesRealizadas,
      mensaje: `Se asignaron canchas a ${asignacionesRealizadas} encuentro(s)`
    }
  } catch (error) {
    console.error('Error al asignar canchas automáticamente:', error)
    throw new Error(
      `Error al asignar canchas automáticamente: ${error instanceof Error ? error.message : 'Error desconocido'}`
    )
  }
}