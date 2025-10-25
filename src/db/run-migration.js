const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Fu41a07..@localhost:5432/FixturePro',
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'migrations', '0036_convert_jugadores_id_to_varchar.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar la migración
    await client.query(migrationSQL);
    console.log('Migración ejecutada exitosamente');

  } catch (error) {
    console.error('Error ejecutando la migración:', error);
  } finally {
    await client.end();
    console.log('Conexión cerrada');
  }
}

runMigration();
