# Drizzle ORM - Implementación Completa

Este proyecto ha sido configurado con **Drizzle ORM** para manejar la base de datos PostgreSQL de manera type-safe y eficiente.

## 📋 Tabla de Contenidos

- [Instalación y Configuración](#instalación-y-configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Esquema de Base de Datos](#esquema-de-base-de-datos)
- [Uso de Drizzle ORM](#uso-de-drizzle-orm)
- [API Routes](#api-routes)
- [Componentes de Ejemplo](#componentes-de-ejemplo)
- [Comandos Útiles](#comandos-útiles)
- [Variables de Entorno](#variables-de-entorno)

## 🚀 Instalación y Configuración

### Dependencias Instaladas

```bash
# Dependencias principales
npm install drizzle-orm @types/pg pg

# Dependencias de desarrollo
npm install -D drizzle-kit
```

### Scripts Agregados

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push"
  }
}
```

## 📁 Estructura del Proyecto

```
src/
├── db/
│   ├── index.ts          # Configuración de conexión
│   ├── schema.ts         # Esquema de la base de datos
│   ├── types.ts          # Tipos TypeScript
│   └── queries.ts        # Funciones de consulta
├── app/
│   └── api/
│       ├── users/
│       │   ├── route.ts
│       │   └── [id]/
│       │       └── route.ts
│       └── products/
│           └── route.ts
└── components/
    └── UserManagement.tsx
```

## 🗄️ Esquema de Base de Datos

### Tablas Implementadas

1. **users** - Gestión de usuarios
2. **products** - Catálogo de productos
3. **orders** - Órdenes de compra
4. **order_items** - Detalles de órdenes
5. **categories** - Categorías de productos
6. **system_config** - Configuración del sistema

### Relaciones

- Usuarios → Órdenes (1:N)
- Órdenes → Items de Orden (1:N)
- Productos → Items de Orden (1:N)
- Categorías → Categorías (auto-referencia para jerarquías)

## 🔧 Uso de Drizzle ORM

### Conexión a la Base de Datos

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

### Consultas Básicas

```typescript
import { db } from '@/db/index';
import { users, products } from '@/db/schema';
import { eq, like, desc } from 'drizzle-orm';

// Obtener todos los usuarios
const allUsers = await db.select().from(users);

// Obtener usuario por email
const user = await db.select().from(users).where(eq(users.email, 'user@example.com'));

// Buscar productos
const searchResults = await db
  .select()
  .from(products)
  .where(like(products.name, '%laptop%'))
  .orderBy(desc(products.createdAt));
```

### Inserción de Datos

```typescript
// Crear nuevo usuario
const newUser = await db.insert(users).values({
  name: 'Juan Pérez',
  email: 'juan@example.com',
  password: 'hashedPassword',
  role: 'user'
}).returning();

// Crear múltiples productos
const newProducts = await db.insert(products).values([
  { name: 'Laptop', price: 999.99, category: 'Electrónicos' },
  { name: 'Mouse', price: 29.99, category: 'Accesorios' }
]).returning();
```

### Actualización de Datos

```typescript
// Actualizar usuario
const updatedUser = await db
  .update(users)
  .set({ 
    name: 'Juan Carlos Pérez',
    updatedAt: new Date()
  })
  .where(eq(users.id, 1))
  .returning();
```

### Eliminación de Datos

```typescript
// Eliminar usuario
await db.delete(users).where(eq(users.id, 1));
```

## 🌐 API Routes

### Endpoints de Usuarios

- `GET /api/users` - Obtener todos los usuarios
- `GET /api/users?q=search` - Buscar usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users/[id]` - Obtener usuario por ID
- `PUT /api/users/[id]` - Actualizar usuario
- `DELETE /api/users/[id]` - Eliminar usuario

### Endpoints de Productos

- `GET /api/products` - Obtener todos los productos
- `GET /api/products?category=electronics` - Filtrar por categoría
- `GET /api/products?active=true` - Solo productos activos
- `POST /api/products` - Crear producto

### Ejemplo de Uso de API

```typescript
// Crear usuario
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'María García',
    email: 'maria@example.com',
    password: 'password123',
    role: 'user'
  })
});

const result = await response.json();
```

## 🎨 Componentes de Ejemplo

### UserManagement Component

El componente `UserManagement.tsx` demuestra:

- Carga de datos desde API
- Creación de usuarios
- Búsqueda en tiempo real
- Eliminación de registros
- Manejo de errores
- Estados de carga

### Características del Componente

- ✅ TypeScript completo
- ✅ Manejo de estados
- ✅ Validaciones
- ✅ Interfaz responsive
- ✅ Confirmaciones de eliminación
- ✅ Mensajes de error/éxito

## ⚡ Comandos Útiles

### Generar Migraciones

```bash
npm run db:generate
```

Este comando genera archivos de migración basados en los cambios del esquema.

### Aplicar Migraciones

```bash
npm run db:migrate
```

Aplica las migraciones pendientes a la base de datos.

### Drizzle Studio

```bash
npm run db:studio
```

Abre Drizzle Studio, una interfaz web para explorar y editar datos.

### Push Directo

```bash
npm run db:push
```

Sincroniza el esquema directamente con la base de datos (solo desarrollo).

## 🔐 Variables de Entorno

Crea un archivo `.env.local` con:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/fixturepro_db
```

### Configuración de Base de Datos

```typescript
// drizzle.config.ts
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/fixturepro_db',
  },
  verbose: true,
  strict: true,
});
```

## 📊 Tipos TypeScript

### Tipos Automáticos

Drizzle genera automáticamente tipos TypeScript:

```typescript
import type { User, NewUser, Product, NewProduct } from '@/db/types';

// Tipo para lectura
const user: User = {
  id: 1,
  name: 'Juan',
  email: 'juan@example.com',
  // ... otros campos
};

// Tipo para inserción
const newUser: NewUser = {
  name: 'María',
  email: 'maria@example.com',
  password: 'hash',
  // No incluye id, createdAt, updatedAt
};
```

## 🔄 Funciones de Consulta

### Organización por Entidad

```typescript
// src/db/queries.ts
export const userQueries = {
  getAll: async () => { /* ... */ },
  getById: async (id: number) => { /* ... */ },
  create: async (userData: NewUser) => { /* ... */ },
  update: async (id: number, userData: Partial<NewUser>) => { /* ... */ },
  delete: async (id: number) => { /* ... */ },
  search: async (query: string) => { /* ... */ },
};

export const productQueries = {
  // Funciones similares para productos
};

export const statsQueries = {
  getUserCount: async () => { /* ... */ },
  getTotalSales: async () => { /* ... */ },
};
```

## 🚨 Manejo de Errores

### Patrón de Respuesta API

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Ejemplo de uso
const response: ApiResponse<User[]> = await fetch('/api/users');
if (response.success && response.data) {
  // Manejar datos
} else {
  // Manejar error
  console.error(response.error);
}
```

## 🔍 Búsquedas y Filtros

### Búsqueda de Texto

```typescript
import { like, or } from 'drizzle-orm';

const results = await db
  .select()
  .from(products)
  .where(
    or(
      like(products.name, `%${query}%`),
      like(products.description, `%${query}%`)
    )
  );
```

### Filtros Múltiples

```typescript
import { and, eq, gte } from 'drizzle-orm';

const filteredProducts = await db
  .select()
  .from(products)
  .where(
    and(
      eq(products.category, 'Electrónicos'),
      eq(products.isActive, true),
      gte(products.price, 100)
    )
  );
```

## 📈 Estadísticas y Agregaciones

```typescript
import { count, sum, avg } from 'drizzle-orm';

// Contar usuarios
const userCount = await db.select({ count: count() }).from(users);

// Total de ventas
const totalSales = await db.select({ total: sum(orders.total) }).from(orders);

// Precio promedio de productos
const avgPrice = await db.select({ average: avg(products.price) }).from(products);
```

## 🎯 Próximos Pasos

1. **Configurar Base de Datos**: Crear la base de datos PostgreSQL
2. **Ejecutar Migraciones**: `npm run db:generate` y `npm run db:migrate`
3. **Configurar Variables de Entorno**: Agregar `DATABASE_URL`
4. **Probar API Routes**: Usar Postman o similar
5. **Integrar Componentes**: Agregar `UserManagement` a tu aplicación
6. **Personalizar Esquema**: Adaptar las tablas a tus necesidades

## 📚 Recursos Adicionales

- [Documentación Oficial de Drizzle](https://orm.drizzle.team/)
- [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL con Drizzle](https://orm.drizzle.team/docs/get-started-postgresql)
- [Next.js con Drizzle](https://orm.drizzle.team/docs/get-started-nextjs)

---

¡Drizzle ORM está completamente configurado y listo para usar en tu proyecto FixturePro! 🎉 