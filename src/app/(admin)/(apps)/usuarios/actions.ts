'use server';

import { db } from '@/db';
import { users, roles, rolesUsuarios } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';

export type Usuario = typeof users.$inferSelect;

/**
 * Obtener todos los roles disponibles
 */
export async function getRolesDisponibles() {
  try {
    const allRoles = await db.query.roles.findMany({
      where: eq(roles.activo, true),
      orderBy: (roles, { asc }) => [asc(roles.nivel)],
    });
    
    return allRoles.map(rol => ({
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      nivel: rol.nivel,
    }));
  } catch (error) {
    console.error('Error al obtener roles:', error);
    // Si hay error (tabla no existe aún), devolver roles por defecto
    return [
      { id: 1, nombre: 'admin', descripcion: 'Administrador', nivel: 1 },
      { id: 2, nombre: 'arbitro', descripcion: 'Árbitro', nivel: 2 },
      { id: 3, nombre: 'jugador', descripcion: 'Jugador', nivel: 3 },
      { id: 4, nombre: 'visitante', descripcion: 'Visitante', nivel: 4 },
    ];
  }
}

/**
 * Obtener todos los usuarios
 */
export async function getUsuarios() {
  await requireAdmin(); // Solo admins pueden ver usuarios
  
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
    
    // Convertir a objeto plano serializable con fechas en formato string
    const usuarios = allUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'admin' | 'arbitro' | 'jugador' | 'visitante',
      equipoId: user.equipoId,
      createdAt: user.createdAt ? user.createdAt.toISOString() : null,
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
      emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
      image: user.image,
    }));
    
    return JSON.parse(JSON.stringify(usuarios));
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw new Error('Error al obtener usuarios');
  }
}

/**
 * Crear un nuevo usuario
 */
export async function createUsuario(formData: FormData) {
  await requireAdmin();
  
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as 'admin' | 'arbitro' | 'jugador' | 'visitante';
  const equipoId = formData.get('equipoId') as string;

  // Validaciones
  if (!name || !email || !password) {
    throw new Error('Nombre, email y contraseña son requeridos');
  }

  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  try {
    // Verificar si el email ya existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const nuevoUsuario = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: role || 'visitante',
      equipoId: equipoId ? parseInt(equipoId) : null,
    }).returning();

    // Sincronizar con roles_usuarios
    const rolFinal = role || 'visitante';
    const rolEnDB = await db.query.roles.findFirst({
      where: eq(roles.nombre, rolFinal),
    });

    if (rolEnDB && nuevoUsuario[0]) {
      await db.insert(rolesUsuarios).values({
        userId: nuevoUsuario[0].id,
        rolId: rolEnDB.id,
        esRolPrincipal: true,
      });

      console.log(`✅ Usuario creado y rol en roles_usuarios: Usuario ${nuevoUsuario[0].id} tiene rol "${rolFinal}" (ID: ${rolEnDB.id})`);
    }

    revalidatePath('/usuarios');
    return { success: true, message: 'Usuario creado exitosamente' };
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
}

/**
 * Actualizar un usuario
 */
export async function updateUsuario(id: number, formData: FormData) {
  await requireAdmin();
  
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as 'admin' | 'arbitro' | 'jugador' | 'visitante';
  const equipoId = formData.get('equipoId') as string;

  try {
    // Verificar si el email ya existe en otro usuario
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser && existingUser.id !== id) {
      throw new Error('El email ya está registrado por otro usuario');
    }

    // Obtener el usuario actual para verificar si el rol cambió
    const usuarioActual = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    const nuevoRol = role || 'visitante';
    const rolCambio = usuarioActual?.role !== nuevoRol;

    const updateData: any = {
      name,
      email,
      role: nuevoRol,
      equipoId: equipoId ? parseInt(equipoId) : null,
      updatedAt: new Date(),
    };

    // Solo actualizar password si se proporcionó uno nuevo
    if (password && password.length > 0) {
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, id));

    // Si el rol cambió, actualizar SOLO en roles_usuarios
    if (rolCambio) {
      const rolEnDB = await db.query.roles.findFirst({
        where: eq(roles.nombre, nuevoRol),
      });

      if (rolEnDB) {
        // Eliminar todos los roles existentes del usuario
        await db.delete(rolesUsuarios)
          .where(eq(rolesUsuarios.userId, id));

        // Agregar el nuevo rol como rol principal
        await db.insert(rolesUsuarios).values({
          userId: id,
          rolId: rolEnDB.id,
          esRolPrincipal: true,
        });

        console.log(`✅ Rol actualizado en roles_usuarios: Usuario ${id} ahora tiene rol "${nuevoRol}" (ID: ${rolEnDB.id})`);
      }
    }

    revalidatePath('/usuarios');
    return { success: true, message: 'Usuario actualizado exitosamente' };
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    throw error;
  }
}

/**
 * Cambiar rol de un usuario
 */
export async function cambiarRol(
  userId: number,
  nuevoRol: 'admin' | 'arbitro' | 'jugador' | 'visitante'
) {
  await requireAdmin();
  
  try {
    // 1. Obtener el ID del rol desde la tabla roles
    const rolEnDB = await db.query.roles.findFirst({
      where: eq(roles.nombre, nuevoRol),
    });

    if (!rolEnDB) {
      throw new Error(`No se encontró el rol "${nuevoRol}" en la base de datos`);
    }

    // 2. Actualizar SOLO en roles_usuarios
    // Primero eliminar todos los roles existentes del usuario
    await db.delete(rolesUsuarios)
      .where(eq(rolesUsuarios.userId, userId));

    // Luego agregar el nuevo rol como rol principal
    await db.insert(rolesUsuarios).values({
      userId,
      rolId: rolEnDB.id,
      esRolPrincipal: true,
    });

    console.log(`✅ Rol actualizado en roles_usuarios: Usuario ${userId} ahora tiene rol "${nuevoRol}" (ID: ${rolEnDB.id})`);

    revalidatePath('/usuarios');
    return { success: true, message: 'Rol actualizado exitosamente' };
  } catch (error) {
    console.error('Error al cambiar rol:', error);
    throw new Error('Error al cambiar el rol del usuario');
  }
}

/**
 * Eliminar un usuario
 */
export async function deleteUsuario(id: number) {
  await requireAdmin();
  
  try {
    await db.delete(users).where(eq(users.id, id));
    
    revalidatePath('/usuarios');
    return { success: true, message: 'Usuario eliminado exitosamente' };
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    throw new Error('Error al eliminar el usuario');
  }
}

/**
 * Eliminar múltiples usuarios
 */
export async function deleteMultipleUsuarios(ids: number[]) {
  await requireAdmin();
  
  try {
    for (const id of ids) {
      await db.delete(users).where(eq(users.id, id));
    }
    
    revalidatePath('/usuarios');
    return { success: true, message: `${ids.length} usuarios eliminados exitosamente` };
  } catch (error) {
    console.error('Error al eliminar usuarios:', error);
    throw new Error('Error al eliminar los usuarios');
  }
}

/**
 * Resetear contraseña de un usuario
 */
export async function resetPassword(userId: number, newPassword: string) {
  await requireAdmin();
  
  if (newPassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    revalidatePath('/usuarios');
    return { success: true, message: 'Contraseña reseteada exitosamente' };
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    throw new Error('Error al resetear la contraseña');
  }
}

