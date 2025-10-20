# 🎯 Resumen: Sistema de Permisos Dinámicos

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MATRIZ DE PERMISOS (/roles-permisos)             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ROL      │  Ver  │ Crear │ Editar │ Eliminar │                    │
│   ─────────┼───────┼───────┼────────┼──────────┤                    │
│   Admin    │   ✓   │   ✓   │   ✓    │    ✓     │  ← Todo permitido│
│   Arbitro  │   ✓   │   ✓   │   ✗    │    ✗     │  ← Crear solo    │
│   Jugador  │   ✓   │   ✗   │   ✗    │    ✗     │  ← Solo ver      │
│   Visitante│   ✓   │   ✗   │   ✗    │    ✗     │  ← Solo ver      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS (roles_menus)                       │
├─────────────────────────────────────────────────────────────────────┤
│  id │ rol_id │ menu_id │ puede_ver │ puede_crear │ puede_editar │..│
│  ───┼────────┼─────────┼───────────┼─────────────┼──────────────┤..│
│  1  │   1    │    5    │    true   │    true     │     true     │..│
│  2  │   2    │    5    │    true   │    true     │     false    │..│
│  3  │   3    │    5    │    true   │    false    │     false    │..│
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    HOOK: usePermisos('entrenadores')                 │
├─────────────────────────────────────────────────────────────────────┤
│  Consulta:                                                           │
│  • Usuario actual                                                    │
│  • Roles del usuario                                                 │
│  • Permisos en tabla roles_menus                                     │
│                                                                      │
│  Retorna:                                                            │
│  {                                                                   │
│    puedeVer: true,                                                   │
│    puedeCrear: true,                                                 │
│    puedeEditar: false,  ← Según el rol                              │
│    puedeEliminar: false                                              │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPONENTE: EntrenadoresPage                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  const permisos = usePermisos('entrenadores')                        │
│                                                                      │
│  ┌────────────────────────────────────────────┐                     │
│  │ Entrenadores                  [+ Nuevo]    │ ← Solo si puedeCrear│
│  ├────────────────────────────────────────────┤                     │
│  │ Juan Pérez    [✏️] [🗑️]                   │ ← Solo si puede... │
│  │ María López   [✏️] [🗑️]                   │                     │
│  └────────────────────────────────────────────┘                     │
│                                                                      │
│  {permisos.puedeCrear && <Button>Crear</Button>}                    │
│  {permisos.puedeEditar && <Button>Editar</Button>}                  │
│  {permisos.puedeEliminar && <Button>Eliminar</Button>}              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER ACTION: createEntrenador()                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  export async function createEntrenador(data: FormData) {           │
│    // 🛡️ VALIDACIÓN DE SEGURIDAD                                   │
│    await requirePermiso('entrenadores', 'crear')                    │
│                                                                      │
│    // Si pasa, ejecutar acción                                      │
│    await db.insert(entrenadores).values(...)                        │
│  }                                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Capas de Seguridad

```
┌─────────────────────────────────────────────────────────────────┐
│                        1. CAPA UI (Frontend)                     │
├─────────────────────────────────────────────────────────────────┤
│  • Oculta/muestra botones según permisos                        │
│  • Mejora UX (usuario no ve lo que no puede hacer)              │
│  • NO ES SEGURIDAD, solo comodidad                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    2. CAPA CLIENTE (Funciones)                   │
├─────────────────────────────────────────────────────────────────┤
│  • Verifica permisos antes de llamar al servidor                │
│  • Muestra mensajes de error amigables                          │
│  • Evita llamadas innecesarias al backend                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 3. CAPA SERVIDOR (Server Actions)                │
├─────────────────────────────────────────────────────────────────┤
│  • ⚠️ SEGURIDAD REAL AQUÍ ⚠️                                   │
│  • Valida permisos en cada acción                               │
│  • Lanza error si no tiene permiso                              │
│  • NO confía en validaciones del cliente                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      4. CAPA BASE DE DATOS                       │
├─────────────────────────────────────────────────────────────────┤
│  • Almacena configuración de permisos                           │
│  • Consultas optimizadas para verificación rápida               │
│  • Auditoría de cambios (quién modificó qué)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎭 Ejemplo de Flujo Completo

### Caso: Usuario Arbitro Intenta Crear un Entrenador

```
1. Usuario "Juan" (rol: arbitro) entra a /entrenadores
   ↓
2. Hook usePermisos('entrenadores') consulta BD
   ↓
3. Encuentra: arbitro puede Ver ✓ y Crear ✓
   ↓
4. Página renderiza:
   ✓ Tabla visible
   ✓ Botón "Crear" visible
   ✗ Botones "Editar" ocultos
   ✗ Botones "Eliminar" ocultos
   ↓
5. Juan hace click en "Crear"
   ↓
6. Se abre modal/offcanvas con formulario
   ↓
7. Juan completa formulario y envía
   ↓
8. Función handleCreate() verifica:
   if (!puedeCrear) return ❌  // Pasa ✓
   ↓
9. Llama a createEntrenador(formData)
   ↓
10. Server action verifica:
    await requirePermiso('entrenadores', 'crear')
    • Consulta BD
    • Verifica que arbitro tenga permiso de crear
    • Permiso encontrado ✓
    ↓
11. Ejecuta inserción en BD
    ↓
12. Retorna success
    ↓
13. UI muestra mensaje de éxito
    ↓
14. Tabla se actualiza con nuevo entrenador
```

### Caso: Usuario Jugador Intenta Eliminar (Intento Malicioso)

```
1. Usuario "Pedro" (rol: jugador) entra a /entrenadores
   ↓
2. Hook usePermisos('entrenadores') consulta BD
   ↓
3. Encuentra: jugador solo puede Ver ✓
   ↓
4. Página renderiza:
   ✓ Tabla visible
   ✗ Botón "Crear" oculto
   ✗ Botones "Editar" ocultos
   ✗ Botones "Eliminar" ocultos
   ↓
5. Pedro inspecciona HTML y manipula el código
   Agrega manualmente: <button onclick="deleteEntrenador(5)">
   ↓
6. Pedro hace click en su botón custom
   ↓
7. Llama directamente a deleteEntrenador(5)
   ↓
8. Server action verifica:
   await requirePermiso('entrenadores', 'eliminar')
   • Consulta BD
   • jugador NO tiene permiso de eliminar ✗
   ↓
9. ⛔ Lanza error:
   "No tienes permiso para eliminar en entrenadores"
   ↓
10. ❌ Acción bloqueada
    ↓
11. UI muestra error
    ↓
12. Nada se elimina (seguridad garantizada)
```

---

## 📁 Archivos del Sistema

```
fixturePro/
├─ src/
│  ├─ hooks/
│  │  └─ usePermisos.ts                    ← Hook para frontend
│  │
│  ├─ lib/
│  │  ├─ auth-helpers.ts                   ← requirePermiso() para backend
│  │  └─ permisos-helpers.ts               ← Lógica de verificación
│  │
│  ├─ app/(admin)/(apps)/
│  │  ├─ roles-permisos/
│  │  │  ├─ page.tsx                       ← Matriz de permisos (UI)
│  │  │  └─ actions.ts                     ← Acciones de roles/permisos
│  │  │
│  │  └─ entrenadores/
│  │     ├─ page.tsx                       ← Página protegida
│  │     ├─ actions.ts                     ← Actions con validación
│  │     └─ ejemplo-con-permisos.tsx       ← Ejemplo de implementación
│  │
│  └─ db/
│     └─ schema.ts                         ← Tablas roles_menus, roles, menus
│
├─ GUIA_APLICAR_PERMISOS.md               ← Guía completa
└─ RESUMEN_SISTEMA_PERMISOS.md            ← Este archivo
```

---

## ⚙️ Configuración Rápida para Nuevas Páginas

### Paso 1: Frontend (page.tsx)
```tsx
import { usePermisos } from '@/hooks/usePermisos'

export default function MiPagina() {
  const { puedeVer, puedeCrear, puedeEditar, puedeEliminar, cargando } = usePermisos('mi_recurso')
  
  if (cargando) return <Loader />
  if (!puedeVer) return <NoAccess />
  
  return (
    <div>
      {puedeCrear && <ButtonCrear />}
      {puedeEditar && <ButtonEditar />}
      {puedeEliminar && <ButtonEliminar />}
    </div>
  )
}
```

### Paso 2: Backend (actions.ts)
```tsx
'use server'
import { requirePermiso } from '@/lib/auth-helpers'

export async function createItem(data: FormData) {
  await requirePermiso('mi_recurso', 'crear')
  // ... lógica
}

export async function updateItem(id: number, data: FormData) {
  await requirePermiso('mi_recurso', 'editar')
  // ... lógica
}

export async function deleteItem(id: number) {
  await requirePermiso('mi_recurso', 'eliminar')
  // ... lógica
}
```

### Paso 3: Base de Datos (Seed)
```sql
-- Agregar el menú en tabla 'menus'
INSERT INTO menus (key, label, url, orden) 
VALUES ('mi_recurso', 'Mi Recurso', '/mi-recurso', 10);

-- Configurar permisos en /roles-permisos (UI)
```

---

## 🎯 Ventajas del Sistema

✅ **Flexible:** Crea roles personalizados fácilmente  
✅ **Granular:** Control fino por recurso y acción  
✅ **Seguro:** Validación en backend obligatoria  
✅ **Visual:** Matriz clara y fácil de entender  
✅ **Escalable:** Agregar nuevos recursos es simple  
✅ **Auditable:** Logs de quién tiene qué permisos  

---

## 📚 Próximos Pasos

1. ✅ Sistema de permisos implementado
2. ✅ Hook `usePermisos` creado
3. ✅ Funciones `requirePermiso` agregadas
4. ✅ Documentación completa
5. ⬜ **Aplicar a todas las páginas existentes**
6. ⬜ Agregar logs de auditoría
7. ⬜ Dashboard de permisos por usuario
8. ⬜ Tests unitarios de permisos

---

## 💡 Tips Finales

- Siempre configura permisos desde `/roles-permisos`
- No modifiques directamente la BD
- Testea con diferentes roles
- Documenta permisos especiales
- Mantén consistencia en los `keys`

---

**¿Dudas?** Revisa `GUIA_APLICAR_PERMISOS.md` para ejemplos detallados.

