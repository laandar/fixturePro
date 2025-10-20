import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';

async function fixUserRole() {
  try {
    console.log('🔧 Actualizando rol del usuario...');
    
    // Actualizar el rol del usuario de 'visitante' a 'admin'
    const result = await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.email, 'darwin.sinche@gmail.com'));
    
    console.log('✅ Rol actualizado exitosamente');
    console.log('📧 Email:', 'darwin.sinche@gmail.com');
    console.log('🔄 Rol anterior: visitante');
    console.log('✅ Rol nuevo: vocal');
    
    // Verificar el cambio
    const user = await db.query.users.findFirst({
      where: eq(users.email, 'darwin.sinche@gmail.com'),
      columns: { id: true, email: true, role: true }
    });
    
    console.log('🔍 Verificación:');
    console.log('   ID:', user?.id);
    console.log('   Email:', user?.email);
    console.log('   Rol:', user?.role);
    
  } catch (error) {
    console.error('❌ Error al actualizar rol:', error);
  }
}

fixUserRole();
