import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Configuración de la conexión a la base de datos
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Fu41a07..@localhost:5432/FixturePro';

// Cliente de PostgreSQL con configuración mejorada
const client = postgres(connectionString, {
  max: 20, // Máximo número de conexiones
  idle_timeout: 20, // Tiempo de espera antes de cerrar conexiones inactivas
  connect_timeout: 10, // Tiempo de espera para conectar
});

// Instancia de Drizzle ORM
export const db = drizzle(client, { schema });

// Exportar el cliente para uso directo si es necesario
export { client };

// Función para cerrar la conexión
export const closeConnection = async () => {
  await client.end();
};

// Función para probar la conexión
export const testConnection = async () => {
  try {
    await client`SELECT 1 as test`
    return true
  } catch (error) {
    console.error('Error de conexión:', error)
    return false
  }
} 