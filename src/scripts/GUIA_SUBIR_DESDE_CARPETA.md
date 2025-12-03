# 📁 Guía: Subir Imágenes desde una Carpeta

Este script te permite subir todas las imágenes de una carpeta a Cloudinary y asociarlas automáticamente con los jugadores.

## 📋 Requisitos Previos

1. **Credenciales de Cloudinary configuradas** en `.env.local`
2. **Carpeta con imágenes** lista para subir
3. **Nombres de archivos** que coincidan con los jugadores

## 🎯 Formatos de Nombres de Archivo Soportados

El script busca jugadores por diferentes criterios. Puedes nombrar tus archivos de estas formas:

### ✅ Por Cédula (Recomendado)
```
12345678.jpg
cedula_12345678.jpg
12345678.png
```

### ✅ Por ID de Jugador
```
jugador_abc123.jpg
id_abc123.jpg
abc123.jpg
```

### ✅ Por Nombre
```
Juan_Perez.jpg
juan_perez.jpg
Juan_Perez_Martinez.jpg
```

**Nota:** El script normaliza los nombres (minúsculas, sin espacios, sin prefijos), así que "Juan_Perez.jpg", "juan_perez.jpg" y "JUAN_PEREZ.jpg" funcionarán igual.

## 🚀 Uso del Script

### Opción 1: Carpeta por Defecto

Si tus imágenes están en una carpeta llamada `imagenes-jugadores` en la raíz del proyecto:

```bash
# Modo prueba (recomendado primero)
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --dry-run

# Subida real
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts
```

### Opción 2: Especificar Carpeta

Si tus imágenes están en otra ubicación:

```bash
# Modo prueba
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --carpeta "C:/ruta/a/tus/imagenes" --dry-run

# Subida real
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --carpeta "C:/ruta/a/tus/imagenes"
```

**Ejemplo:**
```bash
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --carpeta "C:/D/dsc/dev/fixturePro/fotos-jugadores" --dry-run
```

## 📝 Pasos Detallados

### 1. Preparar las Imágenes

1. Coloca todas las imágenes en una carpeta
2. Asegúrate de que los nombres coincidan con:
   - La cédula del jugador (mejor opción)
   - El ID del jugador
   - El nombre del jugador (apellido_nombre)

### 2. Verificar Nombres (Opcional)

Puedes consultar los jugadores en tu base de datos para verificar los nombres:

```bash
npx tsx src/scripts/consultar-imagenes-jugadores.ts
```

### 3. Ejecutar en Modo Prueba

Siempre ejecuta primero en modo prueba para ver qué haría:

```bash
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --carpeta "tu/carpeta" --dry-run
```

Esto te mostrará:
- Qué archivos se procesarían
- Qué jugadores se encontrarían
- Qué URLs se generarían
- **NO modificará la base de datos**

### 4. Ejecutar Subida Real

Una vez verificado, ejecuta la subida real:

```bash
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --carpeta "tu/carpeta"
```

## 📊 Qué Esperar

### Durante la Ejecución

Verás algo como esto:

```
🔄 [MODO PRUEBA] Subiendo imágenes desde carpeta...
📁 Carpeta: C:/ruta/a/imagenes
✅ Conexión con Cloudinary verificada
📂 Leyendo archivos de la carpeta...
   Encontrados 25 archivos de imagen

[1/25] 📸 Procesando: 12345678.jpg
   👤 Jugador encontrado: Juan Pérez (Cédula: 12345678)
   ☁️  [SIMULACIÓN] Se subiría a: jugadores/jugador_abc123
   📝 [SIMULACIÓN] Se actualizaría la foto del jugador

[2/25] 📸 Procesando: 87654321.jpg
   👤 Jugador encontrado: María García (Cédula: 87654321)
   ☁️  [SIMULACIÓN] Se subiría a: jugadores/jugador_def456
   📝 [SIMULACIÓN] Se actualizaría la foto del jugador

[3/25] 📸 Procesando: foto_xyz.jpg
   ⚠️  No se encontró jugador para: foto_xyz.jpg
   💡 Sugerencia: El archivo debe nombrarse con la cédula, ID o nombre del jugador
```

### Al Finalizar

```
============================================================
📊 RESUMEN
============================================================
Total de archivos: 25
✅ Exitosos: 23
❌ Fallidos: 1
⚠️  Jugadores no encontrados: 1
============================================================
✅ Reporte guardado en: reporte-subida-prueba.json
```

## ⚠️ Archivos No Encontrados

Si un archivo no encuentra su jugador, el script:
- ⚠️ Te mostrará una advertencia
- 💡 Te sugerirá cómo nombrar el archivo
- ⏭️ Continuará con los demás archivos
- 📝 Registrará el error en el reporte

**Solución:** Renombra el archivo con la cédula, ID o nombre del jugador y vuelve a ejecutar.

## 🔧 Personalizar la Carpeta por Defecto

Si siempre usas la misma carpeta, puedes editarla en el script:

1. Abre `src/scripts/subir-imagenes-desde-carpeta.ts`
2. Busca la línea:
   ```typescript
   const CARPETA_IMAGENES_DEFAULT = join(process.cwd(), 'imagenes-jugadores')
   ```
3. Cambia `'imagenes-jugadores'` por tu carpeta

## 📝 Extensiones Soportadas

El script acepta estas extensiones:
- `.jpg` / `.jpeg`
- `.png`
- `.gif`
- `.webp`

## 🆘 Solución de Problemas

### Error: "La carpeta no existe"

**Solución:** Verifica que la ruta sea correcta. Usa rutas absolutas o relativas desde la raíz del proyecto.

### "No se encontró jugador para: archivo.jpg"

**Solución:** 
1. Verifica que el nombre del archivo coincida con la cédula, ID o nombre del jugador
2. Consulta los jugadores con: `npx tsx src/scripts/consultar-imagenes-jugadores.ts`
3. Renombra el archivo y vuelve a intentar

### "Error al conectar con Cloudinary"

**Solución:** Verifica que las credenciales estén correctas en `.env.local`

### Algunas imágenes fallan al subir

**Solución:**
- Verifica que los archivos no estén corruptos
- Verifica el tamaño (Cloudinary tiene límites)
- Revisa el reporte JSON para detalles del error

## ✅ Después de la Subida

1. **Verifica:** Revisa algunas imágenes en la aplicación
2. **Reporte:** Revisa el archivo `reporte-subida-real.json` para detalles
3. **Limpieza:** Puedes mover o eliminar las imágenes de la carpeta si todo funciona

## 💡 Consejos

1. **Usa cédulas:** Es la forma más confiable de identificar jugadores
2. **Nombres únicos:** Asegúrate de que no haya duplicados
3. **Backup:** Haz backup de tus imágenes antes de subir
4. **Prueba primero:** Siempre ejecuta `--dry-run` primero

## 🎉 ¡Listo!

Tus imágenes ahora están en Cloudinary y asociadas con los jugadores correctos.

