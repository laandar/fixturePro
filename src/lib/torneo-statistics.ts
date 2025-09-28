import type { Gol, Tarjeta, EncuentroWithRelations } from '@/db/types'

// Tipos para las estadísticas
export interface EstadisticaGoleador {
  jugador: any
  goles: number
  penales: number
  autogoles: number
  hatTricks: number
  golesPrimerTiempo: number
  golesSegundoTiempo: number
  totalGoles: number
}

export interface EstadisticaGeneral {
  totalGoles: number
  cantidadGoleadores: number
  promedioPorPartido: string
  hatTricks: number
}

export interface EstadisticaDetallada {
  partidosConGoles: number
  partidosSinGoles: number
  golesPrimerTiempo: number
  golesSegundoTiempo: number
}

export interface EstadisticaSancion {
  jugador: any
  amarillas: number
  rojas: number
  sancionado: boolean
  partidosSancionado: number
  totalTarjetas: number
}

export interface EstadisticaGeneralSanciones {
  totalAmarillas: number
  totalRojas: number
  jugadoresSancionados: number
  promedioPorPartido: string
}

export interface SancionPorEquipo {
  equipo: any
  amarillas: number
  rojas: number
  totalTarjetas: number
}

export interface GoleadorPorEquipo {
  equipo: any
  totalGoles: number
}

export interface EstadisticaEquipo {
  equipo: any
  partidosJugados: number
  partidosGanados: number
  partidosEmpatados: number
  partidosPerdidos: number
  golesFavor: number
  golesContra: number
  diferenciaGoles: number
  puntos: number
}

// Parámetros para las funciones de estadísticas
export interface EstadisticasParams {
  goles: Gol[]
  tarjetas: Tarjeta[]
  encuentros: EncuentroWithRelations[]
  todosJugadores: any[]
  equiposParticipantes: any[]
}

/**
 * Obtiene estadísticas detalladas de goleadores del torneo
 */
export const getEstadisticasGoleadores = (
  goles: Gol[],
  todosJugadores: any[]
): EstadisticaGoleador[] => {
  console.log('Procesando goles para estadísticas:', goles.length)
  console.log('Goles disponibles:', goles)
  
  const golesPorJugador: Record<number, { 
    jugador: any, 
    goles: number, 
    penales: number, 
    autogoles: number,
    hatTricks: number,
    golesPrimerTiempo: number,
    golesSegundoTiempo: number
  }> = {}

  // Procesar goles
  goles.forEach(gol => {
    if (!golesPorJugador[gol.jugador_id]) {
      golesPorJugador[gol.jugador_id] = {
        jugador: null, // Se llenará después
        goles: 0,
        penales: 0,
        autogoles: 0,
        hatTricks: 0,
        golesPrimerTiempo: 0,
        golesSegundoTiempo: 0
      }
    }

    const stats = golesPorJugador[gol.jugador_id]
    
    if (gol.tipo === 'gol') stats.goles++
    else if (gol.tipo === 'penal') stats.penales++
    else if (gol.tipo === 'autogol') stats.autogoles++

    if (gol.tiempo === 'primer') stats.golesPrimerTiempo++
    else if (gol.tiempo === 'segundo') stats.golesSegundoTiempo++
  })

  // Obtener información de jugadores y calcular hat-tricks
  const jugadoresConGoles = Object.entries(golesPorJugador).map(([jugadorId, stats]) => {
    console.log('Buscando jugador con ID:', jugadorId)
    
    // Buscar el jugador en todos los jugadores disponibles
    let jugador = todosJugadores.find(j => j.id === parseInt(jugadorId))
    
    if (jugador) {
      console.log('Jugador encontrado:', jugador.apellido_nombre)
    } else {
      console.log('Jugador no encontrado para ID:', jugadorId)
      console.log('Jugadores disponibles:', todosJugadores.map(j => ({ id: j.id, nombre: j.apellido_nombre })))
    }

    // Calcular hat-tricks (3 o más goles en un partido)
    const golesPorPartido: Record<number, number> = {}
    goles.filter(g => g.jugador_id === parseInt(jugadorId) && g.tipo === 'gol')
         .forEach(gol => {
           golesPorPartido[gol.encuentro_id] = (golesPorPartido[gol.encuentro_id] || 0) + 1
         })
    
    const hatTricks = Object.values(golesPorPartido).filter(count => count >= 3).length

    return {
      jugador,
      goles: stats.goles,
      penales: stats.penales,
      autogoles: stats.autogoles,
      hatTricks,
      golesPrimerTiempo: stats.golesPrimerTiempo,
      golesSegundoTiempo: stats.golesSegundoTiempo,
      totalGoles: stats.goles + stats.penales
    }
  }).filter(item => item.jugador && item.totalGoles > 0)

  // Ordenar por total de goles
  jugadoresConGoles.sort((a, b) => b.totalGoles - a.totalGoles)

  console.log('Jugadores con goles encontrados:', jugadoresConGoles.length)
  console.log('Jugadores con goles:', jugadoresConGoles)

  return jugadoresConGoles
}

/**
 * Obtiene estadísticas generales del torneo
 */
export const getEstadisticasGenerales = (
  goles: Gol[],
  encuentros: EncuentroWithRelations[],
  todosJugadores: any[] = []
): EstadisticaGeneral => {
  const totalGoles = goles.filter(g => g.tipo === 'gol' || g.tipo === 'penal').length
  const goleadores = getEstadisticasGoleadores(goles, todosJugadores)
  const partidosJugados = encuentros.filter(e => e.estado === 'finalizado').length
  const promedioPorPartido = partidosJugados > 0 ? (totalGoles / partidosJugados).toFixed(2) : '0.00'
  const hatTricks = goleadores.reduce((sum, g) => sum + g.hatTricks, 0)

  return {
    totalGoles,
    cantidadGoleadores: goleadores.length,
    promedioPorPartido,
    hatTricks
  }
}

/**
 * Obtiene estadísticas detalladas del torneo
 */
export const getEstadisticasDetalladas = (
  goles: Gol[],
  encuentros: EncuentroWithRelations[]
): EstadisticaDetallada => {
  const partidosConGoles = new Set(goles.map(g => g.encuentro_id)).size
  const partidosJugados = encuentros.filter(e => e.estado === 'finalizado').length
  const partidosSinGoles = partidosJugados - partidosConGoles
  const golesPrimerTiempo = goles.filter(g => g.tiempo === 'primer').length
  const golesSegundoTiempo = goles.filter(g => g.tiempo === 'segundo').length

  return {
    partidosConGoles,
    partidosSinGoles,
    golesPrimerTiempo,
    golesSegundoTiempo
  }
}

/**
 * Obtiene estadísticas de sanciones por jugador
 */
export const getEstadisticasSanciones = (
  tarjetas: Tarjeta[],
  todosJugadores: any[]
): EstadisticaSancion[] => {
  const sancionesPorJugador: Record<number, { 
    jugador: any, 
    amarillas: number, 
    rojas: number,
    sancionado: boolean,
    partidosSancionado: number
  }> = {}

  // Procesar tarjetas
  tarjetas.forEach(tarjeta => {
    if (!sancionesPorJugador[tarjeta.jugador_id]) {
      sancionesPorJugador[tarjeta.jugador_id] = {
        jugador: null,
        amarillas: 0,
        rojas: 0,
        sancionado: false,
        partidosSancionado: 0
      }
    }

    const stats = sancionesPorJugador[tarjeta.jugador_id]
    
    if (tarjeta.tipo === 'amarilla') {
      stats.amarillas++
    } else if (tarjeta.tipo === 'roja') {
      stats.rojas++
      stats.sancionado = true
      stats.partidosSancionado = 1 // Tarjeta roja = 1 partido de sanción
    }
  })

  // Obtener información de jugadores
  const jugadoresConSanciones = Object.entries(sancionesPorJugador).map(([jugadorId, stats]) => {
    const jugador = todosJugadores.find(j => j.id === parseInt(jugadorId))
    
    // Calcular sanciones por acumulación de amarillas (5 amarillas = 1 partido)
    if (stats.amarillas >= 5) {
      stats.sancionado = true
      stats.partidosSancionado += Math.floor(stats.amarillas / 5)
    }

    return {
      jugador,
      amarillas: stats.amarillas,
      rojas: stats.rojas,
      sancionado: stats.sancionado,
      partidosSancionado: stats.partidosSancionado,
      totalTarjetas: stats.amarillas + stats.rojas
    }
  }).filter(item => item.jugador && item.totalTarjetas > 0)

  // Ordenar por total de tarjetas
  jugadoresConSanciones.sort((a, b) => b.totalTarjetas - a.totalTarjetas)

  return jugadoresConSanciones
}

/**
 * Obtiene estadísticas generales de sanciones
 */
export const getEstadisticasGeneralesSanciones = (
  tarjetas: Tarjeta[],
  encuentros: EncuentroWithRelations[]
): EstadisticaGeneralSanciones => {
  const totalAmarillas = tarjetas.filter(t => t.tipo === 'amarilla').length
  const totalRojas = tarjetas.filter(t => t.tipo === 'roja').length
  const jugadoresSancionados = getEstadisticasSanciones(tarjetas, []).filter(j => j.sancionado).length
  const partidosJugados = encuentros.filter(e => e.estado === 'finalizado').length
  const promedioPorPartido = partidosJugados > 0 ? ((totalAmarillas + totalRojas) / partidosJugados).toFixed(2) : '0.00'

  return {
    totalAmarillas,
    totalRojas,
    jugadoresSancionados,
    promedioPorPartido
  }
}

/**
 * Obtiene sanciones agrupadas por equipo
 */
export const getSancionesPorEquipo = (
  tarjetas: Tarjeta[],
  equiposParticipantes: any[]
): SancionPorEquipo[] => {
  const sancionesPorEquipo: Record<number, { 
    equipo: any, 
    amarillas: number, 
    rojas: number,
    totalTarjetas: number
  }> = {}

  tarjetas.forEach(tarjeta => {
    if (!sancionesPorEquipo[tarjeta.equipo_id]) {
      sancionesPorEquipo[tarjeta.equipo_id] = {
        equipo: null,
        amarillas: 0,
        rojas: 0,
        totalTarjetas: 0
      }
    }

    if (tarjeta.tipo === 'amarilla') {
      sancionesPorEquipo[tarjeta.equipo_id].amarillas++
    } else if (tarjeta.tipo === 'roja') {
      sancionesPorEquipo[tarjeta.equipo_id].rojas++
    }
    sancionesPorEquipo[tarjeta.equipo_id].totalTarjetas++
  })

  // Llenar información de equipos
  Object.keys(sancionesPorEquipo).forEach(equipoId => {
    const equipoTorneo = equiposParticipantes.find(et => et.equipo_id === parseInt(equipoId))
    if (equipoTorneo) {
      sancionesPorEquipo[parseInt(equipoId)].equipo = equipoTorneo.equipo
    }
  })

  return Object.values(sancionesPorEquipo)
    .filter(item => item.equipo)
    .sort((a, b) => b.totalTarjetas - a.totalTarjetas)
}

/**
 * Obtiene goleadores agrupados por equipo
 */
export const getGoleadoresPorEquipo = (
  goles: Gol[],
  equiposParticipantes: any[]
): GoleadorPorEquipo[] => {
  const golesPorEquipo: Record<number, { equipo: any, totalGoles: number }> = {}

  goles.forEach(gol => {
    if (!golesPorEquipo[gol.equipo_id]) {
      golesPorEquipo[gol.equipo_id] = {
        equipo: null,
        totalGoles: 0
      }
    }
    
    if (gol.tipo === 'gol' || gol.tipo === 'penal') {
      golesPorEquipo[gol.equipo_id].totalGoles++
    }
  })

  // Llenar información de equipos
  Object.keys(golesPorEquipo).forEach(equipoId => {
    const equipoTorneo = equiposParticipantes.find(et => et.equipo_id === parseInt(equipoId))
    if (equipoTorneo) {
      golesPorEquipo[parseInt(equipoId)].equipo = equipoTorneo.equipo
    }
  })

  return Object.values(golesPorEquipo)
    .filter(item => item.equipo)
    .sort((a, b) => b.totalGoles - a.totalGoles)
}

/**
 * Calcula estadísticas de equipos con goles reales
 */
export const getEstadisticasEquipos = (
  encuentros: EncuentroWithRelations[],
  goles: Gol[],
  equiposParticipantes: any[]
): EstadisticaEquipo[] => {
  const estadisticasEquipos: Record<number, {
    equipo: any,
    partidosJugados: number,
    partidosGanados: number,
    partidosEmpatados: number,
    partidosPerdidos: number,
    golesFavor: number,
    golesContra: number,
    diferenciaGoles: number,
    puntos: number
  }> = {}

  // Inicializar estadísticas para todos los equipos del torneo
  equiposParticipantes.forEach(equipoTorneo => {
    if (equipoTorneo.equipo) {
      estadisticasEquipos[equipoTorneo.equipo_id] = {
        equipo: equipoTorneo.equipo,
        partidosJugados: 0,
        partidosGanados: 0,
        partidosEmpatados: 0,
        partidosPerdidos: 0,
        golesFavor: 0,
        golesContra: 0,
        diferenciaGoles: 0,
        puntos: 0
      }
    }
  })

  // Procesar encuentros finalizados
  const encuentrosFinalizados = encuentros.filter(e => e.estado === 'finalizado')
  
  encuentrosFinalizados.forEach(encuentro => {
    const equipoLocalId = encuentro.equipo_local_id
    const equipoVisitanteId = encuentro.equipo_visitante_id
    
    if (equipoLocalId && equipoVisitanteId && 
        estadisticasEquipos[equipoLocalId] && estadisticasEquipos[equipoVisitanteId]) {
      
      // Contar partidos jugados
      estadisticasEquipos[equipoLocalId].partidosJugados++
      estadisticasEquipos[equipoVisitanteId].partidosJugados++
      
      // Calcular goles reales desde la tabla goles
      const golesLocal = goles.filter(g => 
        g.encuentro_id === encuentro.id && 
        g.equipo_id === equipoLocalId && 
        (g.tipo === 'gol' || g.tipo === 'penal')
      ).length
      
      const golesVisitante = goles.filter(g => 
        g.encuentro_id === encuentro.id && 
        g.equipo_id === equipoVisitanteId && 
        (g.tipo === 'gol' || g.tipo === 'penal')
      ).length
      
      // Actualizar goles a favor y en contra
      estadisticasEquipos[equipoLocalId].golesFavor += golesLocal
      estadisticasEquipos[equipoLocalId].golesContra += golesVisitante
      
      estadisticasEquipos[equipoVisitanteId].golesFavor += golesVisitante
      estadisticasEquipos[equipoVisitanteId].golesContra += golesLocal
      
      // Calcular resultado y puntos
      if (golesLocal > golesVisitante) {
        // Local gana
        estadisticasEquipos[equipoLocalId].partidosGanados++
        estadisticasEquipos[equipoLocalId].puntos += 3
        estadisticasEquipos[equipoVisitanteId].partidosPerdidos++
      } else if (golesVisitante > golesLocal) {
        // Visitante gana
        estadisticasEquipos[equipoVisitanteId].partidosGanados++
        estadisticasEquipos[equipoVisitanteId].puntos += 3
        estadisticasEquipos[equipoLocalId].partidosPerdidos++
      } else {
        // Empate
        estadisticasEquipos[equipoLocalId].partidosEmpatados++
        estadisticasEquipos[equipoLocalId].puntos += 1
        estadisticasEquipos[equipoVisitanteId].partidosEmpatados++
        estadisticasEquipos[equipoVisitanteId].puntos += 1
      }
    }
  })

  // Calcular diferencia de goles
  Object.values(estadisticasEquipos).forEach(estadistica => {
    estadistica.diferenciaGoles = estadistica.golesFavor - estadistica.golesContra
  })

  // Ordenar por puntos y diferencia de goles
  return Object.values(estadisticasEquipos)
    .sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos
      return b.diferenciaGoles - a.diferenciaGoles
    })
}

/**
 * Función de conveniencia para obtener todas las estadísticas
 */
export const getAllEstadisticas = (params: EstadisticasParams) => {
  const { goles, tarjetas, encuentros, todosJugadores, equiposParticipantes } = params

  return {
    goleadores: getEstadisticasGoleadores(goles, todosJugadores),
    generales: getEstadisticasGenerales(goles, encuentros, todosJugadores),
    detalladas: getEstadisticasDetalladas(goles, encuentros),
    sanciones: getEstadisticasSanciones(tarjetas, todosJugadores),
    generalesSanciones: getEstadisticasGeneralesSanciones(tarjetas, encuentros),
    sancionesPorEquipo: getSancionesPorEquipo(tarjetas, equiposParticipantes),
    goleadoresPorEquipo: getGoleadoresPorEquipo(goles, equiposParticipantes),
    equipos: getEstadisticasEquipos(encuentros, goles, equiposParticipantes)
  }
}
