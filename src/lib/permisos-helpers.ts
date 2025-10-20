/**
 * Helpers para el sistema dinámico de roles y permisos
 */

import { db } from '@/db';
import { rolesUsuarios, rolesMenus, menus as menusTable } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@/auth';

/**
 * Obtener todos los roles de un usuario
 */
export async function getRolesDeUsuario(userId: number) {
  const roles = await db.query.rolesUsuarios.findMany({
    where: eq(rolesUsuarios.userId, userId),
    with: {
      rol: true,
    },
  });
  
  return roles.map(r => r.rol);
}

/**
 * Obtener el rol principal de un usuario
 */
export async function getRolPrincipalDeUsuario(userId: number) {
  const rolPrincipal = await db.query.rolesUsuarios.findFirst({
    where: and(
      eq(rolesUsuarios.userId, userId),
      eq(rolesUsuarios.esRolPrincipal, true)
    ),
    with: {
      rol: true,
    },
  });
  
  return rolPrincipal?.rol || null;
}

/**
 * Verificar si un usuario tiene un permiso específico sobre un recurso
 */
export async function usuarioTienePermiso(
  userId: number,
  menuKey: string,
  accion: 'ver' | 'crear' | 'editar' | 'eliminar'
): Promise<boolean> {
  // 1. Obtener roles del usuario
  const rolesDelUsuario = await getRolesDeUsuario(userId);
  if (rolesDelUsuario.length === 0) return false;
  
  const rolesIds = rolesDelUsuario.map(r => r.id);
  
  // 2. Buscar el menú
  const menu = await db.query.menus.findFirst({
    where: (menus, { eq }) => eq(menus.key, menuKey),
  });
  
  if (!menu) return false;
  
  // 3. Buscar permisos
  const permisos = await db.query.rolesMenus.findMany({
    where: and(
      inArray(rolesMenus.rolId, rolesIds),
      eq(rolesMenus.menuId, menu.id)
    ),
  });
  
  // 4. Verificar si tiene el permiso específico
  return permisos.some(p => {
    if (accion === 'ver') return p.puedeVer;
    if (accion === 'crear') return p.puedeCrear;
    if (accion === 'editar') return p.puedeEditar;
    if (accion === 'eliminar') return p.puedeEliminar;
    return false;
  });
}

/**
 * Obtener menús visibles para un usuario
 */
export async function getMenusParaUsuario(userId: number) {
  // 1. Obtener roles del usuario
  const rolesDelUsuario = await getRolesDeUsuario(userId);
  if (rolesDelUsuario.length === 0) return [];
  
  const rolesIds = rolesDelUsuario.map(r => r.id);
  
  // 2. Obtener permisos del usuario (cualquier rol que tenga)
  const permisos = await db.query.rolesMenus.findMany({
    where: and(
      inArray(rolesMenus.rolId, rolesIds),
      eq(rolesMenus.puedeVer, true)
    ),
    with: {
      menu: true,
    },
  });
  
  // 3. Obtener menús únicos
  const menusIds = [...new Set(permisos.map(p => p.menuId))];
  
  const menusResult = await db.select()
    .from(menusTable)
    .where(and(
      inArray(menusTable.id, menusIds),
      eq(menusTable.activo, true)
    ))
    .orderBy(menusTable.orden);
  
  return menusResult;
}

/**
 * Verificar si el usuario actual tiene permiso
 */
export async function currentUserTienePermiso(
  menuKey: string,
  accion: 'ver' | 'crear' | 'editar' | 'eliminar'
): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  
  return await usuarioTienePermiso(session.user.id, menuKey, accion);
}

