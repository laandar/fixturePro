# 🚀 Guía Rápida - Sistema de Roles Dinámicos

## ⚡ Inicio Rápido (10 minutos)

### 1️⃣ Generar y Aplicar Migraciones

```bash
npm run db:generate
npm run db:push
```

### 2️⃣ Poblar Roles y Menús Iniciales

```bash
npm run seed:roles-menus
```

Esto crea:
- ✅ 4 roles: admin, arbitro, jugador, visitante
- ✅ 16 menús del sistema
- ✅ ~40 permisos predefinidos

### 3️⃣ Migrar Usuarios Existentes

```bash
npm run migrate:users-to-roles
```

Convierte usuarios con `users.role` → `roles_usuarios`

### 4️⃣ Reiniciar Servidor

```bash
npm run dev
```

### 5️⃣ Acceder a la UI de Gestión

```
http://localhost:3000/roles-permisos
```

---

## 🎯 Crear un Nuevo Rol Dinámicamente

### **Ejemplo: Crear rol "Entrenador"**

#### **Paso 1: Ir a Roles**
1. Accede a `/roles-permisos`
2. Click en pestaña **"Roles"**
3. Click en **"Nuevo Rol"**

#### **Paso 2: Llenar Formulario**
```
Nombre: entrenador
Descripción: Entrenador de equipos
Nivel: 5  (entre árbitro y visitante)
```

#### **Paso 3: Crear**
- Click en **"Crear Rol"**
- ✅ Rol creado exitosamente

#### **Paso 4: Asignar Permisos**
1. Ve a pestaña **"Matriz de Permisos"**
2. Verás nueva columna **"ENTRENADOR"**
3. Click en las celdas para asignar permisos:
   ```
   Dashboard:      ✅ Ver
   Estadísticas:   ✅ Ver
   Jugadores:      ✅ Ver, ✅ Editar (solo de su equipo)
   ```

#### **Paso 5: Asignar a un Usuario**
1. Ve a `/usuarios`
2. Edita un usuario
3. En "Rol" ahora aparece **"Entrenador"**
4. Asígnalo
5. ✅ Usuario ahora es entrenador

---

## 💡 Ejemplos de Roles Personalizados

### **1. Rol "Prensa"**
```
Nombre: prensa
Descripción: Periodista deportivo - Acceso a estadísticas
Nivel: 6

Permisos:
✅ Dashboard (Ver)
✅ Estadísticas (Ver)
✅ Fixture (Ver)
❌ No puede editar nada
```

### **2. Rol "Directivo"**
```
Nombre: directivo
Descripción: Directivo del club - Ve todo, edita poco
Nivel: 2

Permisos:
✅ Dashboard (Ver)
✅ Equipos (Ver)
✅ Jugadores (Ver)
✅ Torneos (Ver)
✅ Configuraciones (Ver, Editar)
❌ No puede eliminar
```

### **3. Rol "Asistente"**
```
Nombre: asistente
Descripción: Asistente administrativo
Nivel: 3

Permisos:
✅ Equipos (Ver, Crear, Editar)
✅ Jugadores (Ver, Crear, Editar)
✅ Categorías (Ver, Crear)
❌ No puede eliminar
❌ No puede gestionar torneos
```

---

## 🔄 Modificar Permisos de un Rol

### **Escenario: Dar más permisos a "Árbitro"**

1. Ve a `/roles-permisos`
2. Pestaña **"Matriz de Permisos"**
3. Busca fila **"Torneos"**
4. Columna **"ARBITRO"**
5. Click en celda **"Ver"**
6. ✅ Ahora árbitros pueden ver torneos
7. **Cambio aplicado inmediatamente**
8. Sin reiniciar servidor ✨

---

## 📊 Matriz de Permisos Interactiva

```
Clic en cada celda para activar/desactivar:

✅ = Permiso concedido
❌ = Permiso denegado

Colores:
🟢 Ver      → Verde
🔵 Crear    → Azul
🟡 Editar   → Amarillo
🔴 Eliminar → Rojo
```

---

## 🎭 Múltiples Roles por Usuario (Futuro)

El sistema ya soporta que un usuario tenga **múltiples roles**:

```
Carlos:
  ├─ Rol Principal: Árbitro    (se muestra en badge)
  └─ Roles Adicionales:
     ├─ Jugador
     └─ Entrenador

Permisos combinados:
✅ Cargar resultados (árbitro)
✅ Ver sus estadísticas (jugador)
✅ Gestionar plantel (entrenador)
```

*Nota: La UI para asignar múltiples roles se puede agregar después*

---

## ⚠️ Notas Importantes

### **Roles del Sistema Base (No eliminables):**
- `admin`
- `arbitro`
- `jugador`
- `visitante`

Estos roles tienen protección y **no se pueden eliminar**.

### **Niveles de Jerarquía:**
```
1 = Mayor poder (admin)
2 = Árbitro
3 = Jugador
4 = Visitante
5+ = Roles personalizados
```

### **Validaciones:**
- Nombre del rol: solo letras minúsculas y guiones bajos
- No se pueden duplicar nombres
- Nivel debe ser entre 1 y 99

---

## 🛠️ Comandos Útiles

```bash
# Ver base de datos en Drizzle Studio
npm run db:studio

# Re-poblar roles y menús (si algo falla)
npm run seed:roles-menus

# Ver logs del servidor
npm run dev
```

---

## 🎯 Flujo Completo de Trabajo

```
1. Crear Rol
   ↓
2. Asignar Permisos en Matriz
   ↓
3. Asignar Rol a Usuarios
   ↓
4. Usuarios ven menú personalizado
   ↓
5. Ajustar permisos cuando sea necesario
   ↓
6. Cambios aplicados en tiempo real ✨
```

---

¡Sistema completamente dinámico y profesional! 🚀

