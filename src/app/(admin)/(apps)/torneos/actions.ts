'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { torneoQueries, equipoTorneoQueries, encuentroQueries, equiposDescansanQueries } from '@/db/queries'
import { generateFixture } from '@/lib/fixture-generator'
import type { NewTorneo, NewEquipoTorneo, EquipoWithRelations } from '@/db/types'
import { requirePermiso } from '@/lib/auth-helpers'
import { db } from '@/db'
import { tarjetas, goles, equiposTorneo, jugadoresParticipantes, cambiosJugadores, firmasEncuentros, torneos, horarios, encuentros, categorias, canchas, canchasCategorias } from '@/db/schema'
import { eq, count, inArray, and, isNotNull, asc, sql, ne } from 'drizzle-orm'
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

/**
 * Obtiene todos los encuentros de todos los torneos con sus relaciones
 */
export async function getAllEncuentrosTodosTorneos() {
  try {
    const { db } = await import('@/db')
    const { encuentros } = await import('@/db/schema')
    const { isNotNull } = await import('drizzle-orm')

    // Obtener todos los encuentros con sus relaciones usando query builder
    const todosEncuentros = await db.query.encuentros.findMany({
      where: isNotNull(encuentros.horario_id),
      with: {
        equipoLocal: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
        equipoVisitante: {
          with: {
            equiposCategoria: {
              with: {
                categoria: true,
              },
            },
            entrenador: true,
          },
        },
        horario: true,
        torneo: {
          with: {
            categoria: true,
          },
        },
      },
      orderBy: [encuentros.torneo_id, encuentros.jornada, encuentros.id],
    })

    return todosEncuentros
  } catch (error) {
    console.error('Error al obtener todos los encuentros:', error)
    throw new Error('Error al obtener todos los encuentros de los torneos')
  }
}

/**
 * Obtiene todos los horarios de todos los torneos
 */
export async function getAllHorariosTodosTorneos() {
  try {
    const { db } = await import('@/db')
    const { horarios } = await import('@/db/schema')
    const { asc } = await import('drizzle-orm')

    // Obtener todos los horarios ordenados
    const todosHorarios = await db
      .select()
      .from(horarios)
      .orderBy(asc(horarios.dia_semana), asc(horarios.hora_inicio))

    return todosHorarios
  } catch (error) {
    console.error('Error al obtener todos los horarios:', error)
    throw new Error('Error al obtener todos los horarios de los torneos')
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

/**
 * Mueve un encuentro globalmente a otra combinación horario/cancha,
 * opcionalmente intercambiando con otro encuentro del MISMO torneo si ya ocupa ese slot.
 * Mantiene las validaciones de no repetir cancha+fecha+hora entre torneos.
 */
export async function moverEncuentroGlobal(
  encuentroId: number,
  targetHorarioId: number | null,
  targetCancha: string,
  targetFechaProgramada?: Date | null
): Promise<{
  success: boolean
  mensaje: string
}> {
  try {
    if (!targetHorarioId || !targetCancha) {
      throw new Error('Horario o cancha destino inválidos')
    }

    // Cargar encuentro actual
    const encuentroActual = await db.query.encuentros.findFirst({
      where: eq(encuentros.id, encuentroId),
      with: {
        horario: true,
      },
    })

    if (!encuentroActual) {
      throw new Error('Encuentro no encontrado')
    }

    const jornada = encuentroActual.jornada
    const torneoId = encuentroActual.torneo_id
    const fechaBase = targetFechaProgramada ?? encuentroActual.fecha_programada ?? null

    // Buscar si ya hay un encuentro ocupando el slot destino (misma cancha, horario y fecha/jornada)
    // Usamos la misma lógica de fecha que en verificarCanchaOcupadaEnTodosTorneos
    const condicionesConflicto: any[] = [
      eq(encuentros.cancha, targetCancha),
      eq(encuentros.horario_id, targetHorarioId),
      isNotNull(encuentros.cancha),
      isNotNull(encuentros.horario_id),
      ne(encuentros.id, encuentroId),
    ]

    if (fechaBase) {
      const fecha = new Date(fechaBase)
      fecha.setHours(0, 0, 0, 0)
      const fechaSiguiente = new Date(fecha)
      fechaSiguiente.setDate(fechaSiguiente.getDate() + 1)

      condicionesConflicto.push(
        sql`${encuentros.fecha_programada} >= ${fecha.toISOString()}::timestamp`,
        sql`${encuentros.fecha_programada} < ${fechaSiguiente.toISOString()}::timestamp`,
      )
    } else if (jornada !== null && jornada !== undefined) {
      condicionesConflicto.push(eq(encuentros.jornada, jornada))
    }

    const conflicto = await db.query.encuentros.findFirst({
      where: and(...condicionesConflicto),
    })

    // Si el conflicto es de otro torneo, no permitimos mover
    if (conflicto && conflicto.torneo_id !== torneoId) {
      throw new Error(
        `La combinación ${targetCancha} / horario destino ya está usada por otro torneo (encuentro ${conflicto.id})`,
      )
    }

    // Si hay conflicto en el mismo torneo => intercambiar horarios/canchas
    if (conflicto && conflicto.torneo_id === torneoId) {
      // Intercambiar horario_id y cancha entre los dos encuentros
      await db.transaction(async (tx) => {
        await tx
          .update(encuentros)
          .set({
            horario_id: targetHorarioId,
            cancha: targetCancha,
            updatedAt: new Date(),
          })
          .where(eq(encuentros.id, encuentroId))

        await tx
          .update(encuentros)
          .set({
            horario_id: encuentroActual.horario_id,
            cancha: encuentroActual.cancha,
            updatedAt: new Date(),
          })
          .where(eq(encuentros.id, conflicto.id))
      })

      revalidatePath('/torneos')
      return {
        success: true,
        mensaje: `Encuentro movido e intercambiado con el encuentro ${conflicto.id}`,
      }
    }

    // Sin conflicto: solo mover este encuentro al nuevo horario/cancha (y opcionalmente fecha)
    const updateData: any = {
      horario_id: targetHorarioId,
      cancha: targetCancha,
      updatedAt: new Date(),
    }

    if (targetFechaProgramada) {
      const fechaNueva = new Date(targetFechaProgramada)
      updateData.fecha_programada = fechaNueva
    }

    await db
      .update(encuentros)
      .set(updateData)
      .where(eq(encuentros.id, encuentroId))

    revalidatePath('/torneos')
    return {
      success: true,
      mensaje: 'Encuentro movido correctamente al nuevo horario y cancha',
    }
  } catch (error: any) {
    console.error('Error al mover encuentro globalmente:', error)
    return {
      success: false,
      mensaje:
        error instanceof Error ? error.message : 'Error al mover encuentro. Intenta nuevamente.',
    }
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

/**
 * Calcula la fecha correcta basándose en el día de la semana del horario
 * Busca el día más cercano a la fecha base, priorizando el anterior si está a la misma distancia
 * @param fechaBase - Fecha base proporcionada (puede ser sábado o domingo)
 * @param diaSemanaHorario - Día de la semana del horario ('viernes', 'sabado', 'domingo')
 * @returns Fecha ajustada al día de la semana correcto
 */
function calcularFechaPorDiaSemana(fechaBase: Date, diaSemanaHorario: string | null | undefined): Date {
  if (!diaSemanaHorario) {
    return fechaBase // Si no hay horario, usar la fecha base
  }

  const fecha = new Date(fechaBase)
  fecha.setHours(0, 0, 0, 0) // Normalizar a inicio del día

  // Mapeo de días de la semana
  const diasSemana: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6
  }

  const diaObjetivo = diasSemana[diaSemanaHorario.toLowerCase()] ?? 5 // Default: viernes
  const diaActual = fecha.getDay()

  // Si ya estamos en el día correcto, no hacer cambios
  if (diaObjetivo === diaActual) {
    return fecha
  }

  // Calcular diferencia hacia adelante y hacia atrás
  const diferenciaAdelante = diaObjetivo > diaActual 
    ? diaObjetivo - diaActual 
    : (diaObjetivo - diaActual) + 7
  
  const diferenciaAtras = diaObjetivo < diaActual
    ? diaActual - diaObjetivo
    : (diaActual - diaObjetivo) + 7

  // Priorizar el día anterior si está a la misma distancia o más cerca
  // En el contexto de una jornada, si seleccionas domingo, los sábados deberían ir al sábado anterior
  let diferencia: number
  if (diferenciaAtras <= diferenciaAdelante) {
    // Usar el día anterior (más cercano o igual distancia)
    diferencia = -diferenciaAtras
  } else {
    // Usar el día siguiente (más cercano)
    diferencia = diferenciaAdelante
  }

  // Ajustar la fecha al día de la semana correcto
  const fechaAjustada = new Date(fecha)
  fechaAjustada.setDate(fecha.getDate() + diferencia)

  return fechaAjustada
}

export async function updateFechaJornada(
  torneoId: number,
  jornada: number,
  fecha: Date
) {
  try {
    await requirePermiso('torneos', 'editar')
    
    // Obtener todos los encuentros de la jornada con sus horarios
    const encuentrosJornada = await encuentroQueries.getByJornada(torneoId, jornada)
    
    if (encuentrosJornada.length === 0) {
      throw new Error(`No se encontraron encuentros para la jornada ${jornada}`)
    }

    // Actualizar cada encuentro con la fecha correcta según su horario
    const { db } = await import('@/db')
    const { encuentros } = await import('@/db/schema')
    const { eq, and } = await import('drizzle-orm')

    let encuentrosActualizados = 0

    for (const encuentro of encuentrosJornada) {
      // Calcular la fecha correcta según el día de la semana del horario
      const diaSemanaHorario = encuentro.horario?.dia_semana
      const fechaCorrecta = calcularFechaPorDiaSemana(fecha, diaSemanaHorario)

      // Actualizar solo este encuentro con su fecha específica
      await db
        .update(encuentros)
        .set({ 
          fecha_programada: fechaCorrecta,
          updatedAt: new Date()
        })
        .where(eq(encuentros.id, encuentro.id))
        .returning()

      encuentrosActualizados++
    }

    revalidatePath(`/torneos/${torneoId}`)
    revalidatePath('/fixture')

    return {
      success: true,
      mensaje: `Fecha de la jornada ${jornada} actualizada correctamente. Se ajustaron las fechas según el día de la semana de cada horario.`,
      encuentrosActualizados: encuentrosActualizados
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

/**
 * Verifica si una cancha está ocupada en cualquier torneo con la misma hora_inicio y jornada
 * @param canchaNombre - Nombre de la cancha a verificar
 * @param horaInicio - Hora de inicio del horario (formato HH:MM)
 * @param jornada - Número de jornada
 * @param torneoIdActual - ID del torneo actual (opcional, para logging)
 * @param encuentroIdActual - ID del encuentro actual que se está intentando asignar (para excluirlo)
 * @returns true si la cancha está ocupada, false si está disponible
 */
async function verificarCanchaOcupadaEnTodosTorneos(
  canchaNombre: string,
  horaInicio: string | null,
  jornada: number | null,
  torneoIdActual?: number,
  encuentroIdActual?: number,
  diaSemana?: string | null,
  fechaProgramada?: Date | string | null
): Promise<boolean> {
  // Si falta información crítica, NO permitir asignación (más estricto)
  if (!horaInicio || !jornada || !canchaNombre) {
    console.warn('⚠️ Verificación de cancha omitida: falta información', {
      canchaNombre,
      horaInicio,
      jornada,
      diaSemana,
      fechaProgramada,
      encuentroIdActual
    })
    // Retornar true para bloquear asignación si falta información crítica
    return true
  }

  try {
    const { encuentros, horarios } = await import('@/db/schema')
    const { eq, and, isNotNull, ne, sql } = await import('drizzle-orm')

    // Construir condiciones de filtro base
    const condiciones = [
      eq(encuentros.cancha, canchaNombre),
      eq(horarios.hora_inicio, horaInicio),
      isNotNull(encuentros.cancha),
      isNotNull(encuentros.horario_id)
    ]

    // PRIORIDAD 1: Si tenemos fecha_programada, usar fecha exacta (más preciso)
    // Esto es más confiable que usar jornada, ya que la fecha es única
    if (fechaProgramada) {
      const fecha = typeof fechaProgramada === 'string' ? new Date(fechaProgramada) : fechaProgramada
      // Normalizar fecha a inicio del día (00:00:00) para comparar solo la fecha, no la hora
      const fechaNormalizada = new Date(fecha)
      fechaNormalizada.setHours(0, 0, 0, 0)
      const fechaSiguiente = new Date(fechaNormalizada)
      fechaSiguiente.setDate(fechaSiguiente.getDate() + 1)
      
      // Verificar que la fecha_programada del encuentro existente esté en el mismo día
      condiciones.push(
        sql`${encuentros.fecha_programada} >= ${fechaNormalizada.toISOString()}::timestamp`,
        sql`${encuentros.fecha_programada} < ${fechaSiguiente.toISOString()}::timestamp`
      )
    } else {
      // FALLBACK: Si no hay fecha_programada, usar jornada y dia_semana
      condiciones.push(eq(encuentros.jornada, jornada))
      
      // IMPORTANTE: Si se proporciona diaSemana, también verificar que coincida
      // Esto previene conflictos entre sábado y domingo con la misma hora
      if (diaSemana && (diaSemana === 'viernes' || diaSemana === 'sabado' || diaSemana === 'domingo')) {
        condiciones.push(eq(horarios.dia_semana, diaSemana as 'viernes' | 'sabado' | 'domingo'))
      }
    }

    // Excluir el encuentro actual si se proporciona (para evitar que se detecte a sí mismo)
    if (encuentroIdActual) {
      condiciones.push(ne(encuentros.id, encuentroIdActual))
    }

    // Buscar encuentros en TODOS los torneos que tengan:
    // - La misma cancha
    // - Un horario con la misma hora_inicio
    // - La misma fecha_programada (si se proporciona) O la misma jornada + dia_semana
    const encuentrosOcupados = await db
      .select({
        id: encuentros.id,
        torneo_id: encuentros.torneo_id,
        cancha: encuentros.cancha,
        jornada: encuentros.jornada,
        fecha_programada: encuentros.fecha_programada,
        hora_inicio: horarios.hora_inicio,
        dia_semana: horarios.dia_semana
      })
      .from(encuentros)
      .innerJoin(horarios, eq(encuentros.horario_id, horarios.id))
      .where(and(...condiciones))
      .limit(5) // Limitar a 5 para logging

    if (encuentrosOcupados.length > 0) {
      console.log('🚫 Cancha ocupada encontrada:', {
        cancha: canchaNombre,
        horaInicio,
        diaSemana,
        jornada,
        fechaProgramada,
        encuentrosEncontrados: encuentrosOcupados.map(e => ({
          id: e.id,
          torneo_id: e.torneo_id,
          jornada: e.jornada,
          fecha_programada: e.fecha_programada,
          dia_semana: e.dia_semana
        })),
        encuentroIdActual
      })
      return true
    }

    return false
  } catch (error) {
    console.error('❌ Error al verificar cancha ocupada:', error)
    // En caso de error, retornar true para bloquear la asignación (más seguro)
    return true
  }
}

/**
 * Obtiene la hora_inicio y dia_semana de un horario por su ID
 */
async function obtenerHoraInicioPorHorarioId(horarioId: number | null): Promise<string | null> {
  if (!horarioId) {
    return null
  }

  try {
    const { horarios } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const horario = await db
      .select({
        hora_inicio: horarios.hora_inicio
      })
      .from(horarios)
      .where(eq(horarios.id, horarioId))
      .limit(1)

    return horario.length > 0 ? horario[0].hora_inicio : null
  } catch (error) {
    console.error('Error al obtener hora_inicio del horario:', error)
    return null
  }
}

/**
 * Obtiene el dia_semana de un horario por su ID
 */
async function obtenerDiaSemanaPorHorarioId(horarioId: number | null): Promise<string | null> {
  if (!horarioId) {
    return null
  }

  try {
    const { horarios } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const horario = await db
      .select({
        dia_semana: horarios.dia_semana
      })
      .from(horarios)
      .where(eq(horarios.id, horarioId))
      .limit(1)

    return horario.length > 0 ? horario[0].dia_semana : null
  } catch (error) {
    console.error('Error al obtener dia_semana del horario:', error)
    return null
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
      
      // La capacidad de la cancha prioritaria se calculará más abajo,
      // cuando carguemos todos los horarios del torneo (horariosDisponibles).
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
      .orderBy(asc(equipos.id)) // Ordenar por ID para tener consistencia
    
    // DISTRIBUCIÓN ESPECIAL PARA 12 EQUIPOS
    // Si hay 12 equipos y hay cancha prioritaria, aplicar distribución estricta:
    // - 2 equipos: 10 partidos en prioritaria, 1 en secundarias (total 11 partidos)
    // - 10 equipos: 9 partidos en prioritaria, 2 en secundarias (total 11 partidos)
    // Total: 11 jornadas × 1 partido en secundarias = 11 partidos = 22 apariciones de equipos
    // Distribución de las 22 apariciones: 2 equipos × 1 + 10 equipos × 2 = 2 + 20 = 22 ✓
    const esCategoriaMaxima = equiposDelTorneo.length === 12 && tieneCanchaPrioritaria
    const equiposConLimite1: Set<number> = new Set()
    const equiposConLimite2: Set<number> = new Set()
    
    if (esCategoriaMaxima) {
      // Seleccionar 2 equipos que tendrán solo 1 aparición en secundarias
      // ESTRATEGIA: Seleccionar de forma aleatoria o por criterio específico
      // Para simplificar, usaremos los primeros 2 equipos ordenados por ID
      const equiposOrdenados = [...equiposDelTorneo].sort((a, b) => a.id - b.id)
      for (let i = 0; i < 2 && i < equiposOrdenados.length; i++) {
        equiposConLimite1.add(equiposOrdenados[i].id)
      }
      // Los otros 10 equipos tendrán 2 apariciones en secundarias
      for (let i = 2; i < equiposOrdenados.length; i++) {
        equiposConLimite2.add(equiposOrdenados[i].id)
      }
    }
    
    // Mapa de límites por equipo: { equipo_id: max_apariciones_secundarias }
    const limiteAparicionesSecundariasPorEquipo: Record<number, number> = {}
    equiposDelTorneo.forEach(equipo => {
      if (esCategoriaMaxima && equiposConLimite1.has(equipo.id)) {
        limiteAparicionesSecundariasPorEquipo[equipo.id] = 1 // 2 equipos: 1 aparición en secundarias
      } else if (esCategoriaMaxima && equiposConLimite2.has(equipo.id)) {
        limiteAparicionesSecundariasPorEquipo[equipo.id] = 2 // 10 equipos: 2 apariciones en secundarias
      } else {
        limiteAparicionesSecundariasPorEquipo[equipo.id] = 2 // Por defecto: 2 apariciones
      }
    })
    
    // Para 12 equipos: alternar entre cancha 2 y cancha 3 para el partido sobrante de cada jornada
    
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
    // Si hay cancha prioritaria, su capacidad es el número total de horarios disponibles
    if (tieneCanchaPrioritaria) {
      capacidadCanchaPrioritaria = horariosDisponibles.length
    }
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
    
    // Máximo por cancha específica: cada equipo puede jugar máximo 1 vez en cada cancha secundaria
    const maxAparicionesPorCancha = 1
    
    // Función auxiliar para obtener el límite máximo de apariciones secundarias para un equipo
    const getMaxAparicionesSecundarias = (equipoId: number): number => {
      return limiteAparicionesSecundariasPorEquipo[equipoId] || 2
    }
    
    // Función para verificar si un equipo puede jugar en cancha secundaria
    // ESTRICTA: Verifica el límite específico de cada equipo
    const puedeJugarEnSecundaria = (equipoId: number): boolean => {
      const vecesSecundarias = contadorEquipoCanchasSecundarias[equipoId] || 0
      const limiteMaximo = getMaxAparicionesSecundarias(equipoId)
      return vecesSecundarias < limiteMaximo // Solo si tiene menos de su límite máximo
    }
    
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
    
    // PLANIFICACIÓN GLOBAL PARA 12 EQUIPOS:
    // Pre-planificar qué encuentros van a canchas secundarias para garantizar la distribución exacta
    // 2 equipos con 1 aparición en secundarias, 10 equipos con 2 apariciones en secundarias
    const encuentrosParaSecundariasPorJornada: Record<number, number> = {} // { jornada: encuentro_id }
    
    if (esCategoriaMaxima) {
      // Obtener todos los encuentros sin cancha por jornada
      const todosLosEncuentrosSinCancha: any[] = []
      for (const jornada of jornadasOrdenadas) {
        const encuentrosJornada = encuentrosPorJornada[jornada]
        const encuentrosSinCancha = encuentrosJornada.filter(e => !e.cancha || e.cancha.trim() === '')
        todosLosEncuentrosSinCancha.push(...encuentrosSinCancha.map(e => ({ ...e, jornada })))
      }
      
      // Contador de apariciones necesarias en secundarias para cada equipo
      const aparicionesRestantesEnSecundarias: Record<number, number> = {}
      equiposDelTorneo.forEach(equipo => {
        const yaAsignadas = contadorEquipoCanchasSecundarias[equipo.id] || 0
        const limiteEquipo = getMaxAparicionesSecundarias(equipo.id)
        aparicionesRestantesEnSecundarias[equipo.id] = limiteEquipo - yaAsignadas
      })
      
      // Seleccionar exactamente 1 encuentro por jornada para ir a secundarias
      // Estrategia: priorizar encuentros donde ambos equipos necesiten más apariciones en secundarias
      for (const jornada of jornadasOrdenadas) {
        const encuentrosJornada = encuentrosPorJornada[jornada]
        const encuentrosSinCancha = encuentrosJornada.filter(e => !e.cancha || e.cancha.trim() === '')
        
        if (encuentrosSinCancha.length === 0) continue
        
        // Ordenar encuentros por prioridad para ir a secundarias
        const encuentrosConPuntuacion = encuentrosSinCancha.map(encuentro => {
          const necesidadLocal = aparicionesRestantesEnSecundarias[encuentro.equipo_local_id] || 0
          const necesidadVisitante = aparicionesRestantesEnSecundarias[encuentro.equipo_visitante_id] || 0
          
          // Si algún equipo ya no necesita más apariciones, penalizar mucho
          if (necesidadLocal <= 0 || necesidadVisitante <= 0) {
            return { encuentro, puntuacion: -10000 }
          }
          
          // Priorizar encuentros donde ambos equipos necesiten apariciones
          // Mayor puntuación = más prioridad
          const puntuacion = necesidadLocal * 100 + necesidadVisitante * 100
          
          return { encuentro, puntuacion }
        })
        
        // Ordenar por puntuación (mayor = más prioridad)
        encuentrosConPuntuacion.sort((a, b) => b.puntuacion - a.puntuacion)
        
        // Seleccionar el mejor encuentro para ir a secundarias
        const mejorEncuentro = encuentrosConPuntuacion[0]
        if (mejorEncuentro && mejorEncuentro.puntuacion > 0) {
          encuentrosParaSecundariasPorJornada[jornada] = mejorEncuentro.encuentro.id
          
          // Actualizar contadores de necesidad (simulación)
          aparicionesRestantesEnSecundarias[mejorEncuentro.encuentro.equipo_local_id] = 
            (aparicionesRestantesEnSecundarias[mejorEncuentro.encuentro.equipo_local_id] || 0) - 1
          aparicionesRestantesEnSecundarias[mejorEncuentro.encuentro.equipo_visitante_id] = 
            (aparicionesRestantesEnSecundarias[mejorEncuentro.encuentro.equipo_visitante_id] || 0) - 1
        } else {
          // Fallback: seleccionar el primer encuentro disponible (aunque exceda límites)
          encuentrosParaSecundariasPorJornada[jornada] = encuentrosSinCancha[0].id
        }
      }
    }
    
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
      
      // ESTRATEGIA PARA 12 EQUIPOS:
      // 1. Cada jornada: exactamente 5 partidos en cancha prioritaria, 1 en secundarias (alternando entre cancha 2 y 3)
      // 2. Distribución final: 2 equipos (10 en prioritaria + 1 fuera), 10 equipos (9 en prioritaria + 2 fuera)
      
      const encuentrosPendientes = [...encuentrosSinCancha]
      const nombreCanchaPrioritaria = tieneCanchaPrioritaria ? (canchaPrioritaria as any).nombre : null
      
      // Recargar encuentros de esta jornada desde BD para tener estado actualizado
      const encuentrosJornadaActualizados = await encuentroQueries.getByTorneoId(torneoId)
      const encuentrosJornadaBD = encuentrosJornadaActualizados.filter(e => e.jornada === jornada)
      
      // Actualizar canchasPorHorarioEnJornada con estado actual de BD
      for (const encuentroBD of encuentrosJornadaBD) {
        if (encuentroBD.cancha && encuentroBD.cancha.trim() !== '' && encuentroBD.horario_id) {
          const horarioKey = encuentroBD.horario_id
          if (!canchasPorHorarioEnJornada[horarioKey]) {
            canchasPorHorarioEnJornada[horarioKey] = {}
          }
          canchasPorHorarioEnJornada[horarioKey][encuentroBD.cancha] = true
        }
      }
      
      // Para 12 equipos: exactamente 5 partidos por jornada en prioritaria, 1 en secundarias
      const partidosPorJornadaEnPrioritaria = esCategoriaMaxima ? 5 : capacidadCanchaPrioritaria
      const partidosPorJornadaEnSecundarias = esCategoriaMaxima ? 1 : 0
      
      // Contador rotativo para alternar entre canchas secundarias (cancha 2 y cancha 3)
      // Usar el número de jornada para determinar qué cancha usar (alternar)
      // Ordenar canchas secundarias por nombre para tener consistencia
      const canchasSecundariasOrdenadas = canchasRestantes.length >= 2 
        ? [...canchasRestantes].sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''))
        : []
      const indiceCanchaSecundaria = (jornada - 1) % 2 // Alterna entre 0 y 1
      
      // PASO 1: Para 12 equipos, asignar exactamente 1 partido a canchas secundarias (alternando entre cancha 2 y 3)
      // IMPORTANTE: Usar la planificación global pre-calculada para garantizar la distribución exacta
      // CRÍTICO: Debe asignarse ANTES que a la prioritaria para garantizar la distribución
      if (esCategoriaMaxima && canchasSecundariasOrdenadas.length >= 2 && encuentrosPendientes.length >= partidosPorJornadaEnPrioritaria + 1) {
        // Obtener el encuentro pre-planificado para esta jornada
        const encuentroIdParaSecundaria = encuentrosParaSecundariasPorJornada[jornada]
        const encuentroSeleccionado = encuentroIdParaSecundaria 
          ? encuentrosPendientes.find(e => e.id === encuentroIdParaSecundaria)
          : null
        
        let encuentroAsignadoASecundaria = false
        
        // Si tenemos un encuentro pre-planificado, intentar asignarlo
        if (encuentroSeleccionado) {
          const encuentro = encuentroSeleccionado
          
          // Verificar que ambos equipos pueden ir a secundarias
          const vecesSecundariasLocal = contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0
          const vecesSecundariasVisitante = contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0
          const maxAparicionesLocal = getMaxAparicionesSecundarias(encuentro.equipo_local_id)
          const maxAparicionesVisitante = getMaxAparicionesSecundarias(encuentro.equipo_visitante_id)
          
          // Si un equipo ya alcanzó su límite, no usar este encuentro (buscar en fallback)
          const puedeUsarEsteEncuentro = vecesSecundariasLocal < maxAparicionesLocal && 
              vecesSecundariasVisitante < maxAparicionesVisitante
          
          if (puedeUsarEsteEncuentro) {
          
          // Seleccionar la cancha secundaria según la jornada (alternar entre cancha 2 y cancha 3)
          const canchaSecundariaSeleccionada = canchasSecundariasOrdenadas[indiceCanchaSecundaria]
          const nombreCanchaSecundaria = canchaSecundariaSeleccionada.nombre
          
          // CRÍTICO: No asignar cancha si el encuentro no tiene horario asignado
          if (!encuentro.horario_id) {
            console.warn('⚠️ No se puede asignar cancha a encuentro sin horario:', {
              encuentroId: encuentro.id,
              jornada
            })
            continue // Saltar este encuentro, necesita horario primero
          }
          
          // Obtener hora_inicio y dia_semana del horario del encuentro
          const horaInicio = await obtenerHoraInicioPorHorarioId(encuentro.horario_id)
          const diaSemana = await obtenerDiaSemanaPorHorarioId(encuentro.horario_id)
          const fechaProgramada = encuentro.fecha_programada
          const horarioKey = encuentro.horario_id || 'sin_horario'
          
          // Verificar SIEMPRE desde BD si la cancha está ocupada en cualquier torneo con la misma fecha, hora_inicio, dia_semana y jornada
          const canchaOcupada = await verificarCanchaOcupadaEnTodosTorneos(
            nombreCanchaSecundaria,
            horaInicio,
            jornada,
            torneoId,
            encuentro.id,
            diaSemana,
            fechaProgramada
          )
          
          if (!canchaOcupada) {
            // Verificar una vez más que ambos equipos pueden ir a secundarias
            const vecesSecundariasLocalActual = contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0
            const vecesSecundariasVisitanteActual = contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0
            
            if (vecesSecundariasLocalActual < maxAparicionesLocal && 
                vecesSecundariasVisitanteActual < maxAparicionesVisitante) {
              
              // Asignar a cancha secundaria
              const formData = new FormData()
              formData.append('cancha', nombreCanchaSecundaria)
              await updateEncuentro(encuentro.id, formData)
              asignacionesRealizadas++
              encuentroAsignadoASecundaria = true
              
              // Actualizar contadores
              contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] = 
                (contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0) + 1
              contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] = 
                (contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0) + 1
              
              if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
              }
              if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
              }
              contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaSecundaria] = 
                (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaSecundaria] || 0) + 1
              contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaSecundaria] = 
                (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaSecundaria] || 0) + 1
              
              contadorUsoCanchasSecundarias[nombreCanchaSecundaria] = 
                (contadorUsoCanchasSecundarias[nombreCanchaSecundaria] || 0) + 1
              usoHorariosPorCancha[nombreCanchaSecundaria] = 
                (usoHorariosPorCancha[nombreCanchaSecundaria] || 0) + 1
              
              // Actualizar registro local INMEDIATAMENTE
              if (!canchasPorHorarioEnJornada[horarioKey]) {
                canchasPorHorarioEnJornada[horarioKey] = {}
              }
              canchasPorHorarioEnJornada[horarioKey][nombreCanchaSecundaria] = true
              
              // Recargar encuentros desde BD después de asignar
              const encuentroActualizado = await encuentroQueries.getById(encuentro.id)
              if (encuentroActualizado) {
                const indexEnBD = encuentrosJornadaBD.findIndex(e => e.id === encuentro.id)
                if (indexEnBD !== -1) {
                  encuentrosJornadaBD[indexEnBD] = encuentroActualizado as any
                } else {
                  encuentrosJornadaBD.push(encuentroActualizado as any)
                }
              }
              
              // Remover de pendientes INMEDIATAMENTE
              const indexEnPendientes = encuentrosPendientes.indexOf(encuentro)
              if (indexEnPendientes !== -1) {
                encuentrosPendientes.splice(indexEnPendientes, 1)
              }
            }
          }
          }
        }
        
        // FALLBACK: Si no se pudo asignar ningún encuentro a secundarias por límites, asignar el primero disponible
        // Esto asegura que siempre haya exactamente 1 partido en secundarias por jornada
        if (!encuentroAsignadoASecundaria && encuentrosPendientes.length >= 6 && canchasSecundariasOrdenadas.length >= 2) {
          // Buscar cualquier encuentro disponible que pueda ir a secundarias (relajar restricciones)
          const canchaSecundariaSeleccionada = canchasSecundariasOrdenadas[indiceCanchaSecundaria]
          const nombreCanchaSecundaria = canchaSecundariaSeleccionada.nombre
          
          // Intentar con el primer encuentro pendiente
          const encuentroFallback = encuentrosPendientes[0]
          if (encuentroFallback) {
            // CRÍTICO: No asignar cancha si el encuentro no tiene horario asignado
            if (!encuentroFallback.horario_id) {
              console.warn('⚠️ No se puede asignar cancha a encuentro sin horario (fallback):', {
                encuentroId: encuentroFallback.id,
                jornada
              })
              continue // Saltar este encuentro, necesita horario primero
            }
            
            // Obtener hora_inicio del horario del encuentro
            const horaInicio = await obtenerHoraInicioPorHorarioId(encuentroFallback.horario_id)
            const diaSemana = await obtenerDiaSemanaPorHorarioId(encuentroFallback.horario_id)
            const fechaProgramada = encuentroFallback.fecha_programada
            const horarioKey = encuentroFallback.horario_id || 'sin_horario'
            
            // Verificar desde BD si la cancha está ocupada en cualquier torneo con la misma fecha, hora_inicio, dia_semana y jornada
            const canchaOcupada = await verificarCanchaOcupadaEnTodosTorneos(
              nombreCanchaSecundaria,
              horaInicio,
              jornada,
              torneoId,
              encuentroFallback.id,
              diaSemana,
              fechaProgramada
            )
            
            if (!canchaOcupada) {
              // Asignar a cancha secundaria (aunque un equipo pueda haber alcanzado su límite)
              const formData = new FormData()
              formData.append('cancha', nombreCanchaSecundaria)
              await updateEncuentro(encuentroFallback.id, formData)
              asignacionesRealizadas++
              encuentroAsignadoASecundaria = true
              
              // Actualizar contadores (incluso si excede límites, para mantener consistencia)
              contadorEquipoCanchasSecundarias[encuentroFallback.equipo_local_id] = 
                (contadorEquipoCanchasSecundarias[encuentroFallback.equipo_local_id] || 0) + 1
              contadorEquipoCanchasSecundarias[encuentroFallback.equipo_visitante_id] = 
                (contadorEquipoCanchasSecundarias[encuentroFallback.equipo_visitante_id] || 0) + 1
              
              if (!contadorEquipoCanchaEspecifica[encuentroFallback.equipo_local_id]) {
                contadorEquipoCanchaEspecifica[encuentroFallback.equipo_local_id] = {}
              }
              if (!contadorEquipoCanchaEspecifica[encuentroFallback.equipo_visitante_id]) {
                contadorEquipoCanchaEspecifica[encuentroFallback.equipo_visitante_id] = {}
              }
              contadorEquipoCanchaEspecifica[encuentroFallback.equipo_local_id][nombreCanchaSecundaria] = 
                (contadorEquipoCanchaEspecifica[encuentroFallback.equipo_local_id][nombreCanchaSecundaria] || 0) + 1
              contadorEquipoCanchaEspecifica[encuentroFallback.equipo_visitante_id][nombreCanchaSecundaria] = 
                (contadorEquipoCanchaEspecifica[encuentroFallback.equipo_visitante_id][nombreCanchaSecundaria] || 0) + 1
              
              contadorUsoCanchasSecundarias[nombreCanchaSecundaria] = 
                (contadorUsoCanchasSecundarias[nombreCanchaSecundaria] || 0) + 1
              usoHorariosPorCancha[nombreCanchaSecundaria] = 
                (usoHorariosPorCancha[nombreCanchaSecundaria] || 0) + 1
              
              // Actualizar registro local
              if (!canchasPorHorarioEnJornada[horarioKey]) {
                canchasPorHorarioEnJornada[horarioKey] = {}
              }
              canchasPorHorarioEnJornada[horarioKey][nombreCanchaSecundaria] = true
              
              // Recargar encuentros desde BD
              const encuentroActualizado = await encuentroQueries.getById(encuentroFallback.id)
              if (encuentroActualizado) {
                const indexEnBD = encuentrosJornadaBD.findIndex(e => e.id === encuentroFallback.id)
                if (indexEnBD !== -1) {
                  encuentrosJornadaBD[indexEnBD] = encuentroActualizado as any
                } else {
                  encuentrosJornadaBD.push(encuentroActualizado as any)
                }
              }
              
              // Remover de pendientes
              const indexEnPendientes = encuentrosPendientes.indexOf(encuentroFallback)
              if (indexEnPendientes !== -1) {
                encuentrosPendientes.splice(indexEnPendientes, 1)
              }
            }
          }
        }
      }
      
      // PASO 2: Asignar exactamente 5 partidos a la cancha prioritaria (para 12 equipos)
      // Para otras configuraciones: llenar hasta completar su capacidad
      // CRÍTICO: Después de asignar 1 partido a secundarias, los 5 restantes van a prioritaria
      if (tieneCanchaPrioritaria && encuentrosPendientes.length > 0) {
        // Para 12 equipos: limitar a exactamente 5 partidos por jornada en prioritaria
        // Después de asignar 1 a secundarias, deben quedar exactamente 5 para prioritaria
        const limitePartidosPrioritaria = esCategoriaMaxima ? 5 : horariosOrdenados.length
        
        // Para 12 equipos: verificar cuántos partidos ya están asignados a prioritaria en esta jornada
        const encuentrosJornadaActualizadosCheck = await encuentroQueries.getByTorneoId(torneoId)
        const encuentrosJornadaBDCheck = encuentrosJornadaActualizadosCheck.filter(e => e.jornada === jornada)
        const partidosYaAsignadosAPrioritaria = encuentrosJornadaBDCheck.filter(e => 
          e.cancha === nombreCanchaPrioritaria
        ).length
        
        // Si ya hay 5 partidos asignados a prioritaria (para 12 equipos), no asignar más
        // (Esto se verifica dentro del loop de encuentros)
        
        // FASE 1: Asignar encuentros que ya tienen horario a la cancha prioritaria en ese horario
        // IMPORTANTE: Procesar uno por uno y recargar estado para evitar conflictos
        const encuentrosConHorario = encuentrosPendientes.filter(e => e.horario_id)
        for (const encuentro of encuentrosConHorario) {
          // Verificar cuántos partidos ya están asignados a la prioritaria en esta jornada
          const encuentrosJornadaActualizadosCheck = await encuentroQueries.getByTorneoId(torneoId)
          const encuentrosJornadaBDCheck = encuentrosJornadaActualizadosCheck.filter(e => e.jornada === jornada)
          const partidosAsignadosAPrioritaria = encuentrosJornadaBDCheck.filter(e => 
            e.cancha === nombreCanchaPrioritaria
          ).length
          
          // Si ya alcanzamos el límite de 5 partidos en prioritaria (para 12 equipos), no asignar más
          if (esCategoriaMaxima && partidosAsignadosAPrioritaria >= limitePartidosPrioritaria) {
            break // Ya tenemos exactamente 5 partidos en prioritaria
          }
          
          // CRÍTICO: No asignar cancha si el encuentro no tiene horario asignado
          if (!encuentro.horario_id) {
            console.warn('⚠️ No se puede asignar cancha a encuentro sin horario (prioritaria):', {
              encuentroId: encuentro.id,
              jornada
            })
            continue // Saltar este encuentro, necesita horario primero
          }
          
          // Obtener hora_inicio del horario del encuentro
          const horaInicio = await obtenerHoraInicioPorHorarioId(encuentro.horario_id)
          const diaSemana = await obtenerDiaSemanaPorHorarioId(encuentro.horario_id)
          const fechaProgramada = encuentro.fecha_programada
          const horarioKey = encuentro.horario_id ?? 'sin_horario'
          
          // Verificar SIEMPRE antes de asignar si la cancha prioritaria está ocupada en cualquier torneo con la misma fecha, hora_inicio, dia_semana y jornada
          const canchaOcupadaEnHorario = await verificarCanchaOcupadaEnTodosTorneos(
            nombreCanchaPrioritaria,
            horaInicio,
            jornada,
            torneoId,
            encuentro.id,
            diaSemana,
            fechaProgramada
          )
          
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
            
            // Actualizar registro local INMEDIATAMENTE
            if (!canchasPorHorarioEnJornada[horarioKey]) {
              canchasPorHorarioEnJornada[horarioKey] = {}
            }
            canchasPorHorarioEnJornada[horarioKey][nombreCanchaPrioritaria] = true
            
            // Recargar encuentros desde BD después de asignar para mantener estado actualizado
            const encuentroActualizado = await encuentroQueries.getById(encuentro.id)
            if (encuentroActualizado) {
              const indexEnBD = encuentrosJornadaBD.findIndex(e => e.id === encuentro.id)
              if (indexEnBD !== -1) {
                encuentrosJornadaBD[indexEnBD] = encuentroActualizado as any
              } else {
                encuentrosJornadaBD.push(encuentroActualizado as any)
              }
            }
            
            // Remover de pendientes INMEDIATAMENTE
            encuentrosPendientes.splice(indexEnPendientes, 1)
            
            usoHorariosPorCancha[nombreCanchaPrioritaria] = 
              (usoHorariosPorCancha[nombreCanchaPrioritaria] || 0) + 1
          }
        }
        
        // FASE 2: Llenar los horarios restantes de la cancha prioritaria hasta llegar al límite
        // IMPORTANTE: Para 12 equipos, limitar a exactamente 5 partidos por jornada en prioritaria
        for (let i = 0; i < horariosOrdenados.length && encuentrosPendientes.length > 0; i++) {
          // Verificar cuántos partidos ya están asignados a la prioritaria en esta jornada
          const encuentrosJornadaActualizadosCheck = await encuentroQueries.getByTorneoId(torneoId)
          const encuentrosJornadaBDCheck = encuentrosJornadaActualizadosCheck.filter(e => e.jornada === jornada)
          const partidosAsignadosAPrioritaria = encuentrosJornadaBDCheck.filter(e => 
            e.cancha === nombreCanchaPrioritaria
          ).length
          
          // Si ya alcanzamos el límite de 5 partidos en prioritaria (para 12 equipos), no asignar más
          if (esCategoriaMaxima && partidosAsignadosAPrioritaria >= limitePartidosPrioritaria) {
            break
          }
          
          const horario = horariosOrdenados[i]
          const horarioKey = horario.id
          const horaInicio = horario.hora_inicio // Obtener hora_inicio directamente del horario
          const diaSemana = horario.dia_semana // Obtener dia_semana directamente del horario
          
          // Verificar SIEMPRE desde BD si la cancha prioritaria está ocupada en cualquier torneo con la misma hora_inicio, dia_semana y jornada
          // Nota: Aquí aún no tenemos el encuentro específico, así que verificamos sin excluir
          const canchaOcupadaEnHorario = await verificarCanchaOcupadaEnTodosTorneos(
            nombreCanchaPrioritaria,
            horaInicio,
            jornada,
            torneoId,
            undefined,
            diaSemana
          )
          
          if (!canchaOcupadaEnHorario) {
            // PRIORIDAD 1: Buscar un encuentro sin horario
            let encuentroParaAsignar = encuentrosPendientes.find(e => !e.horario_id)
            
            // PRIORIDAD 2: Si no hay encuentro sin horario, buscar cualquier encuentro pendiente
            if (!encuentroParaAsignar && encuentrosPendientes.length > 0) {
              encuentroParaAsignar = encuentrosPendientes[0]
            }
            
            if (encuentroParaAsignar) {
              // Verificar que el encuentro aún está en pendientes (no fue asignado en otra iteración)
              const indexEnPendientes = encuentrosPendientes.indexOf(encuentroParaAsignar)
              if (indexEnPendientes === -1) {
                continue // El encuentro ya fue procesado, saltar
              }
              
              // Verificar UNA VEZ MÁS desde BD antes de asignar (evitar condición de carrera)
              // Verificar en todos los torneos con la misma hora_inicio, dia_semana y jornada
              // Ahora sí excluimos el encuentro actual
              const ultimaVerificacion = await verificarCanchaOcupadaEnTodosTorneos(
                nombreCanchaPrioritaria,
                horaInicio,
                jornada,
                torneoId,
                encuentroParaAsignar.id,
                diaSemana
              )
              if (ultimaVerificacion) {
                continue // Alguien más asignó, saltar este horario
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
              
              // Actualizar registro local INMEDIATAMENTE
              if (!canchasPorHorarioEnJornada[horarioKey]) {
                canchasPorHorarioEnJornada[horarioKey] = {}
              }
              canchasPorHorarioEnJornada[horarioKey][nombreCanchaPrioritaria] = true
              
              // Recargar encuentros desde BD después de asignar
              const encuentroActualizado = await encuentroQueries.getById(encuentroParaAsignar.id)
              if (encuentroActualizado) {
                const indexEnBD = encuentrosJornadaBD.findIndex(e => e.id === encuentroParaAsignar.id)
                if (indexEnBD !== -1) {
                  encuentrosJornadaBD[indexEnBD] = encuentroActualizado as any
                } else {
                  encuentrosJornadaBD.push(encuentroActualizado as any)
                }
              }
              
              // Remover de pendientes INMEDIATAMENTE
              encuentrosPendientes.splice(indexEnPendientes, 1)
              
              usoHorariosPorCancha[nombreCanchaPrioritaria] = 
                (usoHorariosPorCancha[nombreCanchaPrioritaria] || 0) + 1
            }
          }
        }
      }
      
      // PASO 3: Asignar encuentros restantes SOLO si no hay cancha prioritaria o ya alcanzaron límites
      // IMPORTANTE: Si hay cancha prioritaria, NO asignar más encuentros a secundarias si algún equipo alcanzó el límite
      if (encuentrosPendientes.length > 0) {
        // Si no hay cancha prioritaria, distribuir equitativamente entre todas las canchas
        if (!tieneCanchaPrioritaria) {
          // Distribuir equitativamente entre todas las canchas
          for (const encuentro of encuentrosPendientes) {
            let canchaAsignada: string | null = null
            const horarioKey = encuentro.horario_id || 'sin_horario'
            const canchasOcupadasParaEsteHorario = canchasPorHorarioEnJornada[horarioKey] || {}
            
            // CRÍTICO: No asignar cancha si el encuentro no tiene horario asignado
            if (!encuentro.horario_id) {
              console.warn('⚠️ No se puede asignar cancha a encuentro sin horario (distribución equitativa):', {
                encuentroId: encuentro.id,
                jornada
              })
              continue // Saltar este encuentro, necesita horario primero
            }
            
            // Obtener hora_inicio y dia_semana del horario del encuentro
            const horaInicio = await obtenerHoraInicioPorHorarioId(encuentro.horario_id)
            const diaSemana = await obtenerDiaSemanaPorHorarioId(encuentro.horario_id)
            // Obtener fecha_programada del encuentro (más preciso que jornada)
            const fechaProgramada = encuentro.fecha_programada
            
            // Buscar canchas disponibles para este horario
            // Verificar tanto en el torneo actual como en todos los torneos
            const canchasDisponiblesParaHorario = []
            for (const cancha of canchasRestantes) {
              // Verificar si está ocupada en el torneo actual (optimización local)
              const ocupadaEnTorneoActual = canchasOcupadasParaEsteHorario[cancha.nombre]
              // Verificar si está ocupada en cualquier otro torneo con la misma fecha, hora, dia_semana y jornada
              const ocupadaEnOtrosTorneos = await verificarCanchaOcupadaEnTodosTorneos(
                cancha.nombre,
                horaInicio,
                jornada,
                torneoId,
                encuentro.id,
                diaSemana,
                fechaProgramada
              )
              
              if (!ocupadaEnTorneoActual && !ocupadaEnOtrosTorneos) {
                canchasDisponiblesParaHorario.push(cancha)
              }
            }
            
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
              
              // VERIFICACIÓN FINAL: Antes de asignar, verificar una vez más que la cancha no esté ocupada
              // Esto previene conflictos cuando múltiples encuentros tienen el mismo horario
              const verificaciónFinal = await verificarCanchaOcupadaEnTodosTorneos(
                mejorCancha.nombre,
                horaInicio,
                jornada,
                torneoId,
                encuentro.id,
                diaSemana,
                fechaProgramada
              )
              
              // También verificar en el estado local (encuentros asignados en este bucle)
              const ocupadaLocalmente = canchasOcupadasParaEsteHorario[mejorCancha.nombre]
              
                if (!verificaciónFinal && !ocupadaLocalmente) {
                  const nombreCanchaMejor = mejorCancha.nombre
                  canchaAsignada = nombreCanchaMejor
              
              // Actualizar contadores
                  if (nombreCanchaMejor) {
                if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                  contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                }
                if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                  contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                }
                    contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaMejor] = 
                      (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaMejor] || 0) + 1
                    contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaMejor] = 
                    (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaMejor] || 0) + 1
                    usoHorariosPorCancha[nombreCanchaMejor] = (usoHorariosPorCancha[nombreCanchaMejor] || 0) + 1
                  }
              } else {
                console.warn('⚠️ Cancha seleccionada ya está ocupada, buscando alternativa:', {
                  cancha: mejorCancha.nombre,
                  horaInicio,
                  jornada,
                  encuentroId: encuentro.id,
                  ocupadaEnBD: verificaciónFinal,
                  ocupadaLocalmente
                })
              }
            }
            
            // FALLBACK MEJORADO: Si aún no se asignó ninguna cancha, buscar una cancha disponible con verificación
            if (!canchaAsignada && canchasRestantes.length > 0) {
              for (const cancha of canchasRestantes) {
                // Verificar que no esté ocupada localmente
                const ocupadaLocalmente = canchasOcupadasParaEsteHorario[cancha.nombre]
                
                // Verificar que no esté ocupada en BD
                const ocupadaEnBD = await verificarCanchaOcupadaEnTodosTorneos(
                  cancha.nombre,
                  horaInicio,
                  jornada,
                  torneoId,
                  encuentro.id,
                  diaSemana,
                  fechaProgramada
                )
                
                if (!ocupadaLocalmente && !ocupadaEnBD) {
                  const nombreCanchaFallbackSec = cancha.nombre
                  canchaAsignada = nombreCanchaFallbackSec
                  
                  if (nombreCanchaFallbackSec) {
                    usoHorariosPorCancha[nombreCanchaFallbackSec] = (usoHorariosPorCancha[nombreCanchaFallbackSec] || 0) + 1
                
                // Actualizar contadores
                if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                  contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                }
                if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                  contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                }
                    contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaFallbackSec] = 
                      (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaFallbackSec] || 0) + 1
                    contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaFallbackSec] = 
                      (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaFallbackSec] || 0) + 1
                  }
                  
                  break // Encontrar una cancha disponible, salir del bucle
                }
              }
              
              if (!canchaAsignada) {
                console.warn('⚠️ No se pudo asignar cancha al encuentro (todas ocupadas):', {
                  encuentroId: encuentro.id,
                  horaInicio,
                  jornada,
                  canchasDisponibles: canchasRestantes.length,
                  motivo: 'Todas las canchas están ocupadas en este horario'
                })
                
                // ÚLTIMO INTENTO: Asignar la primera cancha disponible sin verificación estricta
                // Esto puede ser necesario si hay un problema con la verificación
                if (canchasRestantes.length > 0 && horaInicio) {
                  const canchaEmergencia = canchasRestantes[0]?.nombre
                  if (canchaEmergencia) {
                    console.warn('⚠️ Asignando cancha de emergencia (último recurso):', {
                      encuentroId: encuentro.id,
                      cancha: canchaEmergencia,
                      horaInicio,
                      jornada
                    })
                    canchaAsignada = canchaEmergencia
                  }
                }
              }
            }
            
            // Asignar cancha solo si se encontró una disponible
            if (canchaAsignada && horaInicio) {
              // Verificación final antes de guardar en BD (solo si tenemos horaInicio)
              const verificaciónPreGuardado = await verificarCanchaOcupadaEnTodosTorneos(
                canchaAsignada,
                horaInicio,
                jornada,
                torneoId,
                encuentro.id,
                diaSemana,
                fechaProgramada
              )
              
              if (verificaciónPreGuardado) {
                console.error('❌ Error: Cancha ocupada detectada justo antes de guardar:', {
                  cancha: canchaAsignada,
                  horaInicio,
                  jornada,
                  encuentroId: encuentro.id
                })
                // Intentar otra cancha si la primera está ocupada
                let canchaAlternativa: string | null = null
                for (const cancha of canchasRestantes) {
                  if (cancha.nombre === canchaAsignada) continue
                  
                    const verifAlt = await verificarCanchaOcupadaEnTodosTorneos(
                      cancha.nombre,
                      horaInicio,
                      jornada,
                      torneoId,
                      encuentro.id,
                      diaSemana,
                      fechaProgramada
                    )
                  
                  if (!verifAlt) {
                    canchaAlternativa = cancha.nombre
                    break
                  }
                }
                
                if (canchaAlternativa) {
                  console.log('✅ Cancha alternativa encontrada:', {
                    original: canchaAsignada,
                    alternativa: canchaAlternativa,
                    encuentroId: encuentro.id
                  })
                  canchaAsignada = canchaAlternativa
                } else {
                  console.error('❌ No se encontró cancha alternativa, saltando asignación')
                  continue
                }
              }
              
              if (!canchasPorHorarioEnJornada[horarioKey]) {
                canchasPorHorarioEnJornada[horarioKey] = {}
              }
              canchasPorHorarioEnJornada[horarioKey][canchaAsignada] = true
              
              const formData = new FormData()
              formData.append('cancha', canchaAsignada)
              await updateEncuentro(encuentro.id, formData)
              asignacionesRealizadas++
              
              console.log('✅ Cancha asignada exitosamente:', {
                encuentroId: encuentro.id,
                cancha: canchaAsignada,
                horaInicio,
                jornada
              })
            } else if (!horaInicio) {
              console.warn('⚠️ No se puede asignar cancha: falta horaInicio:', {
                encuentroId: encuentro.id,
                horarioId: encuentro.horario_id,
                jornada
              })
            } else {
              console.warn('⚠️ No se pudo asignar cancha al encuentro:', {
                encuentroId: encuentro.id,
                horaInicio,
                jornada,
                motivo: 'No se encontró cancha disponible'
              })
            }
          }
        } else {
          // Si hay cancha prioritaria, NUNCA asignar a secundarias si algún equipo alcanzó el límite de 2
          // TODOS los encuentros restantes deben ir a cancha prioritaria
          for (const encuentro of encuentrosPendientes) {
            let canchaAsignada: string | null = null
            const horarioKey = encuentro.horario_id || 'sin_horario'
            const canchasOcupadasParaEsteHorario = canchasPorHorarioEnJornada[horarioKey] || {}
            
            // REGLA ESTRICTA: Verificar si AMBOS equipos pueden jugar en canchas secundarias
            // Un equipo puede jugar si tiene menos de 2 apariciones en secundarias
            const puedeLocal = puedeJugarEnSecundaria(encuentro.equipo_local_id)
            const puedeVisitante = puedeJugarEnSecundaria(encuentro.equipo_visitante_id)
            const ambosEquiposPuedenUsarSecundarias = puedeLocal && puedeVisitante
            
            // SOLO intentar asignar a secundarias si AMBOS equipos pueden (ambos tienen menos de 2)
            if (ambosEquiposPuedenUsarSecundarias) {
              // CRÍTICO: No asignar cancha si el encuentro no tiene horario asignado
              if (!encuentro.horario_id) {
                console.warn('⚠️ No se puede asignar cancha a encuentro sin horario (secundarias):', {
                  encuentroId: encuentro.id,
                  jornada
                })
                continue // Saltar este encuentro, necesita horario primero
              }
              
              // Obtener hora_inicio y dia_semana del horario del encuentro
              const horaInicio = await obtenerHoraInicioPorHorarioId(encuentro.horario_id)
              const diaSemana = await obtenerDiaSemanaPorHorarioId(encuentro.horario_id)
              const fechaProgramada = encuentro.fecha_programada
              
              // Buscar canchas secundarias disponibles para este horario
              // Verificar tanto en el torneo actual como en todos los torneos
              const canchasDisponiblesParaHorario = []
              for (const cancha of canchasRestantes) {
                // Verificar si está ocupada en el torneo actual (optimización local)
                const ocupadaEnTorneoActual = canchasOcupadasParaEsteHorario[cancha.nombre]
                // Verificar si está ocupada en cualquier otro torneo con la misma fecha, hora_inicio, dia_semana y jornada
                const ocupadaEnOtrosTorneos = await verificarCanchaOcupadaEnTodosTorneos(
                  cancha.nombre,
                  horaInicio,
                  jornada,
                  torneoId,
                  encuentro.id,
                  diaSemana,
                  fechaProgramada
                )
                
                if (!ocupadaEnTorneoActual && !ocupadaEnOtrosTorneos) {
                  canchasDisponiblesParaHorario.push(cancha)
                }
              }
              
              // Seleccionar cancha y verificar antes de asignar
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
                
              // VERIFICACIÓN FINAL: Antes de asignar, verificar una vez más que la cancha no esté ocupada
              const verificaciónFinal = await verificarCanchaOcupadaEnTodosTorneos(
                mejorCancha.nombre,
                horaInicio,
                jornada,
                torneoId,
                encuentro.id,
                diaSemana,
                fechaProgramada
              )
                
                // También verificar en el estado local (encuentros asignados en este bucle)
                const ocupadaLocalmente = canchasOcupadasParaEsteHorario[mejorCancha.nombre]
                
                if (!verificaciónFinal && !ocupadaLocalmente) {
                  const nombreCancha = mejorCancha.nombre
                  canchaAsignada = nombreCancha
                  
                  // Actualizar contadores
                  if (nombreCancha) {
                    if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                      contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                    }
                    if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                      contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                    }
                    contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCancha] = 
                      (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCancha] || 0) + 1
                    contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCancha] = 
                    (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCancha] || 0) + 1
                    usoHorariosPorCancha[nombreCancha] = (usoHorariosPorCancha[nombreCancha] || 0) + 1
                  }
                } else {
                  console.warn('⚠️ Cancha seleccionada ya está ocupada (secundarias), buscando alternativa:', {
                    cancha: mejorCancha.nombre,
                    horaInicio,
                    jornada,
                    encuentroId: encuentro.id,
                    ocupadaEnBD: verificaciónFinal,
                    ocupadaLocalmente
                  })
                  
                  // Buscar otra cancha disponible
                  for (const cancha of canchasDisponiblesParaHorario) {
                    if (cancha.nombre === mejorCancha.nombre) continue
                    
                    const verifAlternativa = await verificarCanchaOcupadaEnTodosTorneos(
                      cancha.nombre,
                      horaInicio,
                      jornada,
                      torneoId,
                      encuentro.id,
                      diaSemana,
                      fechaProgramada
                    )
                    const ocupadaLocalAlt = canchasOcupadasParaEsteHorario[cancha.nombre]
                    
                    if (!verifAlternativa && !ocupadaLocalAlt) {
                      const nombreCanchaAlt = cancha.nombre
                      canchaAsignada = nombreCanchaAlt
                      
                      if (nombreCanchaAlt) {
                        usoHorariosPorCancha[nombreCanchaAlt] = (usoHorariosPorCancha[nombreCanchaAlt] || 0) + 1
                        
                        // Actualizar contadores
                        if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                          contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                        }
                        if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                          contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                        }
                        contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaAlt] = 
                          (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaAlt] || 0) + 1
                        contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaAlt] = 
                          (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaAlt] || 0) + 1
                      }
                      
                      break
                    }
                  }
                }
              }
              
              // FALLBACK MEJORADO: Si aún no se asignó ninguna cancha, buscar una cancha disponible con verificación
              if (!canchaAsignada && canchasRestantes.length > 0) {
                for (const cancha of canchasRestantes) {
                  // Verificar que no esté ocupada localmente
                  const ocupadaLocalmente = canchasOcupadasParaEsteHorario[cancha.nombre]
                  
                  // Verificar que no esté ocupada en BD
                  const ocupadaEnBD = await verificarCanchaOcupadaEnTodosTorneos(
                    cancha.nombre,
                    horaInicio,
                    jornada,
                    torneoId,
                    encuentro.id,
                    diaSemana
                  )
                  
                  if (!ocupadaLocalmente && !ocupadaEnBD) {
                    const nombreCanchaFallback = cancha.nombre
                    canchaAsignada = nombreCanchaFallback
                    
                    if (nombreCanchaFallback) {
                      usoHorariosPorCancha[nombreCanchaFallback] = (usoHorariosPorCancha[nombreCanchaFallback] || 0) + 1
                      
                      // Actualizar contadores
                      if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                        contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                      }
                      if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                        contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                      }
                      contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaFallback] = 
                        (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][nombreCanchaFallback] || 0) + 1
                      contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaFallback] = 
                        (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][nombreCanchaFallback] || 0) + 1
                    }
                    
                    break // Encontrar una cancha disponible, salir del bucle
                  }
                }
                
                if (!canchaAsignada) {
                  console.warn('⚠️ No se pudo asignar cancha al encuentro (secundarias, todas ocupadas):', {
                    encuentroId: encuentro.id,
                    horaInicio,
                    jornada,
                    canchasDisponibles: canchasRestantes.length,
                    motivo: 'Todas las canchas están ocupadas en este horario'
                  })
                  
                  // ÚLTIMO INTENTO: Asignar la primera cancha disponible sin verificación estricta
                  if (canchasRestantes.length > 0 && horaInicio) {
                    const canchaEmergencia = canchasRestantes[0]?.nombre
                    if (canchaEmergencia) {
                      console.warn('⚠️ Asignando cancha de emergencia (último recurso, secundarias):', {
                        encuentroId: encuentro.id,
                        cancha: canchaEmergencia,
                        horaInicio,
                        jornada
                      })
                      canchaAsignada = canchaEmergencia
                    }
                  }
                }
              }
              
              // Asignar cancha solo si se encontró una disponible
              if (canchaAsignada && horaInicio) {
                // Verificación final antes de guardar en BD (solo si tenemos horaInicio)
                const verificaciónPreGuardado = await verificarCanchaOcupadaEnTodosTorneos(
                  canchaAsignada,
                  horaInicio,
                  jornada,
                  torneoId,
                  encuentro.id,
                  diaSemana
                )
                
                if (verificaciónPreGuardado) {
                  console.error('❌ Error: Cancha ocupada detectada justo antes de guardar (secundarias):', {
                    cancha: canchaAsignada,
                    horaInicio,
                    jornada,
                    encuentroId: encuentro.id
                  })
                  
                  // Intentar otra cancha si la primera está ocupada
                  let canchaAlternativa: string | null = null
                  for (const cancha of canchasRestantes) {
                    if (cancha.nombre === canchaAsignada) continue
                    
                    const verifAlt = await verificarCanchaOcupadaEnTodosTorneos(
                      cancha.nombre,
                      horaInicio,
                      jornada,
                      torneoId,
                      encuentro.id,
                      diaSemana
                    )
                    
                    if (!verifAlt) {
                      canchaAlternativa = cancha.nombre
                      break
                    }
                  }
                  
                  if (canchaAlternativa) {
                    console.log('✅ Cancha alternativa encontrada (secundarias):', {
                      original: canchaAsignada,
                      alternativa: canchaAlternativa,
                      encuentroId: encuentro.id
                    })
                    canchaAsignada = canchaAlternativa
                  } else {
                    console.error('❌ No se encontró cancha alternativa (secundarias), saltando asignación')
                    continue
                  }
                }
                
                if (!canchasPorHorarioEnJornada[horarioKey]) {
                  canchasPorHorarioEnJornada[horarioKey] = {}
                }
                canchasPorHorarioEnJornada[horarioKey][canchaAsignada] = true
                
                const formData = new FormData()
                formData.append('cancha', canchaAsignada)
                await updateEncuentro(encuentro.id, formData)
                asignacionesRealizadas++
                
                console.log('✅ Cancha asignada exitosamente (secundarias):', {
                  encuentroId: encuentro.id,
                  cancha: canchaAsignada,
                  horaInicio,
                  jornada
                })
              } else if (!horaInicio) {
                console.warn('⚠️ No se puede asignar cancha (secundarias): falta horaInicio:', {
                  encuentroId: encuentro.id,
                  horarioId: encuentro.horario_id,
                  jornada
                })
              } else {
                console.warn('⚠️ No se pudo asignar cancha al encuentro (secundarias):', {
                  encuentroId: encuentro.id,
                  horaInicio,
                  jornada,
                  motivo: 'No se encontró cancha disponible'
                })
              }
              
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
                  const vecesSecundariasLocal = contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0
                  const vecesSecundariasVisitante = contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0
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
                  
                  // VERIFICACIÓN FINAL ESTRICTA: Doble verificación de límites
                  const vecesSecundariasLocalActual = contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0
                  const vecesSecundariasVisitanteActual = contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0
                  
                  // Obtener límites específicos para cada equipo
                  const limiteLocal = getMaxAparicionesSecundarias(encuentro.equipo_local_id)
                  const limiteVisitante = getMaxAparicionesSecundarias(encuentro.equipo_visitante_id)
                  
                  // Verificar que ningún equipo ya jugó en esta cancha específica
                  const vecesLocalEnEstaCanchaActual = contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]?.[nombreMejorCancha] || 0
                  const vecesVisitanteEnEstaCanchaActual = contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]?.[nombreMejorCancha] || 0
                  
                  // SOLO asignar si:
                  // 1. AMBOS equipos tienen menos de su límite específico en secundarias (1 o 2)
                  // 2. Ninguno ya jugó en esta cancha específica
                  if (vecesSecundariasLocalActual < limiteLocal && 
                      vecesSecundariasVisitanteActual < limiteVisitante &&
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
            
            // FALLBACK: Si no se pudo asignar a cancha secundaria, SIEMPRE usar la prioritaria
            // IMPORTANTE: NUNCA asignar a cancha secundaria en fallback si algún equipo alcanzó el límite
            if (!canchaAsignada && tieneCanchaPrioritaria) {
              const nombreCanchaPrioritaria = (canchaPrioritaria as any).nombre
              // Asignar a cancha prioritaria aunque esté ocupada en el horario (es el único recurso)
              canchaAsignada = nombreCanchaPrioritaria
              usoHorariosPorCancha[nombreCanchaPrioritaria] = 
                (usoHorariosPorCancha[nombreCanchaPrioritaria] || 0) + 1
            }
            
            // FALLBACK FINAL: Si aún no se asignó y no hay cancha prioritaria, usar primera secundaria disponible
            // PERO solo si ambos equipos pueden (menos de 2 apariciones)
            if (!canchaAsignada && !tieneCanchaPrioritaria) {
              const puedeLocal = puedeJugarEnSecundaria(encuentro.equipo_local_id)
              const puedeVisitante = puedeJugarEnSecundaria(encuentro.equipo_visitante_id)
              
              // Solo usar secundarias si ambos equipos pueden
              if (puedeLocal && puedeVisitante && canchasRestantes.length > 0) {
                const primeraDisponible = canchasRestantes[0]?.nombre ?? null
                if (primeraDisponible) {
                  canchaAsignada = primeraDisponible
                  usoHorariosPorCancha[primeraDisponible] = (usoHorariosPorCancha[primeraDisponible] || 0) + 1
                  
                  // Actualizar contadores
                  contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] = 
                    (contadorEquipoCanchasSecundarias[encuentro.equipo_local_id] || 0) + 1
                  contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] = 
                    (contadorEquipoCanchasSecundarias[encuentro.equipo_visitante_id] || 0) + 1
                  
                  if (!contadorEquipoCanchaEspecifica[encuentro.equipo_local_id]) {
                    contadorEquipoCanchaEspecifica[encuentro.equipo_local_id] = {}
                  }
                  if (!contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id]) {
                    contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id] = {}
                  }
                  contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][primeraDisponible] = 
                    (contadorEquipoCanchaEspecifica[encuentro.equipo_local_id][primeraDisponible] || 0) + 1
                  contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][primeraDisponible] = 
                    (contadorEquipoCanchaEspecifica[encuentro.equipo_visitante_id][primeraDisponible] || 0) + 1
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
    
    // ===========================
    // SEGUNDA PASADA (RE-ASIGNAR)
    // ===========================
    // Objetivo: si aún quedan encuentros sin cancha pero existen otros horarios/canchas libres
    // en el MISMO día, intentar moverlos a otro horario disponible (sin repetir cancha+hora+fecha).
    // Reutilizamos los horarios ya cargados anteriormente en esta misma función.
    const horariosTorneo = horariosDisponibles

    // Releer encuentros desde BD para tener el estado final tras la primera pasada
    let encuentrosFinales = await encuentroQueries.getByTorneoId(torneoId)

    const encuentrosCandidatosReasignacion = encuentrosFinales.filter(
      (e: any) =>
        (!e.cancha || e.cancha.trim() === '') &&
        e.horario_id && // solo podemos mover si tiene horario
        e.horario && e.horario.dia_semana // necesitamos el día
    ) as any[]

    let reasignacionesRealizadas = 0

    for (const encuentro of encuentrosCandidatosReasignacion) {
      const diaSemanaOriginal = encuentro.horario?.dia_semana
      const jornada = encuentro.jornada || 1
      const fechaProgramada = encuentro.fecha_programada ?? null

      // Buscar todos los horarios del mismo día, ordenados por hora
      const horariosMismoDia = horariosTorneo
        .filter((h: any) => h.dia_semana === diaSemanaOriginal)
        .sort((a: any, b: any) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))

      let reasignado = false

      for (const horarioNuevo of horariosMismoDia) {
        const horaInicioNueva = horarioNuevo.hora_inicio

        // Probar todas las canchas activas para este nuevo horario
        for (const cancha of canchasActivas) {
          const canchaNombre = cancha.nombre

          // Verificar que la combinación (cancha, hora, fecha/día/jornada) esté libre en TODOS los torneos
          const ocupada = await verificarCanchaOcupadaEnTodosTorneos(
            canchaNombre,
            horaInicioNueva,
            jornada,
            torneoId,
            encuentro.id,
            diaSemanaOriginal,
            fechaProgramada
          )

          if (!ocupada) {
            // Actualizar horario y cancha del encuentro
            const formData = new FormData()
            formData.append('cancha', canchaNombre)
            formData.append('horario_id', String(horarioNuevo.id))
            await updateEncuentro(encuentro.id, formData)

            asignacionesRealizadas++
            reasignacionesRealizadas++
            reasignado = true
            break
          }
        }

        if (reasignado) break
      }
    }

    // Revalidar paths después de todas las asignaciones
    revalidatePath(`/torneos/${torneoId}`)
    
    // Calcular encuentros sin cancha asignada tras la segunda pasada
    encuentrosFinales = await encuentroQueries.getByTorneoId(torneoId)
    const encuentrosSinCancha = encuentrosFinales.filter(
      (e: any) => !e.cancha || e.cancha.trim() === ''
    )
    const encuentrosSinHorario = encuentrosFinales.filter((e: any) => !e.horario_id)
    
    let mensaje = `Se asignaron canchas a ${asignacionesRealizadas} encuentro(s)`
    if (reasignacionesRealizadas > 0) {
      mensaje += ` (incluye ${reasignacionesRealizadas} encuentro(s) reprogramados a otro horario del mismo día)`
    }
    if (encuentrosSinCancha.length > 0) {
      mensaje += `. ${encuentrosSinCancha.length} encuentro(s) quedaron sin cancha asignada`
      if (encuentrosSinHorario.length > 0) {
        mensaje += ` (${encuentrosSinHorario.length} sin horario asignado)`
      }
    }
    
    return {
      success: true,
      asignacionesRealizadas,
      encuentrosReasignados: reasignacionesRealizadas,
      encuentrosSinCancha: encuentrosSinCancha.length,
      encuentrosSinHorario: encuentrosSinHorario.length,
      mensaje
    }
  } catch (error) {
    console.error('Error al asignar canchas automáticamente:', error)
    throw new Error(
      `Error al asignar canchas automáticamente: ${error instanceof Error ? error.message : 'Error desconocido'}`
    )
  }
}