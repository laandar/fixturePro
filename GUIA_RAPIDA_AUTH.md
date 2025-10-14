# 🚀 Guía Rápida - Auth.js en FixturePro

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Configurar Variables de Entorno

Crea un archivo `.env` en la raíz:

```bash
# Copia tu DATABASE_URL existente
DATABASE_URL=postgresql://postgres:Fu41a07..@localhost:5432/FixturePro

# Genera un secreto (ejecuta este comando):
# openssl rand -base64 32
AUTH_SECRET=tu_secreto_generado_aqui

NEXTAUTH_URL=http://localhost:3000
```

### 2️⃣ Generar Migraciones

```bash
npm run db:generate
npm run db:push
```

### 3️⃣ Crear Usuario Administrador

```bash
npm run auth:seed-admin
```

**Credenciales por defecto:**
- Email: `admin@fixturepro.com`
- Password: `admin123`

### 4️⃣ Iniciar Servidor

```bash
npm run dev
```

### 5️⃣ Probar Login

Navega a: http://localhost:3000/auth-3/sign-in

---

## 📋 Checklist de Implementación

- ✅ Dependencias instaladas (`next-auth`, `@auth/drizzle-adapter`, `bcryptjs`)
- ✅ Esquema de BD actualizado (usuarios, sesiones, cuentas)
- ✅ Configuración de Auth.js (`src/auth.ts`, `src/auth.config.ts`)
- ✅ Middleware de protección de rutas (`src/middleware.ts`)
- ✅ Páginas de login/registro funcionales
- ✅ Hooks y utilidades (`useAuth`, `requireAuth`, etc.)
- ✅ Sistema de roles (admin, arbitro, jugador, visitante)

---

## 🎯 Casos de Uso Comunes

### Proteger una Página (Server Component)

```typescript
// src/app/(admin)/(apps)/mi-pagina/page.tsx
import { requireAuth } from '@/lib/auth-helpers';

export default async function MiPagina() {
  const user = await requireAuth();
  
  return <div>Hola {user.name}</div>;
}
```

### Proteger por Rol

```typescript
import { requireRole } from '@/lib/auth-helpers';

export default async function AdminPage() {
  await requireRole('admin'); // Solo admins
  
  return <div>Panel Admin</div>;
}
```

### Usar en Client Component

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function MiComponente() {
  const { user, isAdmin } = useAuth();
  
  return (
    <div>
      {isAdmin() && <button>Solo Admin</button>}
    </div>
  );
}
```

### Proteger Server Action

```typescript
'use server';

import { requireRole } from '@/lib/auth-helpers';

export async function eliminarDatos() {
  await requireRole('admin');
  // Solo se ejecuta si es admin
}
```

### Cerrar Sesión

```typescript
'use client';

import { logoutAction } from '@/app/(auth)/actions';

export function LogoutButton() {
  return (
    <button onClick={() => logoutAction()}>
      Cerrar Sesión
    </button>
  );
}
```

---

## 🔧 Próximos Pasos Recomendados

1. **Cambiar la contraseña del admin** después del primer login
2. **Integrar el `UserMenu` en tu navbar** (ya creado en `src/components/UserMenu.tsx`)
3. **Crear usuarios de prueba** para cada rol
4. **Configurar roles en tus rutas existentes**
5. **Agregar OAuth (opcional)** si necesitas login con Google/GitHub

---

## 🛠️ Comandos Útiles

```bash
# Ver base de datos con Drizzle Studio
npm run db:studio

# Crear nuevo admin
npm run auth:seed-admin

# Generar migraciones
npm run db:generate

# Aplicar migraciones
npm run db:push
```

---

## ❓ Troubleshooting

### Error: "AUTH_SECRET is not defined"

Asegúrate de tener el archivo `.env` con la variable `AUTH_SECRET`.

### Error: "Table 'users' doesn't exist"

Ejecuta las migraciones:
```bash
npm run db:generate
npm run db:push
```

### No puedo iniciar sesión

Verifica que hayas creado el usuario admin:
```bash
npm run auth:seed-admin
```

### Redirige infinitamente al login

Revisa que el middleware esté configurado correctamente y que las rutas coincidan.

---

## 📚 Documentación Completa

Lee `README_AUTH.md` para documentación detallada sobre:
- Sistema de roles completo
- Todas las utilidades disponibles
- Configuración avanzada
- Agregar OAuth providers
- Mejores prácticas de seguridad

