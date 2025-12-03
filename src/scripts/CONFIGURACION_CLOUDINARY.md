# Configuración de Cloudinary para FixturePro

## 📋 Pasos para Configurar Cloudinary

### 1. Crear Cuenta en Cloudinary

1. Ve a [https://cloudinary.com/](https://cloudinary.com/)
2. Haz clic en "Sign Up" (Registro)
3. Completa el formulario de registro
4. Verifica tu email

### 2. Obtener Credenciales

1. Inicia sesión en tu cuenta de Cloudinary
2. Ve al **Dashboard** (Panel de control)
3. En la sección **Account Details** encontrarás:
   - **Cloud name** (Nombre de la nube)
   - **API Key** (Clave de API)
   - **API Secret** (Secreto de API)

### 3. Configurar Variables de Entorno

1. Crea o edita el archivo `.env.local` en la raíz del proyecto
2. Agrega las siguientes variables:

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

**Ejemplo:**
```env
CLOUDINARY_CLOUD_NAME=mi_proyecto
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

### 4. Verificar Configuración

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Intenta crear o editar un jugador con foto
3. La imagen debería subirse automáticamente a Cloudinary

## ✅ Características Implementadas

### Funcionalidades Automáticas

- ✅ **Subida automática**: Las nuevas fotos se suben a Cloudinary
- ✅ **Optimización**: Las imágenes se optimizan automáticamente (400x400px, calidad auto, formato WebP)
- ✅ **Eliminación**: Las fotos antiguas se eliminan automáticamente al actualizar
- ✅ **Fallback**: Si Cloudinary no está configurado, usa almacenamiento local
- ✅ **Detección de caras**: Las imágenes se recortan automáticamente enfocando en la cara

### Transformaciones Aplicadas

Las imágenes se procesan con:
- **Tamaño**: 400x400 píxeles
- **Recorte**: Fill (relleno) con detección de cara
- **Calidad**: Automática
- **Formato**: Automático (WebP si es compatible)

## 🔧 Uso en el Código

### Subir Imagen

```typescript
import { uploadFileToCloudinary } from '@/lib/cloudinary'

const url = await uploadFileToCloudinary(file, 'jugador_123', 'jugadores')
```

### Eliminar Imagen

```typescript
import { deleteImageFromCloudinary } from '@/lib/cloudinary'

await deleteImageFromCloudinary('jugador_123', 'jugadores')
```

### Verificar si es URL de Cloudinary

```typescript
import { isCloudinaryUrl } from '@/lib/cloudinary'

if (isCloudinaryUrl(imageUrl)) {
  // Es una imagen de Cloudinary
}
```

## 📊 Plan Gratuito de Cloudinary

El plan gratuito incluye:
- **25 GB** de almacenamiento
- **25 GB** de ancho de banda mensual
- **25 millones** de transformaciones al mes
- CDN global incluido

Esto es más que suficiente para la mayoría de proyectos pequeños y medianos.

## 🚀 Migración de Imágenes Existentes

Si ya tienes imágenes almacenadas localmente, puedes migrarlas usando el script:

```bash
# Primero, consulta el estado actual
npx tsx src/scripts/consultar-imagenes-jugadores.ts

# Luego, migra las imágenes (modo prueba)
npx tsx src/scripts/ejemplo-migracion-cloudinary.ts --dry-run

# Finalmente, migra las imágenes (modo real)
npx tsx src/scripts/ejemplo-migracion-cloudinary.ts
```

## ⚠️ Notas Importantes

1. **Seguridad**: Nunca commitees el archivo `.env.local` al repositorio
2. **Backup**: Haz backup de tus imágenes antes de migrar
3. **Pruebas**: Siempre prueba en modo `--dry-run` primero
4. **Variables**: Asegúrate de que las variables de entorno estén configuradas correctamente

## 🆘 Solución de Problemas

### Error: "Cloudinary no está configurado"

**Solución**: Verifica que las variables de entorno estén en `.env.local` y reinicia el servidor.

### Error: "Invalid API Key"

**Solución**: Verifica que copiaste correctamente las credenciales del Dashboard de Cloudinary.

### Las imágenes no se suben

**Solución**: 
1. Verifica la consola del servidor para ver errores
2. Asegúrate de que las variables de entorno estén configuradas
3. Verifica tu conexión a internet

### Las imágenes se suben pero no se muestran

**Solución**: 
1. Verifica que la URL de Cloudinary esté guardada correctamente en la base de datos
2. Verifica que no haya problemas de CORS
3. Revisa la consola del navegador para errores

## 📚 Recursos Adicionales

- [Documentación de Cloudinary](https://cloudinary.com/documentation)
- [Dashboard de Cloudinary](https://console.cloudinary.com/)
- [Transformaciones de Imágenes](https://cloudinary.com/documentation/image_transformations)

