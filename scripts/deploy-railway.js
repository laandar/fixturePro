#!/usr/bin/env node

/**
 * Script para desplegar en Railway
 * Ejecuta migraciones y configura la base de datos
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando despliegue en Railway...\n');

try {
  // Verificar que DATABASE_URL esté configurada
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no está configurada');
    console.log('💡 Asegúrate de configurar la variable DATABASE_URL en Railway');
    process.exit(1);
  }

  console.log('✅ DATABASE_URL configurada correctamente');
  console.log(`🔗 Conectando a: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}\n`);

  // Ejecutar migraciones
  console.log('📦 Ejecutando migraciones...');
  execSync('npx drizzle-kit push', { stdio: 'inherit' });
  
  console.log('✅ Migraciones ejecutadas correctamente\n');

  // Verificar conexión
  console.log('🔍 Verificando conexión a la base de datos...');
  execSync('node -e "require(\'./src/db/index.ts\').db.then(() => console.log(\'✅ Conexión exitosa\')).catch(e => {console.error(\'❌ Error de conexión:\', e.message); process.exit(1)})"', { stdio: 'inherit' });

  console.log('\n🎉 ¡Despliegue completado exitosamente!');
  console.log('📊 Tu base de datos está lista para usar');

} catch (error) {
  console.error('❌ Error durante el despliegue:', error.message);
  process.exit(1);
}
