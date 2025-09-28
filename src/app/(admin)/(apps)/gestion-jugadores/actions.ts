'use server'

import { db } from '@/db'
import { goles, encuentros, tarjetas, jugadoresParticipantes } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { NewGol, Gol, NewTarjeta, Tarjeta, NewJugadorParticipante, JugadorParticipante } from '@/db/types'

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
        minuto: tarjetas.minuto,
        tiempo: tarjetas.tiempo,
        tipo: tarjetas.tipo,
        motivo: tarjetas.motivo,
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
    console.log('getJugadoresParticipantes - Buscando para encuentro:', encuentroId)
    
    const jugadores = await db
      .select()
      .from(jugadoresParticipantes)
      .where(eq(jugadoresParticipantes.encuentro_id, encuentroId))
    
    console.log('Jugadores participantes encontrados:', jugadores)
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

// Eliminar un jugador participante
export async function deleteJugadorParticipante(participanteId: number) {
  try {
    await db.delete(jugadoresParticipantes).where(eq(jugadoresParticipantes.id, participanteId))
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar jugador participante:', error)
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
