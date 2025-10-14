/**
 * Script para crear un usuario administrador inicial
 * Ejecutar con: npx tsx src/lib/seed-admin.ts
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  const adminEmail = 'admin@fixturepro.com';
  const adminPassword = 'admin123'; // Cambiar en producción

  try {
    // Verificar si ya existe el admin
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, adminEmail),
    });

    if (existingAdmin) {
      console.log('✅ Usuario administrador ya existe');
      console.log('Email:', adminEmail);
      return;
    }

    // Crear admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await db.insert(users).values({
      name: 'Administrador',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
    });

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
  } catch (error) {
    console.error('❌ Error al crear administrador:', error);
    process.exit(1);
  }
}

seedAdmin();

