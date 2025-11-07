'use server'

import { db } from '@/db'
import { equipos, encuentros, tarjetas, configuraciones, pagosMultas, cargosManuales, equiposTorneo } from '@/db/schema'
import { and, eq, inArray, asc, gte, lte, sql, not, or } from 'drizzle-orm'

export interface ResumenTarjetasItem {
  jornada: number
  equipo_id: number
  equipo_nombre: string
  amarillas: number
  rojas: number
}

export async function getResumenTarjetasPorJornadaEquipo(torneoId: number): Promise<ResumenTarjetasItem[]> {
  // Selecciona todas las tarjetas del torneo con su jornada y equipo
  const results = await db
    .select({
      jornada: encuentros.jornada,
      equipo_id: tarjetas.equipo_id,
      equipo_nombre: equipos.nombre,
      tipo: tarjetas.tipo,
    })
    .from(tarjetas)
    .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
    .innerJoin(equipos, eq(tarjetas.equipo_id, equipos.id))
    .where(eq(encuentros.torneo_id, torneoId))

  // Agregar en memoria por (jornada, equipo)
  const map = new Map<string, ResumenTarjetasItem>()
  for (const row of results) {
    const key = `${row.jornada ?? 0}-${row.equipo_id}`
    if (!map.has(key)) {
      map.set(key, {
        jornada: Number(row.jornada || 0),
        equipo_id: row.equipo_id!,
        equipo_nombre: row.equipo_nombre || 'Equipo',
        amarillas: 0,
        rojas: 0,
      })
    }
    const acc = map.get(key)!
    if (row.tipo === 'amarilla') acc.amarillas += 1
    if (row.tipo === 'roja') acc.rojas += 1
  }

  return Array.from(map.values()).sort((a, b) => a.jornada - b.jornada || a.equipo_nombre.localeCompare(b.equipo_nombre))
}

export async function getValoresTarjetas() {
  // Lee valores desde configuraciones
  const claves = ['valor_tarjeta_amarilla', 'valor_tarjeta_roja'] as const
  const rows = await db
    .select({ clave: configuraciones.clave, valor: configuraciones.valor, tipo: configuraciones.tipo })
    .from(configuraciones)
    .where(inArray(configuraciones.clave, claves as unknown as string[]))

  // Fallback por si alguna no existe aún
  const byKey = new Map(rows.map(r => [r.clave, r.valor]))
  const valorAmarilla = parseFloat((byKey.get('valor_tarjeta_amarilla') as string) || '0')
  const valorRoja = parseFloat((byKey.get('valor_tarjeta_roja') as string) || '0')
  return { valorAmarilla, valorRoja }
}

export interface SaldoEquipoItem {
  equipo_id: number
  equipo_nombre: string
  amarillas: number
  rojas: number
  importe_cents: number
  pagos_cents: number
  saldo_cents: number
}

export async function getSaldosPorEquipo(torneoId: number): Promise<SaldoEquipoItem[]> {
  const { valorAmarilla, valorRoja } = await getValoresTarjetas()

  // Todas las tarjetas del torneo agrupadas por equipo
  const tarjetasRows = await db
    .select({
      equipo_id: tarjetas.equipo_id,
      tipo: tarjetas.tipo,
    })
    .from(tarjetas)
    .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
    .where(eq(encuentros.torneo_id, torneoId))

  const agg: Record<number, { amarillas: number; rojas: number }> = {}
  for (const r of tarjetasRows) {
    if (!agg[r.equipo_id!]) agg[r.equipo_id!] = { amarillas: 0, rojas: 0 }
    if (r.tipo === 'amarilla') agg[r.equipo_id!].amarillas += 1
    if (r.tipo === 'roja') agg[r.equipo_id!].rojas += 1
  }

  // Pagos registrados por equipo (excluir anulados)
  const pagosRows = await db
    .select({ equipo_id: pagosMultas.equipo_id, monto_centavos: pagosMultas.monto_centavos })
    .from(pagosMultas)
    .where(
      and(
        eq(pagosMultas.torneo_id, torneoId),
        eq(pagosMultas.anulado, false)
      )
    )

  const pagosAgg = new Map<number, number>()
  for (const p of pagosRows) {
    pagosAgg.set(p.equipo_id!, (pagosAgg.get(p.equipo_id!) || 0) + (p.monto_centavos || 0))
  }

  // Cargos manuales (globales o por jornada, se suman al pendiente global)
  const cargosRows = await db
    .select({ equipo_id: cargosManuales.equipo_id, monto_centavos: cargosManuales.monto_centavos })
    .from(cargosManuales)
    .where(eq(cargosManuales.torneo_id, torneoId))

  const cargosAgg = new Map<number, number>()
  for (const c of cargosRows) {
    cargosAgg.set(c.equipo_id!, (cargosAgg.get(c.equipo_id!) || 0) + (c.monto_centavos || 0))
  }

  // Obtener todos los equipos del torneo desde equipos_torneo
  const equiposTorneoRows = await db
    .select({ id: equipos.id, nombre: equipos.nombre })
    .from(equiposTorneo)
    .innerJoin(equipos, eq(equiposTorneo.equipo_id, equipos.id))
    .where(eq(equiposTorneo.torneo_id, torneoId))

  const equipoIdToNombre = new Map<number, string>()
  const todosLosEquiposIds = new Set<number>()
  for (const e of equiposTorneoRows) {
    if (e.id) {
      equipoIdToNombre.set(e.id, e.nombre || 'Equipo')
      todosLosEquiposIds.add(e.id)
    }
  }

  const result: SaldoEquipoItem[] = []
  // Incluir todos los equipos del torneo, no solo los que tienen tarjetas o pagos
  const equipoIds = new Set<number>([...todosLosEquiposIds, ...Object.keys(agg).map(Number), ...Array.from(pagosAgg.keys())])
  for (const equipoId of equipoIds) {
    const a = agg[equipoId]?.amarillas || 0
    const r = agg[equipoId]?.rojas || 0
    const importe = Math.round(a * valorAmarilla * 100 + r * valorRoja * 100) + (cargosAgg.get(equipoId) || 0)
    const pagos = pagosAgg.get(equipoId) || 0
    result.push({
      equipo_id: equipoId,
      equipo_nombre: equipoIdToNombre.get(equipoId) || 'Equipo',
      amarillas: a,
      rojas: r,
      importe_cents: importe,
      pagos_cents: pagos,
      saldo_cents: importe - pagos,
    })
  }

  // Ordenar por mayor saldo descendente
  return result.sort((x, y) => y.saldo_cents - x.saldo_cents || x.equipo_nombre.localeCompare(y.equipo_nombre))
}

export async function registrarPagoTorneo(
  torneoId: number,
  equipoId: number,
  montoUSD: number,
  descripcion?: string
) {
  if (!torneoId || !equipoId || !montoUSD || montoUSD <= 0) throw new Error('Datos de pago inválidos')
  const cents = Math.round(montoUSD * 100)
  const [row] = await db.insert(pagosMultas).values({
    torneo_id: torneoId,
    equipo_id: equipoId,
    jornada: null,
    monto_centavos: cents,
    descripcion: descripcion || null,
    referencia: null,
  }).returning()
  return { success: true, pago: row }
}

export async function registrarCargoManual(
  torneoId: number,
  equipoId: number,
  montoUSD: number,
  descripcion?: string,
  jornada?: number | null,
) {
  if (!torneoId || !equipoId || !montoUSD || montoUSD <= 0) throw new Error('Datos de cargo manual inválidos')
  const cents = Math.round(montoUSD * 100)
  const [row] = await db.insert(cargosManuales).values({
    torneo_id: torneoId,
    equipo_id: equipoId,
    jornada_aplicacion: jornada || null,
    monto_centavos: cents,
    descripcion: descripcion || null,
  }).returning()
  return { success: true, cargo: row }
}

export async function getCargosManualesTorneo(torneoId: number) {
  const rows = await db
    .select({ 
      id: cargosManuales.id, 
      equipo_id: cargosManuales.equipo_id, 
      monto_centavos: cargosManuales.monto_centavos, 
      descripcion: cargosManuales.descripcion,
      jornada_aplicacion: cargosManuales.jornada_aplicacion
    })
    .from(cargosManuales)
    .where(eq(cargosManuales.torneo_id, torneoId))
  return rows
}

export async function updateCargoManual(id: number, montoUSD: number, descripcion?: string, jornada?: number | null) {
  const cents = Math.round((montoUSD || 0) * 100)
  const [row] = await db
    .update(cargosManuales)
    .set({ 
      monto_centavos: cents, 
      descripcion: descripcion || null, 
      jornada_aplicacion: jornada !== undefined ? (jornada || null) : undefined,
      updatedAt: new Date() 
    })
    .where(eq(cargosManuales.id, id))
    .returning()
  return { success: true, cargo: row }
}

export async function deleteCargoManual(id: number) {
  await db.delete(cargosManuales).where(eq(cargosManuales.id, id))
  return { success: true }
}

// Obtener tarjetas detalladas de un equipo en una jornada específica
export interface TarjetaDetalle {
  id: number
  tipo: 'amarilla' | 'roja'
  jugador_id: string | null
  jugador_nombre: string | null
  encuentro_id: number
  jornada: number | null
}

export async function getTarjetasPorEquipoJornada(
  torneoId: number,
  equipoId: number,
  jornada: number
): Promise<TarjetaDetalle[]> {
  const results = await db
    .select({
      id: tarjetas.id,
      tipo: tarjetas.tipo,
      jugador_id: tarjetas.jugador_id,
      encuentro_id: tarjetas.encuentro_id,
      jornada: encuentros.jornada,
    })
    .from(tarjetas)
    .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
    .where(
      and(
        eq(encuentros.torneo_id, torneoId),
        eq(tarjetas.equipo_id, equipoId),
        eq(encuentros.jornada, jornada)
      )
    )
    .orderBy(asc(tarjetas.id))

  return results.map(r => ({
    id: r.id,
    tipo: r.tipo as 'amarilla' | 'roja',
    jugador_id: r.jugador_id || null,
    jugador_nombre: null, // Se puede mejorar obteniendo nombre del jugador si es necesario
    encuentro_id: r.encuentro_id!,
    jornada: r.jornada,
  }))
}

// Eliminar una tarjeta
export async function deleteTarjetaContabilidad(tarjetaId: number) {
  try {
    await db.delete(tarjetas).where(eq(tarjetas.id, tarjetaId))
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar tarjeta:', error)
    throw new Error('Error al eliminar tarjeta')
  }
}

// ==================== REPORTES Y FUNCIONALIDADES AVANZADAS ====================

// Resumen general del torneo
export interface ResumenGeneral {
  totalIngresosCents: number
  totalEgresosCents: number
  saldoNetoCents: number
  totalTarjetasAmarillas: number
  totalTarjetasRojas: number
  totalCargosManualesCents: number
  totalPagosCents: number
  equiposConSaldo: number
}

export async function getResumenGeneral(torneoId: number, fechaDesde?: Date, fechaHasta?: Date): Promise<ResumenGeneral> {
  const { valorAmarilla, valorRoja } = await getValoresTarjetas()

  // Tarjetas (siempre se cuentan todas independiente de fecha)
  const tarjetasRows = await db
    .select({
      tipo: tarjetas.tipo,
    })
    .from(tarjetas)
    .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
    .where(eq(encuentros.torneo_id, torneoId))

  let amarillas = 0
  let rojas = 0
  for (const t of tarjetasRows) {
    if (t.tipo === 'amarilla') amarillas += 1
    if (t.tipo === 'roja') rojas += 1
  }

  const importeTarjetas = Math.round(amarillas * valorAmarilla * 100 + rojas * valorRoja * 100)

  // Cargos manuales
  let cargosWhere = eq(cargosManuales.torneo_id, torneoId)
  if (fechaDesde) {
    cargosWhere = and(cargosWhere, gte(cargosManuales.createdAt, fechaDesde)) as any
  }
  if (fechaHasta) {
    cargosWhere = and(cargosWhere, lte(cargosManuales.createdAt, fechaHasta)) as any
  }

  const cargosRows = await db
    .select({ monto_centavos: cargosManuales.monto_centavos })
    .from(cargosManuales)
    .where(cargosWhere)

  const totalCargos = cargosRows.reduce((acc, c) => acc + (c.monto_centavos || 0), 0)

  // Pagos (no anulados)
  let pagosWhere = and(
    eq(pagosMultas.torneo_id, torneoId),
    eq(pagosMultas.anulado, false)
  ) as any
  if (fechaDesde) {
    pagosWhere = and(pagosWhere, gte(pagosMultas.createdAt, fechaDesde)) as any
  }
  if (fechaHasta) {
    pagosWhere = and(pagosWhere, lte(pagosMultas.createdAt, fechaHasta)) as any
  }

  const pagosRows = await db
    .select({ monto_centavos: pagosMultas.monto_centavos })
    .from(pagosMultas)
    .where(pagosWhere)

  const totalPagos = pagosRows.reduce((acc, p) => acc + (p.monto_centavos || 0), 0)

  const totalIngresos = importeTarjetas + totalCargos
  const totalEgresos = totalPagos
  const saldoNeto = totalIngresos - totalEgresos

  // Equipos con saldo pendiente
  const saldos = await getSaldosPorEquipo(torneoId)
  const equiposConSaldo = saldos.filter(s => s.saldo_cents > 0).length

  return {
    totalIngresosCents: totalIngresos,
    totalEgresosCents: totalEgresos,
    saldoNetoCents: saldoNeto,
    totalTarjetasAmarillas: amarillas,
    totalTarjetasRojas: rojas,
    totalCargosManualesCents: totalCargos,
    totalPagosCents: totalPagos,
    equiposConSaldo,
  }
}

// Estado de cuenta por equipo
export interface EstadoCuentaEquipo {
  equipo_id: number
  equipo_nombre: string
  fecha_inicio?: Date
  fecha_fin?: Date
  saldo_inicial_cents: number
  movimientos: Array<{
    fecha: Date
    tipo: 'tarjeta_amarilla' | 'tarjeta_roja' | 'cargo_manual' | 'pago'
    descripcion: string
    monto_cents: number
    jornada?: number
  }>
  saldo_final_cents: number
}

export async function getEstadoCuentaEquipo(
  torneoId: number,
  equipoId: number,
  fechaDesde?: Date,
  fechaHasta?: Date
): Promise<EstadoCuentaEquipo> {
  const { valorAmarilla, valorRoja } = await getValoresTarjetas()

  // Obtener equipo
  const equipo = await db.select({ id: equipos.id, nombre: equipos.nombre })
    .from(equipos)
    .where(eq(equipos.id, equipoId))
    .limit(1)

  const equipoNombre = equipo[0]?.nombre || 'Equipo'

  // Saldo inicial (antes de fechaDesde si existe)
  let saldoInicial = 0
  if (fechaDesde) {
    // Obtener todas las tarjetas del equipo en el torneo y filtrar por fecha en memoria
    const todasLasTarjetas = await db
      .select({ 
        tipo: tarjetas.tipo,
        fecha_jugada: encuentros.fecha_jugada,
        fecha_programada: encuentros.fecha_programada,
        createdAt: encuentros.createdAt,
      })
      .from(tarjetas)
      .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
      .where(
        and(
          eq(encuentros.torneo_id, torneoId),
          eq(tarjetas.equipo_id, equipoId)
        )
      )

    // Filtrar tarjetas antes de fechaDesde
    const tarjetasAntes = todasLasTarjetas.filter(t => {
      const fecha = t.fecha_jugada || t.fecha_programada || t.createdAt
      return fecha && new Date(fecha) < fechaDesde
    })

    let amarillasAntes = 0
    let rojasAntes = 0
    for (const t of tarjetasAntes) {
      if (t.tipo === 'amarilla') amarillasAntes += 1
      if (t.tipo === 'roja') rojasAntes += 1
    }

    const cargosAntes = await db
      .select({ monto_centavos: cargosManuales.monto_centavos })
      .from(cargosManuales)
      .where(
        and(
          eq(cargosManuales.torneo_id, torneoId),
          eq(cargosManuales.equipo_id, equipoId),
          sql`${cargosManuales.createdAt} < ${fechaDesde}`
        )
      )

    const pagosAntes = await db
      .select({ monto_centavos: pagosMultas.monto_centavos })
      .from(pagosMultas)
      .where(
        and(
          eq(pagosMultas.torneo_id, torneoId),
          eq(pagosMultas.equipo_id, equipoId),
          eq(pagosMultas.anulado, false),
          sql`${pagosMultas.createdAt} < ${fechaDesde}`
        )
      )

    saldoInicial = Math.round(amarillasAntes * valorAmarilla * 100 + rojasAntes * valorRoja * 100) +
      cargosAntes.reduce((acc, c) => acc + (c.monto_centavos || 0), 0) -
      pagosAntes.reduce((acc, p) => acc + (p.monto_centavos || 0), 0)
  }

  const movimientos: EstadoCuentaEquipo['movimientos'] = []

  // Tarjetas en el rango - obtener todas y filtrar por fecha en memoria
  const todasLasTarjetas = await db
    .select({
      tipo: tarjetas.tipo,
      fecha_jugada: encuentros.fecha_jugada,
      fecha_programada: encuentros.fecha_programada,
      createdAt: encuentros.createdAt,
      jornada: encuentros.jornada,
    })
    .from(tarjetas)
    .innerJoin(encuentros, eq(tarjetas.encuentro_id, encuentros.id))
    .where(
      and(
        eq(encuentros.torneo_id, torneoId),
        eq(tarjetas.equipo_id, equipoId)
      )
    )

  // Filtrar por fechas en memoria
  const tarjetasRows = todasLasTarjetas.filter(t => {
    const fecha = t.fecha_jugada || t.fecha_programada || t.createdAt
    if (!fecha) return true // Si no hay fecha, incluirlo
    const fechaObj = new Date(fecha)
    if (fechaDesde && fechaObj < fechaDesde) return false
    if (fechaHasta && fechaObj > fechaHasta) return false
    return true
  })

  for (const t of tarjetasRows) {
    movimientos.push({
      fecha: t.fecha_jugada || t.fecha_programada || t.createdAt || new Date(),
      tipo: t.tipo === 'amarilla' ? 'tarjeta_amarilla' : 'tarjeta_roja',
      descripcion: `Tarjeta ${t.tipo === 'amarilla' ? 'amarilla' : 'roja'}`,
      monto_cents: Math.round((t.tipo === 'amarilla' ? valorAmarilla : valorRoja) * 100),
      jornada: t.jornada || undefined,
    })
  }

  // Cargos manuales en el rango
  let cargosWhere = and(
    eq(cargosManuales.torneo_id, torneoId),
    eq(cargosManuales.equipo_id, equipoId)
  ) as any
  if (fechaDesde) {
    cargosWhere = and(cargosWhere, gte(cargosManuales.createdAt, fechaDesde)) as any
  }
  if (fechaHasta) {
    cargosWhere = and(cargosWhere, lte(cargosManuales.createdAt, fechaHasta)) as any
  }

  const cargosRows = await db
    .select({
      monto_centavos: cargosManuales.monto_centavos,
      descripcion: cargosManuales.descripcion,
      createdAt: cargosManuales.createdAt,
      jornada: cargosManuales.jornada_aplicacion,
    })
    .from(cargosManuales)
    .where(cargosWhere)

  for (const c of cargosRows) {
    movimientos.push({
      fecha: c.createdAt || new Date(),
      tipo: 'cargo_manual',
      descripcion: c.descripcion || 'Cargo manual',
      monto_cents: c.monto_centavos || 0,
      jornada: c.jornada || undefined,
    })
  }

  // Pagos en el rango
  let pagosWhere = and(
    eq(pagosMultas.torneo_id, torneoId),
    eq(pagosMultas.equipo_id, equipoId),
    eq(pagosMultas.anulado, false)
  ) as any
  if (fechaDesde) {
    pagosWhere = and(pagosWhere, gte(pagosMultas.createdAt, fechaDesde)) as any
  }
  if (fechaHasta) {
    pagosWhere = and(pagosWhere, lte(pagosMultas.createdAt, fechaHasta)) as any
  }

  const pagosRows = await db
    .select({
      monto_centavos: pagosMultas.monto_centavos,
      descripcion: pagosMultas.descripcion,
      referencia: pagosMultas.referencia,
      createdAt: pagosMultas.createdAt,
      jornada: pagosMultas.jornada,
    })
    .from(pagosMultas)
    .where(pagosWhere)

  for (const p of pagosRows) {
    movimientos.push({
      fecha: p.createdAt || new Date(),
      tipo: 'pago',
      descripcion: p.descripcion || `Pago${p.referencia ? ` - Ref: ${p.referencia}` : ''}`,
      monto_cents: -(p.monto_centavos || 0), // Negativo porque es egreso
      jornada: p.jornada || undefined,
    })
  }

  // Ordenar movimientos por fecha
  movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  // Calcular saldo final
  const saldoFinal = saldoInicial + movimientos.reduce((acc, m) => acc + m.monto_cents, 0)

  return {
    equipo_id: equipoId,
    equipo_nombre: equipoNombre,
    fecha_inicio: fechaDesde,
    fecha_fin: fechaHasta,
    saldo_inicial_cents: saldoInicial,
    movimientos,
    saldo_final_cents: saldoFinal,
  }
}

// Obtener todos los pagos de un torneo (con filtros)
export interface PagoItem {
  id: number
  equipo_id: number
  equipo_nombre: string
  monto_centavos: number
  descripcion: string | null
  referencia: string | null
  jornada: number | null
  anulado: boolean
  motivo_anulacion: string | null
  createdAt: Date | null
}

export async function getPagosTorneo(
  torneoId: number,
  equipoId?: number,
  fechaDesde?: Date,
  fechaHasta?: Date,
  incluirAnulados?: boolean
): Promise<PagoItem[]> {
  let where = eq(pagosMultas.torneo_id, torneoId) as any
  
  if (equipoId) {
    where = and(where, eq(pagosMultas.equipo_id, equipoId)) as any
  }
  
  if (!incluirAnulados) {
    where = and(where, eq(pagosMultas.anulado, false)) as any
  }
  
  if (fechaDesde) {
    where = and(where, gte(pagosMultas.createdAt, fechaDesde)) as any
  }
  
  if (fechaHasta) {
    where = and(where, lte(pagosMultas.createdAt, fechaHasta)) as any
  }

  const pagos = await db
    .select({
      id: pagosMultas.id,
      equipo_id: pagosMultas.equipo_id,
      monto_centavos: pagosMultas.monto_centavos,
      descripcion: pagosMultas.descripcion,
      referencia: pagosMultas.referencia,
      jornada: pagosMultas.jornada,
      anulado: pagosMultas.anulado,
      motivo_anulacion: pagosMultas.motivo_anulacion,
      createdAt: pagosMultas.createdAt,
    })
    .from(pagosMultas)
    .where(where)
    .orderBy(asc(pagosMultas.createdAt))

  // Obtener nombres de equipos
  const equipoIds = [...new Set(pagos.map(p => p.equipo_id))]
  const equiposMap = new Map<number, string>()
  
  if (equipoIds.length > 0) {
    const equiposRows = await db
      .select({ id: equipos.id, nombre: equipos.nombre })
      .from(equipos)
      .where(inArray(equipos.id, equipoIds))
    
    for (const e of equiposRows) {
      if (e.id) equiposMap.set(e.id, e.nombre || 'Equipo')
    }
  }

  return pagos.map(p => ({
    id: p.id,
    equipo_id: p.equipo_id!,
    equipo_nombre: equiposMap.get(p.equipo_id!) || 'Equipo',
    monto_centavos: p.monto_centavos || 0,
    descripcion: p.descripcion || null,
    referencia: p.referencia || null,
    jornada: p.jornada || null,
    anulado: p.anulado || false,
    motivo_anulacion: p.motivo_anulacion || null,
    createdAt: p.createdAt || null,
  }))
}

// Actualizar un pago
export async function updatePago(
  pagoId: number,
  montoUSD: number,
  descripcion?: string,
  referencia?: string,
  jornada?: number | null
) {
  if (!montoUSD || montoUSD <= 0) throw new Error('Monto inválido')
  const cents = Math.round(montoUSD * 100)
  const [row] = await db
    .update(pagosMultas)
    .set({
      monto_centavos: cents,
      descripcion: descripcion || null,
      referencia: referencia || null,
      jornada: jornada || null,
      updatedAt: new Date(),
    })
    .where(eq(pagosMultas.id, pagoId))
    .returning()
  return { success: true, pago: row }
}

// Anular un pago
export async function anularPago(pagoId: number, motivoAnulacion: string) {
  if (!motivoAnulacion || motivoAnulacion.trim() === '') {
    throw new Error('Debe proporcionar un motivo de anulación')
  }
  const [row] = await db
    .update(pagosMultas)
    .set({
      anulado: true,
      motivo_anulacion: motivoAnulacion,
      updatedAt: new Date(),
    })
    .where(eq(pagosMultas.id, pagoId))
    .returning()
  return { success: true, pago: row }
}

// Reactivar un pago anulado
export async function reactivarPago(pagoId: number) {
  const [row] = await db
    .update(pagosMultas)
    .set({
      anulado: false,
      motivo_anulacion: null,
      updatedAt: new Date(),
    })
    .where(eq(pagosMultas.id, pagoId))
    .returning()
  return { success: true, pago: row }
}

// Obtener la jornada con la fecha futura más cercana
export async function getJornadaFechaFuturaMasCercana(torneoId: number): Promise<number | null> {
  const ahora = new Date()
  ahora.setHours(0, 0, 0, 0) // Normalizar a inicio del día
  
  // Obtener todos los encuentros del torneo con jornada y fecha_programada
  const encuentrosRows = await db
    .select({
      jornada: encuentros.jornada,
      fecha_programada: encuentros.fecha_programada,
    })
    .from(encuentros)
    .where(
      and(
        eq(encuentros.torneo_id, torneoId),
        sql`${encuentros.fecha_programada} IS NOT NULL`
      )
    )
    .orderBy(asc(encuentros.fecha_programada))
  
  // Encontrar la jornada con la fecha futura más cercana
  let jornadaMasCercana: number | null = null
  let fechaMasCercana: Date | null = null
  
  for (const row of encuentrosRows) {
    if (!row.fecha_programada || !row.jornada) continue
    
    const fechaEncuentro = new Date(row.fecha_programada)
    fechaEncuentro.setHours(0, 0, 0, 0)
    
    // Si la fecha es futura o es hoy
    if (fechaEncuentro >= ahora) {
      if (!fechaMasCercana || fechaEncuentro < fechaMasCercana) {
        fechaMasCercana = fechaEncuentro
        jornadaMasCercana = row.jornada
      }
    }
  }
  
  return jornadaMasCercana
}


