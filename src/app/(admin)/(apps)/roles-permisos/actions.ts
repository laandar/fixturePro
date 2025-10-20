'use server';

import { db } from '@/db';
import { roles, menus, rolesMenus, rolesUsuarios } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';

// ==================== ROLES ====================

export async function getRoles() {
  await requireAdmin();
  
  const allRoles = await db.query.roles.findMany({
    orderBy: (roles, { asc }) => [asc(roles.nivel)],
  });
  
  return JSON.parse(JSON.stringify(allRoles));
}

export async function createRol(formData: FormData) {
  await requireAdmin();
  
  const nombre = formData.get('nombre') as string;
  const descripcion = formData.get('descripcion') as string;
  const nivel = parseInt(formData.get('nivel') as string);

  if (!nombre || !nivel) {
    throw new Error('Nombre y nivel son requeridos');
  }

  const existing = await db.query.roles.findFirst({
    where: eq(roles.nombre, nombre),
  });

  if (existing) {
    throw new Error('Ya existe un rol con ese nombre');
  }

  await db.insert(roles).values({
    nombre,
    descripcion,
    nivel,
  });

  revalidatePath('/roles-permisos');
  return { success: true, message: 'Rol creado exitosamente' };
}

export async function updateRol(id: number, formData: FormData) {
  await requireAdmin();
  
  const descripcion = formData.get('descripcion') as string;
  const nivel = parseInt(formData.get('nivel') as string);
  const activo = formData.get('activo') === 'true';

  await db.update(roles)
    .set({ descripcion, nivel, activo, updatedAt: new Date() })
    .where(eq(roles.id, id));

  revalidatePath('/roles-permisos');
  return { success: true, message: 'Rol actualizado' };
}

export async function deleteRol(id: number) {
  await requireAdmin();
  
  // No permitir eliminar roles del sistema base
  const rol = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (rol && ['admin', 'arbitro', 'jugador', 'visitante'].includes(rol.nombre)) {
    throw new Error('No se pueden eliminar los roles del sistema base');
  }

  await db.delete(roles).where(eq(roles.id, id));
  revalidatePath('/roles-permisos');
  return { success: true };
}

// ==================== MENÚS ====================

export async function getMenus() {
  await requireAdmin();
  
  const allMenus = await db.query.menus.findMany({
    orderBy: (menus, { asc }) => [asc(menus.orden)],
    with: {
      menuPadre: true,
      menusHijos: true,
    },
  });
  
  return JSON.parse(JSON.stringify(allMenus));
}

export async function createMenu(formData: FormData) {
  await requireAdmin();
  
  const key = formData.get('key') as string;
  const label = formData.get('label') as string;
  const url = formData.get('url') as string;
  const icon = formData.get('icon') as string;
  const parentId = formData.get('parentId') as string;
  const orden = parseInt(formData.get('orden') as string);
  const esTitle = formData.get('esTitle') === 'true';

  if (!key || !label) {
    throw new Error('Key y label son requeridos');
  }

  await db.insert(menus).values({
    key,
    label,
    url: url || null,
    icon: icon || null,
    parentId: parentId ? parseInt(parentId) : null,
    orden: orden || 0,
    esTitle,
  });

  revalidatePath('/roles-permisos');
  return { success: true, message: 'Menú creado exitosamente' };
}

export async function updateMenu(id: number, formData: FormData) {
  await requireAdmin();
  
  const label = formData.get('label') as string;
  const url = formData.get('url') as string;
  const icon = formData.get('icon') as string;
  const orden = parseInt(formData.get('orden') as string);
  const activo = formData.get('activo') === 'true';

  await db.update(menus)
    .set({ label, url, icon, orden, activo, updatedAt: new Date() })
    .where(eq(menus.id, id));

  revalidatePath('/roles-permisos');
  return { success: true, message: 'Menú actualizado' };
}

export async function deleteMenu(id: number) {
  await requireAdmin();
  
  await db.delete(menus).where(eq(menus.id, id));
  revalidatePath('/roles-permisos');
  return { success: true };
}

// ==================== PERMISOS (ROLES-MENUS) ====================

export async function getPermisosMatrix() {
  await requireAdmin();
  
  const allRoles = await db.query.roles.findMany({
    orderBy: (roles, { asc }) => [asc(roles.nivel)],
  });
  
  const allMenus = await db.query.menus.findMany({
    where: eq(menus.activo, true),
    orderBy: (menus, { asc }) => [asc(menus.orden)],
  });
  
  const allPermisos = await db.query.rolesMenus.findMany({
    with: {
      rol: true,
      menu: true,
    },
  });
  
  return {
    roles: JSON.parse(JSON.stringify(allRoles)),
    menus: JSON.parse(JSON.stringify(allMenus)),
    permisos: JSON.parse(JSON.stringify(allPermisos)),
  };
}

export async function setPermiso(
  rolId: number,
  menuId: number,
  tipo: 'ver' | 'crear' | 'editar' | 'eliminar',
  valor: boolean
) {
  await requireAdmin();
  
  const existing = await db.query.rolesMenus.findFirst({
    where: and(
      eq(rolesMenus.rolId, rolId),
      eq(rolesMenus.menuId, menuId)
    ),
  });

  const updateData: any = {};
  if (tipo === 'ver') updateData.puedeVer = valor;
  if (tipo === 'crear') updateData.puedeCrear = valor;
  if (tipo === 'editar') updateData.puedeEditar = valor;
  if (tipo === 'eliminar') updateData.puedeEliminar = valor;

  if (existing) {
    await db.update(rolesMenus)
      .set(updateData)
      .where(eq(rolesMenus.id, existing.id));
  } else {
    await db.insert(rolesMenus).values({
      rolId,
      menuId,
      ...updateData,
    });
  }

  // Revalidar múltiples paths para actualizar el menú en tiempo real
  revalidatePath('/roles-permisos');
  revalidatePath('/', 'layout'); // Revalida todo el layout (incluye el menú)
  return { success: true };
}

// ==================== ROLES-USUARIOS ====================

export async function getRolesDeUsuario(userId: number) {
  const rolesDelUsuario = await db.query.rolesUsuarios.findMany({
    where: eq(rolesUsuarios.userId, userId),
    with: {
      rol: true,
    },
  });
  
  return JSON.parse(JSON.stringify(rolesDelUsuario));
}

export async function asignarRolAUsuario(userId: number, rolId: number, esRolPrincipal: boolean = false) {
  await requireAdmin();
  
  const existing = await db.query.rolesUsuarios.findFirst({
    where: and(
      eq(rolesUsuarios.userId, userId),
      eq(rolesUsuarios.rolId, rolId)
    ),
  });

  if (existing) {
    throw new Error('El usuario ya tiene este rol asignado');
  }

  // Si es rol principal, quitar el flag de otros roles
  if (esRolPrincipal) {
    await db.update(rolesUsuarios)
      .set({ esRolPrincipal: false })
      .where(eq(rolesUsuarios.userId, userId));
  }

  await db.insert(rolesUsuarios).values({
    userId,
    rolId,
    esRolPrincipal,
  });

  revalidatePath('/usuarios');
  return { success: true, message: 'Rol asignado al usuario' };
}

export async function removerRolDeUsuario(userId: number, rolId: number) {
  await requireAdmin();
  
  await db.delete(rolesUsuarios)
    .where(and(
      eq(rolesUsuarios.userId, userId),
      eq(rolesUsuarios.rolId, rolId)
    ));

  revalidatePath('/usuarios');
  return { success: true, message: 'Rol removido del usuario' };
}

export async function cambiarRolPrincipal(userId: number, rolId: number) {
  await requireAdmin();
  
  // Quitar flag de todos los roles del usuario
  await db.update(rolesUsuarios)
    .set({ esRolPrincipal: false })
    .where(eq(rolesUsuarios.userId, userId));
  
  // Setear el nuevo rol principal
  await db.update(rolesUsuarios)
    .set({ esRolPrincipal: true })
    .where(and(
      eq(rolesUsuarios.userId, userId),
      eq(rolesUsuarios.rolId, rolId)
    ));

  revalidatePath('/usuarios');
  return { success: true, message: 'Rol principal actualizado' };
}

