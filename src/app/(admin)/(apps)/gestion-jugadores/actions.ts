'use server'

import { db } from '@/db'
import { goles, encuentros, tarjetas, jugadoresParticipantes, cambiosJugadores, firmasEncuentros, configuraciones, pagosMultas, cargosManuales } from '@/db/schema'
import { eq, and, inArray, lte } from 'drizzle-orm'
import type { NewGol, Gol, NewTarjeta, Tarjeta, NewJugadorParticipante, JugadorParticipante, NewCambioJugador, CambioJugador, NewFirmaEncuentro, FirmaEncuentro } from '@/db/types'
import { getConfiguracionPorClave } from '../configuraciones/actions'

// Guardar un gol en la base de datos
export async function saveGol(golData: NewGol) {
  try {
    const [gol] = await db.insert(goles).values(golData).returning()
    return { success: true, gol }
  } catch (error) {
    console.error('Error al guardar gol:', error)
    throw new Error('Error al guardar gol en la base de datos')
  }
}

// Guardar múltiples goles de un encuentro
export async function saveGolesEncuentro(encuentroId: number, golesData: NewGol[]) {
  try {
    if (golesData.length === 0) {
      return { success: true, goles: [] }
    }

    // Eliminar goles existentes del encuentro
    await db.delete(goles).where(eq(goles.encuentro_id, encuentroId))

    // Insertar nuevos goles
    const golesGuardados = await db.insert(goles).values(golesData).returning()
    
    return { success: true, goles: golesGuardados }
  } catch (error) {
    console.error('Error al guardar goles del encuentro:', error)
    throw new Error('Error al guardar goles del encuentro')
  }
}

// Obtener goles de un encuentro
export async function getGolesEncuentro(encuentroId: number) {
  try {
    const golesEncuentro = await db
      .select()
      .from(goles)
      .where(eq(goles.encuentro_id, encuentroId))
    
    return golesEncuentro
  } catch (error) {
    console.error('Error al obtener goles del encuentro:', error)
    throw new Error('Error al obtener goles del encuentro')
  }
}

// Obtener todos los goles de un torneo
export async function getGolesTorneo(torneoId: number) {
  try {
    const golesTorneo = await db
      .select({
        id: goles.id,
        encuentro_id: goles.encuentro_id,
        jugador_id: goles.jugador_id,
        equipo_id: goles.equipo_id,
        minuto: goles.minuto,
        tiempo: goles.tiempo,
        tipo: goles.tipo,
        createdAt: goles.createdAt,
        updatedAt: goles.updatedAt
      })
      .from(goles)
      .innerJoin(encuentros, eq(goles.encuentro_id, encuentros.id))
      .where(eq(encuentros.torneo_id, torneoId))
    
    return golesTorneo
  } catch (error) {
    console.error('Error al obtener goles del torneo:', error)
    throw new Error('Error al obtener goles del torneo')
  }
}

// Eliminar un gol
export async function deleteGol(golId: number) {
  try {
    await db.delete(goles).where(eq(goles.id, golId))
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar gol:', error)
    throw new Error('Error al eliminar gol')
  }
}

// Actualizar un gol
export async function updateGol(golId: number, golData: Partial<NewGol>) {
  try {
    const [gol] = await db
      .update(goles)
      .set(golData)
      .where(eq(goles.id, golId))
      .returning()
    
    return { success: true, gol }
  } catch (error) {
    console.error('Error al actualizar gol:', error)
    throw new Error('Error al actualizar gol')
  }
}

// ===== FUNCIONES PARA TARJETAS =====

// Guardar una tarjeta en la base de datos
export async function saveTarjeta(tarjetaData: NewTarjeta) {
  try {
    const [tarjeta] = await db.insert(tarjetas).values(tarjetaData).returning()
    return { success: true, tarjeta }
  } catch (error) {
    console.error('Error al guardar tarjeta:', error)
    throw new Error('Error al guardar tarjeta en la base de datos')
  }
}

// Guardar múltiples tarjetas de un encuentro
export async function saveTarjetasEncuentro(encuentroId: number, tarjetasData: NewTarjeta[]) {
  try {
    if (tarjetasData.length === 0) {
      return { success: true, tarjetas: [] }
    }

    // Eliminar tarjetas existentes del encuentro
    await db.delete(tarjetas).where(eq(tarjetas.encuentro_id, encuentroId))

    // Insertar nuevas tarjetas
    const tarjetasGuardadas = await db.insert(tarjetas).values(tarjetasData).returning()
    
    return { success: true, tarjetas: tarjetasGuardadas }
  } catch (error) {
    console.error('Error al guardar tarjetas del encuentro:', error)
    throw new Error('Error al guardar tarjetas del encuentro')
  }
}

// Obtener tarjetas de un encuentro
export async function getTarjetasEncuentro(encuentroId: number) {
  try {
    const tarjetasEncuentro = await db
      .select()
      .from(tarjetas)
      .where(eq(tarjetas.encuentro_id, encuentroId))
    
    return tarjetasEncuentro
  } catch (error) {
    console.error('Error al obtener tarjetas del encuentro:', error)
    throw new Error('Error al obtener tarjetas del encuentro')
  }
}

// Obtener todas las tarjetas de un torneo
export async function getTarjetasTorneo(torneoId: number) {
  try {
    const tarjetasTorneo = await db
      .select({
        id: tarjetas.id,
        encuentro_id: tarjetas.encuentro_id,
        jugador_id: tarjetas.jugador_id,
        equipo_id: tarjetas.equipo_id,
        tipo: tarjetas.tipo,
        createdAt: tarjetas.createdAt,
        updatedAt: tarjetas.updatedAt
      })
      .from(tarjetas)
      .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
      .where(eq(encuentros.torneo_id, torneoId))
    
    return tarjetasTorneo
  } catch (error) {
    console.error('Error al obtener tarjetas del torneo:', error)
    throw new Error('Error al obtener tarjetas del torneo')
  }
}

// Obtener tarjetas de un jugador con información de jornada
export async function getTarjetasJugadorConJornada(
  torneoId: number, 
  jugadorId: string,
  hastaJornada?: number
) {
  try {
    const query = db
      .select({
        id: tarjetas.id,
        encuentro_id: tarjetas.encuentro_id,
        jugador_id: tarjetas.jugador_id,
        equipo_id: tarjetas.equipo_id,
        tipo: tarjetas.tipo,
        jornada: encuentros.jornada,
        createdAt: tarjetas.createdAt,
        updatedAt: tarjetas.updatedAt
      })
      .from(tarjetas)
      .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
      .where(
        and(
          eq(encuentros.torneo_id, torneoId),
          eq(tarjetas.jugador_id, jugadorId),
          hastaJornada ? lte(encuentros.jornada, hastaJornada) : undefined
        )
      )
      .orderBy(encuentros.jornada)
    
    return await query
  } catch (error) {
    console.error('Error al obtener tarjetas del jugador:', error)
    throw new Error('Error al obtener tarjetas del jugador')
  }
}

// Determinar si un jugador está sancionado en una jornada específica
export async function isJugadorSancionado(
  torneoId: number,
  jugadorId: string,
  jornadaActual: number
): Promise<{ sancionado: boolean; razon: string; partidosPendientes: number }> {
  try {
    // Obtener configuraciones de sanciones
    const [
      configPartidosRoja,
      configCantidadAmarillas,
      configPartidosDobleAmarilla
    ] = await Promise.all([
      getConfiguracionPorClave('partidos_sancion_roja'),
      getConfiguracionPorClave('cantidad_amarillas_para_sancion'),
      getConfiguracionPorClave('partidos_sancion_doble_amarilla')
    ])

    // Valores por defecto si no existen configuraciones
    const partidosPorRoja = parseInt(configPartidosRoja?.valor || '1')
    const cantidadAmarillasParaSancion = parseInt(configCantidadAmarillas?.valor || '5')
    const partidosPorDobleAmarilla = parseInt(configPartidosDobleAmarilla?.valor || '1')

    // Obtener todas las tarjetas del jugador hasta la jornada anterior
    const tarjetasAnteriores = await getTarjetasJugadorConJornada(
      torneoId,
      jugadorId,
      jornadaActual - 1
    )

    if (tarjetasAnteriores.length === 0) {
      return { sancionado: false, razon: '', partidosPendientes: 0 }
    }

    // Contar tarjetas amarillas y rojas
    let amarillas = 0
    let rojas = 0
    const sanciones: Array<{ jornada: number; tipo: 'roja' | 'acumulacion'; partidos: number }> = []

    // Procesar tarjetas por jornada
    const tarjetasPorJornada: Record<number, { amarillas: number; rojas: number }> = {}
    
    tarjetasAnteriores.forEach(t => {
      const jornada = t.jornada || 0
      if (!tarjetasPorJornada[jornada]) {
        tarjetasPorJornada[jornada] = { amarillas: 0, rojas: 0 }
      }
      
      if (t.tipo === 'amarilla') {
        tarjetasPorJornada[jornada].amarillas++
        amarillas++
      } else if (t.tipo === 'roja') {
        tarjetasPorJornada[jornada].rojas++
        rojas++
        // Tarjeta roja = partidos de sanción según configuración (aplica desde jornada siguiente)
        sanciones.push({
          jornada,
          tipo: 'roja',
          partidos: partidosPorRoja
        })
      }
    })

    // Verificar acumulación de amarillas
    // Contar amarillas progresivamente por jornada para detectar cuándo se alcanza el límite
    let amarillasAcumuladas = 0
    const jornadasOrdenadas = Object.keys(tarjetasPorJornada)
      .map(Number)
      .sort((a, b) => a - b)

    for (const jornada of jornadasOrdenadas) {
      const amarillasJornada = tarjetasPorJornada[jornada].amarillas
      amarillasAcumuladas += amarillasJornada
      
      // Verificar si en esta jornada se alcanza un múltiplo de cantidadAmarillasParaSancion
      const sancionesPorAcumulacionExistentes = sanciones.filter(s => s.tipo === 'acumulacion').length
      const amarillasParaSiguienteSancion = (sancionesPorAcumulacionExistentes + 1) * cantidadAmarillasParaSancion
      
      if (amarillasAcumuladas >= amarillasParaSiguienteSancion) {
        sanciones.push({
          jornada,
          tipo: 'acumulacion',
          partidos: 1 // Cada acumulación genera 1 partido de sanción
        })
      }
    }

    // Verificar si alguna sanción se aplica en la jornada actual
    for (const sancion of sanciones) {
      const jornadaInicioSancion = sancion.jornada + 1 // La sanción aplica desde la jornada siguiente
      const jornadaFinSancion = sancion.jornada + sancion.partidos // Hasta jornada + partidos sancionados (inclusive)
      
      // Si la jornada actual está dentro del período de sanción
      if (jornadaActual >= jornadaInicioSancion && jornadaActual <= jornadaFinSancion) {
        const partidosPendientes = jornadaFinSancion - jornadaActual + 1
        let razon = sancion.tipo === 'roja' 
          ? 'Tarjeta roja' 
          : `${amarillasAcumuladas} tarjetas amarillas acumuladas`
        
        return {
          sancionado: true,
          razon,
          partidosPendientes
        }
      }
    }

    return { sancionado: false, razon: '', partidosPendientes: 0 }
  } catch (error) {
    console.error('Error al verificar sanción del jugador:', error)
    return { sancionado: false, razon: '', partidosPendientes: 0 }
  }
}

// ===== SALDOS Y PAGOS DE MULTAS (TARJETAS) =====

async function getValoresTarjetasInterno() {
  const claves = ['valor_tarjeta_amarilla', 'valor_tarjeta_roja'] as const
  const rows = await db
    .select({ clave: configuraciones.clave, valor: configuraciones.valor })
    .from(configuraciones)
    .where(inArray(configuraciones.clave, claves as unknown as string[]))

  const map = new Map(rows.map(r => [r.clave, r.valor]))
  const valorAmarilla = parseFloat((map.get('valor_tarjeta_amarilla') as string) || '0')
  const valorRoja = parseFloat((map.get('valor_tarjeta_roja') as string) || '0')
  return { valorAmarilla, valorRoja }
}

export async function getSaldosEquiposHastaJornada(
  torneoId: number,
  equipoLocalId: number,
  equipoVisitanteId: number,
  hastaJornada: number,
) {
  const { valorAmarilla, valorRoja } = await getValoresTarjetasInterno()

  // Traer tarjetas de ambos equipos hasta la jornada indicada
  const tarjetasRows = await db
    .select({
      equipo_id: tarjetas.equipo_id,
      tipo: tarjetas.tipo,
      jornada: encuentros.jornada,
    })
    .from(tarjetas)
    .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
    .where(and(
      eq(encuentros.torneo_id, torneoId),
      inArray(tarjetas.equipo_id, [equipoLocalId, equipoVisitanteId]),
      lte(encuentros.jornada, hastaJornada)
    ))

  const acum: Record<number, { amarillas: number; rojas: number }> = {
    [equipoLocalId]: { amarillas: 0, rojas: 0 },
    [equipoVisitanteId]: { amarillas: 0, rojas: 0 },
  }
  for (const t of tarjetasRows) {
    if (!acum[t.equipo_id]) acum[t.equipo_id] = { amarillas: 0, rojas: 0 }
    if (t.tipo === 'amarilla') acum[t.equipo_id].amarillas += 1
    if (t.tipo === 'roja') acum[t.equipo_id].rojas += 1
  }

  const importeLocal = Math.round((acum[equipoLocalId]?.amarillas || 0) * valorAmarilla * 100 + (acum[equipoLocalId]?.rojas || 0) * valorRoja * 100)
  const importeVisitante = Math.round((acum[equipoVisitanteId]?.amarillas || 0) * valorAmarilla * 100 + (acum[equipoVisitanteId]?.rojas || 0) * valorRoja * 100)

  // Pagos
  const pagosRows = await db
    .select({ equipo_id: pagosMultas.equipo_id, monto_centavos: pagosMultas.monto_centavos })
    .from(pagosMultas)
    .where(and(
      eq(pagosMultas.torneo_id, torneoId),
      inArray(pagosMultas.equipo_id, [equipoLocalId, equipoVisitanteId]),
      // considerar pagos hasta la jornada (si jornada es null se considera general -> también cuenta)
      // no hay operador OR directo a null en el builder, sumamos todos y el cliente filtra por hastaJornada al insertar
      // simplificamos: contamos todos los pagos registrados hasta el momento (comportamiento esperado para saldo acumulado)
      // Si luego se requiere corte por jornada, agregamos columna fecha o filtramos por jornada <= hasta
    ))

  let pagosLocal = 0
  let pagosVisitante = 0
  for (const p of pagosRows) {
    if (p.equipo_id === equipoLocalId) pagosLocal += p.monto_centavos
    if (p.equipo_id === equipoVisitanteId) pagosVisitante += p.monto_centavos
  }

  // Cargos manuales aplicables hasta la jornada (se aplican en su jornada especificada)
  const cargosRows = await db
    .select({ equipo_id: cargosManuales.equipo_id, monto_centavos: cargosManuales.monto_centavos, jornada: cargosManuales.jornada_aplicacion, descripcion: cargosManuales.descripcion })
    .from(cargosManuales)
    .where(and(
      eq(cargosManuales.torneo_id, torneoId),
      inArray(cargosManuales.equipo_id, [equipoLocalId, equipoVisitanteId]),
      // incluir cargos globales (jornada null) o con jornada <= hasta
      // Drizzle no soporta OR con null directo en and(), así que hacemos filtro después de traer por torneo/equipos
    ))

  let cargosLocal = 0
  let cargosVisitante = 0
  for (const c of cargosRows.filter(c => c.jornada == null || (c.jornada as number) <= hastaJornada)) {
    if (c.equipo_id === equipoLocalId) cargosLocal += c.monto_centavos || 0
    if (c.equipo_id === equipoVisitanteId) cargosVisitante += c.monto_centavos || 0
  }

  return {
    localCents: importeLocal + cargosLocal - pagosLocal,
    visitanteCents: importeVisitante + cargosVisitante - pagosVisitante,
  }
}

export async function getCargosManualesPorJornada(
  torneoId: number,
  equipoLocalId: number,
  equipoVisitanteId: number,
  jornada: number,
) {
  // Incluir cargos globales (jornada null) y cargos específicos de esta jornada
  const rowsAll = await db
    .select({ equipo_id: cargosManuales.equipo_id, monto_centavos: cargosManuales.monto_centavos, descripcion: cargosManuales.descripcion, jornada: cargosManuales.jornada_aplicacion })
    .from(cargosManuales)
    .where(and(
      eq(cargosManuales.torneo_id, torneoId),
      inArray(cargosManuales.equipo_id, [equipoLocalId, equipoVisitanteId])
    ))
  
  // Filtrar: incluir cargos globales (jornada null) o específicos de esta jornada
  const rows = rowsAll.filter(c => c.jornada == null || c.jornada === jornada)
  return rows
}

export async function getDetalleValoresEquiposHastaJornada(
  torneoId: number,
  equipoLocalId: number,
  equipoVisitanteId: number,
  hastaJornada: number,
) {
  const { valorAmarilla, valorRoja } = await getValoresTarjetasInterno()

  // Tarjetas por tipo hasta la jornada
  const tarjetasRows = await db
    .select({ equipo_id: tarjetas.equipo_id, tipo: tarjetas.tipo })
    .from(tarjetas)
    .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
    .where(and(
      eq(encuentros.torneo_id, torneoId),
      inArray(tarjetas.equipo_id, [equipoLocalId, equipoVisitanteId]),
      lte(encuentros.jornada, hastaJornada)
    ))

  const agg: Record<number, { amarillas: number; rojas: number }> = {
    [equipoLocalId]: { amarillas: 0, rojas: 0 },
    [equipoVisitanteId]: { amarillas: 0, rojas: 0 },
  }
  for (const t of tarjetasRows) {
    const e = t.equipo_id!
    if (!agg[e]) agg[e] = { amarillas: 0, rojas: 0 }
    if (t.tipo === 'amarilla') agg[e].amarillas += 1
    if (t.tipo === 'roja') agg[e].rojas += 1
  }

  // Cargos manuales hasta la jornada (incluir cargos globales - jornada null)
  const cargosRowsAll = await db
    .select({ equipo_id: cargosManuales.equipo_id, monto_centavos: cargosManuales.monto_centavos, descripcion: cargosManuales.descripcion, jornada: cargosManuales.jornada_aplicacion })
    .from(cargosManuales)
    .where(and(
      eq(cargosManuales.torneo_id, torneoId),
      inArray(cargosManuales.equipo_id, [equipoLocalId, equipoVisitanteId])
    ))
  
  // Filtrar: incluir cargos globales (jornada null) o con jornada <= hasta
  const cargosRows = cargosRowsAll.filter(c => c.jornada == null || (c.jornada as number) <= hastaJornada)

  // Pagos (acumulados)
  const pagosRows = await db
    .select({ equipo_id: pagosMultas.equipo_id, monto_centavos: pagosMultas.monto_centavos, jornada: pagosMultas.jornada, descripcion: pagosMultas.descripcion })
    .from(pagosMultas)
    .where(and(
      eq(pagosMultas.torneo_id, torneoId),
      inArray(pagosMultas.equipo_id, [equipoLocalId, equipoVisitanteId])
    ))

  function buildDetalle(equipoId: number) {
    const a = agg[equipoId]?.amarillas || 0
    const r = agg[equipoId]?.rojas || 0
    const importeAmarillas = Math.round(a * valorAmarilla * 100)
    const importeRojas = Math.round(r * valorRoja * 100)
    const cargos = cargosRows.filter(c => c.equipo_id === equipoId)
    const pagos = pagosRows.filter(p => p.equipo_id === equipoId)
    const sumaCargos = cargos.reduce((acc, c) => acc + (c.monto_centavos || 0), 0)
    const sumaPagos = pagos.reduce((acc, p) => acc + (p.monto_centavos || 0), 0)
    const importe = importeAmarillas + importeRojas + sumaCargos
    const saldo = importe - sumaPagos
    return {
      amarillas: a,
      rojas: r,
      importeAmarillasCents: importeAmarillas,
      importeRojasCents: importeRojas,
      cargos,
      pagos,
      sumaCargosCents: sumaCargos,
      sumaPagosCents: sumaPagos,
      importeCents: importe,
      saldoCents: saldo,
      valorAmarilla,
      valorRoja,
    }
  }

  return {
    local: buildDetalle(equipoLocalId),
    visitante: buildDetalle(equipoVisitanteId),
  }
}

export async function registrarPagoMulta(
  torneoId: number,
  equipoId: number,
  jornada: number | null,
  montoCentavos: number,
  descripcion?: string,
  referencia?: string,
) {
  if (!torneoId || !equipoId || !montoCentavos || montoCentavos <= 0) {
    throw new Error('Datos de pago inválidos')
  }
  const [row] = await db.insert(pagosMultas).values({
    torneo_id: torneoId,
    equipo_id: equipoId,
    jornada: jornada ?? null,
    monto_centavos: Math.round(montoCentavos),
    descripcion: descripcion || null,
    referencia: referencia || null,
  }).returning()
  return { success: true, pago: row }
}

// Eliminar una tarjeta
export async function deleteTarjeta(tarjetaId: number) {
  try {
    await db.delete(tarjetas).where(eq(tarjetas.id, tarjetaId))
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar tarjeta:', error)
    throw new Error('Error al eliminar tarjeta')
  }
}

// Actualizar una tarjeta
export async function updateTarjeta(tarjetaId: number, tarjetaData: Partial<NewTarjeta>) {
  try {
    const [tarjeta] = await db
      .update(tarjetas)
      .set(tarjetaData)
      .where(eq(tarjetas.id, tarjetaId))
      .returning()
    
    return { success: true, tarjeta }
  } catch (error) {
    console.error('Error al actualizar tarjeta:', error)
    throw new Error('Error al actualizar tarjeta')
  }
}

// ===== FUNCIONES PARA JUGADORES PARTICIPANTES =====

// Guardar jugadores participantes de un encuentro
export async function saveJugadoresParticipantes(encuentroId: number, jugadoresData: NewJugadorParticipante[]) {
  try {
    console.log('saveJugadoresParticipantes - Entrada:', {
      encuentroId,
      jugadoresDataLength: jugadoresData.length,
      jugadoresData
    })

    if (jugadoresData.length === 0) {
      console.log('No hay jugadores para guardar')
      return { success: true, jugadores: [] }
    }

    // Eliminar jugadores participantes existentes del encuentro
    console.log('Eliminando jugadores participantes existentes para encuentro:', encuentroId)
    await db.delete(jugadoresParticipantes).where(eq(jugadoresParticipantes.encuentro_id, encuentroId))

    // Insertar nuevos jugadores participantes
    console.log('Insertando nuevos jugadores participantes:', jugadoresData)
    const jugadoresGuardados = await db.insert(jugadoresParticipantes).values(jugadoresData).returning()
    
    console.log('Jugadores guardados exitosamente:', jugadoresGuardados)
    return { success: true, jugadores: jugadoresGuardados }
  } catch (error) {
    console.error('Error al guardar jugadores participantes:', error)
    throw new Error('Error al guardar jugadores participantes')
  }
}

// Obtener jugadores participantes de un encuentro
export async function getJugadoresParticipantes(encuentroId: number) {
  try {
    
    
    const jugadores = await db
      .select()
      .from(jugadoresParticipantes)
      .where(eq(jugadoresParticipantes.encuentro_id, encuentroId))
    
    
    return jugadores
  } catch (error) {
    console.error('Error al obtener jugadores participantes:', error)
    throw new Error('Error al obtener jugadores participantes')
  }
}

// Obtener jugadores participantes por encuentro y tipo de equipo
export async function getJugadoresParticipantesByTipo(encuentroId: number, equipoTipo: 'local' | 'visitante') {
  try {
    const jugadores = await db
      .select()
      .from(jugadoresParticipantes)
      .where(and(
        eq(jugadoresParticipantes.encuentro_id, encuentroId),
        eq(jugadoresParticipantes.equipo_tipo, equipoTipo)
      ))
    
    return jugadores
  } catch (error) {
    console.error('Error al obtener jugadores participantes por tipo:', error)
    throw new Error('Error al obtener jugadores participantes por tipo')
  }
}

// Insertar un jugador participante individual
export async function insertJugadorParticipante(jugadorData: NewJugadorParticipante) {
  try {
    console.log('insertJugadorParticipante - Insertando:', jugadorData)
    
    const [jugador] = await db.insert(jugadoresParticipantes).values(jugadorData).returning()
    
    console.log('✅ Jugador participante insertado exitosamente:', jugador)
    return { success: true, jugador }
  } catch (error) {
    console.error('❌ Error al insertar jugador participante:', error)
    throw new Error('Error al insertar jugador participante')
  }
}

// Eliminar un jugador participante específico
export async function deleteJugadorParticipante(encuentroId: number, jugadorId: number) {
  try {
    console.log('deleteJugadorParticipante - Eliminando:', { encuentroId, jugadorId })
    
    await db.delete(jugadoresParticipantes).where(and(
      eq(jugadoresParticipantes.encuentro_id, encuentroId),
      eq(jugadoresParticipantes.jugador_id, jugadorId.toString())
    ))
    
    console.log('✅ Jugador participante eliminado exitosamente')
    return { success: true }
  } catch (error) {
    console.error('❌ Error al eliminar jugador participante:', error)
    throw new Error('Error al eliminar jugador participante')
  }
}


// Actualizar un jugador participante
export async function updateJugadorParticipante(participanteId: number, participanteData: Partial<NewJugadorParticipante>) {
  try {
    const [participante] = await db
      .update(jugadoresParticipantes)
      .set(participanteData)
      .where(eq(jugadoresParticipantes.id, participanteId))
      .returning()
    
    return { success: true, participante }
  } catch (error) {
    console.error('Error al actualizar jugador participante:', error)
    throw new Error('Error al actualizar jugador participante')
  }
}

// ===== FUNCIONES PARA CAMBIOS DE JUGADORES =====

// Guardar un cambio de jugador en la base de datos
export async function saveCambioJugador(cambioData: NewCambioJugador) {
  try {
    const [cambio] = await db.insert(cambiosJugadores).values(cambioData).returning()
    return { success: true, cambio }
  } catch (error) {
    console.error('Error al guardar cambio de jugador:', error)
    throw new Error('Error al guardar cambio de jugador en la base de datos')
  }
}

// Realizar cambio de jugador completo: registrar cambio y actualizar jugadores participantes
export async function realizarCambioJugadorCompleto(
  cambioData: NewCambioJugador,
  jugadorEntraData: NewJugadorParticipante
) {
  try {
    console.log('realizarCambioJugadorCompleto - Iniciando cambio completo:', {
      cambio: cambioData,
      jugadorEntra: jugadorEntraData
    })

    // 1. Registrar el cambio en la tabla de cambios
    const [cambio] = await db.insert(cambiosJugadores).values(cambioData).returning()
    console.log('✅ Cambio registrado:', cambio)

    // 2. Insertar el jugador que entra en jugadores_participantes
    const [jugadorParticipante] = await db.insert(jugadoresParticipantes).values(jugadorEntraData).returning()
    console.log('✅ Jugador participante insertado:', jugadorParticipante)

    return { 
      success: true, 
      cambio, 
      jugadorParticipante 
    }
  } catch (error) {
    console.error('❌ Error al realizar cambio completo:', error)
    throw new Error('Error al realizar cambio completo de jugador')
  }
}

// Guardar múltiples cambios de jugadores de un encuentro
export async function saveCambiosEncuentro(encuentroId: number, cambiosData: NewCambioJugador[]) {
  try {
    if (cambiosData.length === 0) {
      return { success: true, cambios: [] }
    }

    // Eliminar cambios existentes del encuentro
    await db.delete(cambiosJugadores).where(eq(cambiosJugadores.encuentro_id, encuentroId))

    // Insertar nuevos cambios
    const cambiosGuardados = await db.insert(cambiosJugadores).values(cambiosData).returning()
    
    return { success: true, cambios: cambiosGuardados }
  } catch (error) {
    console.error('Error al guardar cambios del encuentro:', error)
    throw new Error('Error al guardar cambios del encuentro')
  }
}

// Obtener cambios de jugadores de un encuentro
export async function getCambiosEncuentro(encuentroId: number) {
  try {
    const cambiosEncuentro = await db
      .select()
      .from(cambiosJugadores)
      .where(eq(cambiosJugadores.encuentro_id, encuentroId))
    
    return cambiosEncuentro
  } catch (error) {
    console.error('Error al obtener cambios del encuentro:', error)
    throw new Error('Error al obtener cambios del encuentro')
  }
}

// Obtener todos los cambios de un torneo
export async function getCambiosTorneo(torneoId: number) {
  try {
    const cambiosTorneo = await db
      .select({
        id: cambiosJugadores.id,
        encuentro_id: cambiosJugadores.encuentro_id,
        jugador_sale_id: cambiosJugadores.jugador_sale_id,
        jugador_entra_id: cambiosJugadores.jugador_entra_id,
        equipo_id: cambiosJugadores.equipo_id,
        minuto: cambiosJugadores.minuto,
        tiempo: cambiosJugadores.tiempo,
        createdAt: cambiosJugadores.createdAt,
        updatedAt: cambiosJugadores.updatedAt
      })
      .from(cambiosJugadores)
      .innerJoin(encuentros, eq(cambiosJugadores.encuentro_id, encuentros.id))
      .where(eq(encuentros.torneo_id, torneoId))
    
    return cambiosTorneo
  } catch (error) {
    console.error('Error al obtener cambios del torneo:', error)
    throw new Error('Error al obtener cambios del torneo')
  }
}

// Eliminar un cambio de jugador
export async function deleteCambioJugador(cambioId: number) {
  try {
    await db.delete(cambiosJugadores).where(eq(cambiosJugadores.id, cambioId))
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar cambio de jugador:', error)
    throw new Error('Error al eliminar cambio de jugador')
  }
}

// Deshacer un cambio de jugador: eliminar el cambio y remover el jugador que entra de jugadores_participantes
export async function deshacerCambioJugador(
  cambioId: number,
  jugadorEntraId: number,
  encuentroId: number
) {
  try {
    console.log('deshacerCambioJugador - Iniciando:', {
      cambioId,
      jugadorEntraId,
      encuentroId
    })

    // 1. Eliminar el cambio de la tabla cambios_jugadores
    await db.delete(cambiosJugadores).where(eq(cambiosJugadores.id, cambioId))
    console.log('✅ Cambio eliminado de cambios_jugadores')

    // 2. Eliminar el jugador que entra de jugadores_participantes
    await db.delete(jugadoresParticipantes).where(and(
      eq(jugadoresParticipantes.encuentro_id, encuentroId),
      eq(jugadoresParticipantes.jugador_id, jugadorEntraId.toString())
    ))
    console.log('✅ Jugador que entra eliminado de jugadores_participantes')

    return { success: true }
  } catch (error) {
    console.error('❌ Error al deshacer cambio de jugador:', error)
    throw new Error('Error al deshacer cambio de jugador')
  }
}

// Actualizar un cambio de jugador
export async function updateCambioJugador(cambioId: number, cambioData: Partial<NewCambioJugador>) {
  try {
    const [cambio] = await db
      .update(cambiosJugadores)
      .set(cambioData)
      .where(eq(cambiosJugadores.id, cambioId))
      .returning()
    
    return { success: true, cambio }
  } catch (error) {
    console.error('Error al actualizar cambio de jugador:', error)
    throw new Error('Error al actualizar cambio de jugador')
  }
}

// ===== FUNCIONES PARA FIRMAS DE ENCUENTROS =====

// Guardar o actualizar firmas de un encuentro
export async function saveFirmasEncuentro(firmasData: NewFirmaEncuentro) {
  try {
    // Verificar si ya existen firmas para este encuentro
    const firmasExistentes = await db
      .select()
      .from(firmasEncuentros)
      .where(eq(firmasEncuentros.encuentro_id, firmasData.encuentro_id!))
      .limit(1)
    
    let firmas
    
    if (firmasExistentes.length > 0) {
      // Actualizar firmas existentes
      const [firmasActualizadas] = await db
        .update(firmasEncuentros)
        .set({
          ...firmasData,
          updatedAt: new Date()
        })
        .where(eq(firmasEncuentros.encuentro_id, firmasData.encuentro_id!))
        .returning()
      
      firmas = firmasActualizadas
    } else {
      // Insertar nuevas firmas
      const [firmasNuevas] = await db
        .insert(firmasEncuentros)
        .values(firmasData)
        .returning()
      
      firmas = firmasNuevas
    }
    
    return { success: true, firmas }
  } catch (error) {
    throw new Error('Error al guardar firmas del encuentro')
  }
}

// Obtener firmas de un encuentro
export async function getFirmasEncuentro(encuentroId: number) {
  try {
    const firmas = await db
      .select()
      .from(firmasEncuentros)
      .where(eq(firmasEncuentros.encuentro_id, encuentroId))
      .limit(1)
    
    return firmas.length > 0 ? firmas[0] : null
  } catch (error) {
    throw new Error('Error al obtener firmas del encuentro')
  }
}

// Eliminar firmas de un encuentro
export async function deleteFirmasEncuentro(encuentroId: number) {
  try {
    await db.delete(firmasEncuentros).where(eq(firmasEncuentros.encuentro_id, encuentroId))
    
    return { success: true }
  } catch (error) {
    throw new Error('Error al eliminar firmas del encuentro')
  }
}

// Función para designar capitán
export async function designarCapitan(encuentroId: number, jugadorId: number, equipoTipo: 'local' | 'visitante') {
  try {
    // Primero, quitar el capitán actual del equipo
    await db.update(jugadoresParticipantes)
      .set({ es_capitan: false })
      .where(
        and(
          eq(jugadoresParticipantes.encuentro_id, encuentroId),
          eq(jugadoresParticipantes.equipo_tipo, equipoTipo)
        )
      )

    // Luego, designar al nuevo capitán
    const result = await db.update(jugadoresParticipantes)
      .set({ es_capitan: true })
      .where(
        and(
        eq(jugadoresParticipantes.encuentro_id, encuentroId),
        eq(jugadoresParticipantes.jugador_id, jugadorId.toString()),
        eq(jugadoresParticipantes.equipo_tipo, equipoTipo)
        )
      )
      .returning()

    return { success: true, data: result[0] }
  } catch (error) {
    console.error('Error al designar capitán:', error)
    return { success: false, error: 'Error al designar capitán' }
  }
}
