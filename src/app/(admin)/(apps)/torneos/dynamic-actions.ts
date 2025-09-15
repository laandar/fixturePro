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
    
    // Convertir descansos a formato Record<number, number[]>
    const descansosFormato: Record<number, number[]> = {}
    descansos.forEach((descanso: any) => {
      if (!descansosFormato[descanso.jornada]) {
        descansosFormato[descanso.jornada] = []
      }
      descansosFormato[descanso.jornada].push(descanso.equipo_id)
    })

    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    const generador = crearGeneradorDinamico(equipos, encuentros as any, descansosFormato as any)
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
    forzarDescanso?: number[]
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
    const descansos = await equiposDescansanQueries.getByTorneoId(torneoId)
    
    // Convertir descansos a formato Record<number, number[]>
    const descansosFormato: Record<number, number[]> = {}
    descansos.forEach((descanso: any) => {
      if (!descansosFormato[descanso.jornada]) {
        descansosFormato[descanso.jornada] = []
      }
      descansosFormato[descanso.jornada].push(descanso.equipo_id)
    })
    
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
    let equiposQueDescansan: number[] = []
    
    if (opciones.forzarDescanso && opciones.forzarDescanso.length > 0) {
      // Usar equipos forzados para descansar
      equiposQueDescansan = opciones.forzarDescanso
    } else if (equipos.length % 2 === 1) {
      // Selección automática: elegir el equipo con menos descansos
      const equiposConDescansos = equipos.map(equipo => {
        let totalDescansos = 0
        Object.values(descansosFormato).forEach((equiposDescansando) => {
          if (equiposDescansando.includes(equipo.id)) {
            totalDescansos++
          }
        })
        return { equipo, descansos: totalDescansos }
      })
      
      // Ordenar por número de descansos (menos descansos primero)
      equiposConDescansos.sort((a, b) => a.descansos - b.descansos)
      
      // Tomar el equipo con menos descansos
      equiposQueDescansan = [equiposConDescansos[0].equipo.id]
    }
    
    const equiposDisponibles = equipos.filter((e: any) => !equiposQueDescansan.includes(e.id))
    
    // Generar encuentros usando algoritmo optimizado que evita emparejamientos repetidos
    const encuentros = generarEncuentrosOptimizados(equiposDisponibles, emparejamientosJugados, jornada, opciones)

    const jornadaPropuesta = {
      numero: jornada,
      encuentros,
      equiposQueDescansan,
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
      equiposConDescanso: equiposQueDescansan.length,
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
): Promise<{ mensaje: string; encuentrosCreados: number; equiposQueDescansan?: number[] }> {
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

    // Guardar descansos si existen
    if (jornada.equiposQueDescansan && jornada.equiposQueDescansan.length > 0) {
      // Eliminar descansos existentes para esta jornada
      await equiposDescansanQueries.deleteByJornada(torneoId, jornada.numero)
      
      // Crear los nuevos registros de descanso
      for (const equipoId of jornada.equiposQueDescansan) {
        await equiposDescansanQueries.create({
          torneo_id: torneoId,
          jornada: jornada.numero,
          equipo_id: equipoId
        })
      }
    }

    revalidatePath(`/torneos/${torneoId}`)
    
    return {
      mensaje: `Jornada ${jornada.numero} confirmada exitosamente`,
      encuentrosCreados,
      equiposQueDescansan: jornada.equiposQueDescansan
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
    forzarDescanso?: number[]
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
    const descansosFormato: Record<number, number[]> = {}
    descansos.forEach((descanso: any) => {
      if (descanso.jornada !== jornada) { // Excluir descanso de la jornada a regenerar
        if (!descansosFormato[descanso.jornada]) {
          descansosFormato[descanso.jornada] = []
        }
        descansosFormato[descanso.jornada].push(descanso.equipo_id)
      }
    })

    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    const dynamicOptions: DynamicFixtureOptions = {
      permiteRevancha: Boolean(torneo.permite_revancha ?? false),
      diasEntreJornadas: opciones.diasEntreJornadas || 7,
      fechaInicio: new Date(String(torneo.fecha_inicio)),
      canchas: opciones.canchas || ['Cancha Principal', 'Cancha Secundaria'],
      arbitros: opciones.arbitros || ['Árbitro 1', 'Árbitro 2', 'Árbitro 3'],
      encuentrosExistentes: encuentrosSinJornada as any,
      equiposDescansanExistentes: descansosFormato,
      forzarDescanso: opciones.forzarDescanso,
      permitirDescansosConsecutivos: opciones.permitirDescansosConsecutivos || false
    }

    const generador = crearGeneradorDinamico(equipos, encuentrosSinJornada as any, descansosFormato as any, dynamicOptions)
    const resultado = generador.generarPropuestaJornada(jornada)

    return resultado
  } catch (error) {
    throw new Error(`Error al regenerar jornada: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

export async function confirmarRegeneracionJornada(
  torneoId: number,
  jornada: JornadaPropuesta
): Promise<{ mensaje: string; encuentrosCreados: number; encuentrosEliminados: number; equiposQueDescansan?: number[] }> {
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

    // Guardar nuevos descansos si existen
    if (jornada.equiposQueDescansan && jornada.equiposQueDescansan.length > 0) {
      for (const equipoId of jornada.equiposQueDescansan) {
        await equiposDescansanQueries.create({
          torneo_id: torneoId,
          equipo_id: equipoId,
          jornada: jornada.numero
        })
      }
    }

    revalidatePath(`/torneos/${torneoId}`)
    
    return {
      mensaje: `Jornada ${jornada.numero} regenerada exitosamente`,
      encuentrosCreados,
      encuentrosEliminados,
      equiposQueDescansan: jornada.equiposQueDescansan
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
    
    const descansosFormato: Record<number, number[]> = {}
    descansos.forEach((descanso: any) => {
      if (!descansosFormato[descanso.jornada]) {
        descansosFormato[descanso.jornada] = []
      }
      descansosFormato[descanso.jornada].push(descanso.equipo_id)
    })

    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    const generador = crearGeneradorDinamico(equipos, encuentros as any, descansosFormato as any)
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

// ===== FUNCIONES AUXILIARES =====

/**
 * Genera encuentros optimizados que maximizan nuevos emparejamientos
 */
function generarEncuentrosOptimizados(
  equiposDisponibles: any[],
  emparejamientosJugados: Set<string>,
  jornada: number,
  opciones: any
): any[] {
  const encuentros: any[] = []
  const equiposUsados = new Set<number>()
  
  // Crear todas las combinaciones posibles con su información
  const combinaciones = []
  for (let i = 0; i < equiposDisponibles.length; i++) {
    for (let j = i + 1; j < equiposDisponibles.length; j++) {
      const equipo1 = equiposDisponibles[i].id
      const equipo2 = equiposDisponibles[j].id
      const emparejamiento = `${equipo1}-${equipo2}`
      const emparejamientoInverso = `${equipo2}-${equipo1}`
      
      const esNuevoEmparejamiento = !emparejamientosJugados.has(emparejamiento) && !emparejamientosJugados.has(emparejamientoInverso)
      
      combinaciones.push({
        equipo1,
        equipo2,
        esNuevoEmparejamiento,
        prioridad: esNuevoEmparejamiento ? 'alta' as const : 'baja' as const
      })
    }
  }
  
  // Ordenar: nuevos emparejamientos primero
  combinaciones.sort((a, b) => {
    if (a.esNuevoEmparejamiento && !b.esNuevoEmparejamiento) return -1
    if (!a.esNuevoEmparejamiento && b.esNuevoEmparejamiento) return 1
    return 0
  })
  
  // Usar backtracking para encontrar la mejor combinación
  const mejorCombinacion = encontrarMejorCombinacion(combinaciones, equiposDisponibles.length)
  
  // Crear encuentros con la mejor combinación encontrada
  for (const combo of mejorCombinacion) {
    if (!equiposUsados.has(combo.equipo1) && !equiposUsados.has(combo.equipo2)) {
      encuentros.push({
        equipoLocal: combo.equipo1,
        equipoVisitante: combo.equipo2,
        cancha: (opciones.canchas || ['Cancha Principal'])[0],
        arbitro: (opciones.arbitros || ['Árbitro Principal'])[0],
        fecha: new Date(Date.now() + (jornada - 1) * (opciones.diasEntreJornadas || 7) * 24 * 60 * 60 * 1000),
        esNuevoEmparejamiento: combo.esNuevoEmparejamiento,
        prioridad: combo.prioridad
      })
      
      equiposUsados.add(combo.equipo1)
      equiposUsados.add(combo.equipo2)
    }
  }
  
  return encuentros
}

/**
 * Encuentra la mejor combinación de emparejamientos usando backtracking
 */
function encontrarMejorCombinacion(combinaciones: any[], totalEquipos: number): any[] {
  let mejorCombinacion: any[] = []
  let maxNuevosEmparejamientos = -1
  
  function backtrack(combinacionActual: any[], equiposUsados: Set<number>, index: number) {
    // Si ya tenemos todos los equipos emparejados
    if (equiposUsados.size === totalEquipos) {
      const nuevosEmparejamientos = combinacionActual.filter(c => c.esNuevoEmparejamiento).length
      if (nuevosEmparejamientos > maxNuevosEmparejamientos) {
        maxNuevosEmparejamientos = nuevosEmparejamientos
        mejorCombinacion = [...combinacionActual]
      }
      return
    }
    
    // Si ya no podemos mejorar la mejor solución actual
    const posiblesNuevos = combinaciones.slice(index).filter(c => c.esNuevoEmparejamiento).length
    const nuevosActuales = combinacionActual.filter(c => c.esNuevoEmparejamiento).length
    if (nuevosActuales + posiblesNuevos <= maxNuevosEmparejamientos) {
      return
    }
    
    // Probar cada combinación restante
    for (let i = index; i < combinaciones.length; i++) {
      const combo = combinaciones[i]
      
      // Verificar si podemos usar esta combinación
      if (!equiposUsados.has(combo.equipo1) && !equiposUsados.has(combo.equipo2)) {
        // Agregar a la combinación actual
        combinacionActual.push(combo)
        equiposUsados.add(combo.equipo1)
        equiposUsados.add(combo.equipo2)
        
        // Continuar recursivamente
        backtrack(combinacionActual, equiposUsados, i + 1)
        
        // Backtrack: remover de la combinación actual
        combinacionActual.pop()
        equiposUsados.delete(combo.equipo1)
        equiposUsados.delete(combo.equipo2)
      }
    }
  }
  
  // Iniciar backtracking
  backtrack([], new Set<number>(), 0)
  
  // Si no encontramos una solución completa, usar la mejor parcial
  if (mejorCombinacion.length === 0) {
    // Fallback: usar el algoritmo greedy mejorado
    const equiposUsados = new Set<number>()
    for (const combo of combinaciones) {
      if (!equiposUsados.has(combo.equipo1) && !equiposUsados.has(combo.equipo2)) {
        mejorCombinacion.push(combo)
        equiposUsados.add(combo.equipo1)
        equiposUsados.add(combo.equipo2)
      }
    }
  }
  
  return mejorCombinacion
}

// ===== FUNCIONES DE UTILIDAD =====

export async function obtenerEmparejamientosFaltantes(torneoId: number) {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    const encuentros = await encuentroQueries.getByTorneoId(torneoId)
    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    // Debug: Log encuentros data
    console.log('DEBUG - Encuentros encontrados:', encuentros.length)
    console.log('DEBUG - Equipos en torneo:', equipos.length)
    console.log('DEBUG - Encuentros con IDs:', encuentros.map(e => ({
      id: e.id,
      local: e.equipo_local_id,
      visitante: e.equipo_visitante_id,
      jornada: e.jornada
    })))
    
    // Crear conjunto de emparejamientos existentes
    const emparejamientosExistentes = new Set<string>()
    const equiposIds = new Set(equipos.map(e => e.id))
    
    encuentros.forEach(encuentro => {
      if (encuentro.equipo_local_id && encuentro.equipo_visitante_id) {
        // Verificar que ambos equipos existen en el torneo
        if (equiposIds.has(encuentro.equipo_local_id) && equiposIds.has(encuentro.equipo_visitante_id)) {
          // Crear clave única para el emparejamiento (ordenada para evitar duplicados)
          const equipo1 = Math.min(encuentro.equipo_local_id, encuentro.equipo_visitante_id)
          const equipo2 = Math.max(encuentro.equipo_local_id, encuentro.equipo_visitante_id)
          const clave = `${equipo1}-${equipo2}`
          emparejamientosExistentes.add(clave)
          console.log('DEBUG - Agregando emparejamiento:', clave)
        } else {
          console.log('DEBUG - Encuentro con equipos inválidos:', {
            id: encuentro.id,
            local: encuentro.equipo_local_id,
            visitante: encuentro.equipo_visitante_id,
            equiposEnTorneo: Array.from(equiposIds)
          })
        }
      } else {
        console.log('DEBUG - Encuentro con IDs nulos:', {
          id: encuentro.id,
          local: encuentro.equipo_local_id,
          visitante: encuentro.equipo_visitante_id
        })
      }
    })

    console.log('DEBUG - Emparejamientos existentes:', Array.from(emparejamientosExistentes))

    // Generar todos los emparejamientos posibles
    const emparejamientosPosibles: Array<{
      equipo1: { id: number; nombre: string }
      equipo2: { id: number; nombre: string }
      jugado: boolean
    }> = []

    for (let i = 0; i < equipos.length; i++) {
      for (let j = i + 1; j < equipos.length; j++) {
        const equipo1 = equipos[i]
        const equipo2 = equipos[j]
        
        // Crear clave ordenada (igual que en la creación de emparejamientos existentes)
        const equipo1Id = Math.min(equipo1.id, equipo2.id)
        const equipo2Id = Math.max(equipo1.id, equipo2.id)
        const clave = `${equipo1Id}-${equipo2Id}`
        const jugado = emparejamientosExistentes.has(clave)

        emparejamientosPosibles.push({
          equipo1: { id: equipo1.id, nombre: equipo1.nombre },
          equipo2: { id: equipo2.id, nombre: equipo2.nombre },
          jugado
        })
        
        if (!jugado) {
          console.log('DEBUG - Emparejamiento faltante:', `${equipo1.nombre} vs ${equipo2.nombre} (${clave})`)
        }
      }
    }

    // Separar emparejamientos jugados y faltantes
    const emparejamientosJugados = emparejamientosPosibles.filter(e => e.jugado)
    const emparejamientosFaltantes = emparejamientosPosibles.filter(e => !e.jugado)

    console.log('DEBUG - Total posibles:', emparejamientosPosibles.length)
    console.log('DEBUG - Jugados:', emparejamientosJugados.length)
    console.log('DEBUG - Faltantes:', emparejamientosFaltantes.length)
    console.log('DEBUG - Emparejamientos faltantes detalle:', emparejamientosFaltantes.map(e => `${e.equipo1.nombre} vs ${e.equipo2.nombre} (${e.equipo1.id}-${e.equipo2.id})`))
    
    // Verificar si el cálculo es correcto
    const totalEsperado = (equipos.length * (equipos.length - 1)) / 2
    console.log('DEBUG - Total esperado (n*(n-1)/2):', totalEsperado)
    console.log('DEBUG - ¿Cálculo correcto?:', emparejamientosPosibles.length === totalEsperado)

    return {
      total: emparejamientosPosibles.length,
      jugados: emparejamientosJugados.length,
      faltantes: emparejamientosFaltantes.length,
      emparejamientosJugados,
      emparejamientosFaltantes,
      porcentajeCompletado: emparejamientosPosibles.length > 0 
        ? Math.round((emparejamientosJugados.length / emparejamientosPosibles.length) * 100) 
        : 0
    }
  } catch (error) {
    throw new Error(`Error al obtener emparejamientos faltantes: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

export async function obtenerEquiposDisponiblesParaDescanso(torneoId: number, jornada: number) {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    const descansos = await equiposDescansanQueries.getByTorneoId(torneoId)
    const descansosFormato: Record<number, number[]> = {}
    descansos.forEach((descanso: any) => {
      if (!descansosFormato[descanso.jornada]) {
        descansosFormato[descanso.jornada] = []
      }
      descansosFormato[descanso.jornada].push(descanso.equipo_id)
    })

    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    // Si hay número par de equipos, no hay descanso
    if (equipos.length % 2 === 0) {
      return []
    }

    // Mostrar TODOS los equipos con su conteo de descansos
    return equipos.map(equipo => {
      // Contar todos los descansos que ha tenido el equipo hasta ahora
      let totalDescansos = 0
      Object.values(descansosFormato).forEach(equiposDescansando => {
        if (equiposDescansando.includes(equipo.id)) {
          totalDescansos++
        }
      })
      
      return {
        id: equipo.id,
        nombre: equipo.nombre,
        descansos: totalDescansos
      }
    })
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
    const descansosFormato: Record<number, number[]> = {}
    descansos.forEach((descanso: any) => {
      if (!descansosFormato[descanso.jornada]) {
        descansosFormato[descanso.jornada] = []
      }
      descansosFormato[descanso.jornada].push(descanso.equipo_id)
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
      const descansosAnteriores = descansosFormato[jornada - 1] || []
      if (descansosAnteriores.includes(equipoDescanso)) {
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
