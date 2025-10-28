import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Configuración de la conexión a la base de datos
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Fu41a07..@localhost:5432/FixturePro';

console.log('🔗 [DB] Configurando conexión a base de datos...')
console.log('🌍 [DB] Entorno:', process.env.NODE_ENV)
console.log('🔗 [DB] DATABASE_URL presente:', !!process.env.DATABASE_URL)

// Cliente de PostgreSQL con configuración mejorada
const client = postgres(connectionString, {
  max: 20, // Máximo número de conexiones
  idle_timeout: 20, // Tiempo de espera antes de cerrar conexiones inactivas
  connect_timeout: 10, // Tiempo de espera para conectar
  onnotice: (notice) => {
    console.log('📢 [DB] Notice:', notice.message)
  },
  onparameter: (key, value) => {
    console.log('⚙️ [DB] Parameter:', key, '=', value)
  }
});

// Instancia de Drizzle ORM
export const db = drizzle(client, { schema });

// Exportar el cliente para uso directo si es necesario
export { client };

// Función para cerrar la conexión
export const closeConnection = async () => {
  console.log('🔌 [DB] Cerrando conexión...')
  await client.end();
};

// Función para probar la conexión
export const testConnection = async () => {
  try {
    console.log('🧪 [DB] Probando conexión...')
    await client`SELECT 1 as test`
    console.log('✅ [DB] Conexión exitosa')
    return true
  } catch (error) {
    console.error('❌ [DB] Error de conexión:', error)
    return false
  }
} 