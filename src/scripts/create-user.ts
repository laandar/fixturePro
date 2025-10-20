#!/usr/bin/env tsx

/**
 * Script para crear usuarios con diferentes roles
 * Uso: npx tsx src/scripts/create-user.ts [opciones]
 * 
 * Ejemplos:
 * npx tsx src/scripts/create-user.ts --name "Juan Pérez" --email "juan@example.com" --password "123456" --role "admin"
 * npx tsx src/scripts/create-user.ts --name "María García" --email "maria@example.com" --password "123456" --role "arbitro"
 * npx tsx src/scripts/create-user.ts --name "Carlos López" --email "carlos@example.com" --password "123456" --role "jugador"
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

interface CreateUserOptions {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'arbitro' | 'jugador' | 'visitante';
  equipoId?: number;
}

async function createUser(options: CreateUserOptions) {
  const { name, email, password, role, equipoId } = options;

  try {
    console.log('🔍 Verificando si el usuario ya existe...');
    
    // Verificar si ya existe el usuario
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      console.log('❌ Error: Ya existe un usuario con este email');
      console.log('Email:', email);
      console.log('Usuario existente:', existingUser.name);
      return;
    }

    console.log('🔐 Hasheando contraseña...');
    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('👤 Creando usuario...');
    // Crear usuario
    const newUser = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role,
      equipoId: equipoId || null,
    }).returning();

    console.log('✅ Usuario creado exitosamente!');
    console.log('📋 Detalles del usuario:');
    console.log('   ID:', newUser[0].id);
    console.log('   Nombre:', newUser[0].name);
    console.log('   Email:', newUser[0].email);
    console.log('   Rol:', newUser[0].role);
    console.log('   Equipo ID:', newUser[0].equipoId || 'No asignado');
    console.log('   Creado:', newUser[0].createdAt);
    
  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    process.exit(1);
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log(`
📖 Uso del script create-user.ts

Comando:
  npx tsx src/scripts/create-user.ts [opciones]

Opciones:
  --name <nombre>        Nombre completo del usuario (requerido)
  --email <email>        Email del usuario (requerido)
  --password <password>  Contraseña del usuario (requerido)
  --role <rol>           Rol del usuario: admin, arbitro, jugador, visitante (requerido)
  --equipo-id <id>       ID del equipo (opcional, solo para jugadores)
  --help                 Mostrar esta ayuda

Ejemplos:
  # Crear administrador
  npx tsx src/scripts/create-user.ts --name "Admin Principal" --email "admin@fixturepro.com" --password "admin123" --role "admin"

  # Crear árbitro
  npx tsx src/scripts/create-user.ts --name "Carlos Arbitro" --email "arbitro@fixturepro.com" --password "arbitro123" --role "arbitro"

  # Crear jugador
  npx tsx src/scripts/create-user.ts --name "Juan Jugador" --email "jugador@fixturepro.com" --password "jugador123" --role "jugador" --equipo-id 1

  # Crear visitante
  npx tsx src/scripts/create-user.ts --name "María Visitante" --email "visitante@fixturepro.com" --password "visitante123" --role "visitante"

Roles disponibles:
  - admin: Administrador del sistema
  - arbitro: Árbitro de partidos
  - jugador: Jugador de fútbol
  - visitante: Usuario con acceso limitado
`);
}

// Función para parsear argumentos de línea de comandos
function parseArgs(): CreateUserOptions | null {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    showHelp();
    return null;
  }

  const options: Partial<CreateUserOptions> = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--name':
        options.name = value;
        break;
      case '--email':
        options.email = value;
        break;
      case '--password':
        options.password = value;
        break;
      case '--role':
        if (!['admin', 'arbitro', 'jugador', 'visitante'].includes(value)) {
          console.error('❌ Error: Rol inválido. Roles válidos: admin, arbitro, jugador, visitante');
          process.exit(1);
        }
        options.role = value as CreateUserOptions['role'];
        break;
      case '--equipo-id':
        options.equipoId = parseInt(value);
        break;
      default:
        console.error(`❌ Error: Opción desconocida: ${key}`);
        showHelp();
        process.exit(1);
    }
  }

  // Validar campos requeridos
  const requiredFields = ['name', 'email', 'password', 'role'];
  const missingFields = requiredFields.filter(field => !options[field as keyof CreateUserOptions]);
  
  if (missingFields.length > 0) {
    console.error('❌ Error: Faltan campos requeridos:', missingFields.join(', '));
    showHelp();
    process.exit(1);
  }

  return options as CreateUserOptions;
}

// Función principal
async function main() {
  console.log('🚀 Script de creación de usuarios - FixturePro');
  console.log('===============================================\n');
  
  const options = parseArgs();
  
  if (!options) {
    return; // Se mostró la ayuda
  }
  
  await createUser(options);
  
  console.log('\n🎉 Proceso completado!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}
