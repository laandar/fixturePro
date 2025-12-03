# Scripts de Gestión de Imágenes de Jugadores

Este directorio contiene scripts útiles para consultar, analizar y migrar las imágenes de jugadores.

## 📋 Scripts Disponibles

### 1. `consultar-imagenes-jugadores.ts`

Consulta todas las imágenes de jugadores en la base de datos y genera un reporte detallado.

**Uso:**
```bash
npx tsx src/scripts/consultar-imagenes-jugadores.ts
```

**Qué hace:**
- ✅ Lista todos los jugadores y sus fotos
- ✅ Verifica qué imágenes existen físicamente
- ✅ Identifica fotos locales vs URLs externas
- ✅ Genera un reporte JSON con toda la información
- ✅ Muestra resumen en consola

**Salida:**
- Reporte en consola con estadísticas
- Archivo `reporte-imagenes-jugadores.json` con detalles completos

---

### 2. `ejemplo-migracion-cloudinary.ts`

Ejemplo de cómo migrar imágenes locales a Cloudinary.

**⚠️ IMPORTANTE:** Este es solo un ejemplo. Ajusta según la plataforma que elijas.

**Configuración previa:**

1. Instalar Cloudinary:
```bash
npm install cloudinary
```

2. Configurar variables de entorno en `.env.local`:
```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

3. Ejecutar en modo prueba (dry-run):
```bash
npx tsx src/scripts/ejemplo-migracion-cloudinary.ts --dry-run
```

4. Ejecutar migración real:
```bash
npx tsx src/scripts/ejemplo-migracion-cloudinary.ts
```

**Qué hace:**
- ✅ Sube imágenes locales a Cloudinary
- ✅ Optimiza imágenes automáticamente
- ✅ Actualiza URLs en la base de datos
- ✅ Genera reporte de la migración

---

## 🚀 Flujo de Trabajo Recomendado

### Paso 1: Consultar Estado Actual
```bash
npx tsx src/scripts/consultar-imagenes-jugadores.ts
```

Esto te mostrará:
- Cuántos jugadores tienen fotos
- Cuántas fotos existen físicamente
- Cuántas fotos están rotas o faltantes

### Paso 2: Elegir Plataforma

Revisa el archivo `PLATAFORMAS_ALMACENAMIENTO.md` para comparar opciones:
- **Cloudinary** (recomendado para optimización)
- **Supabase Storage** (recomendado para integración)
- **Firebase Storage** (recomendado para proyectos Firebase)
- **AWS S3** (recomendado para control total)

### Paso 3: Configurar Plataforma

1. Crear cuenta en la plataforma elegida
2. Obtener credenciales (API keys, tokens, etc.)
3. Configurar variables de entorno

### Paso 4: Crear Script de Migración

Usa `ejemplo-migracion-cloudinary.ts` como base y adapta para tu plataforma elegida.

### Paso 5: Probar Migración

Ejecuta en modo dry-run primero:
```bash
npx tsx src/scripts/tu-script-migracion.ts --dry-run
```

### Paso 6: Ejecutar Migración Real

Una vez que estés seguro, ejecuta la migración real.

### Paso 7: Actualizar Código de Guardado

Modifica `src/app/(admin)/(apps)/jugadores/actions.ts` para que las nuevas imágenes se suban directamente a la plataforma en la nube.

---

## 📊 Ejemplo de Salida

### Consultar Imágenes
```
🔍 Consultando imágenes de jugadores...

📊 RESUMEN DE IMÁGENES DE JUGADORES
==================================================
Total de jugadores: 150
Jugadores con foto: 120
Jugadores sin foto: 30

📁 Tipos de fotos:
  - Fotos locales: 100
  - Fotos URL externas: 20

✅ Fotos que existen físicamente: 95
❌ Fotos que NO existen físicamente: 5

✅ Reporte guardado en: reporte-imagenes-jugadores.json
```

---

## 🔧 Adaptar para Otras Plataformas

### Para Supabase Storage:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

async function uploadToSupabase(file: File, jugadorId: number) {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const { data, error } = await supabase.storage
    .from('jugadores')
    .upload(`jugador_${jugadorId}.jpg`, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    })
  
  if (error) throw error
  
  const { data: { publicUrl } } = supabase.storage
    .from('jugadores')
    .getPublicUrl(data.path)
  
  return publicUrl
}
```

### Para Firebase Storage:

```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const storage = getStorage()

async function uploadToFirebase(file: File, jugadorId: number) {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  
  const storageRef = ref(storage, `jugadores/jugador_${jugadorId}.jpg`)
  await uploadBytes(storageRef, buffer)
  
  const url = await getDownloadURL(storageRef)
  return url
}
```

---

## ⚠️ Consideraciones Importantes

1. **Backup:** Siempre haz backup de tu base de datos antes de migrar
2. **Pruebas:** Ejecuta en modo dry-run primero
3. **Validación:** Verifica que las URLs funcionen después de la migración
4. **Limpieza:** Considera eliminar archivos locales después de migrar (con cuidado)
5. **Variables de entorno:** Nunca commitees credenciales al repositorio

---

## 📝 Notas

- Los scripts están diseñados para ser ejecutados desde la raíz del proyecto
- Asegúrate de tener las dependencias instaladas
- Los reportes se guardan en la raíz del proyecto
- Los scripts son idempotentes (puedes ejecutarlos múltiples veces)

---

## 🆘 Solución de Problemas

### Error: "Cannot find module '@/db'"
Asegúrate de ejecutar desde la raíz del proyecto y que TypeScript esté configurado correctamente.

### Error: "Cloudinary config is missing"
Verifica que las variables de entorno estén configuradas en `.env.local`.

### Error: "File not found"
Algunas imágenes pueden no existir físicamente. El script las identificará en el reporte.

---

## 📚 Recursos Adicionales

- [Documentación de Cloudinary](https://cloudinary.com/documentation)
- [Documentación de Supabase Storage](https://supabase.com/docs/guides/storage)
- [Documentación de Firebase Storage](https://firebase.google.com/docs/storage)
- Ver `PLATAFORMAS_ALMACENAMIENTO.md` para comparación detallada

