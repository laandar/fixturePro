'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { jugadorQueries, equipoQueries, categoriaQueries, equipoCategoriaQueries, jugadorEquipoCategoriaQueries } from '@/db/queries'
import type { NewJugador, NewHistorialJugador } from '@/db/types'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { db } from '@/db'
import { verificarRangoEdad, obtenerMensajeErrorEdad } from '@/lib/age-helpers'
import { historialJugadores, jugadorEquipoCategoria, jugadores, equipoCategoria, categorias, equipos } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { eq, and, or, inArray } from 'drizzle-orm'
import { requirePermiso } from '@/lib/auth-helpers'
import { uploadFileToCloudinary, isCloudinaryUrl, extractPublicIdFromUrl, deleteImageFromCloudinary } from '@/lib/cloudinary'

// ===== FUNCIONES AUXILIARES =====

/**
 * Guarda una imagen usando Cloudinary (preferido) o almacenamiento local (fallback)
 * @param file Archivo de imagen
 * @param jugadorId ID del jugador
 * @returns URL de la imagen (Cloudinary o ruta local)
 */
async function saveImage(file: File, jugadorId: number): Promise<string> {
  try {
    // SIEMPRE intentar usar Cloudinary primero
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary no está configurado. Verifica que .env.local tenga:\n' +
        'CLOUDINARY_CLOUD_NAME=dj2qhm6ru\n' +
        'CLOUDINARY_API_KEY=647218391852358\n' +
        'CLOUDINARY_API_SECRET=Cq6tRH_Dy8je_QaMybQbydsBN-M'
      )
    }
    
    // Subir a Cloudinary
    // Asegurar que jugadorId sea string para el public_id
    const jugadorIdStr = typeof jugadorId === 'number' ? jugadorId.toString() : jugadorId
    const publicId = `jugador_${jugadorIdStr}`
    console.log(`📤 Subiendo imagen a Cloudinary para jugador ${jugadorIdStr}...`)
    console.log(`   Public ID: ${publicId}`)
    const cloudinaryUrl = await uploadFileToCloudinary(file, publicId, 'jugadores')
    console.log(`✅ Imagen subida a Cloudinary: ${cloudinaryUrl}`)
    console.log(`   Verifica que la URL sea accesible antes de continuar`)
    return cloudinaryUrl

    // Fallback: Almacenamiento local
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'jugadores')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const timestamp = Date.now()
    const fileName = `jugador_${jugadorId}_${timestamp}.jpg`
    const filePath = join(uploadDir, fileName)
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    return `/uploads/jugadores/${fileName}`
  } catch (error) {
    console.error('Error al guardar imagen:', error)
    throw new Error('Error al guardar la imagen')
  }
}

/**
 * Elimina una imagen (Cloudinary o local)
 * @param imageUrl URL de la imagen a eliminar
 */
async function deleteImage(imageUrl: string): Promise<void> {
  try {
    if (isCloudinaryUrl(imageUrl)) {
      // Eliminar de Cloudinary
      const publicId = extractPublicIdFromUrl(imageUrl)
      if (publicId) {
        await deleteImageFromCloudinary(publicId, 'jugadores')
        console.log(`✅ Imagen eliminada de Cloudinary: ${publicId}`)
      }
    } else if (imageUrl.startsWith('/uploads/')) {
      // Eliminar archivo local
      const { unlink } = await import('fs/promises')
      const filePath = join(process.cwd(), 'public', imageUrl)
      if (existsSync(filePath)) {
        await unlink(filePath)
        console.log(`✅ Imagen local eliminada: ${imageUrl}`)
      }
    }
  } catch (error) {
    console.error('Error al eliminar imagen:', error)
    // No lanzar error para no interrumpir el flujo principal
  }
}

// ===== JUGADORES =====

export async function getJugadores() {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    return await jugadorQueries.getAllWithRelations()
  } catch (error) {
    console.error('Error al obtener jugadores:', error)
    throw new Error('Error al obtener jugadores')
  }
}

export async function getJugadoresCount() {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    return await jugadorQueries.getCount()
  } catch (error) {
    console.error('Error al obtener contador de jugadores:', error)
    throw new Error('Error al obtener contador de jugadores')
  }
}

export async function getJugadoresActivos() {
  // Obtener solo jugadores activos para gestión de encuentros
  try {
    return await jugadorQueries.getActiveWithRelations()
  } catch (error) {
    console.error('Error al obtener jugadores activos:', error)
    throw new Error('Error al obtener jugadores activos')
  }
}

export async function getJugadoresActivosByEquipos(equipoIds: number[], categoriaId?: number) {
  // Obtener solo jugadores activos de equipos específicos (optimizado para gestión de encuentros)
  try {
    if (equipoIds.length === 0) {
      return []
    }
    return await jugadorQueries.getActiveByEquiposIds(equipoIds, categoriaId)
  } catch (error) {
    console.error('Error al obtener jugadores activos por equipos:', error)
    throw new Error('Error al obtener jugadores activos por equipos')
  }
}

export async function getEquiposCategorias() {
  // Obtener todas las combinaciones equipo-categoría disponibles (solo activos)
  try {
    // Obtener todas las relaciones equipo-categoría con sus relaciones
    const equiposCategorias = await db.query.equipoCategoria.findMany({
      with: {
        equipo: true,
        categoria: true
      }
    })
    
    // Filtrar solo los que tienen equipo y categoría activos
    const equiposCategoriasActivos = equiposCategorias.filter(
      ec => ec.equipo?.estado === true && ec.categoria?.estado === true
    )
    
    return equiposCategoriasActivos
  } catch (error) {
    console.error('Error al obtener equipos-categorías:', error)
    throw new Error('Error al obtener equipos-categorías')
  }
}

export async function getJugadorById(id: number | string) {
  try {
    const jugadorId = typeof id === 'string' ? parseInt(id) : id
    return await jugadorQueries.getByIdWithRelations(jugadorId)
  } catch (error) {
    console.error('Error al obtener jugador:', error)
    throw new Error('Error al obtener jugador')
  }
}

export async function getJugadoresByIds(ids: string[]) {
  // No requiere permiso - función auxiliar usada por otros módulos
  try {
    if (ids.length === 0) {
      return []
    }
    return await jugadorQueries.getByIdsWithRelations(ids)
  } catch (error) {
    console.error('Error al obtener jugadores por IDs:', error)
    throw new Error('Error al obtener jugadores por IDs')
  }
}

export async function createJugador(formData: FormData) {
  await requirePermiso('jugadores', 'crear')
  try {
    const cedula = formData.get('cedula') as string
    const apellido_nombre = formData.get('apellido_nombre') as string
    const nacionalidad = formData.get('nacionalidad') as string
    const liga = formData.get('liga') as string
    const equipo_categoria_id = parseInt(formData.get('equipo_categoria_id') as string)
    const estado = formData.get('estado') === 'true'
    const fecha_nacimiento = formData.get('fecha_nacimiento') as string
    const foto = formData.get('foto') as File | null
    const jugador_existente_id = formData.get('jugador_existente_id') as string | null
    
    // Nuevos campos
    const sexo = formData.get('sexo') as string
    const numero_jugador = formData.get('numero_jugador') as string
    const telefono = formData.get('telefono') as string
    const provincia = formData.get('provincia') as string
    const direccion = formData.get('direccion') as string
    const observacion = formData.get('observacion') as string
    const foraneo = formData.get('foraneo') === 'true'

    if (!cedula || !apellido_nombre || !nacionalidad || !liga || !equipo_categoria_id) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    // Si se proporciona un ID de jugador existente, solo crear la relación
    if (jugador_existente_id) {
      const jugadorExistente = await jugadorQueries.getById(jugador_existente_id)
      if (!jugadorExistente) {
        throw new Error('El jugador existente no se encontró')
      }
      
      // Verificar que la cédula coincida
      if (jugadorExistente.cedula !== cedula) {
        throw new Error('La cédula no coincide con el jugador existente')
      }
      
      // Solo crear la nueva relación jugador-equipo-categoría
      const cedulaJugador = jugadorExistente.cedula
      const numeroJugadorValue = numero_jugador ? parseInt(numero_jugador) : null
      const situacionJugadorValue = formData.get('situacion_jugador') as string | null
      const situacionNormalizada = situacionJugadorValue && (situacionJugadorValue === 'PASE' || situacionJugadorValue === 'PRÉSTAMO') 
        ? situacionJugadorValue as 'PASE' | 'PRÉSTAMO'
        : null
      
      // Verificar si ya existe la relación con este equipo-categoría específico
      const relacionExistente = await db
        .select({
          id: jugadorEquipoCategoria.id,
          equipo_categoria_id: jugadorEquipoCategoria.equipo_categoria_id,
        })
        .from(jugadorEquipoCategoria)
        .where(
          and(
            or(
              eq(jugadorEquipoCategoria.jugador_id, jugador_existente_id),
              eq(jugadorEquipoCategoria.jugador_id, cedulaJugador)
            ),
            eq(jugadorEquipoCategoria.equipo_categoria_id, equipo_categoria_id)
          )
        )
        .limit(1)
      
      if (relacionExistente.length > 0) {
        // Obtener información del equipo-categoría para el mensaje de error
        const equipoCategoriaInfo = await db.query.equipoCategoria.findFirst({
          where: (ec, { eq }) => eq(ec.id, equipo_categoria_id),
          with: {
            equipo: true,
            categoria: true
          }
        })
        
        const equipoNombre = equipoCategoriaInfo?.equipo?.nombre || 'equipo'
        const categoriaNombre = equipoCategoriaInfo?.categoria?.nombre || 'categoría'
        
        throw new Error(`El jugador ya tiene una relación con ${equipoNombre} - ${categoriaNombre}. Si desea crear una relación con otra categoría, seleccione un equipo-categoría diferente.`)
      }
      
      // Crear nueva relación
      await db.insert(jugadorEquipoCategoria).values({
        jugador_id: cedulaJugador,
        equipo_categoria_id: equipo_categoria_id,
        numero_jugador: numeroJugadorValue,
        situacion_jugador: situacionNormalizada
      })
      
      // Si hay una foto nueva, actualizarla
      if (foto && foto.size > 0) {
        try {
          const jugadorIdNum = typeof jugador_existente_id === 'string' ? parseInt(jugador_existente_id) : jugador_existente_id
          const fotoPath = await saveImage(foto, jugadorIdNum)
          await jugadorQueries.update(jugadorIdNum, { foto: fotoPath })
        } catch (error) {
          console.error('Error al guardar la foto:', error)
          // No lanzar error aquí para no impedir la creación de la relación
        }
      }
      
      revalidatePath('/jugadores')
      return
    }

    // Si no hay jugador existente, crear uno nuevo (código original)
    // Verificar si la cédula ya existe
    const jugadorExistente = await jugadorQueries.getByCedula(cedula)
    if (jugadorExistente) {
      throw new Error('Ya existe un jugador con esta cédula. Si desea crear una nueva relación, busque el jugador por cédula primero.')
    }

    // Validar rango de edad si se proporciona fecha de nacimiento y la categoría tiene rango definido
    if (fecha_nacimiento) {
      // Obtener la categoría desde la relación equipo-categoría
      const equipoCategoria = await db.query.equipoCategoria.findFirst({
        where: (equipoCategoria, { eq }) => eq(equipoCategoria.id, equipo_categoria_id),
        with: {
          categoria: true
        }
      })
      const categoria = equipoCategoria?.categoria
      if (categoria && categoria.edad_minima_anos !== null && categoria.edad_maxima_anos !== null) {
        const rango = {
          edadMinimaAnos: categoria.edad_minima_anos,
          edadMinimaMeses: categoria.edad_minima_meses || 0,
          edadMaximaAnos: categoria.edad_maxima_anos,
          edadMaximaMeses: categoria.edad_maxima_meses || 0
        }
        
        const fechaNacimiento = new Date(fecha_nacimiento)
        if (!verificarRangoEdad(fechaNacimiento, rango)) {
          throw new Error(obtenerMensajeErrorEdad(fechaNacimiento, rango, apellido_nombre))
        }
      }
    }

    // Función helper para limpiar strings
    const cleanString = (value: string | null | undefined): string | null => {
      if (!value || value.trim() === '' || value === 'NULL') return null;
      return value.trim();
    };

    // Convertir fecha_nacimiento a string en formato YYYY-MM-DD para PostgreSQL
    const formatFechaNacimiento = (fecha: string | null): string | null => {
      if (!fecha) return null;
      try {
        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) return null;
        // Convertir a formato YYYY-MM-DD
        const year = fechaObj.getFullYear();
        const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const day = String(fechaObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return null;
      }
    };

    // Generar ID único para el jugador
    const generateJugadorId = (): string => {
      // Usar crypto de Node.js para generar UUID
      const { randomUUID } = require('crypto');
      return randomUUID();
    };

    const jugadorData = {
      id: generateJugadorId(),
      cedula,
      apellido_nombre,
      nacionalidad,
      liga,
      estado,
      fecha_nacimiento: formatFechaNacimiento(fecha_nacimiento),
      sexo: cleanString(sexo) as 'masculino' | 'femenino' | 'otro' | null,
      // NO guardar numero_jugador en jugadores, se guardará en jugador_equipo_categoria
      telefono: cleanString(telefono),
      provincia: cleanString(provincia),
      direccion: cleanString(direccion),
      observacion: cleanString(observacion),
      foraneo: foraneo || false,
    }

    // Crear el jugador con equipos-categorías pasando el número de jugador y situación en la relación
    const numeroJugadorValue = numero_jugador ? parseInt(numero_jugador) : undefined
    const situacionJugadorValue = formData.get('situacion_jugador') as string | null
    const situacionNormalizada = situacionJugadorValue && (situacionJugadorValue === 'PASE' || situacionJugadorValue === 'PRÉSTAMO') 
      ? situacionJugadorValue as 'PASE' | 'PRÉSTAMO'
      : null
    const nuevoJugador = await jugadorEquipoCategoriaQueries.crearJugadorConEquiposCategorias(
      jugadorData as any, 
      [{ 
        equipoCategoriaId: equipo_categoria_id, 
        numeroJugador: numeroJugadorValue,
        situacionJugador: situacionNormalizada
      }]
    )
    
    // Si hay una foto, guardarla y actualizar el jugador
    if (foto && foto.size > 0) {
      try {
        const fotoPath = await saveImage(foto, parseInt(nuevoJugador.id))
        await jugadorQueries.update(parseInt(nuevoJugador.id), { foto: fotoPath })
      } catch (error) {
        console.error('Error al guardar la foto:', error)
        // No lanzar error aquí para no impedir la creación del jugador
      }
    }

    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al crear jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear jugador')
  }
}

export async function updateJugador(id: number | string, formData: FormData, relacionId?: number) {
  await requirePermiso('jugadores', 'editar')
  try {
    const cedula = formData.get('cedula') as string
    const apellido_nombre = formData.get('apellido_nombre') as string
    const nacionalidad = formData.get('nacionalidad') as string
    const liga = formData.get('liga') as string
    const equipo_categoria_id = parseInt(formData.get('equipo_categoria_id') as string)
    const estado = formData.get('estado') === 'true'
    const fecha_nacimiento = formData.get('fecha_nacimiento') as string
    const foto = formData.get('foto') as File | null
    
    // Nuevos campos
    const sexo = formData.get('sexo') as string
    const numero_jugador = formData.get('numero_jugador') as string
    const situacion_jugador = formData.get('situacion_jugador') as string | null
    const telefono = formData.get('telefono') as string
    const provincia = formData.get('provincia') as string
    const direccion = formData.get('direccion') as string
    const observacion = formData.get('observacion') as string
    const foraneo = formData.get('foraneo') === 'true'

    if (!cedula || !apellido_nombre || !nacionalidad || !liga || !equipo_categoria_id) {
      throw new Error('Todos los campos obligatorios deben estar completos')
    }

    // Obtener el jugador actual por ID para obtener su cédula original
    let jugadorActual
    try {
      jugadorActual = await jugadorQueries.getById(id)
    } catch (error) {
      console.error('Error al obtener jugador por ID:', id, error)
      throw new Error('Error al obtener información del jugador')
    }
    
    if (!jugadorActual) {
      console.error('Jugador no encontrado con ID:', id, typeof id)
      throw new Error(`Jugador no encontrado con ID: ${id}`)
    }
    
    const cedulaOriginal = jugadorActual.cedula
    
    // Verificar si la cédula nueva ya existe en otro jugador (solo si cambió)
    if (cedula !== cedulaOriginal) {
      const jugadorExistente = await jugadorQueries.getByCedula(cedula)
      if (jugadorExistente && jugadorExistente.id.toString() !== id.toString()) {
        throw new Error('Ya existe otro jugador con esta cédula')
      }
    }

    // Validar rango de edad si se proporciona fecha de nacimiento y la categoría tiene rango definido
    if (fecha_nacimiento) {
      // Obtener la categoría desde la relación equipo-categoría
      const equipoCategoria = await db.query.equipoCategoria.findFirst({
        where: (equipoCategoria, { eq }) => eq(equipoCategoria.id, equipo_categoria_id),
        with: {
          categoria: true
        }
      })
      const categoria = equipoCategoria?.categoria
      if (categoria && categoria.edad_minima_anos !== null && categoria.edad_maxima_anos !== null) {
        const rango = {
          edadMinimaAnos: categoria.edad_minima_anos,
          edadMinimaMeses: categoria.edad_minima_meses || 0,
          edadMaximaAnos: categoria.edad_maxima_anos,
          edadMaximaMeses: categoria.edad_maxima_meses || 0
        }
        
        const fechaNacimiento = new Date(fecha_nacimiento)
        if (!verificarRangoEdad(fechaNacimiento, rango)) {
          throw new Error(obtenerMensajeErrorEdad(fechaNacimiento, rango, apellido_nombre))
        }
      }
    }

    // Función helper para limpiar strings
    const cleanString = (value: string | null | undefined): string | null => {
      if (!value || value.trim() === '' || value === 'NULL') return null;
      return value.trim();
    };

    // Convertir fecha_nacimiento a string en formato YYYY-MM-DD para PostgreSQL
    const formatFechaNacimiento = (fecha: string | null): string | null => {
      if (!fecha) return null;
      try {
        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) return null;
        // Convertir a formato YYYY-MM-DD
        const year = fechaObj.getFullYear();
        const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const day = String(fechaObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return null;
      }
    };

    // Ya tenemos jugadorActual desde arriba, solo obtener foto anterior
    const fotoAnterior = jugadorActual.foto

    const jugadorData: any = {
      cedula,
      apellido_nombre,
      nacionalidad,
      liga,
      estado,
      fecha_nacimiento: formatFechaNacimiento(fecha_nacimiento),
      sexo: cleanString(sexo) as 'masculino' | 'femenino' | 'otro' | null,
      // NO actualizar numero_jugador en jugadores, se actualizará en jugador_equipo_categoria
      telefono: cleanString(telefono),
      provincia: cleanString(provincia),
      direccion: cleanString(direccion),
      observacion: cleanString(observacion),
      foraneo: foraneo || false,
      // Preservar la foto anterior si no se sube una nueva
      foto: fotoAnterior || null,
    }

    // Si hay una nueva foto, guardarla y eliminar la anterior
    if (foto && foto.size > 0) {
      try {
        const jugadorIdNum = typeof id === 'string' ? parseInt(id) : id
        const fotoPath = await saveImage(foto, jugadorIdNum)
        jugadorData.foto = fotoPath
        
        // Eliminar la foto anterior solo si es diferente
        // IMPORTANTE: Si ambas son de Cloudinary con el mismo public_id, NO eliminar
        // porque Cloudinary ya la reemplazó con overwrite: true
        if (fotoAnterior && fotoAnterior !== fotoPath) {
          // Si ambas son de Cloudinary, verificar el public_id
          if (isCloudinaryUrl(fotoAnterior) && isCloudinaryUrl(fotoPath)) {
            const publicIdAnterior = extractPublicIdFromUrl(fotoAnterior)
            const publicIdNuevo = extractPublicIdFromUrl(fotoPath)
            // NO eliminar si tienen el mismo public_id (Cloudinary ya la reemplazó)
            if (publicIdAnterior && publicIdNuevo && publicIdAnterior === publicIdNuevo) {
              console.log(`ℹ️  No se elimina la imagen anterior (mismo public_id, Cloudinary la reemplazó): ${publicIdAnterior}`)
            } else if (publicIdAnterior && publicIdNuevo && publicIdAnterior !== publicIdNuevo) {
              // Solo eliminar si el public_id es diferente
              console.log(`🗑️  Eliminando imagen anterior con public_id diferente: ${publicIdAnterior} (nueva: ${publicIdNuevo})`)
              await deleteImage(fotoAnterior)
            }
          } else {
            // Si la anterior es local y la nueva es Cloudinary, eliminar la local
            if (!isCloudinaryUrl(fotoAnterior) && isCloudinaryUrl(fotoPath)) {
              console.log(`🗑️  Eliminando imagen local anterior: ${fotoAnterior}`)
              await deleteImage(fotoAnterior)
            }
          }
        }
      } catch (error) {
        console.error('Error al guardar la foto:', error)
        // No lanzar error aquí para no impedir la actualización del jugador
        // Mantener la foto anterior si falla la subida de la nueva
        jugadorData.foto = fotoAnterior || null
      }
    }

    // Actualizar los datos del jugador por cédula original (más confiable)
    await db
      .update(jugadores)
      .set({ ...jugadorData, updatedAt: new Date() })
      .where(eq(jugadores.cedula, cedulaOriginal))
      .returning()
    
    // Si se proporciona un ID de relación, solo actualizar esa relación específica
    // NO crear nuevas relaciones al modificar
    const numeroJugadorValue = numero_jugador ? parseInt(numero_jugador) : null
    const situacionJugadorValue = situacion_jugador && (situacion_jugador === 'PASE' || situacion_jugador === 'PRÉSTAMO') 
      ? situacion_jugador as 'PASE' | 'PRÉSTAMO'
      : null
    
    // El ID puede ser UUID o número, convertir a string para búsquedas
    const jugadorIdStr = typeof id === 'string' ? id : id.toString()
    
    // Obtener la relación anterior ANTES de actualizar para comparar si cambió el equipo
    let relacionAnterior: any = null
    let idRelacionAActualizar: number | null = null
    
    if (relacionId) {
      // Si se proporciona relacionId, obtener esa relación específica
      const relacion = await db
        .select()
        .from(jugadorEquipoCategoria)
        .where(eq(jugadorEquipoCategoria.id, relacionId))
        .limit(1)
      relacionAnterior = relacion[0] || null
      idRelacionAActualizar = relacionId
    } else {
      // Si no se proporciona relacionId, buscar la primera relación del jugador
      const relacion = await db
        .select()
        .from(jugadorEquipoCategoria)
        .where(
          or(
            eq(jugadorEquipoCategoria.jugador_id, jugadorIdStr),
            eq(jugadorEquipoCategoria.jugador_id, cedulaOriginal)
          )
        )
        .limit(1)
      
      if (relacion.length > 0) {
        relacionAnterior = relacion[0]
        idRelacionAActualizar = relacion[0].id
      }
    }
    
    // Comparar si cambió el equipo_categoria_id (convertir a número para comparar correctamente)
    const equipoCategoriaIdAnterior = relacionAnterior?.equipo_categoria_id
    const equipoCategoriaIdAnteriorNum = typeof equipoCategoriaIdAnterior === 'number' 
      ? equipoCategoriaIdAnterior 
      : (equipoCategoriaIdAnterior ? parseInt(equipoCategoriaIdAnterior.toString()) : null)
    const equipoCategoriaIdNuevoNum = equipo_categoria_id
    
    const equipoCambio = relacionAnterior && 
      equipoCategoriaIdAnteriorNum !== null && 
      equipoCategoriaIdAnteriorNum !== equipoCategoriaIdNuevoNum
    
    // Comparar si cambió el número de jugador
    const numeroJugadorAnterior = relacionAnterior?.numero_jugador
    const numeroJugadorCambio = relacionAnterior && 
      numeroJugadorAnterior !== numeroJugadorValue
    
    // Actualizar la relación
    if (idRelacionAActualizar) {
      await db
        .update(jugadorEquipoCategoria)
        .set({
          equipo_categoria_id: equipo_categoria_id,
          numero_jugador: numeroJugadorValue,
          situacion_jugador: situacionJugadorValue,
          jugador_id: cedula // Usar la cédula actualizada
        })
        .where(eq(jugadorEquipoCategoria.id, idRelacionAActualizar))
    }
    
    // Si cambió el número de jugador (sin cambiar equipo), actualizar el registro más reciente del historial
    if (numeroJugadorCambio && !equipoCambio) {
      try {
        // Obtener el registro más reciente del historial para este jugador
        const historialReciente = await db
          .select()
          .from(historialJugadores)
          .where(eq(historialJugadores.jugador_id, jugadorIdStr))
          .orderBy(desc(historialJugadores.createdAt))
          .limit(1)
        
        if (historialReciente.length > 0) {
          // Actualizar el número en el registro más reciente
          await db
            .update(historialJugadores)
            .set({
              numero: numeroJugadorValue || null,
              updatedAt: new Date()
            })
            .where(eq(historialJugadores.id, historialReciente[0].id))
        }
      } catch (error) {
        console.error('Error al actualizar número de jugador en historial:', error)
        // No lanzar error aquí para no impedir la actualización del jugador
      }
    }
    
    // Si cambió el equipo, registrar en historial_jugadores DESPUÉS de actualizar
    if (equipoCambio) {
      try {
        // Obtener información del nuevo equipo-categoría
        const nuevoEquipoCategoria = await db.query.equipoCategoria.findFirst({
          where: (ec, { eq }) => eq(ec.id, equipo_categoria_id),
          with: {
            equipo: true,
            categoria: true
          }
        })
        
        // Obtener información del equipo anterior
        let equipoAnteriorNombre: string | null = null
        if (relacionAnterior && relacionAnterior.equipo_categoria_id) {
          const equipoAnteriorCategoria = await db.query.equipoCategoria.findFirst({
            where: (ec, { eq }) => eq(ec.id, relacionAnterior.equipo_categoria_id),
            with: {
              equipo: true
            }
          })
          equipoAnteriorNombre = equipoAnteriorCategoria?.equipo?.nombre || null
        }
        
        if (nuevoEquipoCategoria && nuevoEquipoCategoria.equipo) {
          // Obtener la situación ACTUAL del jugador (la más reciente) para guardarla en situacion_jugador_anterior
          // La función createHistorialJugador ya se encarga de obtener la situación actual si no se proporciona
          const historialData: NewHistorialJugador = {
            jugador_id: jugadorIdStr,
            liga: liga,
            equipo: nuevoEquipoCategoria.equipo.nombre,
            equipo_anterior: equipoAnteriorNombre,
            // No proporcionar situacion_jugador_anterior para que createHistorialJugador obtenga la situación actual
            situacion_jugador_anterior: undefined,
            numero: numeroJugadorValue || null,
            nombre_calificacion: null,
            disciplina: null,
            fecha_calificacion: new Date().toISOString().split('T')[0] // Fecha actual como fecha de calificación
          }
          
          await createHistorialJugador(historialData)
        }
      } catch (error) {
        console.error('Error al registrar cambio de equipo en historial:', error)
        // No lanzar error aquí para no impedir la actualización del jugador
      }
    }
    
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al actualizar jugador:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar jugador')
  }
}

// Eliminar relación jugador-equipo-categoría (NO modifica la tabla jugadores)
export async function deleteJugador(id: number | string, relacionId?: number) {
  await requirePermiso('jugadores', 'eliminar')
  try {
    // Convertir a string si es number para mantener consistencia
    const jugadorId = typeof id === 'number' ? id.toString() : id
    
    // Verificar si el ID es válido
    if (!jugadorId || jugadorId.trim() === '') {
      throw new Error('ID de jugador inválido')
    }
    
    // Verificar si el jugador existe
    const jugador = await jugadorQueries.getById(jugadorId)
    if (!jugador) {
      throw new Error('El jugador no existe')
    }
    
    // Obtener la cédula del jugador para buscar relaciones
    const cedulaJugador = jugador.cedula
    
    if (relacionId) {
      // Si se proporciona un ID de relación específico, eliminar solo esa relación
      await db
        .delete(jugadorEquipoCategoria)
        .where(eq(jugadorEquipoCategoria.id, relacionId))
    } else {
      // Si no se proporciona ID de relación, eliminar todas las relaciones del jugador
      // Buscar relaciones por ID del jugador o por cédula (por si están guardadas con cédula)
      await db
        .delete(jugadorEquipoCategoria)
        .where(
          or(
            eq(jugadorEquipoCategoria.jugador_id, jugadorId),
            eq(jugadorEquipoCategoria.jugador_id, cedulaJugador)
          )
        )
    }
    
    // NOTA: NO se elimina el jugador de la tabla jugadores, solo se elimina la relación
    // NOTA: NO se elimina la foto del jugador ya que el jugador sigue existiendo
    
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al eliminar relación jugador-equipo-categoría:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar relación del jugador')
  }
}

export async function deleteMultipleJugadores(ids: number[]) {
  try {
    // Validar que todos los IDs sean números válidos
    if (!ids.every(id => !isNaN(id) && id > 0)) {
      throw new Error('IDs de jugadores inválidos')
    }
    
    // Verificar que todos los jugadores existan antes de eliminarlos
    for (const id of ids) {
      const jugador = await jugadorQueries.getById(id)
      if (!jugador) {
        throw new Error(`El jugador con ID ${id} no existe`)
      }
    }
    
    // Eliminar todos los jugadores
    for (const id of ids) {
      await jugadorQueries.delete(id)
    }
    
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al eliminar jugadores:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar jugadores')
  }
}

export async function searchJugadores(query: string) {
  try {
    const jugadores = await jugadorQueries.getAllWithRelations()
    return jugadores.filter(jugador => 
      jugador.cedula.toLowerCase().includes(query.toLowerCase()) ||
      jugador.apellido_nombre.toLowerCase().includes(query.toLowerCase()) ||
      jugador.nacionalidad.toLowerCase().includes(query.toLowerCase()) ||
      jugador.liga.toLowerCase().includes(query.toLowerCase())
    )
  } catch (error) {
    console.error('Error al buscar jugadores:', error)
    throw new Error('Error al buscar jugadores')
  }
}

export async function searchJugadoresByCedula(cedula: string) {
  try {
    const jugadores = await jugadorQueries.getAllWithRelations()
    return jugadores.filter(jugador => 
      jugador.cedula.toLowerCase().includes(cedula.toLowerCase())
    )
  } catch (error) {
    console.error('Error al buscar jugadores por cédula:', error)
    throw new Error('Error al buscar jugadores por cédula')
  }
}

export async function searchJugadoresByNombre(nombre: string) {
  try {
    const jugadores = await jugadorQueries.getAllWithRelations()
    return jugadores.filter(jugador => 
      jugador.apellido_nombre.toLowerCase().includes(nombre.toLowerCase())
    )
  } catch (error) {
    console.error('Error al buscar jugadores por nombre:', error)
    throw new Error('Error al buscar jugadores por nombre')
  }
}

// ===== EQUIPOS (para formularios) =====

export async function getEquipos() {
  try {
    return await equipoQueries.getAll()
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    throw new Error('Error al obtener equipos')
  }
}

// ===== CATEGORÍAS (para formularios) =====

export async function getCategorias() {
  try {
    return await categoriaQueries.getAll()
  } catch (error) {
    console.error('Error al obtener categorías:', error)
    throw new Error('Error al obtener categorías')
  }
}

// Buscar jugador por cédula
export async function buscarJugadorPorCedula(cedula: string) {
  await requirePermiso('jugadores', 'ver')
  
  try {
    if (!cedula || cedula.trim() === '') {
      return null
    }

    const jugador = await jugadorQueries.getByCedula(cedula.trim())
    
    if (!jugador) {
      return null
    }

    return jugador
  } catch (error) {
    console.error('Error al buscar jugador por cédula:', error)
    return null
  }
}

// ===== HISTORIAL DE JUGADORES =====

export async function getHistorialJugador(jugadorId: number | string) {
  try {
    const jugadorIdString = jugadorId.toString()
    
    // Obtener el jugador para obtener su cédula
    const jugador = await db
      .select({ cedula: jugadores.cedula })
      .from(jugadores)
      .where(eq(jugadores.id, jugadorIdString))
      .limit(1)
    
    if (jugador.length === 0) {
      return []
    }
    
    const cedulaJugador = jugador[0].cedula
    
    // Obtener historial ordenado por fecha de creación descendente (más recientes primero)
    const historial = await db.query.historialJugadores.findMany({
      where: eq(historialJugadores.jugador_id, jugadorIdString),
      orderBy: (historialJugadores, { desc }) => [desc(historialJugadores.createdAt)],
    })
    
    // Obtener la situación actual del jugador (la más reciente)
    const situacionActual = await db
      .select({
        situacion_jugador: jugadorEquipoCategoria.situacion_jugador,
      })
      .from(jugadorEquipoCategoria)
      .where(eq(jugadorEquipoCategoria.jugador_id, cedulaJugador))
      .orderBy(desc(jugadorEquipoCategoria.createdAt))
      .limit(1)
    
    // Agregar la situación actual a cada registro del historial
    const historialConInfo = historial.map((registro) => {
      return {
        ...registro,
        situacion_jugador: situacionActual.length > 0 ? situacionActual[0].situacion_jugador : null,
      }
    })
    
    return historialConInfo
  } catch (error) {
    console.error('Error al obtener historial del jugador:', error)
    throw new Error('Error al obtener historial del jugador')
  }
}

export async function createHistorialJugador(data: NewHistorialJugador) {
  try {
    if (!data.jugador_id || !data.liga) {
      throw new Error('Jugador y Liga son campos obligatorios')
    }

    // Obtener el jugador para obtener su cédula
    const jugador = await db
      .select({ cedula: jugadores.cedula })
      .from(jugadores)
      .where(eq(jugadores.id, data.jugador_id))
      .limit(1)
    
    if (jugador.length === 0) {
      throw new Error('Jugador no encontrado')
    }
    
    const cedulaJugador = jugador[0].cedula
    
    // SIEMPRE obtener la situación ACTUAL del jugador para guardarla en situacion_jugador_anterior
    // Obtener la relación más reciente del jugador (ordenada por updatedAt y luego por id)
    const relacionActual = await db
      .select({
        equipo: equipos.nombre,
        situacion_jugador: jugadorEquipoCategoria.situacion_jugador,
      })
      .from(jugadorEquipoCategoria)
      .innerJoin(equipoCategoria, eq(jugadorEquipoCategoria.equipo_categoria_id, equipoCategoria.id))
      .innerJoin(equipos, eq(equipoCategoria.equipo_id, equipos.id))
      .where(eq(jugadorEquipoCategoria.jugador_id, cedulaJugador))
      .orderBy(desc(jugadorEquipoCategoria.updatedAt), desc(jugadorEquipoCategoria.id))
      .limit(1)
    
    // Obtener la situación ACTUAL del jugador (normalizar PRESTAMO a PRÉSTAMO)
    let situacionActualJugador: string | null = null
    if (relacionActual.length > 0 && relacionActual[0].situacion_jugador) {
      const situacion = relacionActual[0].situacion_jugador
      situacionActualJugador = situacion === 'PRESTAMO' || situacion === 'PRÉSTAMO' ? 'PRÉSTAMO' : situacion
    }
    
    // Obtener el equipo anterior (usar el proporcionado o el actual del jugador)
    const equipoAnterior = data.equipo_anterior || (relacionActual.length > 0 ? relacionActual[0].equipo : null)
    
    // SIEMPRE guardar la situación ACTUAL del jugador en situacion_jugador_anterior
    // (el nombre del campo es confuso, pero guarda la situación actual del jugador en ese momento)
    const situacionJugadorAnterior = situacionActualJugador || data.situacion_jugador_anterior
    
    // Preparar datos con equipo anterior y situación actual del jugador
    const datosCompletos = {
      ...data,
      equipo_anterior: equipoAnterior,
      situacion_jugador_anterior: situacionJugadorAnterior,
    }
    
    const nuevoHistorial = await db.insert(historialJugadores).values(datosCompletos).returning()
    revalidatePath('/jugadores')
    return nuevoHistorial[0]
  } catch (error) {
    console.error('Error al crear historial:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al crear historial')
  }
}

export async function updateHistorialJugador(id: number, data: Partial<NewHistorialJugador>) {
  try {
    const historialActualizado = await db.update(historialJugadores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(historialJugadores.id, id))
      .returning()
    
    if (historialActualizado.length === 0) {
      throw new Error('Registro de historial no encontrado')
    }
    
    revalidatePath('/jugadores')
    return historialActualizado[0]
  } catch (error) {
    console.error('Error al actualizar historial:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar historial')
  }
}

export async function deleteHistorialJugador(id: number) {
  try {
    if (isNaN(id) || id <= 0) {
      throw new Error('ID de historial inválido')
    }
    
    await db.delete(historialJugadores).where(eq(historialJugadores.id, id))
    revalidatePath('/jugadores')
  } catch (error) {
    console.error('Error al eliminar historial:', error)
    throw new Error(error instanceof Error ? error.message : 'Error al eliminar historial')
  }
}

// Detectar jugadores en múltiples categorías o equipos
export async function detectarJugadoresMultiplesCategoriasEquipos(cedulas: string[]) {
  await requirePermiso('jugadores', 'ver')
  
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
      const equiposData = await db.query.equipos.findMany({
        where: (equipos, { inArray }) => inArray(equipos.id, equiposIds)
      })
      equiposData.forEach(e => equiposMap.set(e.id, e.nombre))
    }

    if (categoriasIds.length > 0) {
      const categoriasData = await db.query.categorias.findMany({
        where: (categorias, { inArray }) => inArray(categorias.id, categoriasIds)
      })
      categoriasData.forEach(c => categoriasMap.set(c.id, c.nombre))
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
