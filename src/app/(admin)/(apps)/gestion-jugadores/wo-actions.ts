'use server'

import { db } from '@/db'
import { encuentros, equiposTorneo, goles, tarjetas, configuraciones } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getConfiguracionPorClave } from '../configuraciones/actions'

// Aplicar WO (Walkover) a un encuentro
export async function aplicarWO(encuentroId: number, equipoGanadorId: number) {
  try {
    console.log('Aplicando WO al encuentro:', encuentroId, 'Equipo ganador:', equipoGanadorId)
    
    // 1. Obtener el encuentro
    const encuentro = await db.query.encuentros.findFirst({
      where: eq(encuentros.id, encuentroId),
      with: {
        equipoLocal: true,
        equipoVisitante: true
      }
    })

    if (!encuentro) {
      throw new Error('Encuentro no encontrado')
    }

    // 2. Obtener configuraciones WO
    const puntosWO = await getConfiguracionPorClave('puntos_por_wo')
    const puntosPenalizacionWO = await getConfiguracionPorClave('puntos_penalizacion_wo')
    const golesWO = await getConfiguracionPorClave('goles_por_wo')
    const golesContraWO = await getConfiguracionPorClave('goles_contra_por_wo')

    const puntosGanador = parseInt(puntosWO?.valor || '3')
    const puntosPerdedor = parseInt(puntosPenalizacionWO?.valor || '-1')
    const golesFavor = parseInt(golesWO?.valor || '3')
    const golesContra = parseInt(golesContraWO?.valor || '0')

    console.log('🔧 CONFIGURACIONES WO CARGADAS:', {
      puntosGanador,
      puntosPerdedor,
      golesFavor,
      golesContra,
      configuraciones: {
        puntosWO: puntosWO?.valor,
        puntosPenalizacionWO: puntosPenalizacionWO?.valor,
        golesWO: golesWO?.valor,
        golesContraWO: golesContraWO?.valor
      }
    })

    // 3. Determinar equipos ganador y perdedor
    const esLocalGanador = encuentro.equipo_local_id === equipoGanadorId
    const equipoPerdedorId = esLocalGanador ? encuentro.equipo_visitante_id : encuentro.equipo_local_id

    console.log('Equipo ganador:', equipoGanadorId, 'Equipo perdedor:', equipoPerdedorId)

    // 4. Eliminar todos los goles y tarjetas del encuentro
    await db.delete(goles).where(eq(goles.encuentro_id, encuentroId))
    await db.delete(tarjetas).where(eq(tarjetas.encuentro_id, encuentroId))

    console.log('Goles y tarjetas eliminados del encuentro')

    // 5. Actualizar el encuentro con resultado WO
    const golesLocal = esLocalGanador ? golesFavor : golesContra
    const golesVisitante = esLocalGanador ? golesContra : golesFavor

    console.log('🎯 APLICANDO RESULTADO WO AL ENCUENTRO:', {
      encuentroId,
      esLocalGanador,
      equipoGanadorId,
      equipoPerdedorId,
      configuracion: {
        golesFavor,
        golesContra
      },
      resultadoFinal: {
        golesLocal,
        golesVisitante
      }
    })

    await db.update(encuentros)
      .set({
        estado: 'finalizado',
        goles_local: golesLocal,
        goles_visitante: golesVisitante,
        fecha_jugada: new Date(),
        observaciones: 'Resultado por WO (Walkover)',
        updatedAt: new Date()
      })
      .where(eq(encuentros.id, encuentroId))

    console.log('Encuentro actualizado con resultado WO')

    // 6. Obtener equipos del torneo para actualizar estadísticas
    const equiposTorneoData = await db.query.equiposTorneo.findMany({
      where: eq(equiposTorneo.torneo_id, encuentro.torneo_id),
      with: {
        equipo: true
      }
    })

    const equipoGanadorTorneo = equiposTorneoData.find(et => et.equipo_id === equipoGanadorId)
    const equipoPerdedorTorneo = equiposTorneoData.find(et => et.equipo_id === equipoPerdedorId)

    if (!equipoGanadorTorneo || !equipoPerdedorTorneo) {
      throw new Error('Equipos no encontrados en el torneo')
    }

    // 7. Actualizar estadísticas del equipo ganador
    const nuevasEstadisticasGanador = {
      puntos: (equipoGanadorTorneo.puntos || 0) + puntosGanador, // +3 puntos
      partidos_jugados: (equipoGanadorTorneo.partidos_jugados || 0) + 1,
      partidos_ganados: (equipoGanadorTorneo.partidos_ganados || 0) + 1,
      goles_favor: (equipoGanadorTorneo.goles_favor || 0) + golesFavor, // +3 goles a favor
      goles_contra: (equipoGanadorTorneo.goles_contra || 0) + golesContra, // +0 goles en contra
      diferencia_goles: ((equipoGanadorTorneo.goles_favor || 0) + golesFavor) - ((equipoGanadorTorneo.goles_contra || 0) + golesContra),
      updatedAt: new Date()
    }

    console.log('🏆 ACTUALIZANDO ESTADÍSTICAS DEL GANADOR:', {
      equipoId: equipoGanadorId,
      nombreEquipo: encuentro.equipoLocal?.nombre || encuentro.equipoVisitante?.nombre,
      configuracion: {
        puntosGanador,
        golesFavor,
        golesContra
      },
      estadisticasActuales: {
        puntos: equipoGanadorTorneo.puntos,
        goles_favor: equipoGanadorTorneo.goles_favor,
        goles_contra: equipoGanadorTorneo.goles_contra
      },
      nuevasEstadisticas: nuevasEstadisticasGanador,
      calculo: {
        puntos: `${equipoGanadorTorneo.puntos} + ${puntosGanador} = ${nuevasEstadisticasGanador.puntos}`,
        golesFavor: `${equipoGanadorTorneo.goles_favor} + ${golesFavor} = ${nuevasEstadisticasGanador.goles_favor}`,
        golesContra: `${equipoGanadorTorneo.goles_contra} + ${golesContra} = ${nuevasEstadisticasGanador.goles_contra}`
      }
    })

    await db.update(equiposTorneo)
      .set(nuevasEstadisticasGanador)
      .where(eq(equiposTorneo.id, equipoGanadorTorneo.id))

    console.log('Estadísticas del equipo ganador actualizadas')

    // 8. Actualizar estadísticas del equipo perdedor
    const nuevasEstadisticasPerdedor = {
      puntos: Math.max(0, (equipoPerdedorTorneo.puntos || 0) + puntosPerdedor), // Máximo 0 puntos (no negativos)
      partidos_jugados: (equipoPerdedorTorneo.partidos_jugados || 0) + 1,
      partidos_perdidos: (equipoPerdedorTorneo.partidos_perdidos || 0) + 1,
      goles_favor: (equipoPerdedorTorneo.goles_favor || 0) + golesContra, // +0 goles a favor
      goles_contra: (equipoPerdedorTorneo.goles_contra || 0) + golesFavor, // +3 goles en contra
      diferencia_goles: ((equipoPerdedorTorneo.goles_favor || 0) + golesContra) - ((equipoPerdedorTorneo.goles_contra || 0) + golesFavor),
      updatedAt: new Date()
    }

    console.log('❌ ACTUALIZANDO ESTADÍSTICAS DEL PERDEDOR:', {
      equipoId: equipoPerdedorId,
      nombreEquipo: esLocalGanador ? encuentro.equipoVisitante?.nombre : encuentro.equipoLocal?.nombre,
      configuracion: {
        puntosPerdedor,
        golesFavor,
        golesContra
      },
      estadisticasActuales: {
        puntos: equipoPerdedorTorneo.puntos,
        goles_favor: equipoPerdedorTorneo.goles_favor,
        goles_contra: equipoPerdedorTorneo.goles_contra
      },
      nuevasEstadisticas: nuevasEstadisticasPerdedor,
      calculo: {
        puntos: `${equipoPerdedorTorneo.puntos} + ${puntosPerdedor} = ${nuevasEstadisticasPerdedor.puntos} (máximo 0)`,
        golesFavor: `${equipoPerdedorTorneo.goles_favor} + ${golesContra} = ${nuevasEstadisticasPerdedor.goles_favor}`,
        golesContra: `${equipoPerdedorTorneo.goles_contra} + ${golesFavor} = ${nuevasEstadisticasPerdedor.goles_contra}`
      }
    })

    await db.update(equiposTorneo)
      .set(nuevasEstadisticasPerdedor)
      .where(eq(equiposTorneo.id, equipoPerdedorTorneo.id))

    console.log('Estadísticas del equipo perdedor actualizadas')

    revalidatePath(`/torneos/${encuentro.torneo_id}`)
    revalidatePath(`/gestion-jugadores/${encuentro.torneo_id}/${encuentro.equipo_local_id}/${encuentro.equipo_visitante_id}/${encuentro.jornada}`)

    return {
      success: true,
      mensaje: `WO aplicado exitosamente. ${encuentro.equipoLocal?.nombre} ${esLocalGanador ? 'gana' : 'pierde'} por WO`,
      resultado: {
        golesLocal,
        golesVisitante,
        puntosGanador,
        puntosPerdedor
      }
    }

  } catch (error) {
    console.error('Error al aplicar WO:', error)
    throw new Error(`Error al aplicar WO: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// Revertir WO (Walkover) de un encuentro
export async function revertirWO(encuentroId: number) {
  try {
    console.log('Revirtiendo WO del encuentro:', encuentroId)
    
    // 1. Obtener el encuentro
    const encuentro = await db.query.encuentros.findFirst({
      where: eq(encuentros.id, encuentroId)
    })

    if (!encuentro) {
      throw new Error('Encuentro no encontrado')
    }

    // 2. Verificar que el encuentro esté marcado como WO
    if (!encuentro.observaciones?.includes('WO') && !encuentro.observaciones?.includes('Walkover')) {
      throw new Error('Este encuentro no tiene resultado por WO')
    }

    // 3. Obtener configuraciones WO para revertir
    const puntosWO = await getConfiguracionPorClave('puntos_por_wo')
    const puntosPenalizacionWO = await getConfiguracionPorClave('puntos_penalizacion_wo')
    const golesWO = await getConfiguracionPorClave('goles_por_wo')
    const golesContraWO = await getConfiguracionPorClave('goles_contra_por_wo')

    const puntosGanador = parseInt(puntosWO?.valor || '3')
    const puntosPerdedor = parseInt(puntosPenalizacionWO?.valor || '-1')
    const golesFavor = parseInt(golesWO?.valor || '3')
    const golesContra = parseInt(golesContraWO?.valor || '0')

    // 4. Determinar equipos ganador y perdedor
    const esLocalGanador = encuentro.goles_local! > encuentro.goles_visitante!
    const equipoGanadorId = esLocalGanador ? encuentro.equipo_local_id : encuentro.equipo_visitante_id
    const equipoPerdedorId = esLocalGanador ? encuentro.equipo_visitante_id : encuentro.equipo_local_id

    // 5. Obtener equipos del torneo para revertir estadísticas
    const equiposTorneoData = await db.query.equiposTorneo.findMany({
      where: eq(equiposTorneo.torneo_id, encuentro.torneo_id),
      with: {
        equipo: true
      }
    })

    const equipoGanadorTorneo = equiposTorneoData.find(et => et.equipo_id === equipoGanadorId)
    const equipoPerdedorTorneo = equiposTorneoData.find(et => et.equipo_id === equipoPerdedorId)

    if (!equipoGanadorTorneo || !equipoPerdedorTorneo) {
      throw new Error('Equipos no encontrados en el torneo')
    }

        // 6. Revertir estadísticas del equipo ganador
        await db.update(equiposTorneo)
          .set({
            puntos: Math.max(0, (equipoGanadorTorneo.puntos || 0) - puntosGanador),
            partidos_jugados: (equipoGanadorTorneo.partidos_jugados || 0) - 1,
            partidos_ganados: (equipoGanadorTorneo.partidos_ganados || 0) - 1,
            goles_favor: (equipoGanadorTorneo.goles_favor || 0) - golesFavor,
            goles_contra: (equipoGanadorTorneo.goles_contra || 0) - golesContra,
            diferencia_goles: ((equipoGanadorTorneo.goles_favor || 0) - golesFavor) - ((equipoGanadorTorneo.goles_contra || 0) - golesContra),
            updatedAt: new Date()
          })
          .where(eq(equiposTorneo.id, equipoGanadorTorneo.id))

    // 7. Revertir estadísticas del equipo perdedor
    await db.update(equiposTorneo)
      .set({
        puntos: (equipoPerdedorTorneo.puntos || 0) - puntosPerdedor,
        partidos_jugados: (equipoPerdedorTorneo.partidos_jugados || 0) - 1,
        partidos_perdidos: (equipoPerdedorTorneo.partidos_perdidos || 0) - 1,
        goles_favor: (equipoPerdedorTorneo.goles_favor || 0) - golesContra,
        goles_contra: (equipoPerdedorTorneo.goles_contra || 0) - golesFavor,
        diferencia_goles: ((equipoPerdedorTorneo.goles_favor || 0) - golesContra) - ((equipoPerdedorTorneo.goles_contra || 0) - golesFavor),
        updatedAt: new Date()
      })
      .where(eq(equiposTorneo.id, equipoPerdedorTorneo.id))

    // 8. Resetear el encuentro
    await db.update(encuentros)
      .set({
        estado: 'programado',
        goles_local: null,
        goles_visitante: null,
        fecha_jugada: null,
        observaciones: null,
        updatedAt: new Date()
      })
      .where(eq(encuentros.id, encuentroId))

    console.log('WO revertido exitosamente')

    revalidatePath(`/torneos/${encuentro.torneo_id}`)
    revalidatePath(`/gestion-jugadores/${encuentro.torneo_id}/${encuentro.equipo_local_id}/${encuentro.equipo_visitante_id}/${encuentro.jornada}`)

    return {
      success: true,
      mensaje: 'WO revertido exitosamente. El encuentro ha vuelto a estado programado.'
    }

  } catch (error) {
    console.error('Error al revertir WO:', error)
    throw new Error(`Error al revertir WO: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// Verificar si un encuentro tiene resultado por WO
export async function esEncuentroWO(encuentroId: number): Promise<boolean> {
  try {
    const encuentro = await db.query.encuentros.findFirst({
      where: eq(encuentros.id, encuentroId)
    })

    if (!encuentro) {
      return false
    }

    return encuentro.observaciones?.includes('WO') || encuentro.observaciones?.includes('Walkover') || false
  } catch (error) {
    console.error('Error al verificar WO:', error)
    return false
  }
}
