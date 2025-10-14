# 🔐 Autenticación y Autorización - FixturePro

Este proyecto usa **Auth.js (NextAuth v5)** para autenticación y autorización.

## 📋 Configuración Inicial

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Base de datos PostgreSQL
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nombre_bd

# Auth.js / NextAuth
# Generar un secreto ejecutando: openssl rand -base64 32
AUTH_SECRET=tu_secreto_super_seguro_aqui

# URL de la aplicación (cambiar en producción)
NEXTAUTH_URL=http://localhost:3000
```

Para generar un `AUTH_SECRET` seguro, ejecuta:
```bash
openssl rand -base64 32
```

### 2. Ejecutar Migraciones

Genera y aplica las migraciones de la base de datos:

```bash
npm run db:generate
npm run db:push
```

O si prefieres usar migraciones:
```bash
npm run db:generate
npm run db:migrate
```

### 3. Crear Usuario Administrador

Ejecuta el script para crear el primer usuario administrador:

```bash
npx tsx src/lib/seed-admin.ts
```

Por defecto se creará con:
- **Email:** `admin@fixturepro.com`
- **Contraseña:** `admin123`

⚠️ **IMPORTANTE:** Cambia la contraseña después del primer login.

## 🎭 Sistema de Roles

El sistema incluye 4 roles predefinidos:

### 1. **Admin** (Administrador)
- Acceso completo a todas las funcionalidades
- Gestión de usuarios, equipos, torneos, configuraciones
- Puede cambiar roles de otros usuarios

### 2. **Árbitro**
- Cargar resultados de encuentros
- Registrar goles, tarjetas, cambios
- Gestionar planillas de encuentros
- Firmar actas

### 3. **Jugador**
- Ver sus estadísticas personales
- Ver historial de encuentros
- Ver fixture de su equipo
- Consultar tarjetas y sanciones

### 4. **Visitante** (por defecto)
- Ver estadísticas públicas
- Ver fixture público
- Ver tabla de posiciones
- Sin capacidad de edición

## 🔒 Protección de Rutas

### En Server Components

```typescript
import { requireAuth, requireRole, requireAdmin } from '@/lib/auth-helpers';

// Requiere estar autenticado
export default async function MiPagina() {
  const user = await requireAuth();
  
  return <div>Hola {user.name}</div>;
}

// Requiere rol específico
export default async function PaginaAdmin() {
  const user = await requireRole('admin');
  
  return <div>Panel de Admin</div>;
}

// Requiere ser admin (atajo)
export default async function PaginaAdmin() {
  await requireAdmin();
  
  return <div>Solo admins</div>;
}
```

### En Client Components

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function MiComponente() {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
  
  if (isLoading) return <div>Cargando...</div>;
  
  if (!isAuthenticated) return <div>Debes iniciar sesión</div>;
  
  return (
    <div>
      <p>Hola {user.name}</p>
      {isAdmin() && <button>Solo admins ven esto</button>}
    </div>
  );
}
```

### En Server Actions

```typescript
'use server';

import { requireRole } from '@/lib/auth-helpers';

export async function eliminarEquipo(id: number) {
  // Solo admins pueden eliminar
  await requireRole('admin');
  
  // Lógica...
}
```

## 📱 Páginas de Autenticación

- **Login:** `/auth-3/sign-in`
- **Registro:** `/auth-3/sign-up`
- **Reset Password:** `/auth-3/reset-password`

## 🛠️ Utilidades Disponibles

### Server Side

```typescript
import { 
  getCurrentUser,     // Obtener usuario actual
  requireAuth,        // Requiere autenticación
  requireRole,        // Requiere rol(es) específico(s)
  requireAdmin,       // Requiere ser admin
  hasRole,           // Verifica si tiene rol
  isAdmin,           // Verifica si es admin
} from '@/lib/auth-helpers';
```

### Client Side

```typescript
import { useAuth } from '@/hooks/useAuth';

const {
  user,              // Datos del usuario
  isLoading,         // Cargando sesión
  isAuthenticated,   // ¿Está autenticado?
  hasRole,           // Función para verificar roles
  isAdmin,           // ¿Es admin?
  isArbitro,         // ¿Es árbitro?
  isJugador,         // ¿Es jugador?
} = useAuth();
```

## 📝 Ejemplos de Uso

### Condicional por Rol

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function Menu() {
  const { hasRole } = useAuth();
  
  return (
    <nav>
      <a href="/dashboard">Dashboard</a>
      
      {hasRole(['admin', 'arbitro']) && (
        <a href="/encuentros/cargar">Cargar Resultados</a>
      )}
      
      {hasRole('admin') && (
        <a href="/admin/usuarios">Gestión de Usuarios</a>
      )}
    </nav>
  );
}
```

### Proteger Server Action

```typescript
'use server';

import { requireRole } from '@/lib/auth-helpers';

export async function crearTorneo(data: FormData) {
  // Solo admins pueden crear torneos
  const user = await requireRole('admin');
  
  // Crear torneo...
  
  return { success: true };
}
```

## 🔄 Gestión de Sesiones

Las sesiones se almacenan como **JWT** por defecto. Puedes cambiar a sesiones de base de datos modificando en `src/auth.ts`:

```typescript
session: {
  strategy: 'database', // Cambiar de 'jwt' a 'database'
}
```

## 🚀 Agregar OAuth Providers

Para agregar login con Google, GitHub, etc:

1. Agrega las credenciales en `.env`:
```env
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
```

2. Importa el provider en `src/auth.ts`:
```typescript
import Google from 'next-auth/providers/google';

providers: [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  Credentials({ ... }),
]
```

## 📚 Recursos

- [Auth.js Documentation](https://authjs.dev/)
- [Drizzle Adapter](https://authjs.dev/reference/adapter/drizzle)
- [Next.js App Router](https://nextjs.org/docs/app)

## ⚠️ Notas de Seguridad

1. **NUNCA** commitees el archivo `.env` al repositorio
2. Usa contraseñas seguras y cámbialas regularmente
3. El `AUTH_SECRET` debe ser único y seguro
4. En producción, usa HTTPS siempre
5. Implementa rate limiting para prevenir ataques de fuerza bruta

