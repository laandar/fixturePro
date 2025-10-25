'use server'

import { db } from '@/db'
import { horarios, encuentros, equipos, torneos, equiposTorneo } from '@/db/schema'
import { eq, and, asc, isNotNull } from 'drizzle-orm'

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

// Función para evaluar la calidad de la asignación actual
async function evaluarCalidadAsignacion(torneoId: number): Promise<number> {
  try {
    // Obtener todos los encuentros del torneo con sus horarios
    const encuentrosDelTorneo = await db
      .select()
      .from(encuentros)
      .where(eq(encuentros.torneo_id, torneoId))
      .orderBy(asc(encuentros.jornada), asc(encuentros.id))

    // Obtener horarios disponibles
    const horariosDisponibles = await db
      .select()
      .from(horarios)
      .orderBy(asc(horarios.orden), asc(horarios.hora_inicio))

    if (horariosDisponibles.length === 0) {
      return Infinity // Sin horarios disponibles
    }

    // Calcular distribución por equipo
    const distribucionPorEquipo: { [equipoId: number]: { [horarioId: number]: number } } = {}
    
    for (const encuentro of encuentrosDelTorneo) {
      if (encuentro.horario_id && encuentro.equipo_local_id && encuentro.equipo_visitante_id) {
        // Contar para equipo local
        if (!distribucionPorEquipo[encuentro.equipo_local_id]) {
          distribucionPorEquipo[encuentro.equipo_local_id] = {}
        }
        distribucionPorEquipo[encuentro.equipo_local_id][encuentro.horario_id] = 
          (distribucionPorEquipo[encuentro.equipo_local_id][encuentro.horario_id] || 0) + 1

        // Contar para equipo visitante
        if (!distribucionPorEquipo[encuentro.equipo_visitante_id]) {
          distribucionPorEquipo[encuentro.equipo_visitante_id] = {}
        }
        distribucionPorEquipo[encuentro.equipo_visitante_id][encuentro.horario_id] = 
          (distribucionPorEquipo[encuentro.equipo_visitante_id][encuentro.horario_id] || 0) + 1
      }
    }

    let puntuacionTotal = 0

    // Calcular distribución equitativa esperada
    const totalJornadas = Math.max(...encuentrosDelTorneo.map(e => e.jornada || 0))
    const numeroHorarios = horariosDisponibles.length
    const vecesPorHorario = totalJornadas / numeroHorarios
    const vecesMinimas = Math.floor(vecesPorHorario)
    const vecesMaximas = Math.ceil(vecesPorHorario)

    // Evaluar cada equipo
    for (const equipoId of Object.keys(distribucionPorEquipo).map(Number)) {
      const distribucionEquipo = distribucionPorEquipo[equipoId]
      
      // Verificar violaciones por horario
      for (const horario of horariosDisponibles) {
        const vecesEnHorario = distribucionEquipo[horario.id] || 0
        
        // Penalizar si excede el máximo (3 veces)
        if (vecesEnHorario > 3) {
          puntuacionTotal += (vecesEnHorario - 3) * 1000 // Penalización severa
        }
        
        // Penalizar si está muy por encima del máximo equitativo
        if (vecesEnHorario > vecesMaximas) {
          puntuacionTotal += (vecesEnHorario - vecesMaximas) * 100
        }
        
        // Penalizar si está muy por debajo del mínimo equitativo
        if (vecesEnHorario < vecesMinimas) {
          puntuacionTotal += (vecesMinimas - vecesEnHorario) * 50
        }
      }
      
      // Verificar si el equipo tiene al menos 1 vez en cada horario
      const horariosUsados = Object.keys(distribucionEquipo).length
      const horariosFaltantes = numeroHorarios - horariosUsados
      if (horariosFaltantes > 0) {
        puntuacionTotal += horariosFaltantes * 200 // Penalización por horarios no usados
      }
    }
    
    // Verificar consecutivos en jornadas
    for (const equipoId of Object.keys(distribucionPorEquipo).map(Number)) {
      const encuentrosEquipo = encuentrosDelTorneo
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.horario_id !== null
        )
        .sort((a, b) => (a.jornada || 0) - (b.jornada || 0))

      // Verificar consecutivos
      for (let i = 1; i < encuentrosEquipo.length; i++) {
        const encuentroAnterior = encuentrosEquipo[i - 1]
        const encuentroActual = encuentrosEquipo[i]
        
        if (encuentroAnterior.jornada && encuentroActual.jornada) {
          // Si son jornadas consecutivas y mismo horario
          if (encuentroActual.jornada === encuentroAnterior.jornada + 1 && 
              encuentroActual.horario_id === encuentroAnterior.horario_id) {
            puntuacionTotal += 500 // Penalización por consecutivos
          }
        }
      }
    }

    return puntuacionTotal
  } catch (error) {
    console.error('Error al evaluar calidad de asignación:', error)
    return Infinity // En caso de error, retornar puntuación muy alta
  }
}

export async function asignarHorariosAutomaticamente(torneoId: number, configuracion: {
  reiniciarAsignaciones?: boolean;
  soloEncuentrosSinHorario?: boolean;
  ordenPorJornada?: boolean;
}) {
  try {
    console.log('🚀 Iniciando asignación automática con auto-corrección (12 iteraciones)...')
    
    // Ejecutar el algoritmo 12 veces para auto-corrección
    const maxIteraciones = 12
    let mejorResultado = null
    let mejorPuntuacion = Infinity
    
    for (let iteracion = 1; iteracion <= maxIteraciones; iteracion++) {
      console.log(`🔄 Ejecutando iteración ${iteracion}/${maxIteraciones}...`)
      
      // Ejecutar una iteración del algoritmo
      const resultado = await ejecutarIteracionAsignacion(torneoId, configuracion, iteracion)
      
      // Evaluar la calidad del resultado
      const puntuacion = await evaluarCalidadAsignacion(torneoId)
      
      console.log(`📊 Iteración ${iteracion}: Puntuación = ${puntuacion}`)
      
      // Guardar el mejor resultado
      if (puntuacion < mejorPuntuacion) {
        mejorPuntuacion = puntuacion
        mejorResultado = resultado
        console.log(`✅ Nuevo mejor resultado en iteración ${iteracion}`)
      }
      
      // Si la puntuación es perfecta (0), detener las iteraciones
      if (puntuacion === 0) {
        console.log(`🎯 Resultado perfecto alcanzado en iteración ${iteracion}`)
        break
      }
    }
    
    console.log(`🏆 Mejor resultado: Puntuación ${mejorPuntuacion}`)
    return mejorResultado
  } catch (error) {
    console.error('❌ Error en asignación automática:', error)
    throw error
  }
}

async function ejecutarIteracionAsignacion(torneoId: number, configuracion: any, iteracion: number) {
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

    // Función para calcular la distribución equitativa esperada
    const calcularDistribucionEquitativa = () => {
      const totalJornadas = Math.max(...encuentrosDelTorneo.map(e => e.jornada || 0))
      const numeroHorarios = horariosDisponibles.length
      const vecesPorHorario = totalJornadas / numeroHorarios
      
      return {
        vecesMinimas: Math.floor(vecesPorHorario), // ⌊veces_por_horario⌋
        vecesMaximas: Math.ceil(vecesPorHorario),  // ⌈veces_por_horario⌉
        vecesExactas: vecesPorHorario
      }
    }

    // Función para verificar si un horario se ha usado en las últimas 2 jornadas consecutivas
    const horarioUsadoEnUltimas2Jornadas = (equipoId: number, jornadaActual: number, horarioId: number) => {
      const encuentrosEquipo = encuentrosDelTorneo
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.jornada < jornadaActual &&
          encuentro.horario_id !== null
        )
        .sort((a, b) => (a.jornada || 0) - (b.jornada || 0))

      // Obtener las últimas 2 jornadas donde jugó el equipo
      const ultimasJornadas = [...new Set(encuentrosEquipo.map(enc => enc.jornada!))].slice(-2)
      
      if (ultimasJornadas.length < 2) {
        return false
      }

      // Verificar si el horario se usó en las últimas 2 jornadas consecutivas
      let horariosEnUltimas2Jornadas = 0
      for (const jornada of ultimasJornadas) {
        const encuentroEnJornada = encuentrosEquipo.find(enc => enc.jornada === jornada)
        if (encuentroEnJornada && encuentroEnJornada.horario_id === horarioId) {
          horariosEnUltimas2Jornadas++
        }
      }

      // Si se usó en las últimas 2 jornadas, verificar si son consecutivas
      if (horariosEnUltimas2Jornadas >= 2) {
        const jornada1 = ultimasJornadas[0]
        const jornada2 = ultimasJornadas[1]
        return jornada2 === jornada1 + 1 // Verificar si son consecutivas
      }

      return false
    }

    // Función para verificar si un equipo ya ha alcanzado el límite de 3 veces en un horario
    const equipoAlcanzoLimiteHorario = (equipoId: number, jornadaActual: number, horarioId: number) => {
      const encuentrosEquipo = encuentrosDelTorneo
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.jornada < jornadaActual &&
          encuentro.horario_id === horarioId
        )
      
      return encuentrosEquipo.length >= 3
    }

    // Función para verificar si un equipo nunca ha jugado en un horario
    const equipoNuncaJugoEnHorario = (equipoId: number, jornadaActual: number, horarioId: number) => {
      const encuentrosEquipo = encuentrosDelTorneo
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.jornada < jornadaActual &&
          encuentro.horario_id === horarioId
        )
      
      return encuentrosEquipo.length === 0
    }

    // Función para verificar si un equipo está cerca del límite (2 veces) en un horario
    const equipoCercaDelLimite = (equipoId: number, jornadaActual: number, horarioId: number) => {
      const encuentrosEquipo = encuentrosDelTorneo
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.jornada < jornadaActual &&
          encuentro.horario_id === horarioId
        )
      
      return encuentrosEquipo.length >= 2
    }

    // Función para verificar si un horario se ha usado en la última jornada (evitar consecutivos)
    const horarioUsadoEnUltimaJornada = (equipoId: number, jornadaActual: number, horarioId: number) => {
      const encuentrosEquipo = encuentrosDelTorneo
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.jornada < jornadaActual &&
          encuentro.horario_id !== null
        )
        .sort((a, b) => (a.jornada || 0) - (b.jornada || 0))

      if (encuentrosEquipo.length === 0) {
        return false
      }

      // Obtener la última jornada donde jugó el equipo
      const ultimaJornada = encuentrosEquipo[encuentrosEquipo.length - 1].jornada
      const encuentroUltimaJornada = encuentrosEquipo.find(enc => enc.jornada === ultimaJornada)
      
      return encuentroUltimaJornada && encuentroUltimaJornada.horario_id === horarioId
    }

    // Función para obtener estadísticas de uso de horarios por equipo
    const obtenerEstadisticasHorariosEquipo = (equipoId: number, jornadaActual: number) => {
      const encuentrosEquipo = encuentrosDelTorneo
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.jornada < jornadaActual &&
          encuentro.horario_id !== null
        )
        .sort((a, b) => (a.jornada || 0) - (b.jornada || 0))

      const estadisticas = {
        ultimoHorario: null as number | null,
        penultimoHorario: null as number | null,
        conteoHorarios: {} as Record<number, number>,
        totalEncuentros: encuentrosEquipo.length
      }

      // Contar uso de cada horario
      encuentrosEquipo.forEach(encuentro => {
        if (encuentro.horario_id) {
          estadisticas.conteoHorarios[encuentro.horario_id] = (estadisticas.conteoHorarios[encuentro.horario_id] || 0) + 1
        }
      })

      // Obtener último y penúltimo horario
      if (encuentrosEquipo.length >= 1) {
        estadisticas.ultimoHorario = encuentrosEquipo[encuentrosEquipo.length - 1].horario_id
      }
      if (encuentrosEquipo.length >= 2) {
        estadisticas.penultimoHorario = encuentrosEquipo[encuentrosEquipo.length - 2].horario_id
      }

      return estadisticas
    }

    // Función para obtener horarios disponibles para un equipo con distribución equilibrada
    const obtenerHorariosDisponiblesParaEquipo = (equipoId: number, jornadaActual: number) => {
      const estadisticas = obtenerEstadisticasHorariosEquipo(equipoId, jornadaActual)
      
      // Si solo hay un horario disponible, lo usamos
      if (horariosDisponibles.length === 1) {
        return horariosDisponibles
      }

      // Priorizar horarios menos usados para distribución equilibrada
      const horariosConPuntuacion = horariosDisponibles.map(horario => {
        let puntuacion = 0
        
        // Penalizar si es el último horario usado (evitar consecutivos)
        if (horario.id === estadisticas.ultimoHorario) {
          puntuacion += 100
        }
        
        // Penalizar si es el penúltimo horario usado (evitar patrones repetitivos)
        if (horario.id === estadisticas.penultimoHorario) {
          puntuacion += 50
        }
        
        // Priorizar horarios menos usados (distribución equilibrada)
        const vecesUsado = estadisticas.conteoHorarios[horario.id] || 0
        puntuacion += vecesUsado * 10
        
        return {
          horario,
          puntuacion,
          vecesUsado
        }
      })

      // Ordenar por puntuación (menor puntuación = mejor opción)
      horariosConPuntuacion.sort((a, b) => a.puntuacion - b.puntuacion)

      // Si hay horarios con puntuación 0 (no usados y no consecutivos), devolverlos
      const horariosIdeales = horariosConPuntuacion.filter(h => h.puntuacion === 0)
      if (horariosIdeales.length > 0) {
        return horariosIdeales.map(h => h.horario)
      }

      // Si no hay horarios ideales, devolver todos ordenados por puntuación
      return horariosConPuntuacion.map(h => h.horario)
    }

    // Agrupar encuentros por jornada para procesarlos correctamente
    const encuentrosPorJornada = encuentrosDelTorneo.reduce((acc, encuentro) => {
      if (encuentro.jornada !== null) {
        if (!acc[encuentro.jornada]) {
          acc[encuentro.jornada] = []
        }
        acc[encuentro.jornada].push(encuentro)
      }
      return acc
    }, {} as Record<number, typeof encuentrosDelTorneo>)

    // Procesar cada jornada
    for (const jornada of Object.keys(encuentrosPorJornada).map(Number).sort((a, b) => a - b)) {
      const encuentrosJornada = encuentrosPorJornada[jornada]
      const horariosUsadosEnJornada = new Set<number>() // Rastrear horarios usados en esta jornada
      
      for (const encuentro of encuentrosJornada) {
        // Si solo queremos asignar a encuentros sin horario y ya tiene uno, saltamos
        if (configuracion.soloEncuentrosSinHorario && encuentro.horario_id) {
          continue
        }

        // Si ya tiene horario y no queremos reiniciar, saltamos
        if (!configuracion.reiniciarAsignaciones && encuentro.horario_id) {
          continue
        }

        // Obtener estadísticas de ambos equipos
        const estadisticasLocal = obtenerEstadisticasHorariosEquipo(encuentro.equipo_local_id, jornada)
        const estadisticasVisitante = obtenerEstadisticasHorariosEquipo(encuentro.equipo_visitante_id, jornada)
        const distribucionEquitativa = calcularDistribucionEquitativa()
        
        // Filtrar horarios que ya alcanzaron el límite de 3 veces para cualquiera de los equipos
        const horariosFiltrados = horariosDisponibles.filter(horario => {
          return !equipoAlcanzoLimiteHorario(encuentro.equipo_local_id, jornada, horario.id) &&
                 !equipoAlcanzoLimiteHorario(encuentro.equipo_visitante_id, jornada, horario.id)
        })
        
        // FILTRO ULTRA ESTRICTO: Eliminar horarios donde algún equipo ya tiene 2 veces (evitar llegar a 3)
        const horariosUltraFiltrados = horariosFiltrados.filter(horario => {
          return !equipoCercaDelLimite(encuentro.equipo_local_id, jornada, horario.id) &&
                 !equipoCercaDelLimite(encuentro.equipo_visitante_id, jornada, horario.id)
        })
        
        // Priorizar horarios donde algún equipo nunca ha jugado (solo de los ultra filtrados)
        const horariosPrioritarios = horariosUltraFiltrados.filter(horario => {
          return equipoNuncaJugoEnHorario(encuentro.equipo_local_id, jornada, horario.id) ||
                 equipoNuncaJugoEnHorario(encuentro.equipo_visitante_id, jornada, horario.id)
        })
        
        // Jerarquía de selección: Ultra filtrados > Filtrados > Todos
        const horariosParaEvaluar = horariosPrioritarios.length > 0 ? horariosPrioritarios : 
                                   horariosUltraFiltrados.length > 0 ? horariosUltraFiltrados :
                                   horariosFiltrados.length > 0 ? horariosFiltrados : horariosDisponibles
        
        // Calcular puntuación combinada para cada horario
        const horariosConPuntuacion = horariosParaEvaluar.map(horario => {
          let puntuacionTotal = 0
          
          // CRÍTICO: Si algún equipo ya alcanzó el límite de 4 veces, penalizar extremadamente
          if (equipoAlcanzoLimiteHorario(encuentro.equipo_local_id, jornada, horario.id) || 
              equipoAlcanzoLimiteHorario(encuentro.equipo_visitante_id, jornada, horario.id)) {
            puntuacionTotal += 20000
          }
          
          // CRÍTICO: Penalizar si ya fue usado en esta jornada (evitar duplicados en jornada)
          if (horariosUsadosEnJornada.has(horario.id)) {
            puntuacionTotal += 10000
          }
          
          // CRÍTICO: Penalizar si el horario se ha usado en la última jornada (evitar consecutivos)
          if (horarioUsadoEnUltimaJornada(encuentro.equipo_local_id, jornada, horario.id) || 
              horarioUsadoEnUltimaJornada(encuentro.equipo_visitante_id, jornada, horario.id)) {
            puntuacionTotal += 5000
          }
          
          // MUY ALTO: Penalizar si el horario se ha usado en las últimas 2 jornadas consecutivas
          if (horarioUsadoEnUltimas2Jornadas(encuentro.equipo_local_id, jornada, horario.id) || 
              horarioUsadoEnUltimas2Jornadas(encuentro.equipo_visitante_id, jornada, horario.id)) {
            puntuacionTotal += 2000
          }
          
          // ALTO: Penalizar si es el último horario usado por cualquier equipo (evitar consecutivos)
          if (horario.id === estadisticasLocal.ultimoHorario || horario.id === estadisticasVisitante.ultimoHorario) {
            puntuacionTotal += 1000
          }
          
          // MEDIO: Penalizar si es el penúltimo horario usado (evitar patrones repetitivos)
          if (horario.id === estadisticasLocal.penultimoHorario || horario.id === estadisticasVisitante.penultimoHorario) {
            puntuacionTotal += 500
          }
          
          // MEDIO: Distribución equitativa según fórmula matemática
          const vecesUsadoLocal = estadisticasLocal.conteoHorarios[horario.id] || 0
          const vecesUsadoVisitante = estadisticasVisitante.conteoHorarios[horario.id] || 0
          
          // Calcular desviación de la distribución equitativa
          const desviacionLocal = Math.abs(vecesUsadoLocal - distribucionEquitativa.vecesExactas)
          const desviacionVisitante = Math.abs(vecesUsadoVisitante - distribucionEquitativa.vecesExactas)
          
          // CRÍTICO: Penalizar si ya se ha usado 3 veces (límite absoluto)
          if (vecesUsadoLocal >= 3) {
            puntuacionTotal += 15000
          }
          if (vecesUsadoVisitante >= 3) {
            puntuacionTotal += 15000
          }
          
          // MUY ALTO: Penalizar si está por encima del máximo permitido
          if (vecesUsadoLocal > distribucionEquitativa.vecesMaximas) {
            puntuacionTotal += 1000
          }
          if (vecesUsadoVisitante > distribucionEquitativa.vecesMaximas) {
            puntuacionTotal += 1000
          }
          
          // CRÍTICO: Bonificar extremadamente si un equipo nunca ha jugado en este horario
          if (equipoNuncaJugoEnHorario(encuentro.equipo_local_id, jornada, horario.id)) {
            puntuacionTotal -= 5000
          }
          if (equipoNuncaJugoEnHorario(encuentro.equipo_visitante_id, jornada, horario.id)) {
            puntuacionTotal -= 5000
          }
          
          // MUY ALTO: Penalizar si un equipo ya tiene 2 veces en este horario (evitar llegar a 3)
          if (equipoCercaDelLimite(encuentro.equipo_local_id, jornada, horario.id)) {
            puntuacionTotal += 3000
          }
          if (equipoCercaDelLimite(encuentro.equipo_visitante_id, jornada, horario.id)) {
            puntuacionTotal += 3000
          }
          
          // Premiar horarios que están por debajo del mínimo (necesitan más uso)
          if (vecesUsadoLocal < distribucionEquitativa.vecesMinimas) {
            puntuacionTotal -= 100
          }
          if (vecesUsadoVisitante < distribucionEquitativa.vecesMinimas) {
            puntuacionTotal -= 100
          }
          
          // Penalizar según desviación de la distribución ideal
          puntuacionTotal += (desviacionLocal + desviacionVisitante) * 50
          
          return {
            horario,
            puntuacion: puntuacionTotal,
            vecesUsadoLocal,
            vecesUsadoVisitante,
            desviacionLocal,
            desviacionVisitante
          }
        })

        // Ordenar por puntuación (menor puntuación = mejor opción)
        horariosConPuntuacion.sort((a, b) => a.puntuacion - b.puntuacion)
        
        // Seleccionar el mejor horario disponible
        const horarioAsignar = horariosConPuntuacion[0].horario
        
        if (horarioAsignar) {
          await db
            .update(encuentros)
            .set({ 
              horario_id: horarioAsignar.id,
              updatedAt: new Date()
            })
            .where(eq(encuentros.id, encuentro.id))

          // Marcar este horario como usado en esta jornada
          horariosUsadosEnJornada.add(horarioAsignar.id)
          asignacionesRealizadas++
        }
      }
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

    // Obtener todos los encuentros del torneo para verificar horarios anteriores
    const todosLosEncuentros = await db
      .select()
      .from(encuentros)
      .where(eq(encuentros.torneo_id, torneoId))
      .orderBy(asc(encuentros.jornada), asc(encuentros.id))

    // Obtener encuentros de la jornada específica
    const encuentrosJornada = todosLosEncuentros.filter(encuentro => encuentro.jornada === jornada)

    if (encuentrosJornada.length === 0) {
      throw new Error(`No hay encuentros en la jornada ${jornada}`)
    }

    let asignacionesRealizadas = 0

    // Función para calcular la distribución equitativa esperada
    const calcularDistribucionEquitativa = () => {
      const totalJornadas = Math.max(...todosLosEncuentros.map(e => e.jornada || 0))
      const numeroHorarios = horariosDisponibles.length
      const vecesPorHorario = totalJornadas / numeroHorarios
      
      return {
        vecesMinimas: Math.floor(vecesPorHorario), // ⌊veces_por_horario⌋
        vecesMaximas: Math.ceil(vecesPorHorario),  // ⌈veces_por_horario⌉
        vecesExactas: vecesPorHorario
      }
    }

    // Función para verificar si un horario se ha usado en las últimas 2 jornadas consecutivas
    const horarioUsadoEnUltimas2Jornadas = (equipoId: number, horarioId: number) => {
      const encuentrosEquipo = todosLosEncuentros
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.jornada! < jornada &&
          encuentro.horario_id !== null
        )
        .sort((a, b) => (a.jornada || 0) - (b.jornada || 0))

      // Obtener las últimas 2 jornadas donde jugó el equipo
      const ultimasJornadas = [...new Set(encuentrosEquipo.map(enc => enc.jornada!))].slice(-2)
      
      if (ultimasJornadas.length < 2) {
        return false
      }

      // Verificar si el horario se usó en las últimas 2 jornadas consecutivas
      let horariosEnUltimas2Jornadas = 0
      for (const jornada of ultimasJornadas) {
        const encuentroEnJornada = encuentrosEquipo.find(enc => enc.jornada === jornada)
        if (encuentroEnJornada && encuentroEnJornada.horario_id === horarioId) {
          horariosEnUltimas2Jornadas++
        }
      }

      // Si se usó en las últimas 2 jornadas, verificar si son consecutivas
      if (horariosEnUltimas2Jornadas >= 2) {
        const jornada1 = ultimasJornadas[0]
        const jornada2 = ultimasJornadas[1]
        return jornada2 === jornada1 + 1 // Verificar si son consecutivas
      }

      return false
    }

    // Función para verificar si un equipo ya ha alcanzado el límite de 3 veces en un horario
    const equipoAlcanzoLimiteHorario = (equipoId: number, horarioId: number) => {
      const encuentrosEquipo = todosLosEncuentros
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.horario_id === horarioId
        )
      
      return encuentrosEquipo.length >= 3
    }

    // Función para verificar si un equipo nunca ha jugado en un horario
    const equipoNuncaJugoEnHorario = (equipoId: number, horarioId: number) => {
      const encuentrosEquipo = todosLosEncuentros
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.horario_id === horarioId
        )
      
      return encuentrosEquipo.length === 0
    }

    // Función para verificar si un equipo está cerca del límite (2 veces) en un horario
    const equipoCercaDelLimite = (equipoId: number, horarioId: number) => {
      const encuentrosEquipo = todosLosEncuentros
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.horario_id === horarioId
        )
      
      return encuentrosEquipo.length >= 2
    }

    // Función para verificar si un horario se ha usado en la última jornada (evitar consecutivos)
    const horarioUsadoEnUltimaJornada = (equipoId: number, horarioId: number) => {
      const encuentrosEquipo = todosLosEncuentros
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.jornada! < jornada &&
          encuentro.horario_id !== null
        )
        .sort((a, b) => (a.jornada || 0) - (b.jornada || 0))

      if (encuentrosEquipo.length === 0) {
        return false
      }

      // Obtener la última jornada donde jugó el equipo
      const ultimaJornada = encuentrosEquipo[encuentrosEquipo.length - 1].jornada
      const encuentroUltimaJornada = encuentrosEquipo.find(enc => enc.jornada === ultimaJornada)
      
      return encuentroUltimaJornada && encuentroUltimaJornada.horario_id === horarioId
    }

    // Función para obtener estadísticas de uso de horarios por equipo
    const obtenerEstadisticasHorariosEquipo = (equipoId: number) => {
      const encuentrosEquipo = todosLosEncuentros
        .filter(encuentro => 
          encuentro.jornada !== null &&
          (encuentro.equipo_local_id === equipoId || encuentro.equipo_visitante_id === equipoId) &&
          encuentro.jornada! < jornada &&
          encuentro.horario_id !== null
        )
        .sort((a, b) => (a.jornada || 0) - (b.jornada || 0))

      const estadisticas = {
        ultimoHorario: null as number | null,
        penultimoHorario: null as number | null,
        conteoHorarios: {} as Record<number, number>,
        totalEncuentros: encuentrosEquipo.length
      }

      // Contar uso de cada horario
      encuentrosEquipo.forEach(encuentro => {
        if (encuentro.horario_id) {
          estadisticas.conteoHorarios[encuentro.horario_id] = (estadisticas.conteoHorarios[encuentro.horario_id] || 0) + 1
        }
      })

      // Obtener último y penúltimo horario
      if (encuentrosEquipo.length >= 1) {
        estadisticas.ultimoHorario = encuentrosEquipo[encuentrosEquipo.length - 1].horario_id
      }
      if (encuentrosEquipo.length >= 2) {
        estadisticas.penultimoHorario = encuentrosEquipo[encuentrosEquipo.length - 2].horario_id
      }

      return estadisticas
    }

    // Asignar horarios evitando repetición consecutiva
    const horariosUsadosEnJornada = new Set<number>() // Rastrear horarios usados en esta jornada
    
    for (const encuentro of encuentrosJornada) {
      // Obtener estadísticas de ambos equipos
      const estadisticasLocal = obtenerEstadisticasHorariosEquipo(encuentro.equipo_local_id)
      const estadisticasVisitante = obtenerEstadisticasHorariosEquipo(encuentro.equipo_visitante_id)
      const distribucionEquitativa = calcularDistribucionEquitativa()
      
      // Filtrar horarios que ya alcanzaron el límite de 3 veces para cualquiera de los equipos
      const horariosFiltrados = horariosDisponibles.filter((horario: any) => {
        return !equipoAlcanzoLimiteHorario(encuentro.equipo_local_id, horario.id) &&
               !equipoAlcanzoLimiteHorario(encuentro.equipo_visitante_id, horario.id)
      })
      
      // FILTRO ULTRA ESTRICTO: Eliminar horarios donde algún equipo ya tiene 2 veces (evitar llegar a 3)
      const horariosUltraFiltrados = horariosFiltrados.filter((horario: any) => {
        return !equipoCercaDelLimite(encuentro.equipo_local_id, horario.id) &&
               !equipoCercaDelLimite(encuentro.equipo_visitante_id, horario.id)
      })
      
      // Priorizar horarios donde algún equipo nunca ha jugado (solo de los ultra filtrados)
      const horariosPrioritarios = horariosUltraFiltrados.filter((horario: any) => {
        return equipoNuncaJugoEnHorario(encuentro.equipo_local_id, horario.id) ||
               equipoNuncaJugoEnHorario(encuentro.equipo_visitante_id, horario.id)
      })
      
      // Jerarquía de selección: Ultra filtrados > Filtrados > Todos
      const horariosParaEvaluar = horariosPrioritarios.length > 0 ? horariosPrioritarios : 
                                 horariosUltraFiltrados.length > 0 ? horariosUltraFiltrados :
                                 horariosFiltrados.length > 0 ? horariosFiltrados : horariosDisponibles
      
      // Calcular puntuación combinada para cada horario
      const horariosConPuntuacion = horariosParaEvaluar.map((horario: any) => {
        let puntuacionTotal = 0
        
        // CRÍTICO: Si algún equipo ya alcanzó el límite de 4 veces, penalizar extremadamente
        if (equipoAlcanzoLimiteHorario(encuentro.equipo_local_id, horario.id) || 
            equipoAlcanzoLimiteHorario(encuentro.equipo_visitante_id, horario.id)) {
          puntuacionTotal += 20000
        }
        
        // CRÍTICO: Penalizar si ya fue usado en esta jornada (evitar duplicados en jornada)
        if (horariosUsadosEnJornada.has(horario.id)) {
          puntuacionTotal += 10000
        }
        
        // CRÍTICO: Penalizar si el horario se ha usado en la última jornada (evitar consecutivos)
        if (horarioUsadoEnUltimaJornada(encuentro.equipo_local_id, horario.id) || 
            horarioUsadoEnUltimaJornada(encuentro.equipo_visitante_id, horario.id)) {
          puntuacionTotal += 5000
        }
        
        // MUY ALTO: Penalizar si el horario se ha usado en las últimas 2 jornadas consecutivas
        if (horarioUsadoEnUltimas2Jornadas(encuentro.equipo_local_id, horario.id) || 
            horarioUsadoEnUltimas2Jornadas(encuentro.equipo_visitante_id, horario.id)) {
          puntuacionTotal += 2000
        }
        
        // ALTO: Penalizar si es el último horario usado por cualquier equipo (evitar consecutivos)
        if (horario.id === estadisticasLocal.ultimoHorario || horario.id === estadisticasVisitante.ultimoHorario) {
          puntuacionTotal += 1000
        }
        
        // MEDIO: Penalizar si es el penúltimo horario usado (evitar patrones repetitivos)
        if (horario.id === estadisticasLocal.penultimoHorario || horario.id === estadisticasVisitante.penultimoHorario) {
          puntuacionTotal += 500
        }
        
        // MEDIO: Distribución equitativa según fórmula matemática
        const vecesUsadoLocal = estadisticasLocal.conteoHorarios[horario.id] || 0
        const vecesUsadoVisitante = estadisticasVisitante.conteoHorarios[horario.id] || 0
        
        // Calcular desviación de la distribución equitativa
        const desviacionLocal = Math.abs(vecesUsadoLocal - distribucionEquitativa.vecesExactas)
        const desviacionVisitante = Math.abs(vecesUsadoVisitante - distribucionEquitativa.vecesExactas)
        
        // CRÍTICO: Penalizar si ya se ha usado 3 veces (límite absoluto)
        if (vecesUsadoLocal >= 3) {
          puntuacionTotal += 15000
        }
        if (vecesUsadoVisitante >= 3) {
          puntuacionTotal += 15000
        }
        
        // MUY ALTO: Penalizar si está por encima del máximo permitido
        if (vecesUsadoLocal > distribucionEquitativa.vecesMaximas) {
          puntuacionTotal += 1000
        }
        if (vecesUsadoVisitante > distribucionEquitativa.vecesMaximas) {
          puntuacionTotal += 1000
        }
        
        // CRÍTICO: Bonificar extremadamente si un equipo nunca ha jugado en este horario
        if (equipoNuncaJugoEnHorario(encuentro.equipo_local_id, horario.id)) {
          puntuacionTotal -= 5000
        }
        if (equipoNuncaJugoEnHorario(encuentro.equipo_visitante_id, horario.id)) {
          puntuacionTotal -= 5000
        }
        
        // MUY ALTO: Penalizar si un equipo ya tiene 2 veces en este horario (evitar llegar a 3)
        if (equipoCercaDelLimite(encuentro.equipo_local_id, horario.id)) {
          puntuacionTotal += 3000
        }
        if (equipoCercaDelLimite(encuentro.equipo_visitante_id, horario.id)) {
          puntuacionTotal += 3000
        }
        
        // Premiar horarios que están por debajo del mínimo (necesitan más uso)
        if (vecesUsadoLocal < distribucionEquitativa.vecesMinimas) {
          puntuacionTotal -= 100
        }
        if (vecesUsadoVisitante < distribucionEquitativa.vecesMinimas) {
          puntuacionTotal -= 100
        }
        
        // Penalizar según desviación de la distribución ideal
        puntuacionTotal += (desviacionLocal + desviacionVisitante) * 50
        
        return {
          horario,
          puntuacion: puntuacionTotal,
          vecesUsadoLocal,
          vecesUsadoVisitante,
          desviacionLocal,
          desviacionVisitante
        }
      })

      // Ordenar por puntuación (menor puntuación = mejor opción)
      horariosConPuntuacion.sort((a, b) => a.puntuacion - b.puntuacion)
      
      // Seleccionar el mejor horario disponible
      const horarioAsignar = horariosConPuntuacion[0].horario
      
      if (horarioAsignar) {
        await db
          .update(encuentros)
          .set({ 
            horario_id: horarioAsignar.id,
            updatedAt: new Date()
          })
          .where(eq(encuentros.id, encuentro.id))

        // Marcar este horario como usado en esta jornada
        horariosUsadosEnJornada.add(horarioAsignar.id)
        asignacionesRealizadas++
      }
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

/**
 * Genera una tabla de distribución de horarios por equipo en un torneo
 */
export async function generarTablaDistribucionHorarios(torneoId: number) {
  try {
    console.log('Generando tabla de distribución para torneo:', torneoId)
    
    // Obtener todos los encuentros del torneo con horarios asignados
    const encuentrosData = await db
      .select({
        id: encuentros.id,
        equipo_local_id: encuentros.equipo_local_id,
        equipo_visitante_id: encuentros.equipo_visitante_id,
        horario_id: encuentros.horario_id,
        jornada: encuentros.jornada
      })
      .from(encuentros)
      .where(
        and(
          eq(encuentros.torneo_id, torneoId),
          isNotNull(encuentros.horario_id)
        )
      )
      .orderBy(encuentros.jornada, encuentros.id)

    console.log('Encuentros encontrados con horarios:', encuentrosData.length)

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

    console.log('Equipos encontrados:', equiposData.length)

    // Obtener horarios del torneo (los que se han usado en encuentros)
    const horariosData = await db
      .select({
        id: horarios.id,
        hora: horarios.hora_inicio
      })
      .from(horarios)
      .innerJoin(encuentros, eq(horarios.id, encuentros.horario_id))
      .where(eq(encuentros.torneo_id, torneoId))
      .groupBy(horarios.id, horarios.hora_inicio)
      .orderBy(horarios.hora_inicio)

    console.log('Horarios encontrados:', horariosData.length)

    // Crear mapa de distribución
    const distribucion: Record<number, Record<number, number>> = {}
    
    // Inicializar contadores en 0
    equiposData.forEach(equipo => {
      distribucion[equipo.id] = {}
      horariosData.forEach(horario => {
        distribucion[equipo.id][horario.id] = 0
      })
    })

    // Contar encuentros por equipo y horario
    encuentrosData.forEach(encuentro => {
      if (encuentro.horario_id) {
        // Contar para equipo local
        if (distribucion[encuentro.equipo_local_id]) {
          distribucion[encuentro.equipo_local_id][encuentro.horario_id]++
        }
        // Contar para equipo visitante
        if (distribucion[encuentro.equipo_visitante_id]) {
          distribucion[encuentro.equipo_visitante_id][encuentro.horario_id]++
        }
      }
    })

    // Calcular estadísticas
    const totalJornadas = Math.max(...encuentrosData.map(e => e.jornada || 0), 0)
    const totalHorarios = horariosData.length
    const vecesPorHorario = totalJornadas / totalHorarios
    const vecesMinimas = Math.floor(vecesPorHorario)
    const vecesMaximas = Math.ceil(vecesPorHorario)

    // Generar tabla
    const tabla = {
      equipos: equiposData.map(equipo => ({
        id: equipo.id,
        nombre: equipo.nombre,
        distribucion: horariosData.map(horario => ({
          horario_id: horario.id,
          horario_nombre: horario.hora,
          horario_hora: horario.hora,
          veces: distribucion[equipo.id][horario.id] || 0
        })),
        totalEncuentros: Object.values(distribucion[equipo.id] || {}).reduce((sum, count) => sum + count, 0)
      })),
      horarios: horariosData.map(horario => ({
        id: horario.id,
        nombre: horario.hora,
        hora: horario.hora,
        totalUsos: equiposData.reduce((sum, equipo) => 
          sum + (distribucion[equipo.id][horario.id] || 0), 0
        )
      })),
      estadisticas: {
        totalJornadas,
        totalHorarios,
        vecesPorHorario: Math.round(vecesPorHorario * 100) / 100,
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

    console.log('Tabla generada exitosamente:', {
      totalEquipos: equiposData.length,
      totalHorarios: horariosData.length,
      totalEncuentros: encuentrosData.length,
      equiposConDistribucionEquitativa: tabla.estadisticas.equiposConDistribucionEquitativa
    })

    return {
      success: true,
      tabla,
      resumen: {
        mensaje: `Distribución de horarios para ${equiposData.length} equipos en ${totalJornadas} jornadas`,
        distribucionEquitativa: tabla.estadisticas.equiposConDistribucionEquitativa === equiposData.length,
        porcentajeEquitativo: Math.round((tabla.estadisticas.equiposConDistribucionEquitativa / equiposData.length) * 100)
      }
    }

  } catch (error) {
    console.error('Error al generar tabla de distribución:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al generar tabla de distribución')
  }
}
