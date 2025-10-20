# 🔐 Guía: Cómo Aplicar Permisos Dinámicos a las Pantallas

## 📖 Índice
1. [Flujo Completo](#flujo-completo)
2. [Pasos para Aplicar Permisos](#pasos-para-aplicar-permisos)
3. [Ejemplos Prácticos](#ejemplos-prácticos)
4. [Validación Backend](#validación-backend)
5. [Mejores Prácticas](#mejores-prácticas)

---

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CONFIGURACIÓN DE PERMISOS (Matriz)                         │
├─────────────────────────────────────────────────────────────────┤
│ Admin va a /roles-permisos                                      │
│ → Activa permisos en la matriz para cada rol                   │
│   Ejemplo: Rol "arbitro" en recurso "entrenadores"             │
│   ✓ Ver    ✓ Crear    ✗ Editar    ✗ Eliminar                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. GUARDADO EN BASE DE DATOS                                   │
├─────────────────────────────────────────────────────────────────┤
│ Se guarda en tabla: roles_menus                                 │
│   rol_id: 2 (arbitro)                                          │
│   menu_id: 5 (entrenadores)                                    │
│   puede_ver: true                                              │
│   puede_crear: true                                            │
│   puede_editar: false                                          │
│   puede_eliminar: false                                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. USUARIO ENTRA A LA PÁGINA                                   │
├─────────────────────────────────────────────────────────────────┤
│ Usuario con rol "arbitro" navega a /entrenadores               │
│ → Hook usePermisos('entrenadores') se ejecuta                  │
│ → Consulta permisos del usuario en BD                          │
│ → Retorna: { puedeVer: true, puedeCrear: true, ... }          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. RENDERIZADO CONDICIONAL                                     │
├─────────────────────────────────────────────────────────────────┤
│ La página muestra/oculta elementos según permisos:             │
│   ✓ Tabla visible (puedeVer = true)                           │
│   ✓ Botón "Crear" visible (puedeCrear = true)                 │
│   ✗ Botón "Editar" oculto (puedeEditar = false)               │
│   ✗ Botón "Eliminar" oculto (puedeEliminar = false)           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. VALIDACIÓN EN BACKEND                                       │
├─────────────────────────────────────────────────────────────────┤
│ Si el usuario intenta hacer una acción (ej: crear):            │
│   → Backend verifica permisos antes de ejecutar                │
│   → Si no tiene permiso, lanza error                           │
│   → Si tiene permiso, ejecuta la acción                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Pasos para Aplicar Permisos

### Paso 1: Importar el Hook

```tsx
import { usePermisos } from '@/hooks/usePermisos'
```

### Paso 2: Usar el Hook en el Componente

```tsx
export default function EntrenadoresPage() {
  // Especificar el KEY del recurso (debe coincidir con la tabla 'menus')
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando } = usePermisos('entrenadores')
  
  // ... resto del código
}
```

### Paso 3: Validar Acceso a la Página

```tsx
// Mostrar loader mientras se cargan permisos
if (cargando) {
  return <div>Cargando permisos...</div>
}

// Bloquear acceso si no tiene permiso de ver
if (!puedeVer) {
  return (
    <Alert variant="danger">
      No tienes permisos para acceder a esta página
    </Alert>
  )
}
```

### Paso 4: Condicionar Botones de Acción

```tsx
// Botón de CREAR
{puedeCrear && (
  <Button onClick={handleCreate}>
    <TbPlus /> Nuevo Entrenador
  </Button>
)}

// Botón de EDITAR
{puedeEditar && (
  <Button onClick={() => handleEdit(item)}>
    <TbEdit />
  </Button>
)}

// Botón de ELIMINAR
{puedeEliminar && (
  <Button onClick={() => handleDelete(item)}>
    <TbTrash />
  </Button>
)}
```

### Paso 5: Validar en las Funciones

```tsx
const handleCreate = async (formData: FormData) => {
  // Verificación adicional en cliente
  if (!puedeCrear) {
    alert('No tienes permiso para crear')
    return
  }
  
  try {
    // La acción del servidor también validará permisos
    await createEntrenador(formData)
  } catch (error) {
    // Manejar error
  }
}
```

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Página de Entrenadores

```tsx
'use client'
import { usePermisos } from '@/hooks/usePermisos'
import { TbPlus, TbEdit, TbTrash } from 'react-icons/tb'

export default function EntrenadoresPage() {
  const permisos = usePermisos('entrenadores')
  
  // Verificación de acceso
  if (permisos.cargando) return <Loader />
  if (!permisos.puedeVer) return <NoAccess />

  return (
    <Container>
      <Card>
        <CardHeader>
          <h4>Entrenadores</h4>
          
          {/* Botón crear - solo visible si tiene permiso */}
          {permisos.puedeCrear && (
            <Button onClick={handleCreate}>
              <TbPlus /> Nuevo
            </Button>
          )}
        </CardHeader>

        <DataTable 
          columns={[
            {
              header: 'Nombre',
              accessorKey: 'nombre'
            },
            {
              header: 'Acciones',
              cell: ({ row }) => (
                <div className="d-flex gap-2">
                  {/* Editar - condicional */}
                  {permisos.puedeEditar && (
                    <Button size="sm" onClick={() => handleEdit(row.original)}>
                      <TbEdit />
                    </Button>
                  )}
                  
                  {/* Eliminar - condicional */}
                  {permisos.puedeEliminar && (
                    <Button size="sm" onClick={() => handleDelete(row.original)}>
                      <TbTrash />
                    </Button>
                  )}
                </div>
              )
            }
          ]}
          data={entrenadores}
        />
      </Card>
    </Container>
  )
}
```

### Ejemplo 2: Diferentes Roles, Diferentes Vistas

**Usuario con rol "admin":**
```
┌────────────────────────────────────┐
│ Entrenadores                       │
│ [+ Nuevo]                          │ ← Puede crear
├────────────────────────────────────┤
│ Juan Pérez    [✏️ Editar] [🗑️]    │ ← Puede editar y eliminar
│ María López   [✏️ Editar] [🗑️]    │
└────────────────────────────────────┘
```

**Usuario con rol "arbitro" (solo ver y crear):**
```
┌────────────────────────────────────┐
│ Entrenadores                       │
│ [+ Nuevo]                          │ ← Puede crear
├────────────────────────────────────┤
│ Juan Pérez    (Sin acciones)       │ ← NO puede editar ni eliminar
│ María López   (Sin acciones)       │
└────────────────────────────────────┘
```

**Usuario con rol "visitante" (solo ver):**
```
┌────────────────────────────────────┐
│ Entrenadores                       │
│ (No puede crear)                   │ ← NO puede crear
├────────────────────────────────────┤
│ Juan Pérez    (Sin acciones)       │ ← Solo visualización
│ María López   (Sin acciones)       │
└────────────────────────────────────┘
```

---

## 🛡️ Validación en Backend

**IMPORTANTE:** Siempre validar permisos en el servidor, no solo en cliente.

### Archivo: `actions.ts`

```tsx
'use server'
import { requirePermiso } from '@/lib/auth-helpers'

export async function createEntrenador(formData: FormData) {
  // 👇 Verificar permiso antes de ejecutar
  await requirePermiso('entrenadores', 'crear')
  
  // Si pasa la validación, ejecutar lógica
  const nombre = formData.get('nombre') as string
  
  await db.insert(entrenadores).values({ nombre })
  
  return { success: true }
}

export async function updateEntrenador(id: number, formData: FormData) {
  // 👇 Verificar permiso de editar
  await requirePermiso('entrenadores', 'editar')
  
  const nombre = formData.get('nombre') as string
  
  await db.update(entrenadores)
    .set({ nombre })
    .where(eq(entrenadores.id, id))
  
  return { success: true }
}

export async function deleteEntrenador(id: number) {
  // 👇 Verificar permiso de eliminar
  await requirePermiso('entrenadores', 'eliminar')
  
  await db.delete(entrenadores)
    .where(eq(entrenadores.id, id))
  
  return { success: true }
}
```

### Función Helper (agregar a `auth-helpers.ts`)

```tsx
import { currentUserTienePermiso } from '@/lib/permisos-helpers'
import { redirect } from 'next/navigation'

export async function requirePermiso(
  menuKey: string, 
  accion: 'ver' | 'crear' | 'editar' | 'eliminar'
) {
  const tienePermiso = await currentUserTienePermiso(menuKey, accion)
  
  if (!tienePermiso) {
    throw new Error(`No tienes permiso para ${accion} en ${menuKey}`)
  }
  
  return true
}
```

---

## ✅ Mejores Prácticas

### 1. **Siempre Validar en Backend**
```tsx
// ❌ MAL - Solo validación en cliente
const handleCreate = async () => {
  if (!puedeCrear) return
  await createEntrenador(data) // Sin validación en servidor
}

// ✅ BIEN - Validación en cliente Y servidor
const handleCreate = async () => {
  if (!puedeCrear) return // Validación cliente
  await createEntrenador(data) // Validación en servidor también
}
```

### 2. **Usar Keys Consistentes**
```tsx
// En la BD (tabla menus)
key: 'entrenadores'

// En el componente
usePermisos('entrenadores') // ✅ Mismo nombre

// En el backend
requirePermiso('entrenadores', 'crear') // ✅ Mismo nombre
```

### 3. **Mostrar Feedback al Usuario**
```tsx
{!puedeCrear && (
  <Tooltip content="No tienes permiso para crear">
    <Button disabled>
      <TbPlus /> Nuevo
    </Button>
  </Tooltip>
)}
```

### 4. **Manejar Estados de Carga**
```tsx
if (cargandoPermisos) {
  return <Skeleton />
}
```

### 5. **Logs de Auditoría**
```tsx
export async function deleteEntrenador(id: number) {
  await requirePermiso('entrenadores', 'eliminar')
  
  // Registrar quién eliminó qué
  await db.insert(auditLogs).values({
    userId: session.user.id,
    accion: 'ELIMINAR',
    recurso: 'entrenadores',
    recordId: id,
    timestamp: new Date()
  })
  
  await db.delete(entrenadores).where(eq(entrenadores.id, id))
}
```

---

## 🎯 Checklist de Implementación

Para cada página que quieras proteger:

- [ ] Importar `usePermisos` hook
- [ ] Llamar al hook con el key del recurso
- [ ] Validar acceso a la página (`puedeVer`)
- [ ] Condicionar botón de crear (`puedeCrear`)
- [ ] Condicionar botones de editar (`puedeEditar`)
- [ ] Condicionar botones de eliminar (`puedeEliminar`)
- [ ] Validar en funciones de cliente
- [ ] Validar en acciones de servidor
- [ ] Agregar mensajes de error apropiados
- [ ] Testear con diferentes roles

---

## 📚 Recursos

- **Hook de Permisos:** `src/hooks/usePermisos.ts`
- **Helpers de Permisos:** `src/lib/permisos-helpers.ts`
- **Acciones de Permisos:** `src/app/(admin)/(apps)/roles-permisos/actions.ts`
- **Ejemplo Completo:** `src/app/(admin)/(apps)/entrenadores/ejemplo-con-permisos.tsx`

---

## 🔧 Troubleshooting

### Problema: Los permisos no se actualizan

**Solución:** Refrescar la sesión después de cambiar permisos
```tsx
// En /roles-permisos, después de cambiar un permiso
await fetch('/api/auth/refresh-session', { method: 'POST' })
router.refresh()
```

### Problema: Usuario ve botones pero no puede usarlos

**Causa:** Falta validación en backend  
**Solución:** Agregar `requirePermiso()` en las server actions

### Problema: Hook retorna siempre false

**Causa:** El `menuKey` no coincide con la BD  
**Solución:** Verificar que el key exista en la tabla `menus`

---

## 🎓 Resumen

**La matriz de permisos funciona así:**

1. **Configuración:** Admin define permisos en `/roles-permisos`
2. **Almacenamiento:** Se guardan en tabla `roles_menus`
3. **Verificación:** Hook `usePermisos()` consulta la BD
4. **Aplicación:** Componente muestra/oculta elementos según permisos
5. **Seguridad:** Backend valida antes de ejecutar cualquier acción

**Recuerda:** 
- ✅ Frontend = UX (ocultar botones)
- ✅ Backend = Seguridad (validar acciones)
- ⚠️ Nunca confiar solo en validaciones de cliente

