'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { equipoQueries, categoriaQueries, entrenadorQueries, equipoCategoriaQueries } from '@/db/queries'
import type { NewEquipo, NewCategoria, NewEntrenador } from '@/db/types'
import { requirePermiso } from '@/lib/auth-helpers'

// ===== EQUIPOS =====

export async function getEquipos() {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    const equipos = await equipoQueries.getAllWithRelations()
    //console.log("Equipos con relaciones:", equipos)
    return equipos
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    throw new Error('Error al obtener equipos')
  }
}

export async function getEquiposCount() {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    return await equipoQueries.getCount()
  } catch (error) {
    console.error('Error al obtener contador de equipos:', error)
    throw new Error('Error al obtener contador de equipos')
  }
}

export async function getEquiposByCategoria(categoriaId: number) {
  try {
    const equipos = await equipoQueries.getByCategoriaWithRelations(categoriaId)
    return equipos
  } catch (error) {
    console.error('Error al obtener equipos por categoría:', error)
    throw new Error('Error al obtener equipos por categoría')
  }
}

export async function getEquipoById(id: number) {
  try {
    return await equipoQueries.getById(id)
  } catch (error) {
    console.error('Error al obtener equipo:', error)
    throw new Error('Error al obtener equipo')
  }
}

export async function getEquipoByIdWithRelations(id: number) {
  try {
    return await equipoQueries.getByIdWithRelations(id)
  } catch (error) {
    console.error('Error al obtener equipo con relaciones:', error)
    throw new Error('Error al obtener equipo con relaciones')
  }
}

export async function createEquipo(formData: FormData) {
  // 🔐 Verificar permiso de crear
  await requirePermiso('equipos', 'crear')
  
  try {
    const nombre = formData.get('nombre') as string
    const categoria_ids = formData.getAll('categoria_ids') as string[]
    const entrenador_id = parseInt(formData.get('entrenador_id') as string)
    const imagen_equipo = formData.get('imagen_equipo') as string
    const estado = formData.get('estado') === 'true'

    console.log('Datos recibidos en createEquipo:', {
      nombre,
      categoria_ids,
      entrenador_id,
      imagen_equipo,
      estado
    })

    if (!nombre || !entrenador_id) {
      throw new Error('Nombre y entrenador son obligatorios')
    }

    if (categoria_ids.length === 0) {
      throw new Error('Debe seleccionar al menos una categoría')
    }

    const equipoData: NewEquipo = {
      nombre,
      entrenador_id,
      imagen_equipo: imagen_equipo || null,
      estado,
    }

    // Convertir string IDs a números y eliminar duplicados
    const categoriaIds = [...new Set(categoria_ids.map(id => parseInt(id)))]

    // Crear equipo con múltiples categorías
    await equipoCategoriaQueries.crearEquipoConCategorias(equipoData, categoriaIds)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al crear equipo:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear equipo')
  }
}

export async function updateEquipo(id: number, formData: FormData) {
  // 🔐 Verificar permiso de editar
  await requirePermiso('equipos', 'editar')
  
  try {
    const nombre = formData.get('nombre') as string
    const categoria_ids = formData.getAll('categoria_ids') as string[]
    const entrenador_id = parseInt(formData.get('entrenador_id') as string)
    const imagen_equipo = formData.get('imagen_equipo') as string
    const estado = formData.get('estado') === 'true'

    console.log('Datos recibidos en updateEquipo:', {
      id,
      nombre,
      categoria_ids,
      entrenador_id,
      imagen_equipo,
      estado
    })

    if (!nombre || !entrenador_id) {
      throw new Error('Nombre y entrenador son obligatorios')
    }

    if (categoria_ids.length === 0) {
      throw new Error('Debe seleccionar al menos una categoría')
    }

    const equipoData: Partial<NewEquipo> = {
      nombre,
      entrenador_id,
      imagen_equipo: imagen_equipo || null,
      estado,
    }

    // Convertir string IDs a números y eliminar duplicados
    const categoriaIds = [...new Set(categoria_ids.map(id => parseInt(id)))]

    // Actualizar equipo con múltiples categorías
    await equipoQueries.updateWithCategorias(id, equipoData, categoriaIds)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al actualizar equipo:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar equipo')
  }
}

export async function deleteEquipo(id: number) {
  // 🔐 Verificar permiso de eliminar
  await requirePermiso('equipos', 'eliminar')
  
  try {
    // Validar que el ID sea un número válido
    if (isNaN(id) || id <= 0) {
      throw new Error('ID de equipo inválido')
    }
    
    // Verificar si el equipo existe antes de eliminarlo
    const equipo = await equipoQueries.getById(id)
    if (!equipo) {
      throw new Error('El equipo no existe')
    }
    
    // Verificar dependencias antes de eliminar
    const dependencias = await equipoQueries.checkDependencies(id)
    if (dependencias.tieneDependencias) {
      const mensajesDependencias: Record<string, string> = {
        torneos: 'torneos',
        encuentros: 'encuentros',
        descansos: 'descansos en torneos'
      }
      const dependenciasTexto = dependencias.dependencias
        .map(dep => mensajesDependencias[dep] || dep)
        .join(', ')
      throw new Error(`No se puede eliminar el equipo porque tiene dependencias en: ${dependenciasTexto}. Por favor, elimine primero estas dependencias.`)
    }
    
    await equipoQueries.delete(id)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al eliminar equipo:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar equipo')
  }
}

export async function deleteMultipleEquipos(ids: number[]) {
  // 🔐 Verificar permiso de eliminar
  await requirePermiso('equipos', 'eliminar')
  
  try {
    if (ids.length === 0) {
      throw new Error('No se proporcionaron IDs para eliminar')
    }
    
    // Validar que los IDs sean números válidos
    const validIds = ids.filter(id => !isNaN(id) && id > 0)
    if (validIds.length !== ids.length) {
      throw new Error('Algunos IDs no son válidos')
    }
    
    // Verificar que todos los equipos existen antes de eliminarlos
    const equipos = await Promise.all(validIds.map(id => equipoQueries.getById(id)))
    const equiposNoEncontrados = equipos.filter(equipo => !equipo)
    
    if (equiposNoEncontrados.length > 0) {
      throw new Error('Algunos equipos no existen')
    }
    
    // Verificar dependencias para todos los equipos antes de eliminar
    const equiposConDependencias: number[] = []
    for (const id of validIds) {
      const dependencias = await equipoQueries.checkDependencies(id)
      if (dependencias.tieneDependencias) {
        equiposConDependencias.push(id)
      }
    }
    
    if (equiposConDependencias.length > 0) {
      const mensajesDependencias: Record<string, string> = {
        torneos: 'torneos',
        encuentros: 'encuentros',
        descansos: 'descansos en torneos'
      }
      const nombresEquipos = await Promise.all(
        equiposConDependencias.map(id => equipoQueries.getById(id))
      )
      const nombres = nombresEquipos.map(e => e?.nombre).filter(Boolean).join(', ')
      throw new Error(`No se pueden eliminar los siguientes equipos porque tienen dependencias: ${nombres}. Por favor, elimine primero estas dependencias.`)
    }
    
    // Eliminar equipos uno por uno para mejor control de errores
    const resultados = []
    for (const id of validIds) {
      try {
        await equipoQueries.delete(id)
        resultados.push({ id, success: true })
      } catch (error) {
        console.error(`Error al eliminar equipo ${id}:`, error)
        resultados.push({ id, success: false, error: error instanceof Error ? error.message : 'Error desconocido' })
      }
    }
    
    // Verificar si todos los equipos fueron eliminados exitosamente
    const fallidos = resultados.filter(r => !r.success)
    if (fallidos.length > 0) {
      throw new Error(`No se pudieron eliminar ${fallidos.length} equipos`)
    }
    
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al eliminar equipos:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar equipos')
  }
}


// ===== CATEGORÍAS =====

export async function getCategorias() {
  try {
    // Filtrar solo categorías activas
    const todasLasCategorias = await categoriaQueries.getAll()
    return todasLasCategorias.filter(categoria => categoria.estado === true)
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    throw new Error('Error al obtener categorías')
  }
}

export async function createCategoria(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string
    const estado = formData.get('estado') === 'true'
    const usuario_id = parseInt(formData.get('usuario_id') as string) || null

    if (!nombre) {
      throw new Error('El nombre de la categoría es obligatorio')
    }

    const categoriaData: NewCategoria = {
      nombre,
      estado,
      usuario_id,
    }

    await categoriaQueries.create(categoriaData)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al crear categoría:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear categoría')
  }
}

// ===== ENTRENADORES =====

export async function getEntrenadores() {
  try {
    return await entrenadorQueries.getAll()
  } catch (error) {
    console.error('Error al obtener entrenadores:', error)
    throw new Error('Error al obtener entrenadores')
  }
}

export async function createEntrenador(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string

    if (!nombre) {
      throw new Error('El nombre del entrenador es obligatorio')
    }

    const entrenadorData: NewEntrenador = {
      nombre,
    }

    await entrenadorQueries.create(entrenadorData)
    revalidatePath('/equipos')
  } catch (error) {
    console.error('Error al crear entrenador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear entrenador')
  }
} 