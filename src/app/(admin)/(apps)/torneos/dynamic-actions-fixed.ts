'use server'

import { revalidatePath } from 'next/cache'
import { torneoQueries, equipoTorneoQueries, encuentroQueries, equiposDescansanQueries } from '@/db/queries'
import { DynamicFixtureGenerator, crearGeneradorDinamico, validarEquiposParaFixtureDinamico } from '@/lib/dynamic-fixture-generator'
import type { EquipoWithRelations, EncuentroWithRelations } from '@/db/types'
import type { DynamicFixtureOptions, DynamicFixtureResult, JornadaPropuesta } from '@/lib/dynamic-fixture-generator'

// ===== FUNCIONES DE UTILIDAD =====

/**
 * Versión mejorada de obtenerEmparejamientosFaltantes con mejor manejo de edge cases
 */
export async function obtenerEmparejamientosFaltantes(torneoId: number) {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    const encuentros = await encuentroQueries.getByTorneoId(torneoId)
    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    if (equipos.length < 2) {
      return {
        total: 0,
        jugados: 0,
        faltantes: 0,
        emparejamientosJugados: [],
        emparejamientosFaltantes: [],
        porcentajeCompletado: 100
      }
    }
    
    // Crear conjunto de emparejamientos existentes con validación mejorada
    const emparejamientosExistentes = new Set<string>()
    const equiposIds = new Set(equipos.map(e => e.id))
    
    // Filtrar encuentros válidos y crear emparejamientos únicos
    encuentros
      .filter(encuentro => 
        encuentro.equipo_local_id && 
        encuentro.equipo_visitante_id &&
        equiposIds.has(encuentro.equipo_local_id) && 
        equiposIds.has(encuentro.equipo_visitante_id) &&
        encuentro.equipo_local_id !== encuentro.equipo_visitante_id // Evitar autoconfrontaciones
      )
      .forEach(encuentro => {
        // Crear clave única para el emparejamiento (ordenada para evitar duplicados)
        const equipo1 = Math.min(encuentro.equipo_local_id, encuentro.equipo_visitante_id)
        const equipo2 = Math.max(encuentro.equipo_local_id, encuentro.equipo_visitante_id)
        const clave = `${equipo1}-${equipo2}`
        emparejamientosExistentes.add(clave)
      })

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
        const clave = `${equipo1.id}-${equipo2.id}`
        const jugado = emparejamientosExistentes.has(clave)

        emparejamientosPosibles.push({
          equipo1: { id: equipo1.id, nombre: equipo1.nombre },
          equipo2: { id: equipo2.id, nombre: equipo2.nombre },
          jugado
        })
      }
    }

    // Separar emparejamientos jugados y faltantes
    const emparejamientosJugados = emparejamientosPosibles.filter(e => e.jugado)
    const emparejamientosFaltantes = emparejamientosPosibles.filter(e => !e.jugado)

    // Validar que el cálculo sea correcto
    const totalEsperado = (equipos.length * (equipos.length - 1)) / 2
    if (emparejamientosPosibles.length !== totalEsperado) {
      console.warn(`Advertencia: Total de emparejamientos calculados (${emparejamientosPosibles.length}) no coincide con el esperado (${totalEsperado})`)
    }

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

/**
 * Función para diagnosticar problemas con emparejamientos
 */
export async function diagnosticarEmparejamientos(torneoId: number) {
  try {
    const torneo = await torneoQueries.getByIdWithRelations(torneoId)
    if (!torneo) {
      throw new Error('Torneo no encontrado')
    }

    const encuentros = await encuentroQueries.getByTorneoId(torneoId)
    const equipos = torneo.equiposTorneo?.map(et => et.equipo!).filter(e => e) || []
    
    const diagnostico = {
      torneo: {
        id: torneo.id,
        nombre: torneo.nombre,
        totalEquipos: equipos.length
      },
      encuentros: {
        total: encuentros.length,
        conIdsValidos: encuentros.filter(e => e.equipo_local_id && e.equipo_visitante_id).length,
        conIdsNulos: encuentros.filter(e => !e.equipo_local_id || !e.equipo_visitante_id).length,
        detalle: encuentros.map(e => ({
          id: e.id,
          local: e.equipo_local_id,
          visitante: e.equipo_visitante_id,
          jornada: e.jornada,
          estado: e.estado
        }))
      },
      equipos: equipos.map(e => ({
        id: e.id,
        nombre: e.nombre
      })),
      emparejamientosEsperados: (equipos.length * (equipos.length - 1)) / 2
    }

    return diagnostico
  } catch (error) {
    throw new Error(`Error al diagnosticar emparejamientos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}
