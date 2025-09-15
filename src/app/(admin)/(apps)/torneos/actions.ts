'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { torneoQueries, equipoTorneoQueries, encuentroQueries, equiposDescansanQueries } from '@/db/queries'
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
    intercambiosInteligentes?: boolean
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
    throw new Error(`Error al eliminar jornada ${jornada}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}
