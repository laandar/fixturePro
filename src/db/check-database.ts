import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Fu41a07..@localhost:5432/FixturePro';

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function checkDatabase() {
  console.log('🔍 Verificando estado de la base de datos...\n');

  try {
    // Verificar si existe la tabla de migraciones de Drizzle
    const migrationsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      );
    `);

    const hasMigrationsTable = (migrationsTableExists[0] as { exists: boolean }).exists;

    if (!hasMigrationsTable) {
      console.log('⚠️  No se encontró la tabla de migraciones de Drizzle.');
      console.log('   Esto significa que la base de datos no ha sido inicializada con Drizzle.\n');
      console.log('💡 Solución: Ejecuta "npm run db:push" para sincronizar el esquema con la base de datos.\n');
      return;
    }

    // Obtener las migraciones aplicadas en la base de datos
    const appliedMigrations = await db.execute(sql`
      SELECT hash, created_at 
      FROM __drizzle_migrations 
      ORDER BY created_at DESC;
    `);

    console.log(`✅ Migraciones aplicadas en la base de datos: ${appliedMigrations.length}\n`);

    if (appliedMigrations.length > 0) {
      console.log('📋 Últimas 10 migraciones aplicadas:');
      appliedMigrations.slice(0, 10).forEach((migration: any, index: number) => {
        console.log(`   ${index + 1}. ${migration.hash} (${new Date(migration.created_at).toLocaleString()})`);
      });
      if (appliedMigrations.length > 10) {
        console.log(`   ... y ${appliedMigrations.length - 10} más`);
      }
      console.log('');
    }

    // Verificar tablas del esquema
    const schemaTables = Object.keys(schema).filter(
      (key) => !key.includes('Relations') && typeof (schema as any)[key] === 'object'
    );

    console.log(`📊 Tablas definidas en el esquema: ${schemaTables.length}\n`);

    // Verificar qué tablas existen en la base de datos
    const existingTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '__drizzle%'
      ORDER BY table_name;
    `);

    const tableNames = (existingTables as any[]).map((t: any) => t.table_name);
    console.log(`✅ Tablas existentes en la base de datos: ${tableNames.length}\n`);

    // Comparar tablas del esquema con las de la base de datos
    const missingTables: string[] = [];
    const extraTables: string[] = [];

    // Tablas esperadas del esquema (nombres reales de las tablas)
    const expectedTables = [
      'categorias',
      'entrenadores',
      'equipos',
      'jugadores',
      'equipo_categoria',
      'jugador_equipo_categoria',
      'torneos',
      'equipos_torneo',
      'horarios',
      'encuentros',
      'equipos_descansan',
      'canchas',
      'canchas_categorias',
      'goles',
      'tarjetas',
      'jugadores_participantes',
      'cambios_jugadores',
      'firmas_encuentros',
      'pagos_multas',
      'cargos_manuales',
      'historial_jugadores',
      'configuraciones',
      'users',
      'accounts',
      'sessions',
      'verification_tokens',
      'roles',
      'menus',
      'roles_menus',
      'roles_usuarios',
    ];

    expectedTables.forEach((table) => {
      if (!tableNames.includes(table)) {
        missingTables.push(table);
      }
    });

    tableNames.forEach((table) => {
      if (!expectedTables.includes(table)) {
        extraTables.push(table);
      }
    });

    if (missingTables.length > 0) {
      console.log('❌ Tablas faltantes en la base de datos:');
      missingTables.forEach((table) => {
        console.log(`   - ${table}`);
      });
      console.log('');
    }

    if (extraTables.length > 0) {
      console.log('⚠️  Tablas adicionales en la base de datos (no en el esquema):');
      extraTables.forEach((table) => {
        console.log(`   - ${table}`);
      });
      console.log('');
    }

    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log('✅ Todas las tablas del esquema están presentes en la base de datos.\n');
    }

    // Verificar columnas de algunas tablas clave
    console.log('🔍 Verificando estructura de tablas clave...\n');

    const keyTables = ['users', 'equipos', 'jugadores', 'torneos', 'encuentros'];
    for (const tableName of keyTables) {
      if (tableNames.includes(tableName)) {
        const columns = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
          ORDER BY ordinal_position;
        `);
        console.log(`   📋 ${tableName}: ${(columns as any[]).length} columnas`);
      }
    }

    console.log('\n💡 Recomendaciones:');
    if (missingTables.length > 0) {
      console.log('   1. Ejecuta "npm run db:push" para aplicar los cambios faltantes');
      console.log('   2. O ejecuta "npm run db:migrate" para aplicar migraciones pendientes');
    } else {
      console.log('   ✅ Tu base de datos parece estar sincronizada con el esquema.');
      console.log('   💡 Si aún tienes problemas, ejecuta "npm run db:generate" para crear nuevas migraciones.');
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ Error al verificar la base de datos:', error.message);
    console.error('\n💡 Asegúrate de que:');
    console.error('   1. La base de datos esté corriendo');
    console.error('   2. DATABASE_URL esté configurada correctamente');
    console.error('   3. Tengas permisos para acceder a la base de datos');
  } finally {
    await client.end();
  }
}

checkDatabase();

