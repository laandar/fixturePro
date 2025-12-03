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
  
  // Variables para logging de errores (definidas fuera del try)
  let equipoData: NewEquipo | undefined
  let categoriaIds: number[] | undefined
  
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

    // Validar que el entrenador existe
    const entrenador = await entrenadorQueries.getById(entrenador_id)
    if (!entrenador) {
      throw new Error(`El entrenador con ID ${entrenador_id} no existe. Por favor, selecciona un entrenador válido.`)
    }

    // Normalizar imagen_equipo: convertir cadena vacía a null
    const imagenEquipoNormalizada = imagen_equipo && imagen_equipo.trim() !== '' ? imagen_equipo.trim() : null

    equipoData = {
      nombre,
      entrenador_id,
      imagen_equipo: imagenEquipoNormalizada,
      estado,
    }

    // Convertir string IDs a números y eliminar duplicados
    categoriaIds = [...new Set(categoria_ids.map(id => parseInt(id)))]

    // Crear equipo con múltiples categorías
    await equipoCategoriaQueries.crearEquipoConCategorias(equipoData, categoriaIds)
    revalidatePath('/equipos')
  } catch (error: any) {
    console.error('Error al crear equipo:', error)
    
    // Obtener mensaje de error más detallado
    let errorMessage = 'Error al crear equipo'
    
    // Intentar extraer información del error de PostgreSQL
    if (error) {
      // Errores de postgres.js suelen tener propiedades específicas
      const postgresError = error as any
      
      // Extraer error real de 'cause' si existe (donde postgres.js pone el error real)
      const realError = postgresError.cause || postgresError
      
      // Extraer mensaje de diferentes posibles fuentes
      if (realError.message) {
        errorMessage = realError.message
      } else if (postgresError.message) {
        errorMessage = postgresError.message
      }
      
      // Si tiene código de error de PostgreSQL, añadirlo
      if (realError.code) {
        errorMessage += ` (Código: ${realError.code})`
      } else if (postgresError.code) {
        errorMessage += ` (Código: ${postgresError.code})`
      }
      
      // Si tiene detalle del error, añadirlo
      if (realError.detail) {
        errorMessage += ` - ${realError.detail}`
      } else if (postgresError.detail) {
        errorMessage += ` - ${postgresError.detail}`
      }
      
      // Si tiene hint, añadirlo
      if (realError.hint) {
        errorMessage += ` (Hint: ${realError.hint})`
      } else if (postgresError.hint) {
        errorMessage += ` (Hint: ${postgresError.hint})`
      }
      
      // Errores comunes de PostgreSQL
      const errorCode = realError.code || postgresError.code
      
      if (errorCode === '23503') {
        errorMessage = 'Error de integridad referencial: El entrenador seleccionado no existe o hay un problema con las relaciones.'
      } else if (errorCode === '23505') {
        // Error de clave primaria duplicada (problema de secuencia)
        if (realError.message?.includes('equipos_pkey') || realError.message?.includes('llave duplicada')) {
          errorMessage = 'Error de base de datos: La secuencia de IDs está desincronizada. Contacta al administrador para corregir la secuencia de la tabla equipos.'
        } else {
          errorMessage = 'Error de unicidad: Ya existe un equipo con estos datos.'
        }
      } else if (errorCode === '23502') {
        errorMessage = 'Error de constraint: Faltan datos obligatorios.'
      }
    }
    
    // Log detallado para debugging
    console.error('Detalles del error:', {
      error,
      errorCode: (error as any)?.code,
      errorDetail: (error as any)?.detail,
      errorHint: (error as any)?.hint,
      errorMessage: (error as any)?.message,
      equipoData: equipoData || 'No definido',
      categoriaIds: categoriaIds || 'No definido',
      errorType: typeof error,
      errorKeys: error ? Object.keys(error) : [],
      errorString: JSON.stringify(error, Object.getOwnPropertyNames(error))
    })
    
    throw new Error(errorMessage)
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

    // Normalizar imagen_equipo: convertir cadena vacía a null
    const imagenEquipoNormalizada = imagen_equipo && imagen_equipo.trim() !== '' ? imagen_equipo.trim() : null

    const equipoData: Partial<NewEquipo> = {
      nombre,
      entrenador_id,
      imagen_equipo: imagenEquipoNormalizada,
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
  } catch (error: any) {
    console.error('Error al eliminar equipo:', error)
    
    // Obtener mensaje de error más detallado
    let errorMessage = 'Error al eliminar equipo'
    
    // Intentar extraer información del error de PostgreSQL
    if (error) {
      const postgresError = error as any
      
      // Extraer error real de 'cause' si existe
      const realError = postgresError.cause || postgresError
      
      // Extraer mensaje de diferentes posibles fuentes
      if (realError.message) {
        errorMessage = realError.message
      } else if (postgresError.message) {
        errorMessage = postgresError.message
      }
      
      // Si tiene código de error de PostgreSQL, añadirlo
      const errorCode = realError.code || postgresError.code
      if (errorCode) {
        errorMessage += ` (Código: ${errorCode})`
      }
      
      // Si tiene detalle del error, añadirlo
      if (realError.detail) {
        errorMessage += ` - ${realError.detail}`
      } else if (postgresError.detail) {
        errorMessage += ` - ${postgresError.detail}`
      }
      
      // Mensajes específicos por código de error
      if (errorCode === '23503') {
        errorMessage = 'No se puede eliminar el equipo porque tiene registros relacionados (torneos, encuentros, etc.). Elimina primero estas relaciones.'
      } else if (errorCode === '23502') {
        errorMessage = 'Error de constraint: Faltan datos necesarios para la operación.'
      }
      
      // Si el error ya tiene un mensaje descriptivo (de nuestras validaciones), mantenerlo
      if (error instanceof Error && error.message && !error.message.includes('Failed query')) {
        errorMessage = error.message
      }
    }
    
    // Log detallado para debugging
    console.error('Detalles del error al eliminar:', {
      error,
      errorCode: (error as any)?.cause?.code || (error as any)?.code,
      errorDetail: (error as any)?.cause?.detail || (error as any)?.detail,
      errorMessage: (error as any)?.cause?.message || (error as any)?.message,
      equipoId: id
    })
    
    throw new Error(errorMessage)
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
      } catch (error: any) {
        console.error(`Error al eliminar equipo ${id}:`, error)
        
        // Extraer mensaje de error más detallado
        let errorMsg = 'Error desconocido'
        const realError = error?.cause || error
        if (realError?.message) {
          errorMsg = realError.message
        } else if (error?.message) {
          errorMsg = error.message
        }
        
        resultados.push({ id, success: false, error: errorMsg })
      }
    }
    
    // Verificar si todos los equipos fueron eliminados exitosamente
    const fallidos = resultados.filter(r => !r.success)
    if (fallidos.length > 0) {
      throw new Error(`No se pudieron eliminar ${fallidos.length} equipos`)
    }
    
    revalidatePath('/equipos')
  } catch (error: any) {
    console.error('Error al eliminar equipos:', error)
    
    // Obtener mensaje de error más detallado
    let errorMessage = 'Error al eliminar equipos'
    
    if (error) {
      const postgresError = error as any
      const realError = postgresError.cause || postgresError
      
      if (realError.message) {
        errorMessage = realError.message
      } else if (postgresError.message) {
        errorMessage = postgresError.message
      }
      
      // Si el error ya tiene un mensaje descriptivo, mantenerlo
      if (error instanceof Error && error.message && !error.message.includes('Failed query')) {
        errorMessage = error.message
      }
    }
    
    throw new Error(errorMessage)
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