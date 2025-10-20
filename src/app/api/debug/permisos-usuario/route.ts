import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { rolesUsuarios, rolesMenus } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener roles del usuario
    const rolesDelUsuario = await db.query.rolesUsuarios.findMany({
      where: eq(rolesUsuarios.userId, session.user.id),
      with: {
        rol: true,
      },
    });

    const rolesIds = rolesDelUsuario.map(r => r.rolId);

    // Obtener todos los permisos de esos roles
    const permisos = await db.query.rolesMenus.findMany({
      where: inArray(rolesMenus.rolId, rolesIds),
      with: {
        menu: true,
        rol: true,
      },
    });

    return NextResponse.json({
      usuario: {
        id: session.user.id,
        email: session.user.email,
        rolLegacy: session.user.role,
      },
      roles: rolesDelUsuario.map(r => r.rol),
      permisos: permisos.map(p => ({
        menuKey: p.menu.key,
        menuLabel: p.menu.label,
        rolNombre: p.rol.nombre,
        puedeVer: p.puedeVer,
        puedeCrear: p.puedeCrear,
        puedeEditar: p.puedeEditar,
        puedeEliminar: p.puedeEliminar,
      })),
    });
  } catch (error: any) {
    console.error('Error en debug permisos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

