# 🚀 Guía Rápida: Migrar Imágenes a Cloudinary

## 📋 Pasos para Migrar Todas tus Imágenes

### 1. Configurar Variables de Entorno

Asegúrate de tener las credenciales de Cloudinary en tu archivo `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

**Nota:** Si ya tienes las credenciales en `ENV_CLOUDINARY.example`, cópialas a `.env.local`.

### 2. Consultar Estado Actual (Opcional)

Antes de migrar, puedes ver qué imágenes tienes:

```bash
npx tsx src/scripts/consultar-imagenes-jugadores.ts
```

Esto te mostrará:
- Cuántos jugadores tienen fotos
- Cuántas fotos existen físicamente
- Cuántas ya están en Cloudinary

### 3. Ejecutar Migración en Modo Prueba

**IMPORTANTE:** Siempre ejecuta primero en modo prueba para ver qué haría:

```bash
npx tsx src/scripts/ejemplo-migracion-cloudinary.ts --dry-run
```

Esto te mostrará:
- Qué imágenes se subirían
- Qué URLs se generarían
- **NO modificará la base de datos**

### 4. Ejecutar Migración Real

Una vez que veas que todo está correcto en el modo prueba, ejecuta la migración real:

```bash
npx tsx src/scripts/ejemplo-migracion-cloudinary.ts
```

**El script:**
- ✅ Subirá todas las imágenes locales a Cloudinary
- ✅ Actualizará las URLs en la base de datos
- ✅ Mostrará progreso en tiempo real
- ✅ Generará un reporte al finalizar

## 📊 Qué Esperar

### Durante la Migración

Verás algo como esto:

```
🔄 [MIGRACIÓN REAL] Iniciando migración a Cloudinary...
📋 Cloud Name: tu_cloud_name
✅ Conexión con Cloudinary verificada
📊 Consultando jugadores en la base de datos...
   Total de jugadores encontrados: 150
📸 Jugadores a migrar: 45
⏭️  Ya en Cloudinary: 5
📝 Sin foto: 100

[1/45] ⬆️  Subiendo: Juan Pérez (125.50 KB)...
   ✅ Completado: https://res.cloudinary.com/...
[2/45] ⬆️  Subiendo: María García (98.30 KB)...
   ✅ Completado: https://res.cloudinary.com/...
...
```

### Al Finalizar

Verás un resumen:

```
============================================================
📊 RESUMEN DE MIGRACIÓN
============================================================
Total de jugadores: 150
📸 Procesados para migración: 45
✅ Exitosos: 43
❌ Fallidos: 2
⏭️  Ya en Cloudinary: 5
📝 Sin foto: 100
============================================================
✅ Reporte guardado en: reporte-migracion-real.json
```

## ⚠️ Importante

1. **Backup:** El script modifica la base de datos. Asegúrate de tener un backup.
2. **Tiempo:** La migración puede tardar varios minutos dependiendo de cuántas imágenes tengas.
3. **Rate Limits:** El script incluye delays entre subidas para evitar límites de Cloudinary.
4. **Errores:** Si alguna imagen falla, el script continuará con las demás.

## 🆘 Solución de Problemas

### Error: "Variables de entorno no configuradas"

**Solución:** Verifica que `.env.local` existe y tiene las variables correctas.

### Error: "No se pudo conectar con Cloudinary"

**Solución:** Verifica que las credenciales sean correctas en el Dashboard de Cloudinary.

### Algunas imágenes fallan

**Solución:** 
- Verifica que los archivos existan físicamente
- Revisa el reporte JSON generado para ver detalles de los errores
- Puedes reintentar solo las que fallaron

### El proceso es muy lento

**Solución:** Es normal. El script incluye delays para evitar rate limits. Puedes ajustar el delay en el código si es necesario.

## 📝 Reporte Generado

Al finalizar, se genera un archivo `reporte-migracion-real.json` con:
- Resumen de la migración
- Detalles de cada jugador procesado
- URLs nuevas asignadas
- Errores si los hubo

## ✅ Después de la Migración

Una vez completada la migración:

1. **Verifica:** Revisa algunas imágenes en la aplicación para confirmar que se muestran correctamente
2. **Limpieza (Opcional):** Puedes eliminar las imágenes locales de `public/uploads/jugadores/` si todo funciona bien
3. **Nuevas Imágenes:** Las nuevas fotos que subas se guardarán automáticamente en Cloudinary

## 🎉 ¡Listo!

Tus imágenes ahora están en Cloudinary y se optimizan automáticamente. Las nuevas fotos que subas también se guardarán allí.

