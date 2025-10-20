/**
 * Script para migrar usuarios existentes al nuevo sistema de roles
 * Los usuarios que tienen role en users.role se les crea su relación en roles_usuarios
 * Ejecutar con: npx tsx src/db/migrate-users-to-roles.ts
 */

import { db } from './index';
import { users, roles, rolesUsuarios } from './schema';
import { eq } from 'drizzle-orm';

async function migrateUsersToRoles() {
  console.log('🔄 Migrando usuarios al nuevo sistema de roles...\n');

  try {
    // 1. Obtener todos los usuarios
    const allUsers = await db.query.users.findMany();
    console.log(`📊 ${allUsers.length} usuarios encontrados\n`);

    // 2. Obtener todos los roles
    const allRoles = await db.query.roles.findMany();
    
    const rolesMap = new Map(allRoles.map(r => [r.nombre, r]));

    let migrados = 0;
    let yaExistian = 0;

    // 3. Para cada usuario, crear su relación en roles_usuarios
    for (const user of allUsers) {
      if (!user.role) {
        console.log(`   ⚠️  Usuario ${user.id} (${user.email}) sin rol, asignando 'visitante'`);
        // Asignar rol visitante por defecto si no tiene
        await db.update(users)
          .set({ role: 'visitante' })
          .where(eq(users.id, user.id));
      }

      const rolActual = user.role || 'visitante';
      const rol = rolesMap.get(rolActual);

      if (!rol) {
        console.log(`   ❌ Rol "${rolActual}" no encontrado en la tabla roles`);
        continue;
      }

      // Verificar si ya existe la relación
      const relacionExistente = await db.query.rolesUsuarios.findFirst({
        where: (rolesUsuarios, { and, eq }) =>
          and(
            eq(rolesUsuarios.userId, user.id),
            eq(rolesUsuarios.rolId, rol.id)
          ),
      });

      if (relacionExistente) {
        yaExistian++;
        console.log(`   ✓ Usuario ${user.id} (${user.email}) ya tiene rol "${rolActual}"`);
      } else {
        await db.insert(rolesUsuarios).values({
          userId: user.id,
          rolId: rol.id,
          esRolPrincipal: true, // Es su único rol por ahora
        });
        migrados++;
        console.log(`   ✅ Usuario ${user.id} (${user.email}) migrado con rol "${rolActual}"`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ MIGRACIÓN COMPLETADA');
    console.log('='.repeat(50));
    console.log(`\n📊 Resumen:`);
    console.log(`   • Usuarios migrados: ${migrados}`);
    console.log(`   • Ya existían: ${yaExistian}`);
    console.log(`   • Total: ${allUsers.length}`);
    console.log('\n💡 Nota: Los usuarios mantienen su campo "role" para compatibilidad.');
    console.log('   Puedes eliminarlo después si solo usas roles_usuarios.\n');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

migrateUsersToRoles();

