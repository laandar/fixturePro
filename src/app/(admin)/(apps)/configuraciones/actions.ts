'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { configuraciones } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { NewConfiguracion } from '@/db/types'

// ===== CONFIGURACIONES =====

export async function getConfiguraciones() {
  try {
    return await db.query.configuraciones.findMany({
      orderBy: (configuraciones, { asc }) => [asc(configuraciones.categoria), asc(configuraciones.clave)],
    })
  } catch (error) {
    console.error('Error al obtener configuraciones:', error)
    throw new Error('Error al obtener configuraciones')
  }
}

export async function getConfiguracionesPorCategoria(categoria: string) {
  try {
    return await db.query.configuraciones.findMany({
      where: eq(configuraciones.categoria, categoria),
      orderBy: (configuraciones, { asc }) => [asc(configuraciones.clave)],
    })
  } catch (error) {
    console.error('Error al obtener configuraciones por categoría:', error)
    throw new Error('Error al obtener configuraciones por categoría')
  }
}

export async function getConfiguracionPorClave(clave: string) {
  try {
    const config = await db.query.configuraciones.findFirst({
      where: eq(configuraciones.clave, clave),
    })
    return config
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    throw new Error('Error al obtener configuración')
  }
}

export async function createConfiguracion(data: NewConfiguracion) {
  try {
    if (!data.clave || !data.valor || !data.tipo || !data.categoria) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    // Verificar si la clave ya existe
    const existente = await getConfiguracionPorClave(data.clave)
    if (existente) {
      throw new Error('Ya existe una configuración con esta clave')
    }

    const nuevaConfig = await db.insert(configuraciones).values(data).returning()
    revalidatePath('/configuraciones')
    return nuevaConfig[0]
  } catch (error) {
    console.error('Error al crear configuración:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear configuración')
  }
}

export async function updateConfiguracion(id: number, data: Partial<NewConfiguracion>) {
  try {
    const configActualizada = await db.update(configuraciones)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(configuraciones.id, id))
      .returning()
    
    if (configActualizada.length === 0) {
      throw new Error('Configuración no encontrada')
    }
    
    revalidatePath('/configuraciones')
    return configActualizada[0]
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar configuración')
  }
}

export async function updateConfiguracionPorClave(clave: string, valor: string) {
  try {
    const config = await getConfiguracionPorClave(clave)
    if (!config) {
      throw new Error('Configuración no encontrada')
    }
    
    return await updateConfiguracion(config.id, { valor })
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar configuración')
  }
}

export async function deleteConfiguracion(id: number) {
  try {
    if (isNaN(id) || id <= 0) {
      throw new Error('ID de configuración inválido')
    }
    
    await db.delete(configuraciones).where(eq(configuraciones.id, id))
    revalidatePath('/configuraciones')
  } catch (error) {
    console.error('Error al eliminar configuración:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar configuración')
  }
}

// ===== FUNCIONES DE UTILIDAD =====

// Agregar configuraciones faltantes
export async function agregarConfiguracionesFaltantes() {
  try {
    const configsExistentes = await getConfiguraciones()
    const clavesExistentes = new Set(configsExistentes.map(c => c.clave))

    // Configuraciones completas (todas las que deberían existir)
    const todasLasConfigs: NewConfiguracion[] = [
      // Sanciones
      {
        clave: 'partidos_sancion_roja',
        valor: '1',
        tipo: 'number',
        categoria: 'sanciones',
        descripcion: 'Número de partidos de sanción por tarjeta roja directa',
      },
      {
        clave: 'partidos_sancion_doble_amarilla',
        valor: '1',
        tipo: 'number',
        categoria: 'sanciones',
        descripcion: 'Número de partidos de sanción por doble amarilla',
      },
      {
        clave: 'partidos_sancion_roja_agresion',
        valor: '3',
        tipo: 'number',
        categoria: 'sanciones',
        descripcion: 'Número de partidos de sanción por roja con agresión',
      },
      // Valores económicos
      {
        clave: 'valor_tarjeta_amarilla',
        valor: '5.00',
        tipo: 'number',
        categoria: 'valores_economicos',
        descripcion: 'Valor económico de multa por tarjeta amarilla (en dólares)',
      },
      {
        clave: 'valor_tarjeta_roja',
        valor: '10.00',
        tipo: 'number',
        categoria: 'valores_economicos',
        descripcion: 'Valor económico de multa por tarjeta roja (en dólares)',
      },
      {
        clave: 'valor_tarjeta_doble_amarilla',
        valor: '15.00',
        tipo: 'number',
        categoria: 'valores_economicos',
        descripcion: 'Valor económico de multa por doble amarilla (en dólares)',
      },
      // Sistema de puntos
      {
        clave: 'puntos_por_victoria',
        valor: '3',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados por partido ganado',
      },
      {
        clave: 'puntos_por_empate',
        valor: '1',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados por partido empatado',
      },
      {
        clave: 'puntos_por_derrota',
        valor: '0',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados por partido perdido',
      },
      {
        clave: 'puntos_por_victoria_resolucion',
        valor: '3',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados por partido ganado por resolución administrativa',
      },
      {
        clave: 'puntos_por_wo',
        valor: '3',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados al equipo que gana por WO (walkover)',
      },
      {
        clave: 'puntos_penalizacion_wo',
        valor: '-1',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos de penalización al equipo que pierde por WO',
      },
      {
        clave: 'goles_por_wo',
        valor: '3',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Cantidad de goles asignados al equipo que gana por WO',
      },
      {
        clave: 'goles_contra_por_wo',
        valor: '0',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Cantidad de goles en contra asignados al equipo que gana por WO',
      },
    ]

    // Agregar solo las que faltan
    for (const config of todasLasConfigs) {
      if (!clavesExistentes.has(config.clave)) {
        await db.insert(configuraciones).values(config)
      }
    }

    revalidatePath('/configuraciones')
  } catch (error) {
    console.error('Error al agregar configuraciones faltantes:', error)
    throw new Error('Error al agregar configuraciones faltantes')
  }
}

// Inicializar configuraciones por defecto si no existen
export async function inicializarConfiguracionesPorDefecto() {
  try {
    const configs = await getConfiguraciones()
    
    // Si ya hay configuraciones, agregar solo las faltantes
    if (configs.length > 0) {
      await agregarConfiguracionesFaltantes()
      return
    }

    // Configuraciones por defecto
    const configsPorDefecto: NewConfiguracion[] = [
      // Sanciones
      {
        clave: 'partidos_sancion_roja',
        valor: '1',
        tipo: 'number',
        categoria: 'sanciones',
        descripcion: 'Número de partidos de sanción por tarjeta roja directa',
      },
      {
        clave: 'partidos_sancion_doble_amarilla',
        valor: '1',
        tipo: 'number',
        categoria: 'sanciones',
        descripcion: 'Número de partidos de sanción por doble amarilla',
      },
      {
        clave: 'partidos_sancion_roja_agresion',
        valor: '3',
        tipo: 'number',
        categoria: 'sanciones',
        descripcion: 'Número de partidos de sanción por roja con agresión',
      },
      // Valores económicos
      {
        clave: 'valor_tarjeta_amarilla',
        valor: '5.00',
        tipo: 'number',
        categoria: 'valores_economicos',
        descripcion: 'Valor económico de multa por tarjeta amarilla (en dólares)',
      },
      {
        clave: 'valor_tarjeta_roja',
        valor: '10.00',
        tipo: 'number',
        categoria: 'valores_economicos',
        descripcion: 'Valor económico de multa por tarjeta roja (en dólares)',
      },
      {
        clave: 'valor_tarjeta_doble_amarilla',
        valor: '15.00',
        tipo: 'number',
        categoria: 'valores_economicos',
        descripcion: 'Valor económico de multa por doble amarilla (en dólares)',
      },
      // Sistema de puntos
      {
        clave: 'puntos_por_victoria',
        valor: '3',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados por partido ganado',
      },
      {
        clave: 'puntos_por_empate',
        valor: '1',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados por partido empatado',
      },
      {
        clave: 'puntos_por_derrota',
        valor: '0',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados por partido perdido',
      },
      {
        clave: 'puntos_por_victoria_resolucion',
        valor: '3',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados por partido ganado por resolución administrativa',
      },
      {
        clave: 'puntos_por_wo',
        valor: '3',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos otorgados al equipo que gana por WO (walkover)',
      },
      {
        clave: 'puntos_penalizacion_wo',
        valor: '-1',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Puntos de penalización al equipo que pierde por WO',
      },
      {
        clave: 'goles_por_wo',
        valor: '3',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Cantidad de goles asignados al equipo que gana por WO',
      },
      {
        clave: 'goles_contra_por_wo',
        valor: '0',
        tipo: 'number',
        categoria: 'puntos',
        descripcion: 'Cantidad de goles en contra asignados al equipo que gana por WO',
      },
    ]

    for (const config of configsPorDefecto) {
      await db.insert(configuraciones).values(config)
    }

    revalidatePath('/configuraciones')
  } catch (error) {
    console.error('Error al inicializar configuraciones:', error)
    throw new Error('Error al inicializar configuraciones')
  }
}

