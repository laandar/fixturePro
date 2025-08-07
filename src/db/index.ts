import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Configuración de la conexión a la base de datos
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Fu41a07..@localhost:5432/FixturePro';

// Cliente de PostgreSQL
const client = postgres(connectionString);

// Instancia de Drizzle ORM
export const db = drizzle(client, { schema });

// Exportar el cliente para uso directo si es necesario
export { client };

// Función para cerrar la conexión
export const closeConnection = async () => {
  await client.end();
}; 