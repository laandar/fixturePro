import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Obtener el rol actual del usuario en la base de datos
    const usuarioEnDB = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true }
    });

    if (!usuarioEnDB) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar si hay discrepancia
    if (usuarioEnDB.role !== session.user.role) {
      console.log('🔄 Rol actualizado en BD:', usuarioEnDB.role);
      console.log('   Cierra sesión y vuelve a iniciar para aplicar cambios');

      return NextResponse.json({ 
        success: true, 
        message: 'Rol actualizado. Cierra sesión y vuelve a iniciar.',
        nuevoRol: usuarioEnDB.role 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'No hay cambios necesarios',
      rolActual: session.user.role 
    });

  } catch (error) {
    console.error('Error al actualizar sesión:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
