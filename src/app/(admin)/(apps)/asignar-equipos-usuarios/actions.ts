'use server';

import { db } from '@/db';
import { users, equipos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';

/**
 * Obtener todos los usuarios con su equipo asignado
 */
export async function getUsuariosConEquipos() {
  await requireAdmin();
  
  try {
    const usuarios = await db.query.users.findMany({
      with: {
        equipo: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)],
    });
    
    // Convertir a objeto plano serializable
    const usuariosSerializados = usuarios.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'admin' | 'arbitro' | 'jugador' | 'visitante',
      equipoId: user.equipoId,
      equipoNombre: user.equipo?.nombre || null,
      createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    }));
    
    return JSON.parse(JSON.stringify(usuariosSerializados));
  } catch (error) {
    console.error('Error al obtener usuarios con equipos:', error);
    throw new Error('Error al obtener usuarios con equipos');
  }
}

/**
 * Obtener todos los equipos disponibles
 */
export async function getEquiposDisponibles() {
  await requireAdmin();
  
  try {
    const equiposList = await db.select({
      id: equipos.id,
      nombre: equipos.nombre,
      estado: equipos.estado,
    })
    .from(equipos)
    .where(eq(equipos.estado, true))
    .orderBy(equipos.nombre);
    
    return JSON.parse(JSON.stringify(equiposList));
  } catch (error) {
    console.error('Error al obtener equipos:', error);
    throw new Error('Error al obtener equipos');
  }
}

/**
 * Asignar un equipo a un usuario
 */
export async function asignarEquipoAUsuario(userId: number, equipoId: number | null) {
  await requireAdmin();
  
  try {
    // Verificar que el usuario existe
    const usuario = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    
    // Si se proporciona un equipoId, verificar que el equipo existe
    if (equipoId !== null) {
      const equipo = await db.query.equipos.findFirst({
        where: eq(equipos.id, equipoId),
      });
      
      if (!equipo) {
        throw new Error('Equipo no encontrado');
      }
    }
    
    // Actualizar el usuario
    await db.update(users)
      .set({
        equipoId: equipoId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    revalidatePath('/asignar-equipos-usuarios');
    return { success: true, message: equipoId ? 'Equipo asignado exitosamente' : 'Equipo removido exitosamente' };
  } catch (error: any) {
    console.error('Error al asignar equipo:', error);
    throw new Error(error.message || 'Error al asignar equipo al usuario');
  }
}

/**
 * Asignar equipos a múltiples usuarios
 */
export async function asignarEquiposMasivo(usuariosIds: number[], equipoId: number | null) {
  await requireAdmin();
  
  try {
    // Si se proporciona un equipoId, verificar que el equipo existe
    if (equipoId !== null) {
      const equipo = await db.query.equipos.findFirst({
        where: eq(equipos.id, equipoId),
      });
      
      if (!equipo) {
        throw new Error('Equipo no encontrado');
      }
    }
    
    // Actualizar todos los usuarios
    for (const userId of usuariosIds) {
      await db.update(users)
        .set({
          equipoId: equipoId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }
    
    revalidatePath('/asignar-equipos-usuarios');
    return { success: true, message: `Equipo ${equipoId ? 'asignado' : 'removido'} a ${usuariosIds.length} usuarios exitosamente` };
  } catch (error: any) {
    console.error('Error al asignar equipos masivamente:', error);
    throw new Error(error.message || 'Error al asignar equipos a usuarios');
  }
}

