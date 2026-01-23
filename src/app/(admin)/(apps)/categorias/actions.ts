'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { categoriaQueries } from '@/db/queries'
import type { NewCategoria } from '@/db/types'
import { requirePermiso } from '@/lib/auth-helpers'
import { validarRangoEdad, crearRangoCategoriaComun } from '@/lib/age-helpers'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// ===== CATEGORÍAS =====

export async function getCategorias() {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    return await categoriaQueries.getAll()
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    throw new Error('Error al obtener categorías')
  }
}

export async function getCategoriaById(id: number) {
  try {
    return await categoriaQueries.getById(id)
  } catch (error) {
    console.error('Error al obtener categoría:', error)
    throw new Error('Error al obtener categoría')
  }
}

export async function createCategoria(formData: FormData) {
  await requirePermiso('categorias', 'crear')
  try {
    const nombre = formData.get('nombre') as string
    const estado = formData.get('estado') === 'true'
    const usuario_id = parseInt(formData.get('usuario_id') as string) || null
    
    // Campos de edad
    const edadMinimaAnos = parseInt(formData.get('edad_minima_anos') as string) || null
    const edadMinimaMeses = parseInt(formData.get('edad_minima_meses') as string) || 0
    const edadMaximaAnos = parseInt(formData.get('edad_maxima_anos') as string) || null
    const edadMaximaMeses = parseInt(formData.get('edad_maxima_meses') as string) || 0
    
    // Campo de número de jugadores permitidos
    const numeroJugadoresPermitidos = parseInt(formData.get('numero_jugadores_permitidos') as string) || null
    
    // Campo de número de jugadores menores a la edad mínima permitidos
    const numeroJugadoresMenoresPermitidosStr = formData.get('numero_jugadores_menores_permitidos') as string
    const numeroJugadoresMenoresPermitidos = numeroJugadoresMenoresPermitidosStr && numeroJugadoresMenoresPermitidosStr.trim() !== '' 
      ? parseInt(numeroJugadoresMenoresPermitidosStr) 
      : null

    console.log('📝 Creando categoría:', {
      nombre,
      numeroJugadoresPermitidos,
      numeroJugadoresMenoresPermitidos,
      numeroJugadoresMenoresPermitidosStr
    })

    if (!nombre) {
      throw new Error('El nombre de la categoría es obligatorio')
    }

    // Validar rango de edad si se proporciona
    if (edadMinimaAnos !== null && edadMaximaAnos !== null) {
      const rango = {
        edadMinimaAnos,
        edadMinimaMeses,
        edadMaximaAnos,
        edadMaximaMeses
      }
      
      const validacion = validarRangoEdad(rango)
      if (!validacion.valido) {
        throw new Error(validacion.error)
      }
    }

    const categoriaData: NewCategoria = {
      nombre,
      estado,
      usuario_id,
      edad_minima_anos: edadMinimaAnos,
      edad_minima_meses: edadMinimaMeses,
      edad_maxima_anos: edadMaximaAnos,
      edad_maxima_meses: edadMaximaMeses,
      numero_jugadores_permitidos: numeroJugadoresPermitidos,
      numero_jugadores_menores_permitidos: numeroJugadoresMenoresPermitidos,
    }

    await categoriaQueries.create(categoriaData)
    revalidatePath('/categorias')
  } catch (error) {
    console.error('Error al crear categoría:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear categoría')
  }
}

export async function updateCategoria(id: number, formData: FormData) {
  await requirePermiso('categorias', 'editar')
  try {
    const nombre = formData.get('nombre') as string
    const estado = formData.get('estado') === 'true'
    const usuario_id = parseInt(formData.get('usuario_id') as string) || null
    
    // Campos de edad
    const edadMinimaAnos = parseInt(formData.get('edad_minima_anos') as string) || null
    const edadMinimaMeses = parseInt(formData.get('edad_minima_meses') as string) || 0
    const edadMaximaAnos = parseInt(formData.get('edad_maxima_anos') as string) || null
    const edadMaximaMeses = parseInt(formData.get('edad_maxima_meses') as string) || 0
    
    // Campo de número de jugadores permitidos
    const numeroJugadoresPermitidos = parseInt(formData.get('numero_jugadores_permitidos') as string) || null
    
    // Campo de número de jugadores menores a la edad mínima permitidos
    const numeroJugadoresMenoresPermitidosStr = formData.get('numero_jugadores_menores_permitidos') as string
    const numeroJugadoresMenoresPermitidos = numeroJugadoresMenoresPermitidosStr && numeroJugadoresMenoresPermitidosStr.trim() !== '' 
      ? parseInt(numeroJugadoresMenoresPermitidosStr) 
      : null

    console.log('📝 Creando categoría:', {
      nombre,
      numeroJugadoresPermitidos,
      numeroJugadoresMenoresPermitidos,
      numeroJugadoresMenoresPermitidosStr
    })

    if (!nombre) {
      throw new Error('El nombre de la categoría es obligatorio')
    }

    // Validar rango de edad si se proporciona
    if (edadMinimaAnos !== null && edadMaximaAnos !== null) {
      const rango = {
        edadMinimaAnos,
        edadMinimaMeses,
        edadMaximaAnos,
        edadMaximaMeses
      }
      
      const validacion = validarRangoEdad(rango)
      if (!validacion.valido) {
        throw new Error(validacion.error)
      }
    }

    const categoriaData: Partial<NewCategoria> = {
      nombre,
      estado,
      usuario_id,
      edad_minima_anos: edadMinimaAnos,
      edad_minima_meses: edadMinimaMeses,
      edad_maxima_anos: edadMaximaAnos,
      edad_maxima_meses: edadMaximaMeses,
      numero_jugadores_permitidos: numeroJugadoresPermitidos,
      numero_jugadores_menores_permitidos: numeroJugadoresMenoresPermitidos,
    }

    await categoriaQueries.update(id, categoriaData)
    revalidatePath('/categorias')
  } catch (error) {
    console.error('Error al actualizar categoría:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar categoría')
  }
}

export async function deleteCategoria(id: number) {
  await requirePermiso('categorias', 'eliminar')
  try {
    // Validar que el ID sea un número válido
    if (isNaN(id) || id <= 0) {
      throw new Error('ID de categoría inválido')
    }
    
    // Verificar si la categoría existe antes de eliminarla
    const categoria = await categoriaQueries.getById(id)
    if (!categoria) {
      throw new Error('La categoría no existe')
    }
    
    try {
      await categoriaQueries.delete(id)
      revalidatePath('/categorias')
    } catch (error: any) {
      // Detectar error de restricción de clave foránea
      if (error && error.message && error.message.includes('delete') && error.message.includes('categorias')) {
        throw new Error('No se puede eliminar la categoría porque tiene equipos asociados. Elimina o reasigna los equipos antes de eliminar la categoría.')
      }
      throw error
    }
  } catch (error) {
    console.error('Error al eliminar categoría:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar categoría')
  }
}

export async function deleteMultipleCategorias(ids: number[]) {
  try {
    // Validar que todos los IDs sean números válidos
    if (!ids.every(id => !isNaN(id) && id > 0)) {
      throw new Error('IDs de categorías inválidos')
    }
    
    // Verificar que todas las categorías existan antes de eliminarlas
    for (const id of ids) {
      const categoria = await categoriaQueries.getById(id)
      if (!categoria) {
        throw new Error(`La categoría con ID ${id} no existe`)
      }
    }
    
    // Eliminar todas las categorías
    for (const id of ids) {
      await categoriaQueries.delete(id)
    }
    
    revalidatePath('/categorias')
  } catch (error) {
    console.error('Error al eliminar categorías:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar categorías')
  }
}

export async function searchCategorias(query: string) {
  try {
    const categorias = await categoriaQueries.getAll()
    return categorias.filter(categoria => 
      categoria.nombre.toLowerCase().includes(query.toLowerCase())
    )
  } catch (error) {
    console.error('Error al buscar categorías:', error)
    throw new Error('Error al buscar categorías')
  }
}

/**
 * Guarda una imagen del carnet en public/carnets
 * @param file Archivo de imagen
 * @param categoriaId ID de la categoría
 * @param tipo Tipo de imagen: 'frontal' o 'trasera'
 * @returns Ruta de la imagen guardada
 */
async function saveCarnetImage(file: File, categoriaId: number, tipo: 'frontal' | 'trasera'): Promise<string> {
  try {
    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), 'public', 'carnets')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Obtener extensión del archivo original
    const originalName = file.name
    const extension = originalName.split('.').pop()?.toLowerCase() || 'png'
    
    // Generar nombre único: categoria_{id}_{tipo}.{extension}
    const fileName = `categoria_${categoriaId}_${tipo}.${extension}`
    const filePath = join(uploadDir, fileName)
    
    // Convertir File a Buffer y guardar
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    // Retornar ruta pública
    return `/carnets/${fileName}`
  } catch (error) {
    console.error('Error al guardar imagen del carnet:', error)
    throw new Error('Error al guardar la imagen del carnet')
  }
}

/**
 * Elimina una imagen del carnet
 * @param imagePath Ruta de la imagen a eliminar
 */
async function deleteCarnetImage(imagePath: string | null): Promise<void> {
  if (!imagePath) return
  
  try {
    if (imagePath.startsWith('/carnets/')) {
      const filePath = join(process.cwd(), 'public', imagePath)
      if (existsSync(filePath)) {
        await unlink(filePath)
        console.log(`✅ Imagen del carnet eliminada: ${imagePath}`)
      }
    }
  } catch (error) {
    console.error('Error al eliminar imagen del carnet:', error)
    // No lanzar error para no interrumpir el flujo principal
  }
}

/**
 * Actualiza las imágenes del carnet de una categoría
 */
export async function updateCarnetImages(categoriaId: number, formData: FormData) {
  await requirePermiso('categorias', 'editar')
  
  try {
    // Obtener la categoría actual para verificar si tiene imágenes previas
    const categoriaActual = await categoriaQueries.getById(categoriaId)
    if (!categoriaActual) {
      throw new Error('La categoría no existe')
    }

    const imagenFrontalFile = formData.get('imagen_carnet_frontal') as File | null
    const imagenTraseraFile = formData.get('imagen_carnet_trasera') as File | null

    // Validar que al menos se haya subido una imagen
    if (!imagenFrontalFile && !imagenTraseraFile) {
      throw new Error('Debe subir al menos una imagen del carnet')
    }

    // Validar tipos de archivo
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    
    if (imagenFrontalFile && imagenFrontalFile.size > 0) {
      if (!tiposPermitidos.includes(imagenFrontalFile.type)) {
        throw new Error('La imagen frontal debe ser PNG, JPEG o WEBP')
      }
    }
    
    if (imagenTraseraFile && imagenTraseraFile.size > 0) {
      if (!tiposPermitidos.includes(imagenTraseraFile.type)) {
        throw new Error('La imagen trasera debe ser PNG, JPEG o WEBP')
      }
    }

    let imagenFrontalPath = categoriaActual.imagen_carnet_frontal
    let imagenTraseraPath = categoriaActual.imagen_carnet_trasera

    // Guardar imagen frontal si se proporcionó
    if (imagenFrontalFile && imagenFrontalFile.size > 0) {
      // Eliminar imagen anterior si existe
      if (imagenFrontalPath) {
        await deleteCarnetImage(imagenFrontalPath)
      }
      imagenFrontalPath = await saveCarnetImage(imagenFrontalFile, categoriaId, 'frontal')
    }

    // Guardar imagen trasera si se proporcionó
    if (imagenTraseraFile && imagenTraseraFile.size > 0) {
      // Eliminar imagen anterior si existe
      if (imagenTraseraPath) {
        await deleteCarnetImage(imagenTraseraPath)
      }
      imagenTraseraPath = await saveCarnetImage(imagenTraseraFile, categoriaId, 'trasera')
    }

    // Actualizar categoría con las rutas de las imágenes
    await categoriaQueries.update(categoriaId, {
      imagen_carnet_frontal: imagenFrontalPath,
      imagen_carnet_trasera: imagenTraseraPath,
    })

    revalidatePath('/categorias')
  } catch (error) {
    console.error('Error al actualizar imágenes del carnet:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar imágenes del carnet')
  }
}
