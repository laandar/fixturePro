'use server'

import { currentUserTienePermiso } from '@/lib/permisos-helpers'
import { auth } from '@/auth'
import { db } from '@/db'
import { rolesUsuarios, rolesMenus, roles, menus } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

/**
 * Server action para obtener los permisos del usuario actual sobre un recurso
 * @param menuKey - El key del menú/recurso
 */
export async function obtenerPermisosUsuario(menuKey: string) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return {
        puedeVer: false,
        puedeCrear: false,
        puedeEditar: false,
        puedeEliminar: false,
      }
    }

    // Si es admin (rol legacy o nuevo), dar todos los permisos
    if (session.user.role === 'admin') {
      return {
        puedeVer: true,
        puedeCrear: true,
        puedeEditar: true,
        puedeEliminar: true,
      }
    }

    // 1. Buscar el menú
    const menu = await db.query.menus.findFirst({
      where: eq(menus.key, menuKey),
    });

    if (!menu) {
      console.log(`❌ Menú "${menuKey}" no encontrado en BD`);
      return {
        puedeVer: false,
        puedeCrear: false,
        puedeEditar: false,
        puedeEliminar: false,
      }
    }

    // 2. Obtener roles del usuario (sistema nuevo: roles_usuarios)
    const rolesDelUsuario = await db.query.rolesUsuarios.findMany({
      where: eq(rolesUsuarios.userId, session.user.id),
      with: { rol: true },
    });

    let rolesIds: number[] = [];

    if (rolesDelUsuario.length > 0) {
      // Usuario tiene roles en el sistema nuevo
      rolesIds = rolesDelUsuario.map(r => r.rolId);
    } else {
      // Fallback: buscar rol por nombre legacy
      const rolLegacy = await db.query.roles.findFirst({
        where: eq(roles.nombre, session.user.role),
      });

      if (rolLegacy) {
        rolesIds = [rolLegacy.id];
        console.log(`🔄 Usando rol legacy: ${session.user.role} (ID: ${rolLegacy.id})`);
      } else {
        console.log(`❌ No se encontró rol para: ${session.user.role}`);
        return {
          puedeVer: false,
          puedeCrear: false,
          puedeEditar: false,
          puedeEliminar: false,
        }
      }
    }

    // 3. Buscar permisos
    const permisosEncontrados = await db.query.rolesMenus.findMany({
      where: and(
        inArray(rolesMenus.rolId, rolesIds),
        eq(rolesMenus.menuId, menu.id)
      ),
    });

    if (permisosEncontrados.length === 0) {
      console.log(`⚠️ No hay permisos configurados para roles [${rolesIds}] en menú "${menuKey}"`);
    }

    // 4. Combinar permisos (si tiene varios roles, usar el más permisivo)
    const puedeVer = permisosEncontrados.some(p => p.puedeVer);
    const puedeCrear = permisosEncontrados.some(p => p.puedeCrear);
    const puedeEditar = permisosEncontrados.some(p => p.puedeEditar);
    const puedeEliminar = permisosEncontrados.some(p => p.puedeEliminar);

    return {
      puedeVer,
      puedeCrear,
      puedeEditar,
      puedeEliminar,
    }
  } catch (error) {
    console.error('Error al obtener permisos:', error)
    return {
      puedeVer: false,
      puedeCrear: false,
      puedeEditar: false,
      puedeEliminar: false,
    }
  }
}


