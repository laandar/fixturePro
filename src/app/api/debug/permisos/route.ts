import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, roles, rolesUsuarios, rolesMenus, menus } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No hay sesión de usuario' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 1. Obtener información del usuario
    const usuario = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true, role: true }
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // 2. Obtener roles del usuario en roles_usuarios
    const rolesDelUsuario = await db.query.rolesUsuarios.findMany({
      where: eq(rolesUsuarios.userId, userId),
      with: {
        rol: {
          columns: { id: true, nombre: true }
        }
      }
    });

    const rolesEnDB = rolesDelUsuario.map(r => ({
      id: r.rol.id,
      nombre: r.rol.nombre,
      esRolPrincipal: r.esRolPrincipal
    }));

    // 3. Obtener permisos del usuario
    let permisos: any[] = [];
    
    if (rolesDelUsuario.length > 0) {
      const rolesIds = rolesDelUsuario.map(r => r.rolId);
      
      const permisosDelUsuario = await db.query.rolesMenus.findMany({
        where: and(
          eq(rolesMenus.rolId, rolesIds[0]), // Solo el primer rol por ahora
          eq(rolesMenus.puedeVer, true)
        ),
        with: {
          menu: {
            columns: { id: true, label: true, key: true, url: true }
          }
        }
      });

      permisos = permisosDelUsuario.map(p => ({
        menuId: p.menu.id,
        menuLabel: p.menu.label,
        menuKey: p.menu.key,
        menuUrl: p.menu.url,
        puedeVer: p.puedeVer,
        puedeCrear: p.puedeCrear,
        puedeEditar: p.puedeEditar,
        puedeEliminar: p.puedeEliminar
      }));
    }

    const usuarioInfo = {
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      rolesEnDB,
      permisos
    };

    return NextResponse.json({
      success: true,
      data: usuarioInfo
    });

  } catch (error) {
    console.error('Error en debug de permisos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al obtener información de permisos' 
      },
      { status: 500 }
    );
  }
}
