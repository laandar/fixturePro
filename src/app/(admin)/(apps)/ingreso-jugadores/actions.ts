'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { jugadores, jugadorEquipoCategoria, equipoCategoria, torneos, equiposTorneo, categorias, equipos } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { requirePermiso } from '@/lib/auth-helpers'
import { randomUUID } from 'crypto'
import { jugadorQueries, jugadorEquipoCategoriaQueries, equipoCategoriaQueries } from '@/db/queries'

export type JugadorIngreso = {
  id?: string
  cedula: string
  apellidos: string
  nombres: string
  nacionalidad: string
  sexo: 'masculino' | 'femenino' | 'otro' | null
  numero_jugador: number | null
  telefono: string | null
  provincia: string | null
  direccion: string | null
}

// Obtener todos los jugadores para la tabla con filtros opcionales
// Hace JOIN con jugador_equipo_categoria y equipo_categoria para obtener el numero_jugador correcto
export async function getJugadoresIngreso(equipoId?: number, torneoId?: number) {
  await requirePermiso('ingreso-jugadores', 'ver')
  
  try {
    let resultados: Array<{
      jugador: typeof jugadores.$inferSelect
      numero_jugador: number | null
    }> = []
    
    // Si hay filtros, obtener jugadores filtrados por equipo y/o torneo
    if (equipoId || torneoId) {
      let categoriaId: number | null = null
      let equipoIdsParaFiltrar: number[] = []
      
      // Si hay torneo, obtener su categoría
      if (torneoId) {
        const torneo = await db
          .select({ categoria_id: torneos.categoria_id })
          .from(torneos)
          .where(eq(torneos.id, torneoId))
          .limit(1)
        
        if (torneo.length === 0 || !torneo[0].categoria_id) {
          return []
        }
        
        categoriaId = torneo[0].categoria_id
        
        // Si no hay equipoId específico, obtener todos los equipos del torneo
        if (!equipoId) {
          const equiposEnTorneo = await db
            .select({ equipo_id: equiposTorneo.equipo_id })
            .from(equiposTorneo)
            .where(eq(equiposTorneo.torneo_id, torneoId))
          
          equipoIdsParaFiltrar = equiposEnTorneo.map(et => et.equipo_id)
          
          if (equipoIdsParaFiltrar.length === 0) {
            return []
          }
        } else {
          equipoIdsParaFiltrar = [equipoId]
        }
      } else if (equipoId) {
        // Solo filtro por equipo, sin torneo (no hay categoriaId)
        equipoIdsParaFiltrar = [equipoId]
      }
      
      // Construir condiciones WHERE
      const condicionesWhere = []
      
      if (equipoIdsParaFiltrar.length === 1) {
        condicionesWhere.push(eq(equipoCategoria.equipo_id, equipoIdsParaFiltrar[0]))
      } else {
        condicionesWhere.push(inArray(equipoCategoria.equipo_id, equipoIdsParaFiltrar))
      }
      
      if (categoriaId) {
        condicionesWhere.push(eq(equipoCategoria.categoria_id, categoriaId))
      }
      
      // Hacer JOIN entre jugadores, jugador_equipo_categoria y equipo_categoria
      // Filtrar directamente por equipo_id y categoria_id
      // Usar cédula para el JOIN (jugador_id en jugador_equipo_categoria contiene la cédula)
      // Solo mostrar jugadores activos (estado = true)
      resultados = await db
        .select({
          jugador: jugadores,
          numero_jugador: jugadorEquipoCategoria.numero_jugador,
        })
        .from(jugadores)
        .innerJoin(
          jugadorEquipoCategoria,
          eq(jugadores.cedula, jugadorEquipoCategoria.jugador_id) // JOIN por cédula
        )
        .innerJoin(
          equipoCategoria,
          eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoria.id)
        )
        .where(
          and(
            eq(jugadores.estado, true), // Solo jugadores activos
            ...condicionesWhere
          )
        )
        .orderBy(jugadores.apellido_nombre)
    } else {
      // Sin filtros, no mostrar jugadores (requiere seleccionar equipo y/o torneo)
      resultados = []
    }
    
    // Separar apellido_nombre en apellidos y nombres
    return resultados.map(({ jugador, numero_jugador }) => {
      const partes = jugador.apellido_nombre.split(' ').filter(p => p.trim())
      const apellidos = partes.length > 1 ? partes.slice(0, -1).join(' ') : partes[0] || ''
      const nombres = partes.length > 1 ? partes[partes.length - 1] : ''
      
      return {
        id: jugador.id,
        cedula: jugador.cedula,
        apellidos,
        nombres,
        nacionalidad: jugador.nacionalidad,
        sexo: jugador.sexo as 'masculino' | 'femenino' | 'otro' | null,
        numero_jugador: numero_jugador, // Usar el numero_jugador de jugador_equipo_categoria
        telefono: jugador.telefono,
        provincia: jugador.provincia,
        direccion: jugador.direccion,
      }
    })
  } catch (error) {
    console.error('Error al obtener jugadores:', error)
    throw new Error('Error al obtener jugadores')
  }
}

// Obtener equipos disponibles
export async function getEquiposParaFiltro() {
  await requirePermiso('ingreso-jugadores', 'ver')
  
  try {
    const equipos = await db.query.equipos.findMany({
      where: (equipos, { eq }) => eq(equipos.estado, true),
      orderBy: (equipos, { asc }) => [asc(equipos.nombre)],
    })
    return equipos
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    throw new Error('Error al obtener equipos')
  }
}

// Obtener torneos activos disponibles
export async function getTorneosActivosParaFiltro() {
  await requirePermiso('ingreso-jugadores', 'ver')
  
  try {
    const torneosActivos = await db.query.torneos.findMany({
      where: (torneos, { inArray }) => inArray(torneos.estado, ['planificado', 'en_curso']),
      with: {
        categoria: true,
      },
      orderBy: (torneos, { asc }) => [asc(torneos.fecha_inicio), asc(torneos.nombre)],
    })
    return torneosActivos
  } catch (error) {
    console.error('Error al obtener torneos activos:', error)
    throw new Error('Error al obtener torneos activos')
  }
}

// Detectar jugadores en múltiples categorías o equipos
export async function detectarJugadoresMultiplesCategoriasEquipos(cedulas: string[]) {
  await requirePermiso('ingreso-jugadores', 'ver')
  
  try {
    if (cedulas.length === 0) {
      return {
        jugadoresMultiplesCategorias: [],
        jugadoresMultiplesEquipos: []
      }
    }

    // Obtener todas las relaciones de los jugadores
    const relaciones = await db
      .select({
        jugador_id: jugadorEquipoCategoria.jugador_id,
        equipo_id: equipoCategoria.equipo_id,
        categoria_id: equipoCategoria.categoria_id,
      })
      .from(jugadorEquipoCategoria)
      .innerJoin(equipoCategoria, eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoria.id))
      .where(inArray(jugadorEquipoCategoria.jugador_id, cedulas))

    // Obtener nombres de equipos y categorías
    const equiposMap = new Map<number, string>()
    const categoriasMap = new Map<number, string>()
    
    const equiposIds = [...new Set(relaciones.map(r => r.equipo_id))]
    const categoriasIds = [...new Set(relaciones.map(r => r.categoria_id))]

    if (equiposIds.length > 0) {
      const equipos = await db.query.equipos.findMany({
        where: (equipos, { inArray }) => inArray(equipos.id, equiposIds)
      })
      equipos.forEach(e => equiposMap.set(e.id, e.nombre))
    }

    if (categoriasIds.length > 0) {
      const categorias = await db.query.categorias.findMany({
        where: (categorias, { inArray }) => inArray(categorias.id, categoriasIds)
      })
      categorias.forEach(c => categoriasMap.set(c.id, c.nombre))
    }

    // Agrupar por jugador (cédula)
    const jugadoresMap = new Map<string, {
      equipos: Set<number>
      categorias: Set<number>
    }>()

    relaciones.forEach(rel => {
      if (!jugadoresMap.has(rel.jugador_id)) {
        jugadoresMap.set(rel.jugador_id, {
          equipos: new Set(),
          categorias: new Set(),
        })
      }
      const jugador = jugadoresMap.get(rel.jugador_id)!
      jugador.equipos.add(rel.equipo_id)
      jugador.categorias.add(rel.categoria_id)
    })

    // Obtener información completa de los jugadores
    const jugadoresInfo = await db
      .select({
        cedula: jugadores.cedula,
        apellido_nombre: jugadores.apellido_nombre,
      })
      .from(jugadores)
      .where(inArray(jugadores.cedula, cedulas))

    const jugadoresInfoMap = new Map(jugadoresInfo.map(j => [j.cedula, j.apellido_nombre]))

    // Identificar jugadores con múltiples categorías
    const jugadoresMultiplesCategorias: Array<{
      cedula: string
      nombre: string
      categorias: string[]
    }> = []

    // Identificar jugadores con múltiples equipos
    const jugadoresMultiplesEquipos: Array<{
      cedula: string
      nombre: string
      equipos: string[]
    }> = []

    jugadoresMap.forEach((data, cedula) => {
      const nombre = jugadoresInfoMap.get(cedula) || cedula
      
      const equiposNombres = Array.from(data.equipos).map(eqId => equiposMap.get(eqId) || `Equipo ${eqId}`)
      const categoriasNombres = Array.from(data.categorias).map(catId => categoriasMap.get(catId) || `Categoría ${catId}`)

      if (data.categorias.size > 1) {
        jugadoresMultiplesCategorias.push({
          cedula,
          nombre,
          categorias: categoriasNombres
        })
      }

      if (data.equipos.size > 1) {
        jugadoresMultiplesEquipos.push({
          cedula,
          nombre,
          equipos: equiposNombres
        })
      }
    })

    return {
      jugadoresMultiplesCategorias,
      jugadoresMultiplesEquipos
    }
  } catch (error) {
    console.error('Error al detectar jugadores con múltiples categorías/equipos:', error)
    throw new Error('Error al detectar jugadores con múltiples categorías/equipos')
  }
}

// Buscar jugador por cédula
export async function buscarJugadorPorCedula(cedula: string): Promise<JugadorIngreso | null> {
  await requirePermiso('ingreso-jugadores', 'ver')
  
  try {
    if (!cedula || cedula.trim() === '') {
      return null
    }

    const jugador = await jugadorQueries.getByCedula(cedula.trim())
    
    if (!jugador) {
      return null
    }

    // Separar apellido_nombre en apellidos y nombres
    const partes = jugador.apellido_nombre.split(' ').filter(p => p.trim())
    const apellidos = partes.length > 1 ? partes.slice(0, -1).join(' ') : partes[0] || ''
    const nombres = partes.length > 1 ? partes[partes.length - 1] : ''

    return {
      id: jugador.id,
      cedula: jugador.cedula,
      apellidos,
      nombres,
      nacionalidad: jugador.nacionalidad,
      sexo: jugador.sexo as 'masculino' | 'femenino' | 'otro' | null,
      numero_jugador: null, // El número de jugador ahora está en jugador_equipo_categoria
      telefono: jugador.telefono,
      provincia: jugador.provincia,
      direccion: jugador.direccion,
    }
  } catch (error) {
    console.error('Error al buscar jugador por cédula:', error)
    return null
  }
}

// Función auxiliar para obtener o crear equipo_categoria_id
async function obtenerOcrearEquipoCategoria(equipoId: number, categoriaId: number): Promise<number> {
  // Buscar si ya existe la relación equipo-categoría
  const equipoCategoriaExistente = await db
    .select({ id: equipoCategoria.id })
    .from(equipoCategoria)
    .where(
      and(
        eq(equipoCategoria.equipo_id, equipoId),
        eq(equipoCategoria.categoria_id, categoriaId)
      )
    )
    .limit(1)

  if (equipoCategoriaExistente.length > 0) {
    return equipoCategoriaExistente[0].id
  }

  // Si no existe, crearla
  const [nuevoEquipoCategoria] = await db
    .insert(equipoCategoria)
    .values({
      equipo_id: equipoId,
      categoria_id: categoriaId,
    })
    .returning()

  return nuevoEquipoCategoria.id
}

// Crear un nuevo jugador
// Si el jugador no existe, lo crea en jugadores Y en jugador_equipo_categoria
export async function createJugadorIngreso(
  data: JugadorIngreso,
  equipoId?: number,
  torneoId?: number
) {
  await requirePermiso('ingreso-jugadores', 'crear')
  
  try {
    // Validar campos requeridos
    if (!data.cedula || !data.apellidos || !data.nombres || !data.nacionalidad) {
      throw new Error('Cédula, apellidos, nombres y nacionalidad son campos obligatorios')
    }

    // Validar que se proporcionen equipoId y torneoId para crear la relación
    if (!equipoId || !torneoId) {
      throw new Error('Debe seleccionar un equipo y un torneo para crear el jugador')
    }

    // Verificar si el jugador ya existe por cédula
    const jugadorExistente = await db
      .select()
      .from(jugadores)
      .where(eq(jugadores.cedula, data.cedula))
      .limit(1)
    
    let jugadorId: string
    const cedulaJugador = data.cedula // Usar la cédula para jugador_equipo_categoria

    if (jugadorExistente.length > 0) {
      // Si el jugador ya existe, usar su ID y actualizar teléfono y dirección si se proporcionan
      jugadorId = jugadorExistente[0].id
      
      // Actualizar teléfono y dirección si se proporcionan valores
      if (data.telefono !== undefined || data.direccion !== undefined) {
        await db
          .update(jugadores)
          .set({
            telefono: data.telefono !== undefined ? data.telefono : jugadorExistente[0].telefono,
            direccion: data.direccion !== undefined ? data.direccion : jugadorExistente[0].direccion,
          })
          .where(eq(jugadores.id, jugadorId))
      }
    } else {
      // Si el jugador NO existe, crearlo en la tabla jugadores
      const apellido_nombre = `${data.apellidos} ${data.nombres}`.trim()
      const id = randomUUID()

      const [nuevoJugador] = await db
        .insert(jugadores)
        .values({
          id,
          cedula: data.cedula,
          apellido_nombre,
          nacionalidad: data.nacionalidad,
          liga: 'N/A', // Valor por defecto, se puede cambiar después
          sexo: data.sexo,
          telefono: data.telefono,
          provincia: data.provincia,
          direccion: data.direccion,
          estado: true,
        })
        .returning()

      jugadorId = nuevoJugador.id
    }

    // SIEMPRE crear/actualizar la relación en jugador_equipo_categoria
    // 1. Obtener la categoría del torneo
    const torneo = await db
      .select({ categoria_id: torneos.categoria_id })
      .from(torneos)
      .where(eq(torneos.id, torneoId))
      .limit(1)

    if (torneo.length === 0) {
      throw new Error('Torneo no encontrado')
    }

    if (!torneo[0].categoria_id) {
      throw new Error('El torneo seleccionado no tiene una categoría asignada')
    }

    const categoriaId = torneo[0].categoria_id

    // 2. Buscar o crear equipo_categoria_id por equipo_id y categoria_id
    const equipoCategoriaEncontrado = await db
      .select({ id: equipoCategoria.id })
      .from(equipoCategoria)
      .where(
        and(
          eq(equipoCategoria.equipo_id, equipoId),
          eq(equipoCategoria.categoria_id, categoriaId)
        )
      )
      .limit(1)

    let equipoCategoriaId: number

    if (equipoCategoriaEncontrado.length > 0) {
      // Si existe, usar el ID encontrado
      equipoCategoriaId = equipoCategoriaEncontrado[0].id
    } else {
      // Si no existe, crearlo
      const [nuevoEquipoCategoria] = await db
        .insert(equipoCategoria)
        .values({
          equipo_id: equipoId,
          categoria_id: categoriaId,
        })
        .returning()
      
      if (!nuevoEquipoCategoria) {
        throw new Error('Error al crear la relación equipo-categoría')
      }
      
      equipoCategoriaId = nuevoEquipoCategoria.id
    }

    // 3. Verificar si ya existe la relación jugador_equipo_categoria (usando cédula)
    const relacionExistente = await db
      .select()
      .from(jugadorEquipoCategoria)
      .where(
        and(
          eq(jugadorEquipoCategoria.jugador_id, cedulaJugador), // Usar cédula en lugar de ID
          eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaId)
        )
      )
      .limit(1)

    if (relacionExistente.length === 0) {
      // Crear nueva relación en jugador_equipo_categoria con el numero_jugador (usando cédula)
      const resultado = await db.insert(jugadorEquipoCategoria).values({
        jugador_id: cedulaJugador, // Guardar la cédula en lugar del ID
        equipo_categoria_id: equipoCategoriaId,
        numero_jugador: data.numero_jugador ?? null
      }).returning()
      
      if (!resultado || resultado.length === 0) {
        throw new Error('Error al crear la relación jugador-equipo-categoría')
      }
    } else {
      // Actualizar el numero_jugador si ya existe la relación
      await db
        .update(jugadorEquipoCategoria)
        .set({ numero_jugador: data.numero_jugador ?? null })
        .where(
          and(
            eq(jugadorEquipoCategoria.jugador_id, cedulaJugador), // Usar cédula en lugar de ID
            eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaId)
          )
        )
    }

    // Obtener el jugador (creado o existente) para retornarlo
    const jugadorFinal = await db
      .select()
      .from(jugadores)
      .where(eq(jugadores.id, jugadorId))
      .limit(1)

    revalidatePath('/ingreso-jugadores')
    return { success: true, jugador: jugadorFinal[0] }
  } catch (error) {
    console.error('Error al crear jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear jugador')
  }
}

// Actualizar relación en jugador_equipo_categoria (NO actualiza la tabla jugadores)
export async function updateJugadorIngreso(
  id: string,
  data: Partial<JugadorIngreso>,
  equipoId?: number,
  torneoId?: number
) {
  await requirePermiso('ingreso-jugadores', 'editar')
  
  try {
    // Verificar que el jugador existe
    const jugadorExistente = await db
      .select()
      .from(jugadores)
      .where(eq(jugadores.id, id))
      .limit(1)
    
    if (jugadorExistente.length === 0) {
      throw new Error('Jugador no encontrado')
    }

    // Obtener la cédula del jugador para usar en jugador_equipo_categoria
    const cedulaJugador = jugadorExistente[0].cedula

    // Actualizar teléfono y dirección en la tabla jugadores si se proporcionan
    if (data.telefono !== undefined || data.direccion !== undefined) {
      const updateData: any = {}
      if (data.telefono !== undefined) {
        updateData.telefono = data.telefono
      }
      if (data.direccion !== undefined) {
        updateData.direccion = data.direccion
      }
      
      await db
        .update(jugadores)
        .set(updateData)
        .where(eq(jugadores.id, id))
    }

    // Actualizar jugador_equipo_categoria
    // Si se proporcionaron equipoId y torneoId, guardar en jugador_equipo_categoria
    if (equipoId && torneoId) {
      // 1. Obtener la categoría del torneo
      const torneo = await db
        .select({ categoria_id: torneos.categoria_id })
        .from(torneos)
        .where(eq(torneos.id, torneoId))
        .limit(1)

      if (torneo.length === 0 || !torneo[0].categoria_id) {
        throw new Error('El torneo seleccionado no tiene una categoría asignada')
      }

      const categoriaId = torneo[0].categoria_id

      // 2. Buscar equipo_categoria_id por equipo_id y categoria_id
      const equipoCategoriaEncontrado = await db
        .select({ id: equipoCategoria.id })
        .from(equipoCategoria)
        .where(
          and(
            eq(equipoCategoria.equipo_id, equipoId),
            eq(equipoCategoria.categoria_id, categoriaId)
          )
        )
        .limit(1)

      let equipoCategoriaId: number

      if (equipoCategoriaEncontrado.length > 0) {
        // Si existe, usar el ID encontrado
        equipoCategoriaId = equipoCategoriaEncontrado[0].id
      } else {
        // Si no existe, crearlo
        const [nuevoEquipoCategoria] = await db
          .insert(equipoCategoria)
          .values({
            equipo_id: equipoId,
            categoria_id: categoriaId,
          })
          .returning()
        equipoCategoriaId = nuevoEquipoCategoria.id
      }

      // 3. Verificar si ya existe la relación jugador_equipo_categoria (usando cédula)
      const relacionExistente = await db
        .select()
        .from(jugadorEquipoCategoria)
        .where(
          and(
            eq(jugadorEquipoCategoria.jugador_id, cedulaJugador), // Usar cédula en lugar de ID
            eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaId)
          )
        )
        .limit(1)

      if (relacionExistente.length === 0) {
        // Crear nueva relación en jugador_equipo_categoria con el numero_jugador (usando cédula)
        await db.insert(jugadorEquipoCategoria).values({
          jugador_id: cedulaJugador, // Guardar la cédula en lugar del ID
          equipo_categoria_id: equipoCategoriaId,
          numero_jugador: data.numero_jugador ?? null
        })
      } else {
        // Actualizar el numero_jugador si ya existe la relación
        await db
          .update(jugadorEquipoCategoria)
          .set({ numero_jugador: data.numero_jugador ?? null })
          .where(
            and(
              eq(jugadorEquipoCategoria.jugador_id, cedulaJugador), // Usar cédula en lugar de ID
              eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaId)
            )
          )
      }
    }
    // Nota: NO se actualiza la tabla jugadores, solo jugador_equipo_categoria

    revalidatePath('/ingreso-jugadores')
    return { success: true }
  } catch (error) {
    console.error('Error al actualizar jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar jugador')
  }
}

// Eliminar relación jugador-equipo-categoría (NO modifica la tabla jugadores)
export async function deleteJugadorIngreso(id: string, equipoId?: number, torneoId?: number) {
  await requirePermiso('ingreso-jugadores', 'eliminar')
  
  try {
    // Verificar que el jugador existe
    const jugadorExistente = await db
      .select()
      .from(jugadores)
      .where(eq(jugadores.id, id))
      .limit(1)
    
    if (jugadorExistente.length === 0) {
      throw new Error('Jugador no encontrado')
    }

    // Obtener la cédula del jugador
    const cedulaJugador = jugadorExistente[0].cedula

    // Si no hay equipoId o torneoId, no se puede eliminar la relación específica
    if (!equipoId || !torneoId) {
      throw new Error('Debe seleccionar un equipo y un torneo para eliminar la relación del jugador')
    }

    // 1. Obtener la categoría del torneo
    const torneo = await db
      .select({ categoria_id: torneos.categoria_id })
      .from(torneos)
      .where(eq(torneos.id, torneoId))
      .limit(1)

    if (torneo.length === 0 || !torneo[0].categoria_id) {
      throw new Error('El torneo seleccionado no tiene una categoría asignada')
    }

    const categoriaId = torneo[0].categoria_id

    // 2. Buscar equipo_categoria_id por equipo_id y categoria_id
    const equipoCategoriaEncontrado = await db
      .select({ id: equipoCategoria.id })
      .from(equipoCategoria)
      .where(
        and(
          eq(equipoCategoria.equipo_id, equipoId),
          eq(equipoCategoria.categoria_id, categoriaId)
        )
      )
      .limit(1)

    if (equipoCategoriaEncontrado.length === 0) {
      throw new Error('No se encontró la relación equipo-categoría')
    }

    const equipoCategoriaId = equipoCategoriaEncontrado[0].id

    // 3. Eliminar solo el registro de jugador_equipo_categoria
    await db
      .delete(jugadorEquipoCategoria)
      .where(
        and(
          eq(jugadorEquipoCategoria.jugador_id, cedulaJugador),
          eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoriaId)
        )
      )

    // NOTA: NO se modifica la tabla jugadores, solo se elimina la relación

    revalidatePath('/ingreso-jugadores')
    return { success: true }
    
  } catch (error) {
    console.error('Error al eliminar jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar jugador')
  }
}

// Guardar múltiples jugadores (para importación masiva)
export async function saveMultipleJugadoresIngreso(jugadoresData: JugadorIngreso[]) {
  await requirePermiso('ingreso-jugadores', 'crear')
  
  try {
    const resultados = []
    const errores = []

    for (const data of jugadoresData) {
      try {
        // Validar campos requeridos
        if (!data.cedula || !data.apellidos || !data.nombres || !data.nacionalidad) {
          errores.push({
            cedula: data.cedula || 'N/A',
            error: 'Cédula, apellidos, nombres y nacionalidad son campos obligatorios'
          })
          continue
        }

        // Verificar si la cédula ya existe
        const jugadorExistente = await db
          .select()
          .from(jugadores)
          .where(eq(jugadores.cedula, data.cedula))
          .limit(1)
        
        if (jugadorExistente.length > 0) {
          errores.push({
            cedula: data.cedula,
            error: `Ya existe un jugador con la cédula ${data.cedula}`
          })
          continue
        }

        // Combinar apellidos y nombres
        const apellido_nombre = `${data.apellidos} ${data.nombres}`.trim()

        // Generar ID único
        const id = randomUUID()

        // Insertar jugador
        const [nuevoJugador] = await db
          .insert(jugadores)
          .values({
            id,
            cedula: data.cedula,
            apellido_nombre,
            nacionalidad: data.nacionalidad,
            liga: 'N/A',
            sexo: data.sexo,
            telefono: data.telefono,
            provincia: data.provincia,
            direccion: data.direccion,
            estado: true,
          })
          .returning()

        resultados.push(nuevoJugador)
      } catch (error) {
        errores.push({
          cedula: data.cedula || 'N/A',
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    revalidatePath('/ingreso-jugadores')
    return {
      success: true,
      creados: resultados.length,
      errores: errores.length,
      detalles: errores
    }
  } catch (error) {
    console.error('Error al guardar múltiples jugadores:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al guardar múltiples jugadores')
  }
}

