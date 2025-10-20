# 🐛 Error Resuelto: Server Functions en Client Components

## ❌ Error Original

```
BuildError: Cannot call server function from client component
```

Stack trace de webpack mostrando error al renderizar componentes.

---

## 🔍 Causa del Problema

En la primera implementación del hook `usePermisos.ts`, estaba intentando llamar directamente a `currentUserTienePermiso()` que es una función de servidor (`'use server'`) desde un componente del cliente (`'use client'`).

### ❌ Código Problemático (ANTES):

```tsx
// src/hooks/usePermisos.ts
'use client';

import { currentUserTienePermiso } from '@/lib/permisos-helpers';

export function usePermisos(menuKey: string) {
  // ...
  useEffect(() => {
    const cargarPermisos = async () => {
      // ❌ ERROR: Llamando función server desde cliente
      const puedeVer = await currentUserTienePermiso(menuKey, 'ver');
      // ...
    };
  }, []);
}
```

### ⚠️ Por Qué Falla

Next.js 13+ con App Router tiene una separación estricta entre:

1. **Server Components/Functions** (`'use server'`)
   - Se ejecutan en el servidor
   - Pueden acceder a DB, APIs, etc.
   - NO pueden usar hooks de React

2. **Client Components** (`'use client'`)
   - Se ejecutan en el navegador
   - Pueden usar hooks de React
   - NO pueden llamar directamente a funciones del servidor

---

## ✅ Solución Implementada

Crear una **Server Action** intermedia que el cliente puede llamar.

### 1️⃣ Crear Server Action

```tsx
// src/app/(admin)/permisos-actions.ts
'use server'

import { currentUserTienePermiso } from '@/lib/permisos-helpers'
import { auth } from '@/auth'

export async function obtenerPermisosUsuario(menuKey: string) {
  const session = await auth()
  
  if (!session?.user) {
    return {
      puedeVer: false,
      puedeCrear: false,
      puedeEditar: false,
      puedeEliminar: false,
    }
  }

  // Si es admin, todos los permisos
  if (session.user.role === 'admin') {
    return {
      puedeVer: true,
      puedeCrear: true,
      puedeEditar: true,
      puedeEliminar: true,
    }
  }

  // Verificar permisos específicos
  const [puedeVer, puedeCrear, puedeEditar, puedeEliminar] = await Promise.all([
    currentUserTienePermiso(menuKey, 'ver'),
    currentUserTienePermiso(menuKey, 'crear'),
    currentUserTienePermiso(menuKey, 'editar'),
    currentUserTienePermiso(menuKey, 'eliminar'),
  ])

  return { puedeVer, puedeCrear, puedeEditar, puedeEliminar }
}
```

### 2️⃣ Actualizar Hook del Cliente

```tsx
// src/hooks/usePermisos.ts
'use client';

import { obtenerPermisosUsuario } from '@/app/(admin)/permisos-actions';

export function usePermisos(menuKey: string) {
  const { data: session, status } = useSession();
  const [permisos, setPermisos] = useState({
    puedeVer: false,
    puedeCrear: false,
    puedeEditar: false,
    puedeEliminar: false,
    cargando: true,
  });

  useEffect(() => {
    const cargarPermisos = async () => {
      if (status === 'loading') return;
      if (!session?.user) {
        setPermisos({ ...defaultPermisos, cargando: false });
        return;
      }

      try {
        // ✅ CORRECTO: Llamando a server action desde cliente
        const permisosObtenidos = await obtenerPermisosUsuario(menuKey);
        setPermisos({ ...permisosObtenidos, cargando: false });
      } catch (error) {
        console.error('Error al cargar permisos:', error);
        setPermisos({ ...defaultPermisos, cargando: false });
      }
    };

    cargarPermisos();
  }, [menuKey, session, status]);

  return permisos;
}
```

---

## 🎯 Diferencia Clave

| Aspecto | ❌ Antes (Incorrecto) | ✅ Después (Correcto) |
|---------|----------------------|---------------------|
| **Desde Cliente** | Llamaba directamente a función server | Llama a server action exportada |
| **Ubicación** | `@/lib/permisos-helpers` | `@/app/(admin)/permisos-actions` |
| **Función** | `currentUserTienePermiso()` | `obtenerPermisosUsuario()` |
| **Resultado** | ❌ BuildError | ✅ Funciona correctamente |

---

## 📋 Reglas a Recordar

### ✅ PERMITIDO:

1. **Client → Server Action**
   ```tsx
   'use client'
   import { miServerAction } from '@/app/actions'
   await miServerAction() // ✅ OK
   ```

2. **Server → Server Function**
   ```tsx
   'use server'
   import { otraFuncionServer } from '@/lib/helpers'
   await otraFuncionServer() // ✅ OK
   ```

3. **Server Action → Database**
   ```tsx
   'use server'
   import { db } from '@/db'
   await db.query(...) // ✅ OK
   ```

### ❌ NO PERMITIDO:

1. **Client → Server Function directamente**
   ```tsx
   'use client'
   import { funcionServer } from '@/lib/helpers'
   await funcionServer() // ❌ ERROR
   ```

2. **Server → Client Hooks**
   ```tsx
   'use server'
   import { useState } from 'react'
   const [state, setState] = useState() // ❌ ERROR
   ```

---

## 🔧 Cómo Detectar Este Error

### Síntomas:
- ❌ BuildError en desarrollo
- ❌ Error de compilación de webpack
- ❌ Mensaje: "Cannot call server function from client component"

### Solución Rápida:
1. Identificar la función que está siendo llamada
2. Verificar si tiene `'use server'` en su archivo
3. Crear una Server Action intermedia
4. Importar y usar la Server Action desde el cliente

---

## 📁 Estructura Final

```
src/
├── app/
│   └── (admin)/
│       ├── permisos-actions.ts       ← Server action (puente)
│       └── (apps)/
│           └── entrenadores/
│               ├── page.tsx          ← Client (usa server action)
│               └── actions.ts        ← Server actions específicas
├── hooks/
│   └── usePermisos.ts                ← Client hook (usa server action)
└── lib/
    ├── auth-helpers.ts               ← Server functions
    └── permisos-helpers.ts           ← Server functions
```

**Flujo de datos:**
```
Cliente (page.tsx)
    ↓ usa
Hook (usePermisos.ts)
    ↓ llama a
Server Action (permisos-actions.ts)
    ↓ usa
Server Functions (permisos-helpers.ts)
    ↓ consulta
Base de Datos
```

---

## ✅ Verificación

Para confirmar que está resuelto:

```bash
# Debe compilar sin errores
npm run build

# O en desarrollo
npm run dev
```

Si ves estos mensajes, está funcionando:
- ✅ "Compiled successfully"
- ✅ Sin errores de webpack
- ✅ Página carga correctamente

---

## 🎓 Lección Aprendida

**Principio de Separación en Next.js App Router:**

> Los componentes/hooks del cliente NO pueden llamar directamente a funciones del servidor. 
> Siempre usar Server Actions como intermediarios.

**Patrón correcto:**
```
Client Component → Server Action → Server Function → Database
```

---

## 📚 Referencias

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Use Server Directive](https://nextjs.org/docs/app/api-reference/directives/use-server)

---

## ✨ Resumen

**Problema:** Llamada directa de función server desde cliente  
**Solución:** Server Action intermedia  
**Resultado:** ✅ Sistema de permisos funcionando correctamente  

¡Error resuelto! 🎉

