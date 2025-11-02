'use server';

import { db } from '@/db';
import { auth } from '@/auth';
import { rolesUsuarios, rolesMenus, menus, users, roles } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export type MenuItemFromDB = {
  id: number;
  key: string;
  label: string;
  url: string | null;
  icon: string | null;
  parentId: number | null;
  orden: number;
  esTitle: boolean;
  children?: MenuItemFromDB[];
  permisos?: {
    puedeVer: boolean;
    puedeCrear: boolean;
    puedeEditar: boolean;
    puedeEliminar: boolean;
  };
};

/**
 * Obtener menús para el usuario actual basado en sus roles
 */
export async function getMenusParaUsuarioActual(): Promise<MenuItemFromDB[]> {
  try {
    const session = await auth();
    if (!session?.user) {
      return [];
    }

    const userId = session.user.id;
    console.log('👤 Usuario ID:', userId, '| Email:', session.user.email, '| Rol en sesión:', session.user.role);

    // Verificar si hay discrepancia entre el rol en sesión y el rol en la base de datos
    const usuarioEnDB = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true }
    });

    // 1. Obtener roles del usuario desde roles_usuarios
    const rolesDelUsuario = await db.query.rolesUsuarios.findMany({
      where: eq(rolesUsuarios.userId, userId),
      with: {
        rol: true,
      },
    });


    if (rolesDelUsuario.length === 0) {
      
      // Fallback: usar el rol de users.role si no tiene en roles_usuarios
      const rolFallback = await db.query.roles.findFirst({
        where: eq(roles.nombre, session.user.role),
      });
      
      if (rolFallback) {
        rolesDelUsuario.push({ 
          id: 0, 
          userId, 
          rolId: rolFallback.id, 
          esRolPrincipal: true,
          createdAt: null,
          updatedAt: null,
          rol: rolFallback 
        } as any);
      } else {
        return [];
      }
    }

    const rolesIds = rolesDelUsuario.map(r => r.rolId);

    // 2. Obtener permisos del usuario
    const permisos = await db.query.rolesMenus.findMany({
      where: and(
        inArray(rolesMenus.rolId, rolesIds),
        eq(rolesMenus.puedeVer, true)
      ),
      with: {
        menu: true,
      },
    });

    // 3. Obtener IDs únicos de menús permitidos
    const menusIdsPermitidos = [...new Set(permisos.map(p => p.menuId))];

    // 4. Obtener todos los menús permitidos
    const menusPermitidos = await db.query.menus.findMany({
      where: and(
        inArray((menus as any).id, menusIdsPermitidos),
        eq(menus.activo, true)
      ),
      orderBy: (menus, { asc }) => [asc(menus.orden)],
    });

    // 4.1. Obtener también los menús padre necesarios para la jerarquía
    const parentIds = menusPermitidos
      .map(m => m.parentId)
      .filter(id => id !== null) as number[];
    
    const menusPadre = parentIds.length > 0 ? await db.query.menus.findMany({
      where: and(
        inArray((menus as any).id, parentIds),
        eq(menus.activo, true)
      ),
      orderBy: (menus, { asc }) => [asc(menus.orden)],
    }) : [];

    // Combinar menús permitidos con menús padre
    const todosLosMenus = [...menusPermitidos, ...menusPadre.filter(p => !menusPermitidos.some(m => m.id === p.id))];
    
    // 5. Construir estructura jerárquica
    const menusMap = new Map<number, MenuItemFromDB>();
    const menusRaiz: MenuItemFromDB[] = [];

    // Primero crear todos los nodos
    for (const menu of todosLosMenus) {
      const permisosDelMenu = permisos.find(p => p.menuId === menu.id);
      
      const menuItem: MenuItemFromDB = {
        id: menu.id,
        key: menu.key,
        label: menu.label,
        url: menu.url,
        icon: menu.icon,
        parentId: menu.parentId || null,
        orden: menu.orden || 0,
        esTitle: menu.esTitle || false,
        children: [],
        permisos: permisosDelMenu ? {
          puedeVer: permisosDelMenu.puedeVer || false,
          puedeCrear: permisosDelMenu.puedeCrear || false,
          puedeEditar: permisosDelMenu.puedeEditar || false,
          puedeEliminar: permisosDelMenu.puedeEliminar || false,
        } : undefined,
      };

      menusMap.set(menu.id, menuItem);

      if (!menu.parentId) {
        menusRaiz.push(menuItem);
      }
    }

    // Luego construir jerarquía
    for (const menu of todosLosMenus) {
      if (menu.parentId) {
        const padre = menusMap.get(menu.parentId);
        const hijo = menusMap.get(menu.id);
        if (padre && hijo) {
          padre.children!.push(hijo);
        }
      }
    }

    return JSON.parse(JSON.stringify(menusRaiz));
  } catch (error) {
    console.error('Error al obtener menús:', error);
    return [];
  }
}

