'use server'

import { revalidatePath } from 'next/cache'
import { torneoQueries, equipoTorneoQueries, encuentroQueries, equiposDescansanQueries } from '@/db/queries'
import { DynamicFixtureGenerator, crearGeneradorDinamico, validarEquiposParaFixtureDinamico } from '@/lib/dynamic-fixture-generator'
import type { EquipoWithRelations, EncuentroWithRelations } from '@/db/types'
import type { DynamicFixtureOptions, DynamicFixtureResult, JornadaPropuesta } from '@/lib/dynamic-fixture-generator'

// ===== FUNCIONES DE ESTADO =====

export async function obtenerEstadoTorneo(torneoId: number) {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    const encuentros = await encuentroQueries.getByTorneoId(torneoId)
    const descansos = await equiposDescansanQueries.getByTorneoId(torneoId)
    
    // Convertir descansos a formato Record<number, number>
    const descansosFormato: Record<number, number> = {}
    descansos.forEach((descanso: any) => {
      descansosFormato[descanso.jornada] = descanso.equipo_id
    })

    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    const generador = crearGeneradorDinamico(equipos, encuentros, descansosFormato)
    const estadisticas = generador.obtenerEstadisticasTorneo()
    const estado = generador.obtenerEstado()

    return {
      torneo,
      equipos,
      encuentros,
      descansos: descansosFormato,
      estadisticas,
      estado
    }
  } catch (error) {
    throw new Error(`Error al obtener estado del torneo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// ===== GENERACIÓN DE PROPUESTAS =====

export async function generarPropuestaJornada(
  torneoId: number,
  jornada: number,
  opciones: {
    forzarDescanso?: number
    permitirDescansosConsecutivos?: boolean
    diasEntreJornadas?: number
    canchas?: string[]
    arbitros?: string[]
  } = {}
): Promise<DynamicFixtureResult> {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    // Obtener encuentros existentes para verificar emparejamientos ya jugados
    const encuentrosExistentes = await encuentroQueries.getByTorneoId(torneoId)
    
    // Crear set de emparejamientos ya jugados
    const emparejamientosJugados = new Set<string>()
    encuentrosExistentes.forEach(encuentro => {
      const emparejamiento1 = `${encuentro.equipo_local_id}-${encuentro.equipo_visitante_id}`
      const emparejamiento2 = `${encuentro.equipo_visitante_id}-${encuentro.equipo_local_id}`
      emparejamientosJugados.add(emparejamiento1)
      emparejamientosJugados.add(emparejamiento2)
    })

    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    if (equipos.length < 2) {
      throw new Error('Se necesitan al menos 2 equipos para generar una jornada')
    }

    // Generar propuesta con validación de emparejamientos
    const equipoQueDescansa = opciones.forzarDescanso || (equipos.length % 2 === 1 ? equipos[0].id : undefined)
    const equiposDisponibles = equipos.filter(e => e.id !== equipoQueDescansa)
    
    // Generar encuentros evitando emparejamientos ya jugados
    const encuentros = []
    const equiposUsados = new Set<number>()
    
    for (let i = 0; i < equiposDisponibles.length; i++) {
      if (equiposUsados.has(equiposDisponibles[i].id)) continue
      
      for (let j = i + 1; j < equiposDisponibles.length; j++) {
        if (equiposUsados.has(equiposDisponibles[j].id)) continue
        
        const equipo1 = equiposDisponibles[i].id
        const equipo2 = equiposDisponibles[j].id
        const emparejamiento = `${equipo1}-${equipo2}`
        
        // Verificar si este emparejamiento ya se jugó
        if (!emparejamientosJugados.has(emparejamiento)) {
          encuentros.push({
            equipoLocal: equipo1,
            equipoVisitante: equipo2,
            cancha: (opciones.canchas || ['Cancha Principal'])[0],
            arbitro: (opciones.arbitros || ['Árbitro Principal'])[0],
            fecha: new Date(Date.now() + (jornada - 1) * (opciones.diasEntreJornadas || 7) * 24 * 60 * 60 * 1000),
            esNuevoEmparejamiento: true,
            prioridad: 'alta' as const
          })
          
          equiposUsados.add(equipo1)
          equiposUsados.add(equipo2)
          break
        }
      }
    }

    // Si no se pudieron generar todos los encuentros, generar los restantes
    const equiposSinEmparejar = equiposDisponibles.filter(e => !equiposUsados.has(e.id))
    for (let i = 0; i < equiposSinEmparejar.length; i += 2) {
      if (i + 1 < equiposSinEmparejar.length) {
        const equipo1 = equiposSinEmparejar[i].id
        const equipo2 = equiposSinEmparejar[i + 1].id
        const emparejamiento = `${equipo1}-${equipo2}`
        
        encuentros.push({
          equipoLocal: equipo1,
          equipoVisitante: equipo2,
          cancha: (opciones.canchas || ['Cancha Principal'])[0],
          arbitro: (opciones.arbitros || ['Árbitro Principal'])[0],
          fecha: new Date(Date.now() + (jornada - 1) * (opciones.diasEntreJornadas || 7) * 24 * 60 * 60 * 1000),
          esNuevoEmparejamiento: !emparejamientosJugados.has(emparejamiento),
          prioridad: emparejamientosJugados.has(emparejamiento) ? 'baja' as const : 'alta' as const
        })
      }
    }

    const jornadaPropuesta = {
      numero: jornada,
      encuentros,
      equipoQueDescansa,
      fecha: new Date(Date.now() + (jornada - 1) * (opciones.diasEntreJornadas || 7) * 24 * 60 * 60 * 1000),
      canchas: opciones.canchas || ['Cancha Principal'],
      arbitros: opciones.arbitros || ['Árbitro Principal']
    }

    // Calcular estadísticas reales
    const nuevosEmparejamientos = encuentros.filter(e => e.esNuevoEmparejamiento).length
    const emparejamientosRepetidos = encuentros.length - nuevosEmparejamientos

    const estadisticas = {
      totalEncuentros: encuentros.length,
      nuevosEmparejamientos,
      emparejamientosRepetidos,
      equiposConDescanso: equipoQueDescansa ? 1 : 0,
      balanceDescansos: equipos.reduce((acc, equipo) => {
        acc[equipo.id] = 0
        return acc
      }, {} as Record<number, number>),
      proximasOpciones: Math.floor(equipos.length * (equipos.length - 1) / 2) - emparejamientosJugados.size / 2
    }

    const validaciones = {
      esValida: true,
      errores: [],
      advertencias: emparejamientosRepetidos > 0 ? [`Se generaron ${emparejamientosRepetidos} emparejamientos repetidos`] : [],
      descansosConsecutivos: [],
      equiposDesbalanceados: []
    }

    return {
      jornada: jornadaPropuesta,
      estadisticas,
      validaciones
    }
  } catch (error) {
    throw new Error(`Error al generar propuesta de jornada: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// ===== CONFIRMACIÓN Y GUARDADO =====

export async function confirmarJornada(
  torneoId: number,
  jornada: JornadaPropuesta
): Promise<{ mensaje: string; encuentrosCreados: number; equipoQueDescansa?: number }> {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    // Verificar que la jornada no existe ya
    const jornadaExistente = await encuentroQueries.getByJornada(torneoId, jornada.numero)
    if (jornadaExistente.length > 0) {
      throw new Error(`La jornada ${jornada.numero} ya existe`)
    }

    // Crear encuentros
    let encuentrosCreados = 0
    for (const encuentro of jornada.encuentros) {
      const encuentroData = {
        torneo_id: torneoId,
        equipo_local_id: encuentro.equipoLocal,
        equipo_visitante_id: encuentro.equipoVisitante,
        jornada: jornada.numero,
        fecha_programada: encuentro.fecha,
        estado: 'programado',
        cancha: encuentro.cancha,
        arbitro: encuentro.arbitro,
        goles_local: null,
        goles_visitante: null,
        fecha_jugada: null,
        observaciones: null
      }

      await encuentroQueries.create(encuentroData)
      encuentrosCreados++
    }

    // Guardar descanso si existe
    if (jornada.equipoQueDescansa) {
      // Verificar si ya existe un descanso para esta jornada
      const descansoExistente = await equiposDescansanQueries.getByJornada(torneoId, jornada.numero)
      
      if (descansoExistente) {
        // Actualizar el descanso existente
        await equiposDescansanQueries.deleteByJornada(torneoId, jornada.numero)
      }
      
      // Crear el nuevo registro de descanso
      await equiposDescansanQueries.create({
        torneo_id: torneoId,
        equipo_id: jornada.equipoQueDescansa,
        jornada: jornada.numero
      })
    }

    revalidatePath(`/torneos/${torneoId}`)
    
    return {
      mensaje: `Jornada ${jornada.numero} confirmada exitosamente`,
      encuentrosCreados,
      equipoQueDescansa: jornada.equipoQueDescansa
    }
  } catch (error) {
    throw new Error(`Error al confirmar jornada: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// ===== REGENERACIÓN DINÁMICA =====

export async function regenerarJornadaDinamica(
  torneoId: number,
  jornada: number,
  opciones: {
    forzarDescanso?: number
    permitirDescansosConsecutivos?: boolean
    diasEntreJornadas?: number
    canchas?: string[]
    arbitros?: string[]
  } = {}
): Promise<DynamicFixtureResult> {
  try {
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

    // Obtener todos los encuentros del torneo (excluyendo la jornada a regenerar)
    const todosEncuentros = await encuentroQueries.getByTorneoId(torneoId)
    const encuentrosSinJornada = todosEncuentros.filter(e => e.jornada !== jornada)
    
    const descansos = await equiposDescansanQueries.getByTorneoId(torneoId)
    const descansosFormato: Record<number, number> = {}
    descansos.forEach((descanso: any) => {
      if (descanso.jornada !== jornada) { // Excluir descanso de la jornada a regenerar
        descansosFormato[descanso.jornada] = descanso.equipo_id
      }
    })

    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    const dynamicOptions: DynamicFixtureOptions = {
      permiteRevancha: Boolean(torneo.permite_revancha ?? false),
      diasEntreJornadas: opciones.diasEntreJornadas || 7,
      fechaInicio: new Date(String(torneo.fecha_inicio)),
      canchas: opciones.canchas || ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: opciones.arbitros || ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      encuentrosExistentes: encuentrosSinJornada,
      equiposDescansanExistentes: descansosFormato,
      forzarDescanso: opciones.forzarDescanso,
      permitirDescansosConsecutivos: opciones.permitirDescansosConsecutivos || false
    }

    const generador = crearGeneradorDinamico(equipos, encuentrosSinJornada, descansosFormato, dynamicOptions)
    const resultado = generador.generarPropuestaJornada(jornada)

    return resultado
  } catch (error) {
    throw new Error(`Error al regenerar jornada: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

export async function confirmarRegeneracionJornada(
  torneoId: number,
  jornada: JornadaPropuesta
): Promise<{ mensaje: string; encuentrosCreados: number; encuentrosEliminados: number; equipoQueDescansa?: number }> {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    // Eliminar encuentros existentes de esta jornada
    const jornadaExistente = await encuentroQueries.getByJornada(torneoId, jornada.numero)
    let encuentrosEliminados = 0
    
    for (const encuentro of jornadaExistente) {
      await encuentroQueries.delete(encuentro.id)
      encuentrosEliminados++
    }

    // Eliminar descanso existente de esta jornada
    const descansoExistente = await equiposDescansanQueries.getByJornada(torneoId, jornada.numero)
    if (descansoExistente) {
      await equiposDescansanQueries.deleteByJornada(torneoId, jornada.numero)
    }

    // Crear nuevos encuentros
    let encuentrosCreados = 0
    for (const encuentro of jornada.encuentros) {
      const encuentroData = {
        torneo_id: torneoId,
        equipo_local_id: encuentro.equipoLocal,
        equipo_visitante_id: encuentro.equipoVisitante,
        jornada: jornada.numero,
        fecha_programada: encuentro.fecha,
        estado: 'programado',
        cancha: encuentro.cancha,
        arbitro: encuentro.arbitro,
        goles_local: null,
        goles_visitante: null,
        fecha_jugada: null,
        observaciones: null
      }

      await encuentroQueries.create(encuentroData)
      encuentrosCreados++
    }

    // Guardar nuevo descanso si existe
    if (jornada.equipoQueDescansa) {
      await equiposDescansanQueries.create({
        torneo_id: torneoId,
        equipo_id: jornada.equipoQueDescansa,
        jornada: jornada.numero
      })
    }

    revalidatePath(`/torneos/${torneoId}`)
    
    return {
      mensaje: `Jornada ${jornada.numero} regenerada exitosamente`,
      encuentrosCreados,
      encuentrosEliminados,
      equipoQueDescansa: jornada.equipoQueDescansa
    }
  } catch (error) {
    throw new Error(`Error al confirmar regeneración de jornada: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// ===== ANÁLISIS Y ESTADÍSTICAS =====

export async function analizarTorneo(torneoId: number) {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    const encuentros = await encuentroQueries.getByTorneoId(torneoId)
    const descansos = await equiposDescansanQueries.getByTorneoId(torneoId)
    
    const descansosFormato: Record<number, number> = {}
    descansos.forEach((descanso: any) => {
      descansosFormato[descanso.jornada] = descanso.equipo_id
    })

    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    const generador = crearGeneradorDinamico(equipos, encuentros, descansosFormato)
    const estadisticas = generador.obtenerEstadisticasTorneo()
    const estado = generador.obtenerEstado()

    // Análisis adicional
    const analisis = {
      equipos: equipos.map(equipo => ({
        id: equipo.id,
        nombre: equipo.nombre,
        descansos: estado.descansosPorEquipo[equipo.id] || 0,
        encuentrosJugados: encuentros.filter(e => 
          e.equipo_local_id === equipo.id || e.equipo_visitante_id === equipo.id
        ).length
      })),
      jornadas: estado.jornadasGeneradas.sort((a, b) => a - b),
      emparejamientosRestantes: estadisticas.emparejamientosDisponibles,
      progreso: estadisticas.progreso,
      recomendaciones: generarRecomendaciones(estadisticas, estado)
    }

    return analisis
  } catch (error) {
    throw new Error(`Error al analizar torneo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

function generarRecomendaciones(estadisticas: any, estado: any): string[] {
  const recomendaciones: string[] = []

  // Verificar balance de descansos
  const descansos = Object.values(estadisticas.balanceDescansos) as number[]
  const maxDescansos = Math.max(...descansos)
  const minDescansos = Math.min(...descansos)
  
  if (maxDescansos - minDescansos > 1) {
    recomendaciones.push('Hay desbalance en los descansos. Considera forzar descansos para equipos con menos descansos.')
  }

  // Verificar progreso
  if (estadisticas.progreso < 50) {
    recomendaciones.push('El torneo está en etapas tempranas. Prioriza nuevos emparejamientos.')
  } else if (estadisticas.progreso > 80) {
    recomendaciones.push('El torneo está avanzado. Considera permitir descansos consecutivos si es necesario.')
  }

  // Verificar emparejamientos restantes
  if (estadisticas.emparejamientosDisponibles < 5) {
    recomendaciones.push('Quedan pocos emparejamientos nuevos. El torneo está cerca de completarse.')
  }

  return recomendaciones
}

// ===== FUNCIONES DE UTILIDAD =====

export async function obtenerEquiposDisponiblesParaDescanso(torneoId: number, jornada: number) {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    const descansos = await equiposDescansanQueries.getByTorneoId(torneoId)
    const descansosFormato: Record<number, number> = {}
    descansos.forEach((descanso: any) => {
      descansosFormato[descanso.jornada] = descanso.equipo_id
    })

    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    // Si hay número par de equipos, no hay descanso
    if (equipos.length % 2 === 0) {
      return []
    }

    // Filtrar equipos que ya descansaron en la jornada anterior
    const equiposDisponibles = equipos.filter(equipo => {
      const descansoAnterior = descansosFormato[jornada - 1]
      return descansoAnterior !== equipo.id
    })

    return equiposDisponibles.map(equipo => ({
      id: equipo.id,
      nombre: equipo.nombre,
      descansos: descansosFormato[jornada - 1] === equipo.id ? 1 : 0
    }))
  } catch (error) {
    throw new Error(`Error al obtener equipos disponibles para descanso: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

export async function validarRestriccionesJornada(
  torneoId: number,
  jornada: number,
  equipoDescanso?: number
): Promise<{ esValida: boolean; errores: string[]; advertencias: string[] }> {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    const descansos = await equiposDescansanQueries.getByTorneoId(torneoId)
    const descansosFormato: Record<number, number> = {}
    descansos.forEach((descanso: any) => {
      descansosFormato[descanso.jornada] = descanso.equipo_id
    })

    const errores: string[] = []
    const advertencias: string[] = []

    // Verificar que la jornada no existe
    const jornadaExistente = await encuentroQueries.getByJornada(torneoId, jornada)
    if (jornadaExistente.length > 0) {
      errores.push(`La jornada ${jornada} ya existe`)
    }

    // Verificar descansos consecutivos
    if (equipoDescanso && jornada > 1) {
      const descansoAnterior = descansosFormato[jornada - 1]
      if (descansoAnterior === equipoDescanso) {
        advertencias.push(`El equipo ${equipoDescanso} descansaría dos jornadas consecutivas`)
      }
    }

    return {
      esValida: errores.length === 0,
      errores,
      advertencias
    }
  } catch (error) {
    throw new Error(`Error al validar restricciones: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}
