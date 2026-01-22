# 📸 Manual de Carga de Imágenes a Cloudinary

## 📋 Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Identificar Imágenes Nuevas](#identificar-imágenes-nuevas)
3. [Subir Imágenes Faltantes](#subir-imágenes-faltantes)
4. [Subir Todas las Imágenes de una Carpeta](#subir-todas-las-imágenes-de-una-carpeta)
5. [Verificar Estado de Imágenes](#verificar-estado-de-imágenes)
6. [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Requisitos Previos

### 1. Configuración de Cloudinary
Asegúrate de tener las variables de entorno configuradas en `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=dj2qhm6ru
CLOUDINARY_API_KEY=647218391852358
CLOUDINARY_API_SECRET=Cq6tRH_Dy8je_QaMybQbydsBN-M
```

### 2. Configuración de Base de Datos
Verifica que la conexión apunte a la base de datos correcta:
- Base de datos: **Fixture** (no FixturePro)
- Archivo: `src/db/index.ts`

### 3. Formato de Nombres de Archivo
Las imágenes deben nombrarse con la **cédula del jugador**:
- ✅ Correcto: `0150016947.jpg`, `1721440871.jpg`
- ❌ Incorrecto: `jugador_123.jpg`, `foto_juan.jpg`

---

## 🔍 Identificar Imágenes Nuevas

**Cuándo usar:** Cuando agregas nuevas fotos a la carpeta y quieres saber cuáles faltan subir a Cloudinary.

### Paso 1: Ejecutar el Script de Identificación

```bash
npx tsx src/scripts/imagenes-no-subidas.ts
```

O especificar una carpeta diferente:

```bash
npx tsx src/scripts/imagenes-no-subidas.ts --carpeta "C:\ruta\a\tu\carpeta"
```

### Paso 2: Revisar el Reporte

El script genera dos archivos:

1. **`imagenes-no-subidas.json`** - Reporte completo en JSON
2. **`imagenes-no-subidas.csv`** - Lista de imágenes no subidas (solo las que tienen jugador en BD)

### Paso 3: Interpretar los Resultados

El script muestra:
- ✅ **Imágenes subidas**: Ya están en Cloudinary
- ❌ **Imágenes NO subidas**: Están en tu carpeta pero no en Cloudinary (tienen jugador en BD)
- ⚠️ **Imágenes sin jugador**: No se encontró el jugador en la base de datos

---

## 📤 Subir Imágenes Faltantes

**Cuándo usar:** Cuando ya identificaste las imágenes que faltan y quieres subirlas automáticamente.

### Paso 1: Verificar el Reporte

Asegúrate de tener el archivo `imagenes-no-subidas.json` actualizado (ejecuta el script de identificación primero).

### Paso 2: Modo Prueba (Opcional)

Ejecuta en modo prueba para ver qué se subiría sin hacer cambios reales:

```bash
npx tsx src/scripts/subir-imagenes-faltantes.ts --dry-run
```

### Paso 3: Subir las Imágenes

Ejecuta el script sin el flag `--dry-run`:

```bash
npx tsx src/scripts/subir-imagenes-faltantes.ts
```

### Paso 4: Revisar el Reporte Final

El script genera:
- **`reporte-subida-faltantes-real.json`** - Reporte completo con todos los resultados
- **`errores-subida-faltantes.csv`** - Solo los errores (si hay alguno)

---

## 📁 Subir Todas las Imágenes de una Carpeta

**Cuándo usar:** Cuando quieres subir todas las imágenes de una carpeta completa (nuevas y existentes).

### Paso 1: Configurar la Ruta

Edita `src/scripts/subir-imagenes-desde-carpeta.ts` y actualiza la constante:

```typescript
const CARPETA_IMAGENES_DEFAULT = 'C:\\D\\imagenes_calificación\\imagenes_calificación'
```

O especifica la carpeta como argumento:

```bash
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --carpeta "C:\ruta\a\tu\carpeta"
```

### Paso 2: Modo Prueba (Recomendado)

```bash
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --dry-run
```

### Paso 3: Subir las Imágenes

```bash
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts
```

**Nota:** Este script subirá TODAS las imágenes de la carpeta, incluso las que ya están en Cloudinary (las sobrescribirá).

---

## ✅ Verificar Estado de Imágenes

### Opción 1: Desde la Interfaz Web

1. Ve a: `/jugadores/urls-cloudinary`
2. Verás todas las URLs de Cloudinary
3. Puedes exportar como JSON o CSV
4. Botón "Actualizar Base de Datos" para sincronizar

### Opción 2: Script de Consulta

```bash
npx tsx src/scripts/consultar-imagenes-jugadores.ts
```

Este script muestra:
- Jugadores con foto local
- Jugadores con foto en URL (Cloudinary)
- Jugadores sin foto
- Fotos que no existen físicamente

---

## 🔄 Flujo de Trabajo Recomendado

### Escenario 1: Agregaste Nuevas Fotos

```bash
# 1. Identificar qué imágenes son nuevas
npx tsx src/scripts/imagenes-no-subidas.ts

# 2. Revisar el reporte imagenes-no-subidas.json

# 3. Subir solo las que faltan
npx tsx src/scripts/subir-imagenes-faltantes.ts
```

### Escenario 2: Quieres Subir Todo desde Cero

```bash
# 1. Verificar en modo prueba
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --dry-run

# 2. Subir todas las imágenes
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts
```

### Escenario 3: Actualizar URLs en la Base de Datos

Si las imágenes ya están en Cloudinary pero las URLs no están en la BD:

1. Ve a `/jugadores/urls-cloudinary` en el navegador
2. Haz clic en "Actualizar Base de Datos"

---

## 🛠️ Solución de Problemas

### Problema: "Jugador no encontrado en BD"

**Causas posibles:**
- El nombre del archivo no coincide con la cédula
- La cédula tiene formato diferente (espacios, ceros a la izquierda)
- El jugador realmente no existe en la BD

**Solución:**
1. Verifica el nombre del archivo (debe ser la cédula exacta)
2. Verifica que el jugador exista en la BD
3. Si la cédula tiene formato diferente, renombra el archivo

### Problema: "Cloudinary no está configurado"

**Solución:**
1. Verifica que `.env.local` tenga las variables de Cloudinary
2. Reinicia el servidor si es necesario
3. Verifica que las credenciales sean correctas

### Problema: "Base de datos incorrecta"

**Solución:**
1. Verifica que `src/db/index.ts` apunte a la BD correcta: **Fixture**
2. Verifica la variable `DATABASE_URL` en `.env.local`

### Problema: "Imagen no se sube"

**Verifica:**
1. Que el archivo existe en la ruta especificada
2. Que el formato es válido (.jpg, .jpeg, .png, .gif, .webp)
3. Que tienes conexión a internet
4. Que las credenciales de Cloudinary son válidas

---

## 📝 Notas Importantes

1. **Formato de URLs en Cloudinary:**
   ```
   https://res.cloudinary.com/dj2qhm6ru/image/upload/v{timestamp}/jugadores/jugador_{id}.jpg
   ```

2. **Public ID en Cloudinary:**
   - Formato: `jugadores/jugador_{jugador_id}`
   - Ejemplo: `jugadores/jugador_0150016947`

3. **Transformaciones Automáticas:**
   - Tamaño: 400x400px
   - Crop: fill con gravity en la cara
   - Formato: auto (WebP si es compatible)
   - Calidad: auto

4. **Rutas por Defecto:**
   - Carpeta local: `C:\D\imagenes_calificación\imagenes_calificación`
   - Carpeta Cloudinary: `jugadores/`

---

## 🚀 Comandos Rápidos

```bash
# Identificar imágenes nuevas
npx tsx src/scripts/imagenes-no-subidas.ts

# Subir solo las que faltan
npx tsx src/scripts/subir-imagenes-faltantes.ts

# Subir todas las imágenes de una carpeta
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts

# Modo prueba (sin subir realmente)
npx tsx src/scripts/subir-imagenes-faltantes.ts --dry-run
npx tsx src/scripts/subir-imagenes-desde-carpeta.ts --dry-run
```

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en la consola
2. Verifica los archivos de reporte generados
3. Asegúrate de que la base de datos y Cloudinary estén configurados correctamente

---

**Última actualización:** Enero 2025
