# ✅ Sistema de Permisos Aplicado a Entrenadores

## 📋 Resumen de Implementación

Se ha aplicado exitosamente el **sistema de permisos dinámicos** al módulo de **Entrenadores**.

---

## 🔧 Cambios Realizados

### 1️⃣ Frontend (`page.tsx`)

#### ✅ Imports Agregados
```tsx
import { usePermisos } from '@/hooks/usePermisos'
```

#### ✅ Hook de Permisos
```tsx
const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando: cargandoPermisos } = usePermisos('entrenadores')
```

#### ✅ Verificación de Acceso
- **Loader de permisos:** Mientras se verifican los permisos
- **Bloqueo de acceso:** Si el usuario no tiene permiso de "ver"
- **Mensaje amigable:** Indica al usuario que no tiene acceso

#### ✅ Botones Condicionados

**Botón Crear:**
- ✅ Visible y activo si tiene permiso `puedeCrear`
- ⚪ Visible pero deshabilitado si NO tiene permiso
- 💡 Tooltip indicando estado

**Botones Editar y Eliminar:**
- ✅ Visibles solo si tiene permisos correspondientes
- ❌ Ocultos si no tiene permisos
- 💬 Mensaje "Sin acciones" si no tiene ningún permiso

#### ✅ Validaciones en Handlers
Todos los handlers verifican permisos antes de ejecutar:
- `handleCreateEntrenador()` → Verifica `puedeCrear`
- `handleEditClick()` → Verifica `puedeEditar`
- `handleUpdateEntrenador()` → Verifica `puedeEditar`
- `handleDelete()` → Verifica `puedeEliminar`

---

### 2️⃣ Backend (`actions.ts`)

#### ✅ Import Agregado
```tsx
import { requirePermiso } from '@/lib/auth-helpers'
```

#### ✅ Validaciones en Server Actions

| Función | Permiso Requerido | Línea |
|---------|-------------------|-------|
| `getEntrenadores()` | **ver** | 12-13 |
| `createEntrenador()` | **crear** | 33-34 |
| `updateEntrenador()` | **editar** | 63-64 |
| `deleteEntrenador()` | **eliminar** | 93-94 |
| `deleteMultipleEntrenadores()` | **eliminar** | 117-118 |

Cada función ahora:
1. ✅ Verifica permisos ANTES de ejecutar
2. 🛡️ Lanza error si no tiene permiso
3. 🔒 Garantiza seguridad a nivel servidor

---

## 🎯 Flujo de Permisos

```
Usuario Intenta Acceder
        ↓
┌───────────────────┐
│   Hook verifica   │
│   permisos en BD  │
└────────┬──────────┘
         ↓
    ¿Tiene permiso?
         ↓
    ┌────┴────┐
    │         │
   SÍ        NO
    │         │
    ↓         ↓
Muestra    Bloquea
botones    acceso
    │
    ↓
Usuario hace click
    ↓
Handler verifica
    ↓
Llama al servidor
    ↓
Servidor VALIDA (requirePermiso)
    ↓
Ejecuta acción
```

---

## 🧪 Pruebas Sugeridas

### Caso 1: Usuario Admin
```
✅ Ver: Puede ver la lista
✅ Crear: Botón "+" activo
✅ Editar: Botones "✏️" visibles
✅ Eliminar: Botones "🗑️" visibles
```

### Caso 2: Usuario Árbitro (con permisos Ver + Crear)
```
✅ Ver: Puede ver la lista
✅ Crear: Botón "+" activo
❌ Editar: Botones "✏️" ocultos
❌ Eliminar: Botones "🗑️" ocultos
```

### Caso 3: Usuario Jugador (solo Ver)
```
✅ Ver: Puede ver la lista
⚪ Crear: Botón "+" deshabilitado
❌ Editar: Sin acciones en la tabla
❌ Eliminar: Sin acciones en la tabla
```

### Caso 4: Usuario Sin Permiso Ver
```
❌ Acceso completamente bloqueado
💬 Mensaje: "No tienes permisos para acceder a esta página"
```

---

## 📝 Cómo Probar

### 1. Configurar Permisos
1. Ir a `/roles-permisos`
2. En la pestaña "Matriz de Permisos"
3. Configurar permisos para el recurso "entrenadores"
4. Click en los checkmarks para activar/desactivar

### 2. Asignar Rol a Usuario
1. Ir a `/usuarios`
2. Editar un usuario
3. Cambiar su rol (ej: de "admin" a "arbitro")
4. Guardar cambios

### 3. Probar con el Usuario
1. Cerrar sesión del admin
2. Iniciar sesión con el usuario de prueba
3. Navegar a `/entrenadores`
4. Verificar que solo vea los botones permitidos

### 4. Intentar Acciones No Permitidas
Si el usuario intenta hacer trampa (inspeccionar HTML y llamar funciones manualmente):
```
❌ El backend bloqueará la acción
💥 Error: "No tienes permiso para [acción] en entrenadores"
```

---

## 🎨 Diferencias Visuales por Rol

### Admin (Todos los Permisos)
```
┌────────────────────────────────────────────┐
│ Entrenadores              [🔍] [➕]        │
├────────────────────────────────────────────┤
│ Juan Pérez         [✏️] [🗑️]              │
│ María López        [✏️] [🗑️]              │
│ Carlos Ruiz        [✏️] [🗑️]              │
└────────────────────────────────────────────┘
```

### Árbitro (Ver + Crear)
```
┌────────────────────────────────────────────┐
│ Entrenadores              [🔍] [➕]        │
├────────────────────────────────────────────┤
│ Juan Pérez         Sin acciones            │
│ María López        Sin acciones            │
│ Carlos Ruiz        Sin acciones            │
└────────────────────────────────────────────┘
```

### Jugador (Solo Ver)
```
┌────────────────────────────────────────────┐
│ Entrenadores              [🔍] [➕]        │  ← Botón + deshabilitado
├────────────────────────────────────────────┤
│ Juan Pérez         Sin acciones            │
│ María López        Sin acciones            │
│ Carlos Ruiz        Sin acciones            │
└────────────────────────────────────────────┘
```

### Sin Permiso Ver
```
┌────────────────────────────────────────────┐
│ ❌ Acceso Denegado                         │
│ No tienes permisos para acceder a         │
│ esta página.                               │
│ Contacta al administrador...               │
└────────────────────────────────────────────┘
```

---

## 🔐 Seguridad Implementada

### Capa Frontend (UX)
- ✅ Botones ocultos/deshabilitados según permisos
- ✅ Validaciones en handlers antes de llamar al servidor
- ✅ Mensajes de error amigables

### Capa Backend (Seguridad Real)
- 🛡️ Validación obligatoria con `requirePermiso()`
- 🔒 Error si intenta acción sin permiso
- 🚫 No confía en validaciones del cliente

---

## 📚 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/app/(admin)/(apps)/entrenadores/page.tsx` | ✅ Hook de permisos, botones condicionales, validaciones |
| `src/app/(admin)/(apps)/entrenadores/actions.ts` | ✅ Validaciones con `requirePermiso()` |
| `src/hooks/usePermisos.ts` | ✅ Creado (nuevo) - Hook para frontend |
| `src/app/(admin)/permisos-actions.ts` | ✅ Creado (nuevo) - Server action para permisos |
| `src/lib/auth-helpers.ts` | ✅ Agregadas funciones `requirePermiso()` y `tienePermiso()` |

---

## 🎓 Lecciones Aprendidas

1. **Siempre validar en backend:** Frontend solo mejora UX
2. **Permisos granulares:** Ver/Crear/Editar/Eliminar por separado
3. **Mensajes claros:** Usuario sabe por qué no puede hacer algo
4. **Estado de carga:** Mostrar feedback mientras se verifican permisos

---

## 🚀 Próximos Pasos

Para aplicar a otros módulos:
1. Copiar el patrón de `entrenadores/page.tsx`
2. Cambiar el key del recurso en `usePermisos('nombre_recurso')`
3. Agregar `requirePermiso()` en las server actions
4. Configurar permisos en `/roles-permisos`

**Módulos sugeridos para siguiente implementación:**
- ✅ Entrenadores (completado)
- ⬜ Equipos
- ⬜ Jugadores
- ⬜ Categorías
- ⬜ Torneos
- ⬜ Canchas

---

## 💡 Tips de Uso

- Para dar acceso total a un rol: Click en todos los checkmarks verdes
- Para solo lectura: Solo activar "Ver"
- Para crear sin modificar: Activar "Ver" + "Crear"
- Los admins siempre tienen todos los permisos (hardcoded)

---

## ✨ Conclusión

El módulo de **Entrenadores** ahora tiene un sistema de permisos robusto y escalable:

✅ **Seguro:** Validaciones en frontend y backend  
✅ **Flexible:** Fácil configurar desde la matriz  
✅ **Usable:** Mensajes claros para el usuario  
✅ **Escalable:** Mismo patrón para otros módulos  

¡El sistema está listo para producción! 🎉

