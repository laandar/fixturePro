# 🎭 Sistema Dinámico de Roles y Permisos - FixturePro

## 📋 Arquitectura Implementada

Tu sistema ahora usa **4 tablas** para gestionar roles y permisos de forma completamente dinámica:

```
┌──────────┐      ┌────────────┐      ┌──────────┐      ┌────────────────┐
│  users   │──┐   │   roles    │──┐   │  menus   │──┐   │  roles_menus   │
└──────────┘  │   └────────────┘  │   └──────────┘  │   └────────────────┘
              │                    │                  │
              │   ┌────────────────┴──────────────┐  │
              └───│  roles_usuarios               │──┘
                  └───────────────────────────────┘
```

---

## 🗄️ **Estructura de Tablas**

### **1. `roles` - Catálogo de Roles**

```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,     -- 'admin', 'arbitro', 'jugador', 'visitante'
  descripcion TEXT,                -- Descripción del rol
  nivel INTEGER NOT NULL,          -- Jerarquía: 1=admin, 4=visitante
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Datos iniciales:**
- `admin` (nivel 1) - Administrador del sistema
- `arbitro` (nivel 2) - Árbitro/Vocal
- `jugador` (nivel 3) - Jugador de equipo
- `visitante` (nivel 4) - Usuario público

---

### **2. `menus` - Catálogo de Menús**

```sql
CREATE TABLE menus (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,        -- 'equipos', 'categorias'
  label TEXT NOT NULL,             -- 'Equipos', 'Categorías'
  url TEXT,                        -- '/equipos' (NULL si es menú padre)
  icon TEXT,                       -- 'TbTrophy' (nombre del icono)
  parent_id INTEGER,               -- ID del menú padre (NULL si es raíz)
  orden INTEGER DEFAULT 0,         -- Orden de aparición
  es_title BOOLEAN DEFAULT false,  -- Si es un título separador
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Ejemplo de jerarquía:**
```
Gestión Deportiva (parent_id: NULL)
  ├─ Equipos (parent_id: ID de "Gestión Deportiva")
  ├─ Categorías (parent_id: ID de "Gestión Deportiva")
  └─ Jugadores (parent_id: ID de "Gestión Deportiva")
```

---

### **3. `roles_menus` - Permisos (Muchos a Muchos)**

```sql
CREATE TABLE roles_menus (
  id SERIAL PRIMARY KEY,
  rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  menu_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
  puede_ver BOOLEAN DEFAULT true,
  puede_crear BOOLEAN DEFAULT false,
  puede_editar BOOLEAN DEFAULT false,
  puede_eliminar BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(rol_id, menu_id)
);
```

**Ejemplo:**
```
rol_id: 1 (admin), menu_id: 5 (equipos)
→ puede_ver: true
→ puede_crear: true
→ puede_editar: true
→ puede_eliminar: true
```

---

### **4. `roles_usuarios` - Asignación de Roles (Muchos a Muchos)**

```sql
CREATE TABLE roles_usuarios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  es_rol_principal BOOLEAN DEFAULT false,  -- Rol que se muestra por defecto
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, rol_id)
);
```

**Ejemplo - Usuario con múltiples roles:**
```
user_id: 5 (Carlos)
→ rol_id: 2 (arbitro), es_rol_principal: true   ← Rol principal
→ rol_id: 3 (jugador), es_rol_principal: false  ← Rol secundario

Carlos puede:
- Cargar resultados (como árbitro)
- Ver sus estadísticas (como jugador)
```

---

## 🚀 **Instalación y Configuración**

### **Paso 1: Generar Migraciones**

```bash
npm run db:generate
npm run db:push
```

### **Paso 2: Poblar Datos Iniciales**

```bash
# Crear roles y menús del sistema
npm run seed:roles-menus

# Migrar usuarios existentes al nuevo sistema
npm run migrate:users-to-roles
```

### **Paso 3: Reiniciar Servidor**

```bash
npm run dev
```

---

## 🎯 **Cómo Usar el Sistema**

### **1. Gestionar Roles y Permisos (UI)**

Como **admin**, accede a:
```
http://localhost:3000/roles-permisos
```

Verás 3 pestañas:

#### **Pestaña 1: Matriz de Permisos**
```
┌──────────────┬─────────────────────────────────────────┐
│ Menú         │  ADMIN  │ ARBITRO │ JUGADOR │ VISITANTE │
├──────────────┼─────────┼─────────┼─────────┼───────────┤
│ Equipos      │ V C E D │    -    │    -    │     -     │
│ Vocalías     │ V C E D │  V C E  │    -    │     -     │
│ Estadísticas │    V    │    V    │    V    │     V     │
└──────────────┴─────────┴─────────┴─────────┴───────────┘

V=Ver, C=Crear, E=Editar, D=Eliminar
```

**Click en cada permiso** para activar/desactivar.

#### **Pestaña 2: Roles**
Lista de todos los roles del sistema.

#### **Pestaña 3: Menús**
Lista de todos los menús disponibles.

---

### **2. Asignar Roles a Usuarios**

En la página de **Usuarios** (`/usuarios`):

```typescript
// Ahora puedes asignar MÚLTIPLES roles a un usuario:

Usuario: Carlos Fernández
├─ Rol Principal: Árbitro    ← Se muestra en el badge
└─ Roles Adicionales:
   └─ Jugador               ← También tiene permisos de jugador

Carlos puede:
✅ Cargar resultados (permiso de árbitro)
✅ Ver sus estadísticas (permiso de jugador)
```

---

### **3. Verificar Permisos en el Código**

#### **En Server Components:**

```typescript
import { currentUserTienePermiso } from '@/lib/permisos-helpers';

export default async function EquiposPage() {
  // Verificar si puede ver
  const puedeVer = await currentUserTienePermiso('equipos', 'ver');
  if (!puedeVer) {
    redirect('/error/403');
  }
  
  // Verificar si puede crear
  const puedeCrear = await currentUserTienePermiso('equipos', 'crear');
  
  return (
    <div>
      <h1>Equipos</h1>
      {puedeCrear && <button>Crear Equipo</button>}
    </div>
  );
}
```

#### **En Server Actions:**

```typescript
'use server';

import { currentUserTienePermiso } from '@/lib/permisos-helpers';

export async function deleteEquipo(id: number) {
  // Verificar permiso de eliminar
  const puede = await currentUserTienePermiso('equipos', 'eliminar');
  
  if (!puede) {
    throw new Error('No tienes permisos para eliminar equipos');
  }
  
  await db.delete(equipos).where(eq(equipos.id, id));
  return { success: true };
}
```

---

## 💡 **Ventajas del Sistema Dinámico**

### **✅ Flexibilidad Total**

```bash
# Cambiar permisos SIN modificar código:
1. Ve a /roles-permisos
2. Click en la matriz
3. Cambios aplicados inmediatamente ✅
```

### **✅ Múltiples Roles por Usuario**

```sql
-- Carlos es árbitro Y jugador
INSERT INTO roles_usuarios (user_id, rol_id, es_rol_principal)
VALUES 
  (5, 2, true),   -- Árbitro (principal)
  (5, 3, false);  -- Jugador (secundario)
```

### **✅ Permisos Granulares (CRUD)**

```
Admin en "Equipos":
  ✅ Ver     → Puede acceder a /equipos
  ✅ Crear   → Puede crear equipos
  ✅ Editar  → Puede modificar equipos
  ✅ Eliminar → Puede eliminar equipos

Árbitro en "Equipos":
  ❌ Ver     → NO puede acceder
  ❌ Crear   → NO puede crear
  ❌ Editar  → NO puede editar
  ❌ Eliminar → NO puede eliminar
```

### **✅ Auditoría**

```sql
-- Ver quién tiene qué permisos
SELECT 
  u.name, 
  r.nombre as rol, 
  m.label as menu,
  rm.puede_ver, 
  rm.puede_crear
FROM users u
JOIN roles_usuarios ru ON u.id = ru.user_id
JOIN roles r ON ru.rol_id = r.id
JOIN roles_menus rm ON r.id = rm.rol_id
JOIN menus m ON rm.menu_id = m.id
WHERE u.email = 'carlos@ejemplo.com';
```

---

## 📚 **API Disponible**

### **Server Actions** (`roles-permisos/actions.ts`):

```typescript
// Roles
✅ getRoles()
✅ createRol(formData)
✅ updateRol(id, formData)
✅ deleteRol(id)

// Menús
✅ getMenus()
✅ createMenu(formData)
✅ updateMenu(id, formData)
✅ deleteMenu(id)

// Permisos
✅ getPermisosMatrix()
✅ setPermiso(rolId, menuId, tipo, valor)

// Asignación de roles
✅ getRolesDeUsuario(userId)
✅ asignarRolAUsuario(userId, rolId, esRolPrincipal)
✅ removerRolDeUsuario(userId, rolId)
✅ cambiarRolPrincipal(userId, rolId)
```

### **Helpers** (`permisos-helpers.ts`):

```typescript
✅ getRolesDeUsuario(userId)
✅ getRolPrincipalDeUsuario(userId)
✅ usuarioTienePermiso(userId, menuKey, accion)
✅ currentUserTienePermiso(menuKey, accion)
✅ getMenusParaUsuario(userId)
```

---

## ⚙️ **Comandos NPM**

```bash
# Poblar roles y menús iniciales
npm run seed:roles-menus

# Migrar usuarios existentes
npm run migrate:users-to-roles

# Ver base de datos
npm run db:studio
```

---

## 🎯 **Próximos Pasos**

1. ✅ **Ejecuta las migraciones**
2. ✅ **Ejecuta los seeds**
3. ✅ **Accede a `/roles-permisos`**
4. ✅ **Configura permisos** desde la UI
5. ✅ **El menú se actualizará automáticamente**

---

## 🔒 **Migración desde el Sistema Anterior**

El campo `users.role` se **mantiene por compatibilidad** pero ahora usa `roles_usuarios`.

Si un usuario tiene:
- `users.role = 'admin'`
- `roles_usuarios`: vacío

→ El script de migración crea automáticamente la relación.

---

¡Sistema completamente dinámico y profesional! 🚀

